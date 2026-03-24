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
  OnChainPublisher,
  PreviewOptions,
  PreviewResult,
  PublishOptions,
  PublishResult,
  PublishTarget,
  RegistryAdapter,
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
import { computeSha256AndSize, sha256HexFromText } from "../utils/hash";

export class SdkClient {
  private readonly baseUrl: string;
  private readonly transport;
  private readonly storage?: StorageAdapter;
  private readonly registry?: RegistryAdapter;
  private readonly onchain?: OnChainPublisher;

  constructor(options: SdkClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.transport = options.transport ?? httpTransport(options);
    this.storage = options.storage;
    this.registry = options.registry;
    this.onchain = options.onchain;
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

  async publish(options: PublishOptions): Promise<PublishResult> {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }

    const inferredTarget: PublishTarget =
      options.target ??
      (this.registry && this.onchain
        ? "both"
        : this.registry
          ? "api"
          : this.onchain
            ? "onchain"
            : "none");

    let upload: UploadResult | UploadBundleResult;
    const metadata: DatasetMetadata = { ...options.metadata };

    if (options.kind === "file") {
      const { checksumSha256, sizeBytes, uploadData, mimeType } = await computeSha256AndSize(
        options.data,
      );
      metadata.checksum = checksumSha256;
      metadata.sizeBytes = sizeBytes;
      if (mimeType && !metadata.mimeType) {
        metadata.mimeType = mimeType;
      }

      const uploadOptions: UploadOptions = {
        metadata,
        checksum: checksumSha256,
        contentLength: sizeBytes,
        ...(options.upload ?? {}),
      };

      upload = await this.storage.upload(uploadData, uploadOptions);
    } else {
      if (!this.storage.uploadBundle) {
        throw new SdkError("E_STORAGE", "Storage adapter does not support bundle uploads.");
      }

      const bundleUpload = await this.storage.uploadBundle({
        metadata,
        files: options.files,
        ...(options.bundle ?? {}),
      });
      upload = bundleUpload;

      const totalSize = bundleUpload.manifest.files.reduce(
        (sum: number, file) => sum + file.sizeBytes,
        0,
      );
      const canonical = bundleUpload.manifest.files
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((file) => `${file.path}:${file.sizeBytes}:${file.checksumSha256}`)
        .join("\n");

      metadata.sizeBytes = totalSize;
      metadata.checksum = await sha256HexFromText(canonical);
    }

    if (typeof upload.location === "string" && upload.location.startsWith("ipfs://")) {
      metadata.ipfsHash = upload.id;
    }

    const result: PublishResult = { metadata, upload };

    if (inferredTarget === "api" || inferredTarget === "both") {
      if (!this.registry) {
        throw new SdkError("E_API", "No registry adapter configured.");
      }
      result.api = await this.registry.registerDataset(metadata);
    }

    if (inferredTarget === "onchain" || inferredTarget === "both") {
      if (!this.onchain) {
        throw new SdkError("E_ONCHAIN", "No on-chain publisher configured.");
      }
      const tx = await this.onchain.buildRegisterDatasetTx(metadata);
      result.onchain = { tx };

      if (options.broadcastOnChainTx) {
        if (!this.onchain.submitTx) {
          throw new SdkError("E_ONCHAIN", "onchain.submitTx is required to broadcast.");
        }
        const submitted = await this.onchain.submitTx(tx);
        result.onchain.txId = submitted.txId;
        result.onchain.receipt = submitted.receipt;
      }
    }

    return result;
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
