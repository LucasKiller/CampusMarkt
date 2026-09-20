import type { WorkerDiagnostics } from "./types.ts";

const PROHIBITED_PATTERNS = [
  /@/u, // email
  /sbp_[a-zA-Z0-9_-]+/u, // secret key
  /ey[a-zA-Z0-9_-]+\.ey[a-zA-Z0-9_-]+/u, // jwt token
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/u, // ipv4
  /secret/iu,
  /password/iu,
];

export function sanitizeDiagnosticText(text: string): string {
  let sanitized = text;
  for (const pattern of PROHIBITED_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

export function formatDiagnosticsOutput(
  diagnostics: WorkerDiagnostics,
): string {
  const lines: string[] = [
    `=== Identity Worker Run ===`,
    `Worker ID: ${diagnostics.workerId}`,
    `Status: ${diagnostics.status}`,
    `Duration: ${diagnostics.durationMs}ms`,
    `Batch Size: ${diagnostics.batchSize}`,
    `Services:`,
    `  - avatarCleanup: processed=${diagnostics.services.avatarCleanup.processed}, succeeded=${diagnostics.services.avatarCleanup.succeeded}, retried=${diagnostics.services.avatarCleanup.retried}, failed=${diagnostics.services.avatarCleanup.failed}`,
    `  - deletionPurge: processed=${diagnostics.services.deletionPurge.processed}, succeeded=${diagnostics.services.deletionPurge.succeeded}, retried=${diagnostics.services.deletionPurge.retried}, failed=${diagnostics.services.deletionPurge.failed}, deadlineAlerts=${diagnostics.services.deletionPurge.deadlineAlerts ?? 0}`,
    `  - tokenExpiry: pruned=${diagnostics.services.tokenExpiry.pruned}`,
    `  - bucketExpiry: pruned=${diagnostics.services.bucketExpiry.pruned}`,
    `  - assurancePruning: pruned=${diagnostics.services.assurancePruning.pruned}`,
    `  - projectionReconciliation: checked=${diagnostics.services.projectionReconciliation.checked}, repaired=${diagnostics.services.projectionReconciliation.repaired}, synchronized=${diagnostics.services.projectionReconciliation.synchronized}`,
  ];

  if (diagnostics.errorCodes.length > 0) {
    lines.push(`Errors: ${diagnostics.errorCodes.join(", ")}`);
  }

  const raw = lines.join("\n");
  return sanitizeDiagnosticText(raw);
}
