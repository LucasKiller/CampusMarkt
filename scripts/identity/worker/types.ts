import type { IdentityRepository } from "../../../apps/web/src/modules/identity/infrastructure/supabase/repository/index.ts";

export interface WorkerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface WorkerPorts {
  repository: IdentityRepository;
  storage: {
    remove(
      bucket: string,
      paths: string[],
    ): Promise<{ ok: boolean; code?: string }>;
    list?(
      bucket: string,
      path: string,
    ): Promise<{ ok: boolean; code?: string; paths?: string[] }>;
  };
  authGateway: {
    deleteUser(authUserId: string): Promise<{ ok: boolean; code?: string }>;
    listUsers?(options?: {
      page?: number;
      perPage?: number;
    }): Promise<{ ok: boolean; users?: Array<{ id: string }> }>;
  };
  now?: () => Date;
  logger?: WorkerLogger;
}

export interface WorkerOptions {
  workerId?: string;
  batchSize?: number;
  leaseSeconds?: number;
  once?: boolean;
}

export interface ServiceResult {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  dueBacklog?: number;
  deadlineAlerts?: number;
}

export interface WorkerDiagnostics {
  workerId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  batchSize: number;
  services: {
    avatarCleanup: ServiceResult;
    deletionPurge: ServiceResult;
    tokenExpiry: { pruned: number };
    bucketExpiry: { pruned: number };
    assurancePruning: { pruned: number };
    projectionReconciliation: {
      checked: number;
      repaired: number;
      synchronized: number;
    };
  };
  status: "success" | "partial_failure" | "failed";
  errorCodes: string[];
}
