import type { ReadinessResponse } from "@campusmarkt/types";

export function parseReadinessResponse(
  response: ReadinessResponse,
): ReadinessResponse {
  if (response.status === "ready") {
    return { status: "ready", unavailable: [] };
  }

  return {
    status: "not_ready",
    unavailable: [...response.unavailable],
  };
}

export * from "./identity/index.js";
