export function calculateJitteredBackoff(
  attempts: number,
  deadline: Date,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterFactor?: number;
    now?: () => Date;
  },
): Date {
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 3600_000;
  const jitterFactor = options?.jitterFactor ?? 0.2;
  const now = options?.now ? options.now() : new Date();

  const exponent = Math.max(0, attempts - 1);
  const exponentialMs = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, exponent),
  );
  const jitterMs = Math.floor(Math.random() * (exponentialMs * jitterFactor));
  const delayMs = exponentialMs + jitterMs;

  const targetMs = now.getTime() + delayMs;
  const deadlineMs = deadline.getTime();

  return new Date(Math.min(targetMs, deadlineMs));
}
