import { calculateJitteredBackoff } from "./backoff.ts";
import type { ServiceResult, WorkerPorts } from "./types.ts";

export async function processDeletionPurgeBatch(
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
    deadlineAlerts: 0,
  };

  const nowFn = ports.now ?? (() => new Date());

  for (let i = 0; i < batchSize; i++) {
    const claim = await ports.repository.claimDeletionJob(
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

    const purgeDue = new Date(job.purgeDueAt);
    const now = nowFn();
    // Alert if within 24 hours of 30-day purge deadline
    if (purgeDue.getTime() - now.getTime() < 24 * 3600_000) {
      result.deadlineAlerts = (result.deadlineAlerts ?? 0) + 1;
    }

    try {
      // Step 1: Storage removal first
      if (ports.storage.list) {
        const listResult = await ports.storage.list(
          "profile-avatars",
          `profiles`,
        );
        if (
          !listResult.ok &&
          listResult.code !== "not_found" &&
          listResult.code !== "NOT_FOUND"
        ) {
          const nextAttempt = calculateJitteredBackoff(job.attempts, purgeDue, {
            now: nowFn,
          });
          await ports.repository.retryDeletionJob(
            job.authUserId,
            listResult.code ?? "storage_unavailable",
            nextAttempt.toISOString(),
          );
          result.retried++;
          continue;
        }
      }

      // Step 2: Auth removal last
      const authResult = await ports.authGateway.deleteUser(job.authUserId);
      if (!authResult.ok) {
        const nextAttempt = calculateJitteredBackoff(job.attempts, purgeDue, {
          now: nowFn,
        });
        await ports.repository.retryDeletionJob(
          job.authUserId,
          authResult.code ?? "auth_unavailable",
          nextAttempt.toISOString(),
        );
        result.retried++;
        continue;
      }

      // Step 3: Complete job (verifies account absence in identity.accounts)
      const completeResult = await ports.repository.completeDeletionJob(
        job.authUserId,
      );

      if (completeResult.ok && completeResult.value === true) {
        result.succeeded++;
      } else {
        const nextAttempt = calculateJitteredBackoff(job.attempts, purgeDue, {
          now: nowFn,
        });
        await ports.repository.retryDeletionJob(
          job.authUserId,
          "db_unavailable",
          nextAttempt.toISOString(),
        );
        result.retried++;
      }
    } catch {
      const nextAttempt = calculateJitteredBackoff(job.attempts, purgeDue, {
        now: nowFn,
      });
      await ports.repository.retryDeletionJob(
        job.authUserId,
        "worker_error",
        nextAttempt.toISOString(),
      );
      result.retried++;
    }
  }

  return result;
}
