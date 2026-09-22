export interface LivenessResponse {
  status: "live";
}

export type ReadinessResponse =
  | { status: "ready"; unavailable: [] }
  | { status: "not_ready"; unavailable: string[] };

export * from "./identity/index.ts";
export * from "./listings/index.ts";
