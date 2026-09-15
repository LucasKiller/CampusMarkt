import { createServer as createHttpsServer } from "node:https";
import { createServer as createTlsServer, type TLSSocket } from "node:tls";
import { spawn, spawnSync } from "node:child_process";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  probeProductionDependencies,
  type ProductionProbeEnvironment,
} from "../../../scripts/config/probe-production.js";

const scratch = mkdtempSync(resolve(tmpdir(), "campusmarkt-probes-"));
const keyPath = resolve(scratch, "localhost.key");
const certificatePath = resolve(scratch, "localhost.crt");
const smtpUser = "probe-user";
const smtpPassword = "generated-probe-password";
const s3AccessKey = "generated-probe-access";
const s3SecretKey = "generated-probe-secret";
const s3Region = "eu-central-1";
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const probeCli = resolve(repositoryRoot, "scripts/config/probe-production.ts");

const generated = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certificatePath,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost",
  ],
  { encoding: "utf8" },
);
if (generated.status !== 0) {
  throw new Error(generated.stderr);
}
const key = readFileSync(keyPath);
const certificate = readFileSync(certificatePath);

type ClosableServer = {
  close(callback: (error?: Error) => void): void;
  closeAllConnections?: () => void;
  listen(port: number, host: string, callback: () => void): void;
  address(): null | string | { port: number };
};

async function listen(server: ClosableServer) {
  await new Promise<void>((resolveListen) =>
    server.listen(0, "::", resolveListen),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port.");
  return address.port;
}

async function close(server: ClosableServer) {
  server.closeAllConnections?.();
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
}

function runProbeCli(environment: ProductionProbeEnvironment) {
  const startedAt = performance.now();
  return new Promise<{
    status: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
  }>((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", probeCli],
      {
        cwd: repositoryRoot,
        env: { ...process.env, ...environment },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 10_000);
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.once("error", reject);
    child.once("close", (status) => {
      clearTimeout(timer);
      resolveResult({
        status,
        stdout,
        stderr,
        durationMs: performance.now() - startedAt,
      });
    });
  });
}

function expectBoundedRedacted(
  output: string,
  additionalCredentials: string[] = [],
) {
  expect(output.length).toBeLessThan(4_000);
  for (const credential of [
    smtpUser,
    smtpPassword,
    s3AccessKey,
    s3SecretKey,
    ...additionalCredentials,
  ]) {
    expect(output).not.toContain(credential);
  }
}

function smtpServer(expectedPassword = smtpPassword) {
  return createTlsServer({ key, cert: certificate }, (socket: TLSSocket) => {
    socket.setEncoding("utf8");
    socket.on("error", () => undefined);
    socket.write("220 mock.smtp ESMTP\r\n");
    let input = "";
    socket.on("data", (chunk) => {
      input += chunk;
      while (input.includes("\r\n")) {
        const boundary = input.indexOf("\r\n");
        const line = input.slice(0, boundary);
        input = input.slice(boundary + 2);
        if (line.startsWith("EHLO ")) {
          socket.write("250-mock.smtp\r\n250 AUTH PLAIN\r\n");
        } else if (line.startsWith("AUTH PLAIN ")) {
          const supplied = Buffer.from(line.slice(11), "base64").toString();
          socket.write(
            supplied === `\0${smtpUser}\0${expectedPassword}`
              ? "235 2.7.0 authenticated\r\n"
              : "535 5.7.8 authentication failed\r\n",
          );
        } else if (line === "QUIT") {
          socket.end("221 2.0.0 bye\r\n");
        }
      }
    });
  });
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function validS3Signature(request: IncomingMessage) {
  const authorization = request.headers.authorization;
  const amzDate = request.headers["x-amz-date"];
  const payloadHash = request.headers["x-amz-content-sha256"];
  const host = request.headers.host;
  if (
    !authorization ||
    typeof amzDate !== "string" ||
    typeof payloadHash !== "string" ||
    !host ||
    request.method !== "HEAD" ||
    !/^\d{8}T\d{6}Z$/u.test(amzDate) ||
    payloadHash !== sha256("")
  ) {
    return false;
  }

  const parsed =
    /^AWS4-HMAC-SHA256 Credential=([^/\s]+)\/(\d{8})\/([^/\s]+)\/s3\/aws4_request, SignedHeaders=([^,\s]+), Signature=([a-f0-9]{64})$/u.exec(
      authorization,
    );
  if (!parsed) return false;
  const [, accessKey, date, region, signedHeaders, suppliedSignature] = parsed;
  if (
    accessKey !== s3AccessKey ||
    date !== amzDate.slice(0, 8) ||
    region !== s3Region ||
    signedHeaders !== "host;x-amz-content-sha256;x-amz-date"
  ) {
    return false;
  }

  const endpoint = new URL(request.url ?? "", `https://${host}`);
  if (endpoint.search) return false;
  const canonicalHeaders = `host:${host.trim()}\nx-amz-content-sha256:${payloadHash.trim()}\nx-amz-date:${amzDate.trim()}\n`;
  const canonicalRequest = [
    request.method,
    endpoint.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmacSha256(`AWS4${s3SecretKey}`, date);
  const regionKey = hmacSha256(dateKey, region);
  const serviceKey = hmacSha256(regionKey, "s3");
  const signingKey = hmacSha256(serviceKey, "aws4_request");
  const expectedSignature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest();
  return timingSafeEqual(
    expectedSignature,
    Buffer.from(suppliedSignature, "hex"),
  );
}

async function fixtures(options: { hangTls?: boolean } = {}) {
  const tls = createHttpsServer(
    { key, cert: certificate },
    (_request, response) => {
      if (!options.hangTls) {
        response.writeHead(200).end('{"status":"ready"}');
      }
    },
  );
  const smtp = smtpServer();
  const s3 = createHttpsServer(
    { key, cert: certificate },
    (request, response) => {
      response.writeHead(validS3Signature(request) ? 200 : 403).end();
    },
  );
  const [tlsPort, smtpPort, s3Port] = await Promise.all([
    listen(tls),
    listen(smtp),
    listen(s3),
  ]);
  const environment: ProductionProbeEnvironment = {
    SUPABASE_PUBLIC_URL: `https://localhost:${tlsPort}`,
    SMTP_HOST: "localhost",
    SMTP_PORT: String(smtpPort),
    SMTP_TLS_MODE: "implicit",
    SMTP_USER: smtpUser,
    SMTP_PASS: "generated-probe-password",
    GLOBAL_S3_BUCKET: "probe-bucket",
    GLOBAL_S3_ENDPOINT: `https://localhost:${s3Port}`,
    AWS_ACCESS_KEY_ID: s3AccessKey,
    AWS_SECRET_ACCESS_KEY: "generated-probe-secret",
    REGION: s3Region,
    PRODUCTION_PROBE_CA_FILE: certificatePath,
    PRODUCTION_PROBE_TIMEOUT_MS: "500",
  };
  return {
    environment,
    async close() {
      await Promise.all([close(tls), close(smtp), close(s3)]);
    },
  };
}

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("production dependency probes", () => {
  it("accepts trusted TLS plus authenticated SMTP and S3", async () => {
    const setup = await fixtures();
    try {
      await expect(
        probeProductionDependencies(setup.environment),
      ).resolves.toEqual({
        ok: true,
        errors: [],
      });
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).toBe(0);
      expect(cli.stdout).toContain(
        "Production dependencies are reachable and authenticated.",
      );
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`);
    } finally {
      await setup.close();
    }
  });

  it("rejects a certificate that is not valid for the endpoint hostname", async () => {
    const setup = await fixtures();
    try {
      setup.environment.SUPABASE_PUBLIC_URL =
        setup.environment.SUPABASE_PUBLIC_URL!.replace(
          "localhost",
          "127.0.0.1",
        );
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("TLS certificate validation failed.");
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.stderr).toContain("TLS certificate validation failed.");
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`);
    } finally {
      await setup.close();
    }
  });

  it("bounds a TLS endpoint timeout", async () => {
    const setup = await fixtures({ hangTls: true });
    try {
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("TLS dependency timed out.");
      expectBoundedRedacted(result.errors.join("\n"));
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.durationMs).toBeLessThan(2_000);
      expect(cli.stderr).toContain("TLS dependency timed out.");
      expect(cli.stdout).not.toContain(
        "Production dependencies are reachable and authenticated.",
      );
      expect(`${cli.stdout}${cli.stderr}`).not.toContain("localhost");
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`);
    } finally {
      await setup.close();
    }
  });

  it("requires successful SMTP authentication without exposing credentials", async () => {
    const setup = await fixtures();
    try {
      const wrongPassword = "generated-wrong-smtp-password";
      setup.environment.SMTP_PASS = wrongPassword;
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("SMTP authentication failed.");
      expectBoundedRedacted(result.errors.join("\n"), [wrongPassword]);
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.stderr).toContain("SMTP authentication failed.");
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`, [wrongPassword]);
    } finally {
      await setup.close();
    }
  });

  it("reports unreachable SMTP without exposing its hostname", async () => {
    const setup = await fixtures();
    try {
      setup.environment.SMTP_PORT = "1";
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("SMTP dependency is unreachable.");
      expectBoundedRedacted(result.errors.join("\n"));
      expect(result.errors.join("\n")).not.toContain(
        setup.environment.SMTP_HOST,
      );
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.durationMs).toBeLessThan(2_000);
      expect(cli.stderr).toContain("SMTP dependency is unreachable.");
      expect(cli.stdout).not.toContain(
        "Production dependencies are reachable and authenticated.",
      );
      expect(`${cli.stdout}${cli.stderr}`).not.toContain(
        setup.environment.SMTP_HOST,
      );
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`);
    } finally {
      await setup.close();
    }
  });

  it("rejects a correct S3 access key signed with the wrong secret", async () => {
    const setup = await fixtures();
    try {
      const wrongSecret = "generated-wrong-s3-secret";
      setup.environment.AWS_SECRET_ACCESS_KEY = wrongSecret;
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("S3 authentication failed.");
      expectBoundedRedacted(result.errors.join("\n"), [wrongSecret]);
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.stderr).toContain("S3 authentication failed.");
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`, [wrongSecret]);
    } finally {
      await setup.close();
    }
  });
});
