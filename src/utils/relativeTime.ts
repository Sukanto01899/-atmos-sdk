import type { DatasetMetadata } from "../types";

export interface FormatRelativeTimeOptions {
  /** Override "now" for testing. Unix seconds. Default: `Date.now() / 1000`. */
  now?: number;
}

const MINUTE = 60;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;
const WEEK   = 7  * DAY;
const MONTH  = 30 * DAY;
const YEAR   = 365 * DAY;

/**
 * Format a unix-seconds timestamp as a human-readable relative string.
 *
 * @example
 * formatRelativeTime(Date.now() / 1000 - 90)          // "2 minutes ago"
 * formatRelativeTime(Date.now() / 1000 - 3 * 86400)   // "3 days ago"
 * formatRelativeTime(Date.now() / 1000 + 3600)         // "in 1 hour"
 */
export function formatRelativeTime(
  unixSeconds: number,
  options?: FormatRelativeTimeOptions,
): string {
  const now = options?.now ?? Date.now() / 1000;
  const diff = now - unixSeconds; // positive = past, negative = future
  const abs  = Math.abs(diff);
  const past = diff >= 0;

  let value: number;
  let unit: string;

  if (abs < 45) {
    return "just now";
  } else if (abs < HOUR) {
    value = Math.round(abs / MINUTE);
    unit  = "minute";
  } else if (abs < DAY) {
    value = Math.round(abs / HOUR);
    unit  = "hour";
  } else if (abs < WEEK) {
    value = Math.round(abs / DAY);
    unit  = "day";
  } else if (abs < MONTH) {
    value = Math.round(abs / WEEK);
    unit  = "week";
  } else if (abs < YEAR) {
    value = Math.round(abs / MONTH);
    unit  = "month";
  } else {
    value = Math.round(abs / YEAR);
    unit  = "year";
  }

  const label = `${value} ${unit}${value !== 1 ? "s" : ""}`;
  return past ? `${label} ago` : `in ${label}`;
}

/**
 * Return the human-readable age of a dataset using `collectionDate` by
 * default, falling back to `createdAt` if `collectionDate` is absent.
 *
 * @example
 * formatDatasetAge(dataset)           // "14 days ago"
 * formatDatasetAge(dataset, { field: "createdAt" }) // "2 hours ago"
 */
export function formatDatasetAge(
  dataset: DatasetMetadata,
  options?: FormatRelativeTimeOptions & { field?: "collectionDate" | "createdAt" },
): string {
  const field = options?.field ?? "collectionDate";
  const ts = dataset[field] ?? dataset.collectionDate;
  if (ts == null || !Number.isFinite(ts)) return "unknown";
  return formatRelativeTime(ts, options);
}
