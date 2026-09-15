import type { ReadinessResponse } from "@campusmarkt/types";

const dependencyTimeoutMs = 2_000;
const dependencies = [
  { name: "auth", path: "/auth/v1/health" },
  { name: "storage", path: "/storage/v1/status" },
] as const;

export async function checkReadiness(): Promise<ReadinessResponse> {
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL;
  const healthKey = process.env.SUPABASE_HEALTH_KEY;

  if (!supabaseUrl || !healthKey) {
    return {
      status: "not_ready",
      unavailable: dependencies.map(({ name }) => name),
    };
  }

  const availability = await Promise.all(
    dependencies.map(async ({ path }) => {
      try {
        const response = await fetch(`${supabaseUrl}${path}`, {
          cache: "no-store",
          headers: { apikey: healthKey },
          signal: AbortSignal.timeout(dependencyTimeoutMs),
        });
        return response.ok;
      } catch {
        return false;
      }
    }),
  );
  const unavailable = dependencies.flatMap(({ name }, index) =>
    availability[index] ? [] : [name],
  );

  if (unavailable.length === 0) {
    return { status: "ready", unavailable: [] };
  }

  return {
    status: "not_ready",
    unavailable,
  };
}
