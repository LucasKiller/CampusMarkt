const SECOND_MS = 1_000;

export const UNIVERSITY_POLICY_SECONDS = {
  tokenTtl: 24 * 60 * 60, // 24 hours
  validity: 180 * 24 * 60 * 60, // 180 days (6 months)
} as const;

export interface SupportedUniversity {
  id: "tu-braunschweig";
  name: "TU Braunschweig";
  badgeLabel: "TU Braunschweig";
  acceptedDomains: readonly ["tu-braunschweig.de", "tu-bs.de"];
}

export const SUPPORTED_UNIVERSITIES: readonly SupportedUniversity[] = [
  {
    id: "tu-braunschweig",
    name: "TU Braunschweig",
    badgeLabel: "TU Braunschweig",
    acceptedDomains: ["tu-braunschweig.de", "tu-bs.de"],
  },
] as const;

export type SupportedUniversityId =
  (typeof SUPPORTED_UNIVERSITIES)[number]["id"];

export type UniversityVerificationStatus = "pending" | "verified" | "revoked";

export interface UniversityVerificationState {
  status: UniversityVerificationStatus | string;
  expiresAt: Date | string | null;
}

export function isUniversityVerificationActive(
  verification: UniversityVerificationState | null | undefined,
  now: Date = new Date(),
): boolean {
  if (
    !verification ||
    verification.status !== "verified" ||
    !verification.expiresAt
  ) {
    return false;
  }

  const expiry =
    typeof verification.expiresAt === "string"
      ? new Date(verification.expiresAt)
      : verification.expiresAt;

  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  return now.getTime() < expiry.getTime();
}

export function universityVerificationExpiresAt(confirmedAt: Date): Date {
  return new Date(
    confirmedAt.getTime() + UNIVERSITY_POLICY_SECONDS.validity * SECOND_MS,
  );
}

export function universityTokenExpiresAt(issuedAt: Date): Date {
  return new Date(
    issuedAt.getTime() + UNIVERSITY_POLICY_SECONDS.tokenTtl * SECOND_MS,
  );
}

export function findSupportedUniversityByDomain(
  domain: string,
): SupportedUniversity | undefined {
  const normalized = domain.trim().toLowerCase();
  return SUPPORTED_UNIVERSITIES.find((uni) =>
    (uni.acceptedDomains as readonly string[]).includes(normalized),
  );
}

export function getSupportedUniversity(
  id: string,
): SupportedUniversity | undefined {
  return SUPPORTED_UNIVERSITIES.find((uni) => uni.id === id);
}
