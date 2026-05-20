export interface RetryOptions {
  /** Maximum number of retry attempts after the first failure (default: 3). */
  retries?: number;
  /** Base delay between attempts in milliseconds (default: 300). */
  delayMs?: number;
  /**
   * When true, doubles the delay after every failed attempt:
   * attempt 1 → delayMs, attempt 2 → delayMs×2, attempt 3 → delayMs×4, …
   * Default: false.
   */
  exponential?: boolean;
  /**
   * Called after each failed attempt before the next delay.
   * `attempt` is 1-based (1 = first retry, 2 = second retry, …).
   */
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retry an async operation up to `options.retries` times with a configurable
 * delay between attempts. Supports optional exponential backoff and a
 * per-attempt callback.
 *
 * @example
 * // Simple – 3 retries, 500 ms fixed delay
 * const data = await withRetry(fetchData, { retries: 3, delayMs: 500 });
 *
 * @example
 * // Exponential backoff: 200ms → 400ms → 800ms
 * const data = await withRetry(fetchData, {
 *   retries: 3,
 *   delayMs: 200,
 *   exponential: true,
 *   onRetry: (attempt, err) => console.warn(`Attempt ${attempt} failed:`, err),
 * });
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions | number = {},
  legacyDelayMs?: number,
): Promise<T> => {
  // Back-compat: withRetry(fn, 3, 300) still works.
  const retries = typeof options === "number" ? options : (options.retries ?? 3);
  const delayMs =
    typeof options === "number"
      ? (legacyDelayMs ?? 300)
      : (options.delayMs ?? 300);
  const exponential = typeof options === "number" ? false : (options.exponential ?? false);
  const onRetry = typeof options === "number" ? undefined : options.onRetry;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      onRetry?.(attempt + 1, error);
      const wait = exponential ? delayMs * 2 ** attempt : delayMs;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
};
