import { SDK_ERROR_BRAND, SdkError } from "../types";

export const isSdkError = (error: unknown): error is SdkError => {
  if (error instanceof SdkError) return true;
  if (!error || typeof error !== "object") return false;

  const maybe = error as { [key: string | symbol]: unknown; code?: unknown; message?: unknown; name?: unknown };

  if (maybe[SDK_ERROR_BRAND] === true && typeof maybe.code === "string") {
    return true;
  }

  // Fallback for cases where the brand isn't present (e.g. older versions), but the shape matches.
  return (
    maybe.name === "SdkError" && typeof maybe.code === "string" && typeof maybe.message === "string"
  );
};
