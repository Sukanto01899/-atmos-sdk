import type { DatasetMetadata } from "../types";

/** A signal used to decide whether two datasets are likely the same. */
export type DuplicateSignal = "name" | "coordinates" | "ipfsHash";

export interface FindDuplicatesOptions {
  /**
   * Which signals must all match for two datasets to be considered duplicates.
   * Defaults to all three (`name` + `coordinates` + `ipfsHash`).
   */
  by?: DuplicateSignal[];
  /**
   * Decimal places used when comparing `latitude`/`longitude`. A larger value
   * is stricter. Default: `4` (~11 m at the equator).
   */
  coordinatePrecision?: number;
}

export interface DuplicateGroup {
  /** The shared composite key the group matched on. */
  key: string;
  /** Two or more datasets sharing that key, in source order. */
  datasets: DatasetMetadata[];
}

const DEFAULT_SIGNALS: DuplicateSignal[] = ["name", "coordinates", "ipfsHash"];

const normalizeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Build the part of a dataset's composite key for one signal, or `null` when
 * the dataset lacks the data needed to match on that signal (and therefore
 * cannot be confirmed as a duplicate).
 */
const signalPart = (
  dataset: DatasetMetadata,
  signal: DuplicateSignal,
  coordinatePrecision: number,
): string | null => {
  if (signal === "name") {
    const name = normalizeName(dataset.name ?? "");
    return name ? `name:${name}` : null;
  }
  if (signal === "ipfsHash") {
    const hash = String(dataset.ipfsHash ?? "").trim().toLowerCase();
    return hash ? `ipfs:${hash}` : null;
  }
  // coordinates
  const { latitude, longitude } = dataset;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `geo:${latitude.toFixed(coordinatePrecision)},${longitude.toFixed(coordinatePrecision)}`;
};

/**
 * Find groups of datasets that are likely duplicates of one another.
 *
 * Unlike `deduplicateDatasets` (which drops repeats by a single exact key),
 * this *reports* suspected duplicates by matching on a composite of fuzzy
 * signals — normalized name, rounded coordinates, and IPFS hash — which is
 * useful for surfacing accidental re-registrations in an open registry.
 *
 * Datasets missing any selected signal are skipped, since they cannot be
 * confidently matched. Only groups of two or more are returned, in the order
 * their first member appears in the input. The input is not mutated.
 *
 * @example
 * // Default: same name AND same coordinates AND same IPFS hash
 * const dupes = findDuplicateDatasets(items);
 *
 * @example
 * // Looser: flag anything sharing a name and location
 * const dupes = findDuplicateDatasets(items, { by: ["name", "coordinates"] });
 */
export function findDuplicateDatasets(
  datasets: DatasetMetadata[],
  options?: FindDuplicatesOptions,
): DuplicateGroup[] {
  const signals = options?.by ?? DEFAULT_SIGNALS;
  const coordinatePrecision = options?.coordinatePrecision ?? 4;

  if (signals.length === 0) return [];

  const groups = new Map<string, DatasetMetadata[]>();

  for (const dataset of datasets) {
    const parts: string[] = [];
    let usable = true;
    for (const signal of signals) {
      const part = signalPart(dataset, signal, coordinatePrecision);
      if (part === null) {
        usable = false;
        break;
      }
      parts.push(part);
    }
    if (!usable) continue;

    const key = parts.join("|");
    const existing = groups.get(key);
    if (existing) existing.push(dataset);
    else groups.set(key, [dataset]);
  }

  const result: DuplicateGroup[] = [];
  for (const [key, members] of groups) {
    if (members.length > 1) result.push({ key, datasets: members });
  }
  return result;
}
