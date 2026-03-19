import type {
  DownloadOptions,
  DownloadResult,
  StorageAdapter,
  UploadOptions,
  UploadResult,
  PreviewOptions,
  PreviewResult,
  VerifyOptions,
  VerifyResult,
  DatasetId,
} from "../types";

export const createS3Adapter = (): StorageAdapter => ({
  async upload(
    _data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
    _options: UploadOptions,
  ): Promise<UploadResult> {
    throw new Error("Not implemented");
  },
  async download(_id: DatasetId, _options?: DownloadOptions): Promise<DownloadResult> {
    throw new Error("Not implemented");
  },
  async preview(_id: DatasetId, _options?: PreviewOptions): Promise<PreviewResult> {
    throw new Error("Not implemented");
  },
  async verify(_id: DatasetId, _options?: VerifyOptions): Promise<VerifyResult> {
    throw new Error("Not implemented");
  },
});
