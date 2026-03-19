import type {
  DatasetId,
  DatasetMetadata,
  DownloadOptions,
  DownloadResult,
  ListDatasetsOptions,
  ListDatasetsResult,
  PreviewOptions,
  PreviewResult,
  SdkClientOptions,
  StorageAdapter,
  UploadOptions,
  UploadResult,
  VerifyOptions,
  VerifyResult,
} from "../types";
import { httpTransport } from "../transport/http";
import { SdkError } from "../types";

export class SdkClient {
  private readonly baseUrl: string;
  private readonly transport;
  private readonly storage?: StorageAdapter;

  constructor(options: SdkClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.transport = options.transport ?? httpTransport(options);
    this.storage = options.storage;
  }

  async upload(
    data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
    options: UploadOptions,
  ): Promise<UploadResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage.upload(data, options);
  }

  async download(id: DatasetId, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage.download(id, options);
  }

  async preview(id: DatasetId, options?: PreviewOptions): Promise<PreviewResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage.preview(id, options);
  }

  async verify(id: DatasetId, options?: VerifyOptions): Promise<VerifyResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage.verify(id, options);
  }

  async getMetadata(id: DatasetId): Promise<DatasetMetadata> {
    return this.transport.request("GET", `/datasets/${id}`);
  }

  async listDatasets(options?: ListDatasetsOptions): Promise<ListDatasetsResult> {
    return this.transport.request("GET", `/datasets`, {
      body: options,
    });
  }
}
