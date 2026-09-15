import { createHash, createHmac } from "node:crypto";
import { request } from "node:https";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { connect, type TLSSocket } from "node:tls";
import { pathToFileURL } from "node:url";

export type ProductionProbeEnvironment = Record<string, string | undefined> & {
  SUPABASE_PUBLIC_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_TLS_MODE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  GLOBAL_S3_BUCKET?: string;
  GLOBAL_S3_ENDPOINT?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  REGION?: string;
  PRODUCTION_PROBE_CA_FILE?: string;
  PRODUCTION_PROBE_TIMEOUT_MS?: string;
};

type ProbeResult = { ok: boolean; errors: string[] };

class ProbeTimeout extends Error {}

function required(environment: ProductionProbeEnvironment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing production probe setting: ${name}`);
  return value;
}

function timeout(environment: ProductionProbeEnvironment) {
  const parsed = Number(environment.PRODUCTION_PROBE_TIMEOUT_MS ?? 5_000);
  return Number.isFinite(parsed)
    ? Math.min(30_000, Math.max(100, parsed))
    : 5_000;
}

function certificateAuthority(environment: ProductionProbeEnvironment) {
  return environment.PRODUCTION_PROBE_CA_FILE
    ? readFileSync(environment.PRODUCTION_PROBE_CA_FILE)
    : undefined;
}

function isCertificateError(error: unknown) {
  const code = (error as NodeJS.ErrnoException)?.code ?? "";
  return (
    code.includes("CERT") ||
    code.includes("TLS") ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  );
}

function httpsStatus(
  url: URL,
  options: {
    ca?: Buffer;
    headers?: Record<string, string>;
    method: "GET" | "HEAD";
    timeoutMs: number;
  },
) {
  return new Promise<number>((resolveStatus, reject) => {
    const outbound = request(
      url,
      {
        ca: options.ca,
        headers: options.headers,
        method: options.method,
        rejectUnauthorized: true,
        timeout: options.timeoutMs,
      },
      (response) => {
        response.resume();
        response.once("end", () => resolveStatus(response.statusCode ?? 0));
      },
    );
    outbound.once("timeout", () =>
      outbound.destroy(new ProbeTimeout("request timed out")),
    );
    outbound.once("error", reject);
    outbound.end();
  });
}

async function probeTls(environment: ProductionProbeEnvironment) {
  try {
    const endpoint = new URL(required(environment, "SUPABASE_PUBLIC_URL"));
    endpoint.pathname = "/health/ready";
    const status = await httpsStatus(endpoint, {
      ca: certificateAuthority(environment),
      method: "GET",
      timeoutMs: timeout(environment),
    });
    return status >= 200 && status < 300
      ? undefined
      : "TLS dependency returned an unhealthy response.";
  } catch (error) {
    if (error instanceof ProbeTimeout) return "TLS dependency timed out.";
    if (isCertificateError(error)) return "TLS certificate validation failed.";
    return "TLS dependency is unreachable.";
  }
}

function smtpReply(socket: TLSSocket, timeoutMs: number) {
  return new Promise<number>((resolveReply, reject) => {
    let contents = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new ProbeTimeout("SMTP timed out"));
    };
    const onData = (chunk: Buffer | string) => {
      contents += chunk.toString();
      const lines = contents.split("\r\n");
      const final = lines.find((line) => /^\d{3} /u.test(line));
      if (final) {
        cleanup();
        resolveReply(Number(final.slice(0, 3)));
      }
    };
    socket.setTimeout(timeoutMs);
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

function smtpConnect(environment: ProductionProbeEnvironment) {
  const host = required(environment, "SMTP_HOST");
  if (environment.SMTP_TLS_MODE !== "implicit") {
    throw new Error("Unsupported SMTP TLS mode");
  }
  return new Promise<TLSSocket>((resolveSocket, reject) => {
    const socket = connect({
      ca: certificateAuthority(environment),
      host,
      port: Number(required(environment, "SMTP_PORT")),
      rejectUnauthorized: true,
      servername: isIP(host) ? undefined : host,
      timeout: timeout(environment),
    });
    socket.once("secureConnect", () => resolveSocket(socket));
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy(new ProbeTimeout("SMTP timed out"));
    });
  });
}

async function probeSmtp(environment: ProductionProbeEnvironment) {
  let socket: TLSSocket | undefined;
  try {
    socket = await smtpConnect(environment);
    if ((await smtpReply(socket, timeout(environment))) !== 220) {
      return "SMTP dependency is unreachable.";
    }
    socket.write("EHLO campusmarkt-preflight\r\n");
    if ((await smtpReply(socket, timeout(environment))) !== 250) {
      return "SMTP dependency is unreachable.";
    }
    const identity = Buffer.from(
      `\0${required(environment, "SMTP_USER")}\0${required(environment, "SMTP_PASS")}`,
    ).toString("base64");
    socket.write(`AUTH PLAIN ${identity}\r\n`);
    if ((await smtpReply(socket, timeout(environment))) !== 235) {
      return "SMTP authentication failed.";
    }
    socket.write("QUIT\r\n");
    return undefined;
  } catch (error) {
    if (error instanceof ProbeTimeout) return "SMTP dependency timed out.";
    if (isCertificateError(error)) return "SMTP certificate validation failed.";
    return "SMTP dependency is unreachable.";
  } finally {
    socket?.destroy();
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function s3Headers(environment: ProductionProbeEnvironment, endpoint: URL) {
  const accessKey = required(environment, "AWS_ACCESS_KEY_ID");
  const secretKey = required(environment, "AWS_SECRET_ACCESS_KEY");
  const region = required(environment, "REGION");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/gu, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = hash("");
  const canonicalHeaders = `host:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "HEAD",
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
    hash(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${secretKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
}

async function probeS3(environment: ProductionProbeEnvironment) {
  try {
    const endpoint = new URL(required(environment, "GLOBAL_S3_ENDPOINT"));
    const bucket = encodeURIComponent(
      required(environment, "GLOBAL_S3_BUCKET"),
    );
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/u, "")}/${bucket}`;
    const status = await httpsStatus(endpoint, {
      ca: certificateAuthority(environment),
      headers: s3Headers(environment, endpoint),
      method: "HEAD",
      timeoutMs: timeout(environment),
    });
    if (status === 401 || status === 403) return "S3 authentication failed.";
    return status >= 200 && status < 300
      ? undefined
      : "S3 dependency is unreachable.";
  } catch (error) {
    if (error instanceof ProbeTimeout) return "S3 dependency timed out.";
    if (isCertificateError(error)) return "S3 certificate validation failed.";
    return "S3 dependency is unreachable.";
  }
}

export async function probeProductionDependencies(
  environment: ProductionProbeEnvironment,
): Promise<ProbeResult> {
  const results = await Promise.all([
    probeTls(environment),
    probeSmtp(environment),
    probeS3(environment),
  ]);
  const errors: string[] = [];
  for (const result of results) {
    if (result) errors.push(result);
  }
  return { ok: errors.length === 0, errors };
}

async function runCli() {
  const result = await probeProductionDependencies(process.env);
  if (!result.ok) {
    for (const error of result.errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    "Production dependencies are reachable and authenticated.\n",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runCli();
}
