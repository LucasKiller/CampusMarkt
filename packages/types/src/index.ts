export interface LivenessResponse {
  status: "live";
}

export type ReadinessResponse =
  | { status: "ready"; unavailable: [] }
  | { status: "not_ready"; unavailable: string[] };

export * from "./identity/index.js";
