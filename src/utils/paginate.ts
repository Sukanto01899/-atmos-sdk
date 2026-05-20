import type { DatasetMetadata, PaginateOptions, PaginateResult } from "../types";

/**
 * Slice a local dataset array into a single page and return pagination metadata.
 *
 * Useful when all datasets are already in memory and you need to present them
 * one page at a time in a UI without an extra network round-trip.
 *
 * @example
 * const page = paginateDatasets(sortedItems, { page: 2, pageSize: 20 });
 * console.log(page.items);       // 20 datasets for page 2
 * console.log(page.totalPages);  // e.g. 5
 * console.log(page.hasNext);     // true
 */
export function paginateDatasets(
  datasets: DatasetMetadata[],
  options: PaginateOptions,
): PaginateResult<DatasetMetadata> {
  const pageSize = Math.max(1, Math.floor(options.pageSize));
  const total = datasets.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(options.page)), totalPages);

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    items: datasets.slice(start, end),
    total,
    page,
    pageSize,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
