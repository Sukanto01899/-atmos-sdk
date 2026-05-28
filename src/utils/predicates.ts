import type { DatasetMetadata } from "../types";

/** Returns `true` if the dataset is verified. */
export const isVerifiedDataset = (ds: DatasetMetadata): boolean =>
  ds.verified === true || ds.status === "verified";

/** Returns `true` if the dataset is publicly accessible. */
export const isPublicDataset = (ds: DatasetMetadata): boolean =>
  ds.isPublic === true;

/** Returns `true` if the dataset has a non-empty IPFS hash. */
export const hasIpfsHash = (ds: DatasetMetadata): boolean =>
  Boolean(ds.ipfsHash?.trim());

/** Returns `true` if the dataset metadata is frozen (immutable). */
export const isFrozenDataset = (ds: DatasetMetadata): boolean =>
  ds.metadataFrozen === true;

/** Returns `true` if the dataset status is "active". */
export const isActiveDataset = (ds: DatasetMetadata): boolean =>
  ds.status === "active";

/** Returns `true` if the dataset status is "deprecated". */
export const isDeprecatedDataset = (ds: DatasetMetadata): boolean =>
  ds.status === "deprecated";

/**
 * Returns `true` if the dataset has the given tag.
 *
 * @example
 * const climate = items.filter((ds) => hasTag(ds, "climate"));
 *
 * @example
 * // Case-insensitive
 * const csv = items.filter((ds) => hasTag(ds, "CSV", { caseInsensitive: true }));
 */
export function hasTag(
  ds: DatasetMetadata,
  tag: string,
  options?: { caseInsensitive?: boolean },
): boolean {
  const tags = ds.tags ?? [];
  if (options?.caseInsensitive) {
    const needle = tag.toLowerCase();
    return tags.some((t) => t.toLowerCase() === needle);
  }
  return tags.includes(tag);
}

/**
 * Composable boolean predicates for filtering datasets.
 *
 * @example
 * const verifiedPublic = items.filter(
 *   (ds) => isVerifiedDataset(ds) && isPublicDataset(ds)
 * );
 *
 * @example
 * const withIpfs = items.filter(hasIpfsHash);
 */
