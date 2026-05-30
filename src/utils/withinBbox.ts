import type { Bbox, DatasetMetadata } from "../types";
import { isValidLatLonDegrees } from "./coords";
import { parseBboxDegrees } from "./bbox";

/**
 * Return every dataset whose coordinates fall inside `bbox` (edges inclusive).
 *
 * Accepts the same bbox shapes as `ListDatasetsOptions.bbox`: a
 * `"minLon,minLat,maxLon,maxLat"` string, a `[minLon, minLat, maxLon, maxLat]`
 * tuple, or a `Bbox` object. Datasets without valid coordinates are excluded.
 *
 * Returns an empty array when the bbox is invalid. Does not mutate the source
 * array and preserves its order.
 *
 * @example
 * const inside = datasetsWithinBbox(items, [-0.5, 51.3, 0.3, 51.7]);
 */
export function datasetsWithinBbox(
  datasets: DatasetMetadata[],
  bbox: string | [number, number, number, number] | Bbox,
): DatasetMetadata[] {
  const parsed = parseBboxDegrees(bbox);
  if (!parsed) return [];

  return datasets.filter((dataset) => {
    if (!isValidLatLonDegrees(dataset.latitude, dataset.longitude)) return false;
    return (
      dataset.longitude >= parsed.minLon &&
      dataset.longitude <= parsed.maxLon &&
      dataset.latitude >= parsed.minLat &&
      dataset.latitude <= parsed.maxLat
    );
  });
}
