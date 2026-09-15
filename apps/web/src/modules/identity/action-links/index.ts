import "server-only";

import { Buffer } from "node:buffer";

type Purpose = "email_confirmation" | "password_recovery";
type PortResult = { ok: boolean; value?: unknown };

type ActionTokenRepository = {
  issueActionToken(input: {
    authUserId: string;
    purpose: Purpose;
    tokenHash: string;
  }): Promise<PortResult>;
  invalidateActionToken(input: {
    purpose: Purpose;
    tokenHash: string;
  }): Promise<PortResult>;
  stageActionToken(input: {
    purpose: Purpose;
    tokenHash: string;
  }): Promise<PortResult>;
};

type Mail = {
  recipient: string;
  subject: string;
  text: string;
  url: string;
};

type Mailer = { send(mail: Mail): Promise<{ ok: boolean }> };

type ActionLinkDependencies = {
  repository: ActionTokenRepository;
  mailer: Mailer;
  origin: string;
  random?: (length: number) => Uint8Array;
  digest?: (value: Uint8Array) => Promise<Uint8Array>;
  production?: boolean;
};

const PURPOSE = {
  email_confirmation: {
    actionPath: "/auth/action/email_confirmation",
    destination: "/auth/confirm",
    subject: "Confirm your CampusMarkt account",
    text: "This confirmation link expires in 24 hours.",
  },
  password_recovery: {
    actionPath: "/auth/action/password_recovery",
    destination: "/reset-password",
    subject: "Reset your CampusMarkt password",
    text: "This recovery link expires in 30 minutes.",
  },
} as const;

function randomBytes(length: number) {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

async function sha256(value: Uint8Array) {
  const input = new Uint8Array(value.byteLength);
  input.set(value);
  return new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", input.buffer),
  );
}

function postgresBytea(value: Uint8Array) {
  return `\\x${Buffer.from(value).toString("hex")}`;
}

export function createActionLinkService({
  repository,
  mailer,
  origin,
  random = randomBytes,
  digest = sha256,
  production = process.env.NODE_ENV === "production",
}: ActionLinkDependencies) {
  async function tokenHash(rawToken: string) {
    return postgresBytea(await digest(new TextEncoder().encode(rawToken)));
  }

  return {
    async issue(input: {
      authUserId: string;
      recipient: string;
      purpose: Purpose;
    }): Promise<{ status: "accepted" | "unavailable" }> {
      const definition = PURPOSE[input.purpose];
      let rawToken: string;
      let hash: string;

      try {
        rawToken = Buffer.from(random(32)).toString("base64url");
        hash = postgresBytea(await digest(new TextEncoder().encode(rawToken)));
      } catch {
        return { status: "unavailable" };
      }

      try {
        const issued = await repository.issueActionToken({
          authUserId: input.authUserId,
          purpose: input.purpose,
          tokenHash: hash,
        });
        if (!issued.ok) return { status: "unavailable" };

        const delivered = await mailer.send({
          recipient: input.recipient,
          subject: definition.subject,
          text: definition.text,
          url: `${origin}${definition.actionPath}?token=${rawToken}`,
        });
        if (delivered.ok) return { status: "accepted" };
      } catch {
        // Delivery failures are enumeration-sensitive and compensated below.
      }

      try {
        await repository.invalidateActionToken({
          purpose: input.purpose,
          tokenHash: hash,
        });
      } catch {
        // The bounded public result remains identical; audit owns diagnostics.
      }
      return { status: "accepted" };
    },

    async stage(rawToken: string, purpose: Purpose) {
      const definition = PURPOSE[purpose];
      const invalid = {
        status: "invalid_link" as const,
        redirectTo: definition.destination,
        headers: { "Referrer-Policy": "no-referrer" } as const,
      };

      try {
        const staged = await repository.stageActionToken({
          purpose,
          tokenHash: await tokenHash(rawToken),
        });
        if (
          !staged.ok ||
          typeof staged.value !== "object" ||
          staged.value === null ||
          !("valid" in staged.value) ||
          staged.value.valid !== true
        ) {
          return invalid;
        }
      } catch {
        return invalid;
      }

      return {
        status: "staged" as const,
        redirectTo: definition.destination,
        cookie: {
          name: `campusmarkt-action-${purpose}`,
          value: rawToken,
          options: {
            httpOnly: true,
            maxAge: 300,
            path: "/",
            sameSite: "strict" as const,
            secure: production,
          },
        },
        headers: { "Referrer-Policy": "no-referrer" } as const,
      };
    },
  };
}

type SmtpTransport = {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

export function createSmtpMailer(transport: SmtpTransport, from: string) {
  return {
    async send(mail: Mail) {
      try {
        await transport.sendMail({
          from,
          to: mail.recipient,
          subject: mail.subject,
          text: `${mail.text}\n\n${mail.url}`,
        });
        return { ok: true as const };
      } catch {
        return { ok: false as const, code: "DELIVERY_FAILED" as const };
      }
    },
  };
}
