export const normalizeIpfsCid = (value: string): string | null => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  let cid = trimmed;

  if (cid.startsWith("ipfs://")) {
    cid = cid.slice("ipfs://".length);
  }

  // Support full gateway URLs or /ipfs/<cid> paths.
  const urlMatch = cid.match(/\/ipfs\/([^/?#]+)/);
  if (urlMatch) {
    cid = urlMatch[1];
  }

  cid = cid.replace(/^\/?ipfs\//, "").split(/[?#]/)[0].trim();
  return cid || null;
};

export const toIpfsGatewayUrl = (
  value: string,
  gatewayBase = "https://ipfs.io/ipfs/",
): string | null => {
  const cid = normalizeIpfsCid(value);
  if (!cid) return null;

  const base = (gatewayBase ?? "").trim();
  if (!base) return null;

  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const withIpfs =
    normalizedBase.includes("/ipfs/")
      ? normalizedBase
      : normalizedBase.endsWith("/ipfs/")
        ? normalizedBase
        : `${normalizedBase}ipfs/`;

  return `${withIpfs}${encodeURIComponent(cid)}`;
};

