import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { calculateJitteredBackoff } from "../../../scripts/identity/worker/backoff.ts";
import { processAvatarCleanupBatch } from "../../../scripts/identity/worker/avatar-cleanup.ts";
import { processDeletionPurgeBatch } from "../../../scripts/identity/worker/deletion-purge.ts";
import { processMaintenancePruning } from "../../../scripts/identity/worker/pruning.ts";
import { processProjectionReconciliation } from "../../../scripts/identity/worker/reconciliation.ts";
import {
  formatDiagnosticsOutput,
  sanitizeDiagnosticText,
} from "../../../scripts/identity/worker/diagnostics.ts";
import { runIdentityWorker } from "../../../scripts/identity/worker/index.ts";
import type {
  WorkerDiagnostics,
  WorkerPorts,
} from "../../../scripts/identity/worker/types.ts";

function createMockRepository() {
  return {
    claimAvatarCleanupJob: vi.fn(async () => ({
      ok: true as const,
      value: null,
    })),
    completeAvatarCleanupJob: vi.fn(async () => ({
      ok: true as const,
      value: true,
    })),
    retryAvatarCleanupJob: vi.fn(async () => ({
      ok: true as const,
      value: true,
    })),
    claimDeletionJob: vi.fn(async () => ({ ok: true as const, value: null })),
    completeDeletionJob: vi.fn(async () => ({
      ok: true as const,
      value: true,
    })),
    retryDeletionJob: vi.fn(async () => ({ ok: true as const, value: true })),
    pruneExpiredActionTokens: vi.fn(async () => ({
      ok: true as const,
      value: 0,
    })),
    pruneExpiredRateLimitBuckets: vi.fn(async () => ({
      ok: true as const,
      value: 0,
    })),
    pruneStaleSessionAssurance: vi.fn(async () => ({
      ok: true as const,
      value: 0,
    })),
    repairAuthProjection: vi.fn(async () => ({
      ok: true as const,
      value: {
        did_repair: true,
        profile_complete: true,
        consent_complete: true,
      },
    })),
    synchronizeConfirmation: vi.fn(async () => ({
      ok: true as const,
      value: true,
    })),
  } as unknown as WorkerPorts["repository"];
}

function createMockPorts(overrides: Partial<WorkerPorts> = {}): WorkerPorts {
  return {
    repository: createMockRepository(),
    storage: {
      remove: vi.fn(async () => ({ ok: true })),
      list: vi.fn(async () => ({ ok: true, paths: [] })),
    },
    authGateway: {
      deleteUser: vi.fn(async () => ({ ok: true })),
      listUsers: vi.fn(async () => ({ ok: true, users: [] })),
    },
    now: () => new Date("2026-09-20T10:00:00.000Z"),
    ...overrides,
  };
}

describe("identity worker: backoff and retry scheduling", () => {
  it("calculates exponential delay based on attempt count", () => {
    const deadline = new Date("2026-09-25T10:00:00.000Z");
    const now = () => new Date("2026-09-20T10:00:00.000Z");

    const first = calculateJitteredBackoff(1, deadline, {
      baseDelayMs: 1000,
      jitterFactor: 0,
      now,
    });
    const second = calculateJitteredBackoff(2, deadline, {
      baseDelayMs: 1000,
      jitterFactor: 0,
      now,
    });
    const third = calculateJitteredBackoff(3, deadline, {
      baseDelayMs: 1000,
      jitterFactor: 0,
      now,
    });

    expect(first.getTime() - now().getTime()).toBe(1000);
    expect(second.getTime() - now().getTime()).toBe(2000);
    expect(third.getTime() - now().getTime()).toBe(4000);
  });

  it("caps backoff delay to maxDelayMs", () => {
    const deadline = new Date("2026-10-20T10:00:00.000Z");
    const now = () => new Date("2026-09-20T10:00:00.000Z");

    const backoff = calculateJitteredBackoff(20, deadline, {
      baseDelayMs: 1000,
      maxDelayMs: 60_000,
      jitterFactor: 0,
      now,
    });

    expect(backoff.getTime() - now().getTime()).toBe(60_000);
  });

  it("clamps backoff strictly to the deadline", () => {
    const now = () => new Date("2026-09-20T10:00:00.000Z");
    const deadline = new Date("2026-09-20T10:00:05.000Z"); // 5 seconds away

    const backoff = calculateJitteredBackoff(10, deadline, {
      baseDelayMs: 10_000, // 10s base would overshoot
      jitterFactor: 0,
      now,
    });

    expect(backoff.getTime()).toBe(deadline.getTime());
  });

  it("adds bounded positive jitter", () => {
    const deadline = new Date("2026-09-25T10:00:00.000Z");
    const now = () => new Date("2026-09-20T10:00:00.000Z");

    const delays = Array.from({ length: 10 }, () => {
      const b = calculateJitteredBackoff(2, deadline, {
        baseDelayMs: 1000,
        jitterFactor: 0.5,
        now,
      });
      return b.getTime() - now().getTime();
    });

    // Delays should be between base (2000ms) and base + 50% (3000ms)
    for (const delay of delays) {
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(3000);
    }
  });
});

describe("identity worker: avatar cleanup", () => {
  it("processes due avatar cleanup job and completes on storage success", async () => {
    const ports = createMockPorts();
    const job = {
      id: 101,
      authUserId: "user-1",
      objectKey: "profiles/00000000-0000-0000-0000-000000000001/1-abc.webp",
      attempts: 1,
      deleteBy: "2026-09-21T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimAvatarCleanupJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processAvatarCleanupBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result).toEqual({
      processed: 1,
      succeeded: 1,
      retried: 0,
      failed: 0,
    });
    expect(ports.storage.remove).toHaveBeenCalledWith("profile-avatars", [
      job.objectKey,
    ]);
    expect(ports.repository.completeAvatarCleanupJob).toHaveBeenCalledWith(101);
  });

  it("treats storage absence (not_found) as idempotent success", async () => {
    const ports = createMockPorts();
    const job = {
      id: 102,
      authUserId: "user-2",
      objectKey: "profiles/00000000-0000-0000-0000-000000000002/1-xyz.webp",
      attempts: 1,
      deleteBy: "2026-09-21T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimAvatarCleanupJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    vi.mocked(ports.storage.remove).mockResolvedValueOnce({
      ok: false,
      code: "not_found",
    });

    const result = await processAvatarCleanupBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.succeeded).toBe(1);
    expect(ports.repository.completeAvatarCleanupJob).toHaveBeenCalledWith(102);
  });

  it("schedules bounded retry on storage failure", async () => {
    const ports = createMockPorts();
    const job = {
      id: 103,
      authUserId: "user-3",
      objectKey: "profiles/00000000-0000-0000-0000-000000000003/1-err.webp",
      attempts: 1,
      deleteBy: "2026-09-21T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimAvatarCleanupJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    vi.mocked(ports.storage.remove).mockResolvedValueOnce({
      ok: false,
      code: "storage_unavailable",
    });

    const result = await processAvatarCleanupBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result).toEqual({
      processed: 1,
      succeeded: 0,
      retried: 1,
      failed: 0,
    });
    expect(ports.repository.retryAvatarCleanupJob).toHaveBeenCalledWith(
      103,
      "storage_unavailable",
      expect.any(String),
    );
  });

  it("stops batch when claim fails", async () => {
    const ports = createMockPorts();
    vi.mocked(ports.repository.claimAvatarCleanupJob).mockResolvedValueOnce({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });

    const result = await processAvatarCleanupBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.failed).toBe(1);
    expect(result.processed).toBe(0);
    expect(ports.storage.remove).not.toHaveBeenCalled();
  });

  it("respects batch size ceiling", async () => {
    const ports = createMockPorts();
    const makeJob = (id: number) => ({
      id,
      authUserId: `user-${id}`,
      objectKey: `profiles/00000000-0000-0000-0000-00000000000${id}/1.webp`,
      attempts: 1,
      deleteBy: "2026-09-21T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    });

    vi.mocked(ports.repository.claimAvatarCleanupJob)
      .mockResolvedValueOnce({ ok: true, value: makeJob(1) })
      .mockResolvedValueOnce({ ok: true, value: makeJob(2) })
      .mockResolvedValueOnce({ ok: true, value: makeJob(3) });

    const result = await processAvatarCleanupBatch(
      ports,
      "test-worker",
      2,
      300,
    );

    expect(result.processed).toBe(2);
    expect(ports.repository.claimAvatarCleanupJob).toHaveBeenCalledTimes(2);
  });
});

describe("identity worker: account deletion purge", () => {
  it("removes Storage first and Auth last during deletion", async () => {
    const ports = createMockPorts();
    const callOrder: string[] = [];

    ports.storage.list = vi.fn(async () => {
      callOrder.push("storage");
      return { ok: true, paths: [] };
    });
    ports.authGateway.deleteUser = vi.fn(async () => {
      callOrder.push("auth");
      return { ok: true };
    });

    const job = {
      authUserId: "11111111-1111-4111-8111-111111111111",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result).toEqual({
      processed: 1,
      succeeded: 1,
      retried: 0,
      failed: 0,
      deadlineAlerts: 0,
    });
    expect(callOrder).toEqual(["storage", "auth"]);
    expect(ports.repository.completeDeletionJob).toHaveBeenCalledWith(
      job.authUserId,
    );
  });

  it("retries on Storage failure and does not call Auth", async () => {
    const ports = createMockPorts();
    ports.storage.list = vi.fn(async () => ({
      ok: false,
      code: "storage_unavailable",
    }));

    const job = {
      authUserId: "22222222-2222-4222-8222-222222222222",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.retried).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(ports.authGateway.deleteUser).not.toHaveBeenCalled();
    expect(ports.repository.retryDeletionJob).toHaveBeenCalledWith(
      job.authUserId,
      "storage_unavailable",
      expect.any(String),
    );
  });

  it("treats Auth absence (not_found) as success", async () => {
    const ports = createMockPorts();
    ports.authGateway.deleteUser = vi.fn(async () => ({ ok: true }));

    const job = {
      authUserId: "33333333-3333-4333-8333-333333333333",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.succeeded).toBe(1);
    expect(ports.repository.completeDeletionJob).toHaveBeenCalledWith(
      job.authUserId,
    );
  });

  it("retries on Auth failure when Storage succeeded", async () => {
    const ports = createMockPorts();
    ports.authGateway.deleteUser = vi.fn(async () => ({
      ok: false,
      code: "auth_unavailable",
    }));

    const job = {
      authUserId: "44444444-4444-4444-8444-444444444444",
      attempts: 2,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.retried).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(ports.repository.retryDeletionJob).toHaveBeenCalledWith(
      job.authUserId,
      "auth_unavailable",
      expect.any(String),
    );
  });

  it("retries if completeDeletionJob returns false", async () => {
    const ports = createMockPorts();
    vi.mocked(ports.repository.completeDeletionJob).mockResolvedValueOnce({
      ok: true,
      value: false, // account still exists in DB
    });

    const job = {
      authUserId: "55555555-5555-4555-8555-555555555555",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.retried).toBe(1);
    expect(ports.repository.retryDeletionJob).toHaveBeenCalledWith(
      job.authUserId,
      "db_unavailable",
      expect.any(String),
    );
  });

  it("records deadline alerts when within 24 hours of purge deadline", async () => {
    const ports = createMockPorts({
      now: () => new Date("2026-10-14T12:00:00.000Z"), // 22 hours before deadline
    });

    const job = {
      authUserId: "66666666-6666-4666-8666-666666666666",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-10-14T12:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };

    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const result = await processDeletionPurgeBatch(
      ports,
      "test-worker",
      5,
      300,
    );

    expect(result.deadlineAlerts).toBe(1);
    expect(result.succeeded).toBe(1);
  });
});

describe("identity worker: maintenance pruning", () => {
  it("prunes expired action tokens, rate-limit buckets, and session assurances", async () => {
    const ports = createMockPorts();
    vi.mocked(ports.repository.pruneExpiredActionTokens).mockResolvedValueOnce({
      ok: true,
      value: 12,
    });
    vi.mocked(
      ports.repository.pruneExpiredRateLimitBuckets,
    ).mockResolvedValueOnce({
      ok: true,
      value: 45,
    });
    vi.mocked(
      ports.repository.pruneStaleSessionAssurance,
    ).mockResolvedValueOnce({
      ok: true,
      value: 3,
    });

    const result = await processMaintenancePruning(ports);

    expect(result).toEqual({
      tokensPruned: 12,
      bucketsPruned: 45,
      assurancesPruned: 3,
    });
  });

  it("handles string counts from PostgreSQL bigint returns", async () => {
    const ports = createMockPorts();
    vi.mocked(ports.repository.pruneExpiredActionTokens).mockResolvedValueOnce({
      ok: true,
      value: "99",
    });
    vi.mocked(
      ports.repository.pruneExpiredRateLimitBuckets,
    ).mockResolvedValueOnce({
      ok: true,
      value: "100",
    });
    vi.mocked(
      ports.repository.pruneStaleSessionAssurance,
    ).mockResolvedValueOnce({
      ok: true,
      value: "5",
    });

    const result = await processMaintenancePruning(ports);

    expect(result).toEqual({
      tokensPruned: 99,
      bucketsPruned: 100,
      assurancesPruned: 5,
    });
  });

  it("handles RPC failures gracefully without throwing", async () => {
    const ports = createMockPorts();
    vi.mocked(ports.repository.pruneExpiredActionTokens).mockResolvedValueOnce({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    vi.mocked(
      ports.repository.pruneExpiredRateLimitBuckets,
    ).mockResolvedValueOnce({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    vi.mocked(
      ports.repository.pruneStaleSessionAssurance,
    ).mockResolvedValueOnce({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });

    const result = await processMaintenancePruning(ports);

    expect(result).toEqual({
      tokensPruned: 0,
      bucketsPruned: 0,
      assurancesPruned: 0,
    });
  });
});

describe("identity worker: projection reconciliation", () => {
  it("iterates users and repairs projections and confirmations", async () => {
    const ports = createMockPorts();
    ports.authGateway.listUsers = vi.fn(async () => ({
      ok: true,
      users: [{ id: "user-a" }, { id: "user-b" }],
    }));

    vi.mocked(ports.repository.repairAuthProjection)
      .mockResolvedValueOnce({
        ok: true,
        value: {
          did_repair: true,
          profile_complete: true,
          consent_complete: true,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          did_repair: false,
          profile_complete: true,
          consent_complete: true,
        },
      });

    vi.mocked(ports.repository.synchronizeConfirmation)
      .mockResolvedValueOnce({ ok: true, value: true })
      .mockResolvedValueOnce({ ok: true, value: false });

    const result = await processProjectionReconciliation(ports, 10);

    expect(result).toEqual({
      checked: 2,
      repaired: 1,
      synchronized: 1,
    });
  });

  it("returns zero counts if listUsers is not supported or fails", async () => {
    const ports = createMockPorts({
      authGateway: {
        deleteUser: vi.fn(async () => ({ ok: true })),
        listUsers: undefined,
      },
    });

    const result = await processProjectionReconciliation(ports, 10);

    expect(result).toEqual({
      checked: 0,
      repaired: 0,
      synchronized: 0,
    });
  });
});

describe("identity worker: diagnostics, redaction, and orchestration", () => {
  it("redacts emails, secrets, tokens, IPs, and passwords from diagnostics", () => {
    const text =
      "Worker for user@example.test with sbp_12345678901234567890123456789012 and token eyJhbGci.eyJzdWIi.sig and IP 192.168.1.1 and password secret";
    const sanitized = sanitizeDiagnosticText(text);

    expect(sanitized).not.toContain("user@example.test");
    expect(sanitized).not.toContain("sbp_12345678901234567890123456789012");
    expect(sanitized).not.toContain("eyJhbGci");
    expect(sanitized).not.toContain("192.168.1.1");
    expect(sanitized).not.toContain("secret");
    expect(sanitized).not.toContain("password");
  });

  it("formats diagnostics with service names, counts, and status", () => {
    const diagnostics: WorkerDiagnostics = {
      workerId: "test-worker-1",
      startedAt: "2026-09-20T10:00:00.000Z",
      completedAt: "2026-09-20T10:00:01.000Z",
      durationMs: 1000,
      batchSize: 10,
      services: {
        avatarCleanup: { processed: 2, succeeded: 2, retried: 0, failed: 0 },
        deletionPurge: {
          processed: 1,
          succeeded: 1,
          retried: 0,
          failed: 0,
          deadlineAlerts: 0,
        },
        tokenExpiry: { pruned: 5 },
        bucketExpiry: { pruned: 10 },
        assurancePruning: { pruned: 1 },
        projectionReconciliation: { checked: 3, repaired: 1, synchronized: 2 },
      },
      status: "success",
      errorCodes: [],
    };

    const formatted = formatDiagnosticsOutput(diagnostics);

    expect(formatted).toContain("=== Identity Worker Run ===");
    expect(formatted).toContain("Worker ID: test-worker-1");
    expect(formatted).toContain("Status: success");
    expect(formatted).toContain("avatarCleanup: processed=2, succeeded=2");
    expect(formatted).toContain("deletionPurge: processed=1, succeeded=1");
    expect(formatted).toContain("tokenExpiry: pruned=5");
    expect(formatted).toContain("bucketExpiry: pruned=10");
    expect(formatted).toContain("assurancePruning: pruned=1");
    expect(formatted).toContain(
      "projectionReconciliation: checked=3, repaired=1, synchronized=2",
    );
  });

  it("orchestrates all five worker tasks and reports diagnostics", async () => {
    const ports = createMockPorts();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    ports.logger = logger;

    const diagnostics = await runIdentityWorker(ports, {
      workerId: "orchestrator-test",
      batchSize: 5,
    });

    expect(diagnostics.workerId).toBe("orchestrator-test");
    expect(diagnostics.status).toBe("success");
    expect(diagnostics.batchSize).toBe(5);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("=== Identity Worker Run ==="),
    );
  });

  it("reports partial_failure status when errors occur but some work succeeded", async () => {
    const ports = createMockPorts();
    // avatar claim fails
    vi.mocked(ports.repository.claimAvatarCleanupJob).mockResolvedValueOnce({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });

    // deletion succeeds
    const job = {
      authUserId: "user-del-1",
      attempts: 1,
      requestedAt: "2026-09-15T10:00:00.000Z",
      purgeDueAt: "2026-10-15T10:00:00.000Z",
      leaseUntil: "2026-09-20T10:05:00.000Z",
      state: "processing",
      workerId: "test-worker",
    };
    vi.mocked(ports.repository.claimDeletionJob)
      .mockResolvedValueOnce({ ok: true, value: job })
      .mockResolvedValueOnce({ ok: true, value: null });

    const diagnostics = await runIdentityWorker(ports, {
      workerId: "partial-test",
    });

    expect(diagnostics.status).toBe("partial_failure");
    expect(diagnostics.errorCodes).toContain("avatar_cleanup_failure");
  });
});
