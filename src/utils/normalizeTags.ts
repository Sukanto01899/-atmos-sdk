export interface NormalizeTagsOptions {
  /** Lowercase every tag. Default: `false`. */
  lowercase?: boolean;
  /**
   * Deduplicate case-insensitively, keeping the first-seen spelling.
   * Default: `true`. (Ignored when `lowercase` is `true`, which already
   * collapses case.)
   */
  caseInsensitiveDedupe?: boolean;
}

/**
 * Clean a tag list into a canonical `string[]`: trims whitespace, drops empty
 * entries, and removes duplicates. Accepts either an array or a comma-separated
 * string (e.g. raw form input), so the same helper handles UI and API shapes.
 *
 * @example
 * normalizeTags("climate, Lidar ,climate,, public");
 * // ["climate", "Lidar", "public"]
 *
 * @example
 * normalizeTags(["Climate", "climate"], { lowercase: true });
 * // ["climate"]
 */
export function normalizeTags(
  input: string | string[] | null | undefined,
  options?: NormalizeTagsOptions,
): string[] {
  if (input == null) return [];
  const lowercase = options?.lowercase ?? false;
  const ciDedupe = options?.caseInsensitiveDedupe ?? true;

  const raw = Array.isArray(input) ? input : input.split(",");

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const tag = lowercase ? trimmed.toLowerCase() : trimmed;
    const key = lowercase || ciDedupe ? tag.toLowerCase() : tag;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result;
}
