export type StacksChain = "mainnet" | "testnet";

const normalizeBase = (base: string) => {
  const trimmed = (base ?? "").trim();
  if (!trimmed) {
    return "https://explorer.hiro.so";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const toStacksExplorerAddressUrl = (
  addressOrContract: string,
  options?: { chain?: StacksChain; baseUrl?: string },
): string | null => {
  const value = (addressOrContract ?? "").trim();
  if (!value) return null;
  const baseUrl = normalizeBase(options?.baseUrl ?? "https://explorer.hiro.so");
  const chain = options?.chain ?? "mainnet";
  return `${baseUrl}/address/${encodeURIComponent(value)}?chain=${encodeURIComponent(chain)}`;
};

export const toStacksExplorerTxUrl = (
  txId: string,
  options?: { chain?: StacksChain; baseUrl?: string },
): string | null => {
  const value = (txId ?? "").trim();
  if (!value) return null;
  const baseUrl = normalizeBase(options?.baseUrl ?? "https://explorer.hiro.so");
  const chain = options?.chain ?? "mainnet";
  return `${baseUrl}/txid/${encodeURIComponent(value)}?chain=${encodeURIComponent(chain)}`;
};

