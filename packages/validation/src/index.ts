export const VALIDATION_BOUNDARY = "validation" as const;

export type ValidationBoundary = typeof VALIDATION_BOUNDARY;

export function isValidationBoundary(
  value: unknown,
): value is ValidationBoundary {
  return value === VALIDATION_BOUNDARY;
}

export * from "./identity/account/index.js";
export * from "./identity/security/index.js";
