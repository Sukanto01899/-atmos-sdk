import type { DatasetMetadata, DatasetStatus } from "../types";
import { isValidLatitudeDegrees, isValidLongitudeDegrees } from "./coords";
import { isValidUnixSeconds } from "./time";

export interface DatasetMetadataValidationError {
  /** The offending field on `DatasetMetadata`. */
  field: string;
  /** Human-readable description of the problem. */
  message: string;
}

export interface DatasetMetadataValidationResult {
  valid: boolean;
  errors: DatasetMetadataValidationError[];
}

const VALID_STATUSES: ReadonlySet<DatasetStatus> = new Set<DatasetStatus>([
  "active",
  "verified",
  "pending",
  "rejected",
  "deprecated",
]);

/**
 * Validate a `DatasetMetadata` object before publishing.
 *
 * Bundles the individual coordinate/time primitives into one pre-flight check
 * and returns every problem found (it does not stop at the first). A result is
 * `valid` only when `errors` is empty.
 *
 * Checks: required text fields are non-empty; latitude/longitude are in range;
 * `altitudeMin <= altitudeMax` and both finite; `collectionDate` (and
 * `createdAt` when present) are valid unix seconds; `status` is a known value.
 *
 * @example
 * const { valid, errors } = validateDatasetMetadata(metadata);
 * if (!valid) throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join("; "));
 */
export function validateDatasetMetadata(
  metadata: DatasetMetadata,
): DatasetMetadataValidationResult {
  const errors: DatasetMetadataValidationError[] = [];

  const requireText = (field: "name" | "description" | "dataType") => {
    const value = metadata[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push({ field, message: "is required and must be a non-empty string" });
    }
  };
  requireText("name");
  requireText("description");
  requireText("dataType");

  if (!isValidLatitudeDegrees(metadata.latitude)) {
    errors.push({ field: "latitude", message: "must be a number between -90 and 90" });
  }
  if (!isValidLongitudeDegrees(metadata.longitude)) {
    errors.push({ field: "longitude", message: "must be a number between -180 and 180" });
  }

  if (!Number.isFinite(metadata.altitudeMin)) {
    errors.push({ field: "altitudeMin", message: "must be a finite number" });
  }
  if (!Number.isFinite(metadata.altitudeMax)) {
    errors.push({ field: "altitudeMax", message: "must be a finite number" });
  }
  if (
    Number.isFinite(metadata.altitudeMin) &&
    Number.isFinite(metadata.altitudeMax) &&
    metadata.altitudeMin > metadata.altitudeMax
  ) {
    errors.push({
      field: "altitudeMax",
      message: "must be greater than or equal to altitudeMin",
    });
  }

  if (!isValidUnixSeconds(metadata.collectionDate)) {
    errors.push({ field: "collectionDate", message: "must be a non-negative integer unix timestamp (seconds)" });
  }
  if (metadata.createdAt !== undefined && !isValidUnixSeconds(metadata.createdAt)) {
    errors.push({ field: "createdAt", message: "must be a non-negative integer unix timestamp (seconds)" });
  }

  if (typeof metadata.isPublic !== "boolean") {
    errors.push({ field: "isPublic", message: "must be a boolean" });
  }

  if (metadata.status !== undefined && !VALID_STATUSES.has(metadata.status)) {
    errors.push({
      field: "status",
      message: `must be one of: ${[...VALID_STATUSES].join(", ")}`,
    });
  }

  return { valid: errors.length === 0, errors };
}
