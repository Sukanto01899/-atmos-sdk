import type { Bbox, DatasetMetadata, ListDatasetsOptions } from "../types";
import { parseBboxDegrees } from "./bbox";

type FilterOptions = Pick<
  ListDatasetsOptions,
  | "search"
  | "owner"
  | "dataType"
  | "status"
  | "isPublic"
  | "verified"
  | "metadataFrozen"
  | "bbox"
  | "altitudeMin"
  | "altitudeMax"
  | "from"
  | "to"
  | "createdAtFrom"
  | "createdAtTo"
  | "tags"
  | "visibility"
>;

function matchesBbox(ds: DatasetMetadata, bbox: Bbox): boolean {
  const lat = ds.latitude;
  const lon = ds.longitude;
  if (lat == null || lon == null) return false;
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

/**
 * Filter a local array of datasets using the same criteria as the server-side
 * `listDatasets` API — useful when datasets are already in memory and an
 * additional network round-trip would be wasteful.
 *
 * All active filters are ANDed together. Omitted / undefined filters are ignored.
 *
 * @example
 * const results = filterDatasets(items, {
 *   search: "rainfall",
 *   status: "verified",
 *   tags: ["climate", "public"],
 *   from: Date.now() / 1000 - 90 * 86400,
 * });
 */
export function filterDatasets(
  datasets: DatasetMetadata[],
  filters: FilterOptions,
): DatasetMetadata[] {
  const searchLower = filters.search?.toLowerCase().trim();
  const parsedBbox = filters.bbox != null ? parseBboxDegrees(filters.bbox) : null;

  return datasets.filter((ds) => {
    if (searchLower) {
      const haystack = [ds.name, ds.description, ds.id, ds.checksum]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }

    if (filters.owner !== undefined && ds.owner !== filters.owner) return false;
    if (filters.dataType !== undefined && ds.dataType !== filters.dataType) return false;
    if (filters.status !== undefined && ds.status !== filters.status) return false;

    if (filters.isPublic !== undefined && ds.isPublic !== filters.isPublic) return false;
    if (filters.verified !== undefined && ds.verified !== filters.verified) return false;
    if (filters.metadataFrozen !== undefined && ds.metadataFrozen !== filters.metadataFrozen) return false;

    if (filters.visibility !== undefined) {
      const expectedPublic = filters.visibility === "public";
      if (ds.isPublic !== expectedPublic) return false;
    }

    if (parsedBbox !== null && !matchesBbox(ds, parsedBbox)) return false;

    if (filters.altitudeMin !== undefined && (ds.altitudeMin ?? -Infinity) < filters.altitudeMin) return false;
    if (filters.altitudeMax !== undefined && (ds.altitudeMax ?? Infinity) > filters.altitudeMax) return false;

    if (filters.from !== undefined && (ds.collectionDate ?? 0) < filters.from) return false;
    if (filters.to !== undefined && (ds.collectionDate ?? Infinity) > filters.to) return false;

    if (filters.createdAtFrom !== undefined && (ds.createdAt ?? 0) < filters.createdAtFrom) return false;
    if (filters.createdAtTo !== undefined && (ds.createdAt ?? Infinity) > filters.createdAtTo) return false;

    if (filters.tags && filters.tags.length > 0) {
      const dsTags = ds.tags ?? [];
      if (!filters.tags.every((t) => dsTags.includes(t))) return false;
    }

    return true;
  });
}
