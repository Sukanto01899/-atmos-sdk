import type { Bbox, DatasetId, DatasetMetadata } from "../types";
import { isValidLatLonDegrees } from "./coords";

export interface DatasetCluster {
  /** Centroid latitude of all datasets in this cluster (degrees). */
  latitude: number;
  /** Centroid longitude of all datasets in this cluster (degrees). */
  longitude: number;
  /** Number of datasets in this cluster. */
  count: number;
  /** IDs of every dataset assigned to this cluster. */
  ids: DatasetId[];
  /** Tight bounding box enclosing all points in this cluster. */
  bbox: Bbox;
}

export interface ClusterDatasetsOptions {
  /**
   * Grid cell size in degrees. Smaller values produce more clusters with
   * finer resolution; larger values produce fewer, coarser clusters.
   *
   * Rough equivalents:
   *  - `0.1`  ≈ city-level (~11 km)
   *  - `1`    ≈ region-level (~111 km)
   *  - `10`   ≈ country-level (~1 100 km)
   *
   * Default: `10`.
   */
  cellSizeDeg?: number;
  /**
   * Skip datasets whose coordinates are missing or outside valid ranges
   * instead of throwing. Default: `true`.
   */
  skipInvalid?: boolean;
}

/**
 * Group datasets into geographic clusters using a uniform degree grid.
 *
 * Each dataset is assigned to the grid cell that contains its coordinates.
 * The returned clusters are sorted by `count` descending so the densest
 * regions come first.
 *
 * This is a pure utility — no network calls are made.
 *
 * @example
 * const datasets = await sdk.listDatasetsAll();
 * const clusters = clusterDatasets(datasets.items, { cellSizeDeg: 5 });
 * clusters.forEach(({ latitude, longitude, count, bbox }) => {
 *   console.log(`${count} datasets near (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
 * });
 */
export function clusterDatasets(
  datasets: DatasetMetadata[],
  options?: ClusterDatasetsOptions,
): DatasetCluster[] {
  const cellSize = Math.max(0.001, options?.cellSizeDeg ?? 10);
  const skipInvalid = options?.skipInvalid !== false;

  type Cell = { lats: number[]; lons: number[]; ids: DatasetId[] };
  const cells = new Map<string, Cell>();

  for (const ds of datasets) {
    const lat = ds.latitude;
    const lon = ds.longitude;

    if (!isValidLatLonDegrees(lat, lon)) {
      if (skipInvalid) continue;
    }

    const key = `${Math.floor(lat / cellSize)}:${Math.floor(lon / cellSize)}`;

    let cell = cells.get(key);
    if (!cell) {
      cell = { lats: [], lons: [], ids: [] };
      cells.set(key, cell);
    }

    cell.lats.push(lat);
    cell.lons.push(lon);
    if (ds.id != null) cell.ids.push(ds.id);
  }

  const clusters: DatasetCluster[] = [];

  for (const { lats, lons, ids } of cells.values()) {
    const n = lats.length;
    const latitude = lats.reduce((sum, v) => sum + v, 0) / n;
    const longitude = lons.reduce((sum, v) => sum + v, 0) / n;

    const bbox: Bbox = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };

    clusters.push({ latitude, longitude, count: n, ids, bbox });
  }

  clusters.sort((a, b) => b.count - a.count);

  return clusters;
}
