export class SelfReportError extends Error {
  readonly code = "CANNOT_REPORT_SELF";

  constructor(message = "Users cannot report their own account or listing.") {
    super(message);
    this.name = "SelfReportError";
  }
}

export class SelfBlockError extends Error {
  readonly code = "CANNOT_BLOCK_SELF";

  constructor(message = "Users cannot block themselves.") {
    super(message);
    this.name = "SelfBlockError";
  }
}

export class DuplicatePendingReportError extends Error {
  readonly code = "REPORT_ALREADY_PENDING";

  constructor(message = "A pending report already exists for this target.") {
    super(message);
    this.name = "DuplicatePendingReportError";
  }
}

export class UserBlockedInteractionError extends Error {
  readonly code = "USER_BLOCKED";

  constructor(message = "Action forbidden due to an active user block.") {
    super(message);
    this.name = "UserBlockedInteractionError";
  }
}

export function canReport(reporterId: string, targetId: string): boolean {
  if (!reporterId || !targetId) {
    return false;
  }
  return reporterId.trim().toLowerCase() !== targetId.trim().toLowerCase();
}

export function assertCanReport(reporterId: string, targetId: string): void {
  if (!reporterId || !targetId) {
    throw new Error("Reporter ID and Target ID must be non-empty strings.");
  }
  if (!canReport(reporterId, targetId)) {
    throw new SelfReportError();
  }
}

export function canBlock(blockerId: string, blockedId: string): boolean {
  if (!blockerId || !blockedId) {
    return false;
  }
  return blockerId.trim().toLowerCase() !== blockedId.trim().toLowerCase();
}

export function assertCanBlock(blockerId: string, blockedId: string): void {
  if (!blockerId || !blockedId) {
    throw new Error("Blocker ID and Blocked ID must be non-empty strings.");
  }
  if (!canBlock(blockerId, blockedId)) {
    throw new SelfBlockError();
  }
}
