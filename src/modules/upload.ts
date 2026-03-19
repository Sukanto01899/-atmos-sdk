import type {
  DownloadOptions,
  DownloadResult,
  PreviewOptions,
  PreviewResult,
  UploadOptions,
  UploadResult,
  VerifyOptions,
  VerifyResult,
} from "../types";

export const uploadDataset = async (
  _data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
  _options: UploadOptions,
): Promise<UploadResult> => {
  throw new Error("Not implemented");
};

export const downloadDataset = async (
  _id: string,
  _options?: DownloadOptions,
): Promise<DownloadResult> => {
  throw new Error("Not implemented");
};

export const previewDataset = async (
  _id: string,
  _options?: PreviewOptions,
): Promise<PreviewResult> => {
  throw new Error("Not implemented");
};

export const verifyDataset = async (
  _id: string,
  _options?: VerifyOptions,
): Promise<VerifyResult> => {
  throw new Error("Not implemented");
};
