import type {
  DatasetMetadata,
  DatasetsGeoJsonFeature,
  DatasetsGeoJsonFeatureCollection,
} from "../types";

export interface ToGeoJsonOptions {
  /** Include a `generatedAt` ISO timestamp on the collection. Default: `true`. */
  includeGeneratedAt?: boolean;
  /** Extra top-level properties merged into the FeatureCollection. */
  meta?: Record<string, unknown>;
}

/**
 * Convert an array of DatasetMetadata objects into a GeoJSON FeatureCollection.
 *
 * This is the inverse of `fromGeoJsonFeatureCollection`. The resulting object
 * is valid GeoJSON and can be saved to a `.geojson` file or consumed by any
 * mapping library (Leaflet, Mapbox, QGIS, etc.).
 *
 * @example
 * const geojson = toGeoJson(items);
 * fs.writeFileSync("datasets.geojson", JSON.stringify(geojson, null, 2));
 *
 * @example
 * // With extra metadata on the collection
 * const geojson = toGeoJson(items, { meta: { source: "atmos-registry" } });
 */
export function toGeoJson(
  datasets: DatasetMetadata[],
  options?: ToGeoJsonOptions,
): DatasetsGeoJsonFeatureCollection {
  const features: DatasetsGeoJsonFeature[] = datasets.map((ds) => ({
    type: "Feature",
    id: ds.id ?? "",
    geometry: {
      type: "Point",
      coordinates: [ds.longitude, ds.latitude],
    },
    properties: {
      name: ds.name,
      description: ds.description,
      dataType: ds.dataType,
      tags: ds.tags,
      status: ds.status,
      owner: ds.owner,
      isPublic: ds.isPublic,
      verified: ds.verified,
      metadataFrozen: ds.metadataFrozen,
      collectionDate: ds.collectionDate,
      createdAt: ds.createdAt,
      altitudeMin: ds.altitudeMin,
      altitudeMax: ds.altitudeMax,
      ipfsHash: ds.ipfsHash,
      checksum: ds.checksum,
      sizeBytes: ds.sizeBytes,
      mimeType: ds.mimeType,
    },
  }));

  return {
    type: "FeatureCollection",
    ...(options?.includeGeneratedAt !== false
      ? { generatedAt: new Date().toISOString() }
      : {}),
    totalVisible: datasets.length,
    features,
    ...options?.meta,
  };
}
