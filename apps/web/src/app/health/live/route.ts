import type { LivenessResponse } from "@campusmarkt/types";

export function GET() {
  const response: LivenessResponse = { status: "live" };
  return Response.json(response);
}
