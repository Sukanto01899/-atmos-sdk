import type {
  DatasetMetadata,
  DatasetStatus,
  DatasetsGeoJsonFeature,
  DatasetsGeoJsonFeatureCollection,
} from "../types";

export interface FromGeoJsonOptions {
  /** Default value for `isPublic` when the property is absent. Default: `true`. */
  defaultIsPublic?: boolean;
  /** Default value for `dataType` when the property is absent. */
  defaultDataType?: string;
  /**
   * Default `collectionDate` (unix seconds) when the property is absent.
   * Default: current time at the moment of the call.
   */
  defaultCollectionDate?: number;
}

/**
 * Convert a GeoJSON Feature back into a partial `DatasetMetadata` object.
 *
 * This is the inverse of `sdk.getDatasetGeoJsonFeature()`. Coordinates map
 * directly to `latitude` / `longitude`; all known properties are mapped by
 * name, with snake_case aliases supported.
 *
 * Fields that cannot be inferred from the feature are omitted from the
 * returned object so callers can fill them in before publishing.
 *
 * @example
 * const partial = fromGeoJsonFeature(feature);
 * await sdk.publish({ data: file, metadata: { name: "My dataset", ...partial } });
 */
export function fromGeoJsonFeature(
  feature: DatasetsGeoJsonFeature,
  options?: FromGeoJsonOptions,
): Partial<DatasetMetadata> {
  const [longitude, latitude] = feature.geometry.coordinates;
  const p: Record<string, unknown> = feature.properties ?? {};

  const result: Partial<DatasetMetadata> = { longitude, latitude };

  // id (from the GeoJSON Feature id field)
  if (feature.id !== undefined && feature.id !== null) {
    result.id = String(feature.id);
  }

  // name
  if (typeof p["name"] === "string" && p["name"]) {
    result.name = p["name"];
  }

  // description
  if (typeof p["description"] === "string") {
    result.description = p["description"];
  }

  // dataType — also accept snake_case and generic "type"
  const rawDataType = p["dataType"] ?? p["data_type"] ?? p["type"] ?? options?.defaultDataType;
  if (typeof rawDataType === "string" && rawDataType) {
    result.dataType = rawDataType;
  }

  // isPublic
  if (typeof p["isPublic"] === "boolean") {
    result.isPublic = p["isPublic"];
  } else if (typeof p["is_public"] === "boolean") {
    result.isPublic = p["is_public"];
  } else {
    result.isPublic = options?.defaultIsPublic ?? true;
  }

  // status
  if (typeof p["status"] === "string" && p["status"]) {
    result.status = p["status"] as DatasetStatus;
  }

  // verified
  if (typeof p["verified"] === "boolean") {
    result.verified = p["verified"];
  }

  // metadataFrozen
  if (typeof p["metadataFrozen"] === "boolean") {
    result.metadataFrozen = p["metadataFrozen"];
  } else if (typeof p["metadata_frozen"] === "boolean") {
    result.metadataFrozen = p["metadata_frozen"];
  }

  // owner
  if (typeof p["owner"] === "string" && p["owner"]) {
    result.owner = p["owner"];
  }

  // ipfsHash — also accept snake_case and bare "cid"
  const rawIpfs = p["ipfsHash"] ?? p["ipfs_hash"] ?? p["cid"];
  if (typeof rawIpfs === "string" && rawIpfs) {
    result.ipfsHash = rawIpfs;
  }

  // tags — accept array or comma-separated string
  if (Array.isArray(p["tags"])) {
    result.tags = (p["tags"] as unknown[]).filter(
      (t): t is string => typeof t === "string",
    );
  } else if (typeof p["tags"] === "string" && p["tags"]) {
    result.tags = p["tags"]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // collectionDate — accept unix seconds (number) or ISO string
  const rawDate = p["collectionDate"] ?? p["collection_date"] ?? p["date"];
  if (typeof rawDate === "number" && rawDate > 0) {
    result.collectionDate = rawDate;
  } else if (typeof rawDate === "string" && rawDate) {
    const ms = Date.parse(rawDate);
    if (!isNaN(ms)) result.collectionDate = Math.floor(ms / 1000);
  }
  if (result.collectionDate === undefined) {
    result.collectionDate =
      options?.defaultCollectionDate ?? Math.floor(Date.now() / 1000);
  }

  // altitudeMin / altitudeMax — default 0 when absent (required by DatasetMetadata)
  const rawAltMin = p["altitudeMin"] ?? p["altitude_min"];
  result.altitudeMin = typeof rawAltMin === "number" ? rawAltMin : 0;

  const rawAltMax = p["altitudeMax"] ?? p["altitude_max"];
  result.altitudeMax = typeof rawAltMax === "number" ? rawAltMax : 0;

  // mimeType
  const rawMime = p["mimeType"] ?? p["mime_type"];
  if (typeof rawMime === "string" && rawMime) {
    result.mimeType = rawMime;
  }

  // sizeBytes
  const rawSize = p["sizeBytes"] ?? p["size_bytes"] ?? p["size"];
  if (typeof rawSize === "number" && rawSize >= 0) {
    result.sizeBytes = rawSize;
  }

  // checksum
  if (typeof p["checksum"] === "string" && p["checksum"]) {
    result.checksum = p["checksum"];
  }

  return result;
}

/**
 * Convert every feature in a GeoJSON FeatureCollection into partial metadata
 * objects. Preserves order.
 *
 * @example
 * const partials = fromGeoJsonFeatureCollection(collection);
 * console.log(partials.length, "datasets ready to review");
 */
export function fromGeoJsonFeatureCollection(
  collection: DatasetsGeoJsonFeatureCollection,
  options?: FromGeoJsonOptions,
): Partial<DatasetMetadata>[] {
  return collection.features.map((f) => fromGeoJsonFeature(f, options));
}
