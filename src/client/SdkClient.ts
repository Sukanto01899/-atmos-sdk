import type {
  BatchOptions,
  BatchResult,
  DatasetId,
  DatasetMetadata,
  DatasetBundleManifest,
  DownloadOptions,
  DownloadResult,
  DownloadBatchItem,
  DownloadBundleOptions,
  ListDatasetsOptions,
  ListDatasetsResult,
  PreviewOptions,
  PreviewResult,
  SdkClientOptions,
  StorageAdapter,
  UploadOptions,
  UploadResult,
  UploadBatchItem,
  UploadBundleOptions,
  UploadBundleResult,
  VerifyOptions,
  VerifyResult,
  VerifyBundleResult,
} from "../types";
import { httpTransport } from "../transport/http";
import { SdkError } from "../types";
import { runBatch } from "../utils/batch";

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

  async uploadBatch(
    items: UploadBatchItem[],
    options?: BatchOptions,
  ): Promise<BatchResult<UploadBatchItem, UploadResult>[]> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return runBatch(items, (item) => this.storage!.upload(item.data, item.options), options);
  }

  async download(id: DatasetId, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage.download(id, options);
  }

  async downloadBatch(
    items: DownloadBatchItem[],
    options?: BatchOptions,
  ): Promise<BatchResult<DownloadBatchItem, DownloadResult>[]> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return runBatch(items, (item) => this.storage!.download(item.id, item.options), options);
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

  async uploadBundle(options: UploadBundleOptions): Promise<UploadBundleResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    if (!this.storage.uploadBundle) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle uploads.");
    }
    return this.storage.uploadBundle(options);
  }

  async downloadBundleManifest(
    id: DatasetId,
    options?: DownloadBundleOptions,
  ): Promise<DatasetBundleManifest> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    if (!this.storage.downloadBundleManifest) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle downloads.");
    }
    return this.storage.downloadBundleManifest(id, options);
  }

  async downloadBundleFile(
    id: DatasetId,
    path: string,
    options?: DownloadOptions,
  ): Promise<DownloadResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    if (!this.storage.downloadBundleFile) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle downloads.");
    }
    return this.storage.downloadBundleFile(id, path, options);
  }

  async verifyBundle(id: DatasetId, options?: DownloadBundleOptions): Promise<VerifyBundleResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    if (!this.storage.verifyBundle) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle verification.");
    }
    return this.storage.verifyBundle(id, options);
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
