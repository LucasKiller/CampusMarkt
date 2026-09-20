import { calculateJitteredBackoff } from "./backoff.ts";
import type { ServiceResult, WorkerPorts } from "./types.ts";

export async function processAvatarCleanupBatch(
  ports: WorkerPorts,
  workerId: string,
  batchSize: number,
  leaseSeconds: number,
): Promise<ServiceResult> {
  const result: ServiceResult = {
    processed: 0,
    succeeded: 0,
    retried: 0,
    failed: 0,
  };

  const nowFn = ports.now ?? (() => new Date());

  for (let i = 0; i < batchSize; i++) {
    const claim = await ports.repository.claimAvatarCleanupJob(
      workerId,
      leaseSeconds,
    );

    if (!claim.ok) {
      result.failed++;
      break;
    }

    if (!claim.value) {
      // No more due jobs
      break;
    }

    const job = claim.value;
    result.processed++;

    try {
      const storageResult = await ports.storage.remove("profile-avatars", [
        job.objectKey,
      ]);

      // Absence is success
      if (
        storageResult.ok ||
        storageResult.code === "not_found" ||
        storageResult.code === "NOT_FOUND"
      ) {
        const complete = await ports.repository.completeAvatarCleanupJob(
          job.id,
        );
        if (complete.ok) {
          result.succeeded++;
        } else {
          result.failed++;
        }
      } else {
        const nextAttempt = calculateJitteredBackoff(
          job.attempts,
          new Date(job.deleteBy),
          { now: nowFn },
        );
        const retryResult = await ports.repository.retryAvatarCleanupJob(
          job.id,
          storageResult.code ?? "storage_unavailable",
          nextAttempt.toISOString(),
        );
        if (retryResult.ok) {
          result.retried++;
        } else {
          result.failed++;
        }
      }
    } catch {
      const nextAttempt = calculateJitteredBackoff(
        job.attempts,
        new Date(job.deleteBy),
        { now: nowFn },
      );
      await ports.repository.retryAvatarCleanupJob(
        job.id,
        "storage_unavailable",
        nextAttempt.toISOString(),
      );
      result.retried++;
    }
  }

  return result;
}
