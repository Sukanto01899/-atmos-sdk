export type SafeJsonParseOptions = {
  reviver?: Parameters<typeof JSON.parse>[1];
};

export const safeJsonParse = <T = unknown>(
  input: string,
  options?: SafeJsonParseOptions,
): T | null => {
  const text = String(input ?? "");
  try {
    return JSON.parse(text, options?.reviver) as T;
  } catch {
    return null;
  }
};

export type SafeJsonStringifyOptions = {
  replacer?: Parameters<typeof JSON.stringify>[1];
  space?: Parameters<typeof JSON.stringify>[2];
};

export const safeJsonStringify = (
  value: unknown,
  options?: SafeJsonStringifyOptions,
): string | null => {
  try {
    return JSON.stringify(value, options?.replacer, options?.space);
  } catch {
    return null;
  }
};

