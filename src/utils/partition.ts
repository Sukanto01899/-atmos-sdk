import type { DatasetMetadata } from "../types";

/**
 * Split datasets into two arrays by a predicate, in a single pass: those for
 * which `predicate` returns truthy (`pass`) and the rest (`fail`).
 *
 * Order within each side matches the source array. Does not mutate the input.
 * Pairs naturally with the boolean predicates in `predicates.ts`.
 *
 * @example
 * const [verified, unverified] = partitionDatasets(items, isVerifiedDataset);
 *
 * @example
 * const [withCoords, missing] = partitionDatasets(
 *   items,
 *   (ds) => isValidLatLonDegrees(ds.latitude, ds.longitude),
 * );
 */
export function partitionDatasets(
  datasets: DatasetMetadata[],
  predicate: (dataset: DatasetMetadata, index: number) => boolean,
): [pass: DatasetMetadata[], fail: DatasetMetadata[]] {
  const pass: DatasetMetadata[] = [];
  const fail: DatasetMetadata[] = [];

  datasets.forEach((dataset, index) => {
    if (predicate(dataset, index)) {
      pass.push(dataset);
    } else {
      fail.push(dataset);
    }
  });

  return [pass, fail];
}
