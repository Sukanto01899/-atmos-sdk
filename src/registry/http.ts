import type { RegistryAdapter, Transport, DatasetMetadata } from "../types";
import { SdkError } from "../types";

export interface HttpRegistryOptions {
  path?: string; // default: "/datasets"
  mapResponse?: (response: unknown) => { datasetId: string | number; receipt?: unknown };
}

const defaultMapResponse = (response: unknown): { datasetId: string | number; receipt?: unknown } => {
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    const datasetId = (record.datasetId ?? record.id) as string | number | undefined;
    if (typeof datasetId === "string" || typeof datasetId === "number") {
      return { datasetId, receipt: response };
    }
  }
  throw new SdkError("E_API", "Unable to parse datasetId from API response.", 0, response);
};

export const createHttpRegistry = (
  transport: Transport,
  options?: HttpRegistryOptions,
): RegistryAdapter => {
  const path = options?.path ?? "/datasets";
  const mapResponse = options?.mapResponse ?? defaultMapResponse;

  return {
    async registerDataset(metadata: DatasetMetadata) {
      const response = await transport.request<unknown>("POST", path, { body: metadata });
      return mapResponse(response);
    },
  };
};

