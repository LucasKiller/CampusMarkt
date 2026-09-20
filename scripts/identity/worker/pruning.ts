import type { WorkerPorts } from "./types.ts";

export interface PruningResult {
  tokensPruned: number;
  bucketsPruned: number;
  assurancesPruned: number;
}

export async function processMaintenancePruning(
  ports: WorkerPorts,
): Promise<PruningResult> {
  const result: PruningResult = {
    tokensPruned: 0,
    bucketsPruned: 0,
    assurancesPruned: 0,
  };

  const tokenRes = await ports.repository.pruneExpiredActionTokens();
  if (tokenRes.ok && typeof tokenRes.value === "number") {
    result.tokensPruned = tokenRes.value;
  } else if (tokenRes.ok && typeof tokenRes.value === "string") {
    result.tokensPruned = Number(tokenRes.value) || 0;
  }

  const bucketRes = await ports.repository.pruneExpiredRateLimitBuckets();
  if (bucketRes.ok && typeof bucketRes.value === "number") {
    result.bucketsPruned = bucketRes.value;
  } else if (bucketRes.ok && typeof bucketRes.value === "string") {
    result.bucketsPruned = Number(bucketRes.value) || 0;
  }

  const assuranceRes = await ports.repository.pruneStaleSessionAssurance();
  if (assuranceRes.ok && typeof assuranceRes.value === "number") {
    result.assurancesPruned = assuranceRes.value;
  } else if (assuranceRes.ok && typeof assuranceRes.value === "string") {
    result.assurancesPruned = Number(assuranceRes.value) || 0;
  }

  return result;
}
