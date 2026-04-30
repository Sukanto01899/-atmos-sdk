import type { DatasetMetadata } from "../types";

export const getDatasetQualityScore = (metadata: DatasetMetadata): number => {
  const verified = metadata.verified === true || metadata.status === "verified";
  const hasIpfs = Boolean(String(metadata.ipfsHash ?? "").trim());
  const frozen = metadata.metadataFrozen === true;
  const isPublic = metadata.isPublic === true;

  return (verified ? 45 : 0) + (hasIpfs ? 30 : 0) + (frozen ? 15 : 0) + (isPublic ? 10 : 0);
};

