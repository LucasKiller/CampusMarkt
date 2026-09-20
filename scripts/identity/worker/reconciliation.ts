import type { WorkerPorts } from "./types.ts";

export interface ReconciliationResult {
  checked: number;
  repaired: number;
  synchronized: number;
}

export async function processProjectionReconciliation(
  ports: WorkerPorts,
  batchSize: number,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    checked: 0,
    repaired: 0,
    synchronized: 0,
  };

  if (!ports.authGateway.listUsers) {
    return result;
  }

  const list = await ports.authGateway.listUsers({
    page: 1,
    perPage: batchSize,
  });

  if (!list.ok || !list.users) {
    return result;
  }

  for (const user of list.users) {
    result.checked++;

    const repairRes = await ports.repository.repairAuthProjection(user.id);
    if (
      repairRes.ok &&
      typeof repairRes.value === "object" &&
      repairRes.value !== null
    ) {
      const repairVal = repairRes.value as {
        did_repair?: boolean;
        repaired?: boolean;
      };
      if (repairVal.did_repair || repairVal.repaired) {
        result.repaired++;
      }
    }

    const syncRes = await ports.repository.synchronizeConfirmation(user.id);
    if (syncRes.ok && syncRes.value === true) {
      result.synchronized++;
    }
  }

  return result;
}
