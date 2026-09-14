import type { ReadinessResponse } from "@campusmarkt/types";

const dependencyTimeoutMs = 2_000;

export async function checkReadiness(): Promise<ReadinessResponse> {
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL;
  const healthKey = process.env.SUPABASE_HEALTH_KEY;

  if (!supabaseUrl || !healthKey) {
    return { status: "not_ready", unavailable: ["supabase"] };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      cache: "no-store",
      headers: { apikey: healthKey },
      signal: AbortSignal.timeout(dependencyTimeoutMs),
    });

    if (response.ok) {
      return { status: "ready", unavailable: [] };
    }
  } catch {
    // The bounded diagnostic is the dependency name, never credentials or URLs.
  }

  return { status: "not_ready", unavailable: ["supabase"] };
}
