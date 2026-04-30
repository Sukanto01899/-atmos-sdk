import type { DatasetStatus } from "../types";

export const getDatasetStatusPriority = (status?: DatasetStatus | string | null): number => {
  const value = String(status ?? "").trim();
  if (value === "verified") return 4;
  if (value === "pending") return 3;
  if (value === "active") return 2;
  if (value === "deprecated") return 1;
  return 0;
};

export const compareDatasetStatusPriority = (
  a?: DatasetStatus | string | null,
  b?: DatasetStatus | string | null,
): number => getDatasetStatusPriority(b) - getDatasetStatusPriority(a);

