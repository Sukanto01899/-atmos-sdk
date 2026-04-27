import type { DatasetMetadata } from "../types";

export type SlugifyOptions = {
  separator?: string;
  lower?: boolean;
  maxLength?: number;
};

const clampMaxLength = (value: number) => Math.min(120, Math.max(1, Math.round(value)));

export const slugify = (input: string, options?: SlugifyOptions): string | null => {
  const separator = options?.separator ?? "-";
  const lower = options?.lower ?? true;

  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const cleaned = (lower ? normalized.toLowerCase() : normalized)
    .replace(/[^a-z0-9]+/gi, separator)
    .replace(new RegExp(`${escapeRegExp(separator)}+`, "g"), separator)
    .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, "g"), "");

  if (!cleaned) return null;

  if (typeof options?.maxLength === "number" && Number.isFinite(options.maxLength)) {
    const maxLength = clampMaxLength(options.maxLength);
    if (cleaned.length <= maxLength) return cleaned;
    const truncated = cleaned.slice(0, maxLength).replace(new RegExp(`${escapeRegExp(separator)}$`, "g"), "");
    return truncated || null;
  }

  return cleaned;
};

export type DatasetSlugOptions = SlugifyOptions & { fallback?: "id" | "name" };

export const toDatasetSlug = (metadata: DatasetMetadata, options?: DatasetSlugOptions): string | null => {
  const fallback = options?.fallback ?? "id";
  const fromName = slugify(metadata.name ?? "", options);
  if (fromName) return fromName;

  if (fallback === "name") return null;
  const id = String(metadata.id ?? "").trim();
  return id || null;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
