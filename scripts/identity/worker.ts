import { createClient } from "@supabase/supabase-js";
import { createIdentityRepository } from "../../apps/web/src/modules/identity/infrastructure/supabase/repository/index.ts";
import { runIdentityWorker } from "./worker/index.ts";
import type { WorkerPorts } from "./worker/types.ts";

function createDefaultPorts(): WorkerPorts {
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!internalUrl || !serviceRoleKey) {
    throw new Error(
      "Missing required worker environment variables: SUPABASE_INTERNAL_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(internalUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const repository = createIdentityRepository({
    user: supabase,
    service: supabase,
  });

  return {
    repository,
    storage: {
      async remove(bucket: string, paths: string[]) {
        try {
          const { error } = await supabase.storage.from(bucket).remove(paths);
          if (error) {
            return { ok: false, code: "storage_unavailable" };
          }
          return { ok: true };
        } catch {
          return { ok: false, code: "storage_unavailable" };
        }
      },
      async list(bucket: string, path: string) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .list(path);
          if (error) {
            return { ok: false, code: "storage_unavailable" };
          }
          const paths = (data ?? []).map((file) => `${path}/${file.name}`);
          return { ok: true, paths };
        } catch {
          return { ok: false, code: "storage_unavailable" };
        }
      },
    },
    authGateway: {
      async deleteUser(authUserId: string) {
        try {
          const { error } = await supabase.auth.admin.deleteUser(
            authUserId,
            false,
          );
          if (error) {
            const message = error.message?.toLowerCase() ?? "";
            if (message.includes("not found")) {
              return { ok: true };
            }
            return { ok: false, code: "auth_unavailable" };
          }
          return { ok: true };
        } catch {
          return { ok: false, code: "auth_unavailable" };
        }
      },
      async listUsers(options) {
        try {
          const { data, error } = await supabase.auth.admin.listUsers({
            page: options?.page ?? 1,
            perPage: options?.perPage ?? 10,
          });
          if (error) {
            return { ok: false };
          }
          const users = (data?.users ?? []).map((u) => ({ id: u.id }));
          return { ok: true, users };
        } catch {
          return { ok: false };
        }
      },
    },
    logger: {
      info: (msg) => console.log(msg),
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes("--once");

  const ports = createDefaultPorts();
  const diagnostics = await runIdentityWorker(ports, { once });

  if (diagnostics.status === "failed") {
    process.exit(1);
  }
}

if (
  process.argv[1]?.endsWith("worker.ts") ||
  process.argv[1]?.endsWith("worker.js")
) {
  main().catch((error) => {
    console.error(
      "Worker fatal error:",
      error instanceof Error ? error.message : "unknown",
    );
    process.exit(1);
  });
}
