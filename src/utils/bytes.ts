export type FormatBytesOptions = {
  decimals?: number;
  binary?: boolean;
  spacer?: string;
};

const clampDecimals = (decimals: number) =>
  Math.min(6, Math.max(0, Math.round(decimals)));

const trimTrailingZeros = (value: string) => value.replace(/\.?0+$/, "");

export const formatBytes = (
  bytes: number,
  options?: FormatBytesOptions,
): string | null => {
  if (!Number.isFinite(bytes) || bytes < 0) return null;

  const spacer = options?.spacer ?? " ";
  const binary = options?.binary ?? false;
  const base = binary ? 1024 : 1000;
  const units = binary
    ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    : ["B", "KB", "MB", "GB", "TB", "PB"];

  if (bytes === 0) return `0${spacer}B`;

  const unitIndex = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(base)),
  );

  if (unitIndex === 0) {
    return `${Math.round(bytes)}${spacer}B`;
  }

  const decimals = clampDecimals(options?.decimals ?? 2);
  const value = bytes / Math.pow(base, unitIndex);
  const formatted = trimTrailingZeros(value.toFixed(decimals));

  return `${formatted}${spacer}${units[unitIndex]}`;
};

