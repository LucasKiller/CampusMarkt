import { createServer as createHttpsServer } from "node:https";
import { createServer as createTlsServer, type TLSSocket } from "node:tls";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolveResult, reject) => {
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
        resolveResult({ status, stdout, stderr });
      });
    },
  );
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

async function fixtures(
  options: { hangTls?: boolean; rejectS3?: boolean } = {},
) {
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
      const authenticated = request.headers.authorization?.includes(
        `Credential=${s3AccessKey}/`,
      );
      response.writeHead(options.rejectS3 || !authenticated ? 403 : 200).end();
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
    REGION: "eu-central-1",
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
    } finally {
      await setup.close();
    }
  });

  it("requires authenticated S3 bucket reachability and redacts secrets", async () => {
    const setup = await fixtures({ rejectS3: true });
    try {
      const result = await probeProductionDependencies(setup.environment);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("S3 authentication failed.");
      expectBoundedRedacted(result.errors.join("\n"));
      const cli = await runProbeCli(setup.environment);
      expect(cli.status).not.toBe(0);
      expect(cli.stderr).toContain("S3 authentication failed.");
      expectBoundedRedacted(`${cli.stdout}${cli.stderr}`);
    } finally {
      await setup.close();
    }
  });
});
