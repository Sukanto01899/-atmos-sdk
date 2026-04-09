export type StacksChain = "mainnet" | "testnet";
export type StacksExplorerOptions = { chain?: StacksChain; baseUrl?: string };

const normalizeBase = (base: string) => {
  const trimmed = (base ?? "").trim();
  if (!trimmed) {
    return "https://explorer.hiro.so";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const toStacksExplorerAddressUrl = (
  addressOrContract: string,
  options?: StacksExplorerOptions,
): string | null => {
  const value = (addressOrContract ?? "").trim();
  if (!value) return null;
  const baseUrl = normalizeBase(options?.baseUrl ?? "https://explorer.hiro.so");
  const chain = options?.chain ?? "mainnet";
  return `${baseUrl}/address/${encodeURIComponent(value)}?chain=${encodeURIComponent(chain)}`;
};

export const toStacksExplorerTxUrl = (
  txId: string,
  options?: StacksExplorerOptions,
): string | null => {
  const value = (txId ?? "").trim();
  if (!value) return null;
  const baseUrl = normalizeBase(options?.baseUrl ?? "https://explorer.hiro.so");
  const chain = options?.chain ?? "mainnet";
  return `${baseUrl}/txid/${encodeURIComponent(value)}?chain=${encodeURIComponent(chain)}`;
};

export const toStacksExplorerContractUrl = (
  contractAddress: string,
  contractName: string,
  options?: StacksExplorerOptions,
): string | null => {
  const addr = (contractAddress ?? "").trim();
  const name = (contractName ?? "").trim();
  if (!addr || !name) return null;
  // Hiro Explorer accepts contract principals via the `/address/<principal>` route.
  return toStacksExplorerAddressUrl(`${addr}.${name}`, options);
};
