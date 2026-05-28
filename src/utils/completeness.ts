import type { DatasetMetadata } from "../types";

export interface DatasetCompletenessField {
  /** Human-readable field label. */
  field: string;
  /** `true` when the field is considered populated. */
  present: boolean;
}

export interface DatasetCompletenessResult {
  /** Number of fields that are populated (0 – `total`). */
  score: number;
  /** Total number of fields checked. Always 8. */
  total: number;
  /** Per-field breakdown — useful for surfacing exactly which fields are missing. */
  fields: DatasetCompletenessField[];
}

/**
 * Evaluate how completely the core metadata fields of a dataset are filled in.
 *
 * Checks **8 fields**: name, description, dataType, collectionDate,
 * coordinates, altitude range, IPFS hash, and tags. Returns a
 * `{ score, total, fields }` result so callers can render progress indicators,
 * sort by completeness, or surface exactly which fields are missing.
 *
 * Unlike `getDatasetQualityScore` — which rewards on-chain certification
 * (verified, frozen, public) — this function measures field-level coverage and
 * is useful before a dataset is ever submitted to the registry.
 *
 * ### Fields checked
 * | Field          | Condition                                              |
 * |----------------|--------------------------------------------------------|
 * | name           | Non-empty string after trimming                        |
 * | description    | Non-empty string after trimming                        |
 * | dataType       | Non-empty string after trimming                        |
 * | collectionDate | Positive number (> 0)                                  |
 * | coordinates    | At least one of latitude / longitude is non-zero       |
 * | altitudeRange  | Both altitudeMin and altitudeMax finite, min ≤ max     |
 * | ipfsHash       | Non-empty string after trimming                        |
 * | tags           | Array with at least one entry                          |
 *
 * @example
 * const { score, total } = getDatasetCompletenessScore(metadata);
 * console.log(`${score}/${total} fields complete`);
 *
 * @example
 * // Surface missing fields to the user
 * const { fields } = getDatasetCompletenessScore(metadata);
 * const missing = fields.filter((f) => !f.present).map((f) => f.field);
 * if (missing.length) console.warn("Missing:", missing.join(", "));
 *
 * @example
 * // Sort a local array by completeness (most complete first)
 * items.sort(
 *   (a, b) =>
 *     getDatasetCompletenessScore(b).score -
 *     getDatasetCompletenessScore(a).score,
 * );
 */
export function getDatasetCompletenessScore(
  metadata: DatasetMetadata,
): DatasetCompletenessResult {
  const fields: DatasetCompletenessField[] = [
    {
      field: "name",
      present: Boolean(metadata.name?.trim()),
    },
    {
      field: "description",
      present: Boolean(metadata.description?.trim()),
    },
    {
      field: "dataType",
      present: Boolean(metadata.dataType?.trim()),
    },
    {
      field: "collectionDate",
      present: typeof metadata.collectionDate === "number" && metadata.collectionDate > 0,
    },
    {
      // Treat (0, 0) as "not set" since it is the numeric default and is
      // an implausible location for atmospheric datasets. A dataset is
      // considered located if at least one axis is non-zero.
      field: "coordinates",
      present:
        typeof metadata.latitude === "number" &&
        typeof metadata.longitude === "number" &&
        (metadata.latitude !== 0 || metadata.longitude !== 0),
    },
    {
      field: "altitudeRange",
      present:
        Number.isFinite(metadata.altitudeMin) &&
        Number.isFinite(metadata.altitudeMax) &&
        metadata.altitudeMax >= metadata.altitudeMin,
    },
    {
      field: "ipfsHash",
      present: Boolean(metadata.ipfsHash?.trim()),
    },
    {
      field: "tags",
      present: Array.isArray(metadata.tags) && metadata.tags.length > 0,
    },
  ];

  const score = fields.filter((f) => f.present).length;
  return { score, total: fields.length, fields };
}
