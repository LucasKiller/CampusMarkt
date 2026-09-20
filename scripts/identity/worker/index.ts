import { processAvatarCleanupBatch } from "./avatar-cleanup.ts";
import { processDeletionPurgeBatch } from "./deletion-purge.ts";
import { formatDiagnosticsOutput } from "./diagnostics.ts";
import { processMaintenancePruning } from "./pruning.ts";
import { processProjectionReconciliation } from "./reconciliation.ts";
import type { WorkerDiagnostics, WorkerOptions, WorkerPorts } from "./types.ts";

export { calculateJitteredBackoff } from "./backoff.ts";
export { formatDiagnosticsOutput } from "./diagnostics.ts";
export * from "./types.ts";

export async function runIdentityWorker(
  ports: WorkerPorts,
  options: WorkerOptions = {},
): Promise<WorkerDiagnostics> {
  const workerId =
    options.workerId ??
    process.env.IDENTITY_WORKER_ID ??
    `identity-worker-${process.pid}`;
  const batchSize =
    options.batchSize ?? (Number(process.env.IDENTITY_WORKER_BATCH_SIZE) || 10);
  const leaseSeconds = options.leaseSeconds ?? 300;

  const nowFn = ports.now ?? (() => new Date());
  const startTime = nowFn();
  const startedAt = startTime.toISOString();
  const errorCodes: string[] = [];

  // 1. Avatar cleanup
  const avatarCleanup = await processAvatarCleanupBatch(
    ports,
    workerId,
    batchSize,
    leaseSeconds,
  );
  if (avatarCleanup.failed > 0) {
    errorCodes.push("avatar_cleanup_failure");
  }

  // 2. Deletion purge
  const deletionPurge = await processDeletionPurgeBatch(
    ports,
    workerId,
    batchSize,
    leaseSeconds,
  );
  if (deletionPurge.failed > 0) {
    errorCodes.push("deletion_purge_failure");
  }

  // 3. Maintenance pruning
  const pruning = await processMaintenancePruning(ports);

  // 4. Projection reconciliation
  const reconciliation = await processProjectionReconciliation(
    ports,
    batchSize,
  );

  const endTime = nowFn();
  const completedAt = endTime.toISOString();
  const durationMs = endTime.getTime() - startTime.getTime();

  let status: WorkerDiagnostics["status"] = "success";
  if (errorCodes.length > 0) {
    status =
      avatarCleanup.succeeded > 0 || deletionPurge.succeeded > 0
        ? "partial_failure"
        : "failed";
  }

  const diagnostics: WorkerDiagnostics = {
    workerId,
    startedAt,
    completedAt,
    durationMs,
    batchSize,
    services: {
      avatarCleanup,
      deletionPurge,
      tokenExpiry: { pruned: pruning.tokensPruned },
      bucketExpiry: { pruned: pruning.bucketsPruned },
      assurancePruning: { pruned: pruning.assurancesPruned },
      projectionReconciliation: reconciliation,
    },
    status,
    errorCodes,
  };

  const output = formatDiagnosticsOutput(diagnostics);
  if (ports.logger) {
    ports.logger.info(output);
  }

  return diagnostics;
}
