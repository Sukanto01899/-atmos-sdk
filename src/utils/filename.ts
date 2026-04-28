import type { DatasetMetadata } from "../types";
import { slugify } from "./slug";

export type SanitizeFilenameOptions = {
  replacement?: string;
  maxLength?: number;
  lower?: boolean;
};

const clampMaxLength = (value: number) => Math.min(240, Math.max(1, Math.round(value)));

// Removes characters disallowed on Windows/macOS/Linux filesystems, plus control chars.
const INVALID_CHARS_RE = /[<>:"/\\|?*\u0000-\u001F]/g;

export const sanitizeFilename = (input: string, options?: SanitizeFilenameOptions): string | null => {
  const replacement = options?.replacement ?? "-";
  const lower = options?.lower ?? false;

  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;

  const cleaned = trimmed
    .replace(INVALID_CHARS_RE, replacement)
    .replace(/\s+/g, " ")
    .trim();

  const normalized = lower ? cleaned.toLowerCase() : cleaned;
  const withoutTrailingDotsOrSpaces = normalized.replace(/[ .]+$/g, "");
  if (!withoutTrailingDotsOrSpaces) return null;

  const maxLength =
    typeof options?.maxLength === "number" && Number.isFinite(options.maxLength)
      ? clampMaxLength(options.maxLength)
      : undefined;

  const finalValue = maxLength ? withoutTrailingDotsOrSpaces.slice(0, maxLength) : withoutTrailingDotsOrSpaces;
  return finalValue || null;
};

export type DatasetFilenameOptions = {
  extension?: string;
  maxLength?: number;
};

export const toDatasetFilename = (
  metadata: DatasetMetadata,
  options?: DatasetFilenameOptions,
): string | null => {
  const extension = String(options?.extension ?? "").trim().replace(/^\.+/g, "");
  const maxLength = options?.maxLength;

  const base =
    slugify(metadata.name ?? "", { maxLength, lower: true }) ??
    sanitizeFilename(String(metadata.id ?? ""), { maxLength, lower: false }) ??
    null;

  if (!base) return null;
  if (!extension) return base;

  return `${base}.${extension}`;
};

