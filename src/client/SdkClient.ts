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
  HealthResult,
  ListDatasetsOptions,
  ListDatasetsAllOptions,
  ListDatasetsAllProgress,
  ListDatasetsAllResult,
  ListDatasetsCsvParsedResult,
  ListDatasetsResult,
  ListTagsResult,
  DatasetsGeoJsonFeatureCollection,
  OnChainPublisher,
  PreviewOptions,
  PreviewResult,
  PublishOptions,
  PublishResult,
  PublishTarget,
  RegistryAdapter,
  SdkClientOptions,
  SummaryResult,
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
import { toQueryString } from "../utils/query";
import { parseCsvWithHeader } from "../utils/csv";

export class SdkClient {
  private readonly transport;
  private readonly storage?: StorageAdapter;
  private readonly registry?: RegistryAdapter;
  private readonly onchain?: OnChainPublisher;

  constructor(options: SdkClientOptions) {
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

  async health(): Promise<HealthResult> {
    return this.transport.request("GET", `/health`);
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

  async getMetadataBatch(
    ids: DatasetId[],
    options?: BatchOptions,
  ): Promise<BatchResult<DatasetId, DatasetMetadata>[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }
    return runBatch(ids, (id) => this.getMetadata(id), options);
  }

  async listDatasets(options?: ListDatasetsOptions): Promise<ListDatasetsResult> {
    const qs = toQueryString({
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      tags: options?.tags,
      limit: options?.limit,
      cursor: options?.cursor,
      sort: options?.sort,
    });
    return this.transport.request("GET", `/datasets${qs}`);
  }

  async listDatasetsAll(options?: ListDatasetsAllOptions): Promise<ListDatasetsAllResult> {
    const pageSize = options?.limit ?? 50;
    const maxPages = Math.max(1, options?.maxPages ?? 50);
    const maxItems = Math.max(1, options?.maxItems ?? 10_000);

    let cursor = options?.startCursor;
    let pagesFetched = 0;
    const items: DatasetMetadata[] = [];

    const report = (nextCursor?: string) => {
      const progress: ListDatasetsAllProgress = {
        pagesFetched,
        itemsFetched: items.length,
        nextCursor,
      };
      options?.onProgress?.(progress);
    };

    while (pagesFetched < maxPages && items.length < maxItems) {
      const qs = toQueryString({
        search: options?.search,
        owner: options?.owner,
        dataType: options?.dataType,
        status: options?.status,
        isPublic: options?.isPublic,
        visibility: options?.visibility,
        from: options?.from,
        to: options?.to,
        tags: options?.tags,
        limit: Math.min(pageSize, maxItems - items.length),
        cursor,
        sort: options?.sort,
      });

      const result = await this.transport.request<ListDatasetsResult>("GET", `/datasets${qs}`, {
        signal: options?.abortSignal,
      });

      pagesFetched += 1;
      items.push(...(result.items ?? []));
      report(result.nextCursor);

      if (!result.nextCursor) {
        return { items, pagesFetched, nextCursor: undefined };
      }

      cursor = result.nextCursor;
    }

    return { items, pagesFetched, nextCursor: cursor };
  }

  async *listDatasetsPages(
    options?: ListDatasetsAllOptions,
  ): AsyncGenerator<ListDatasetsResult, void, void> {
    const pageSize = options?.limit ?? 50;
    const maxPages = Math.max(1, options?.maxPages ?? 50);
    const maxItems = Math.max(1, options?.maxItems ?? 10_000);

    let cursor = options?.startCursor;
    let pagesFetched = 0;
    let itemsFetched = 0;

    const report = (nextCursor?: string) => {
      const progress: ListDatasetsAllProgress = {
        pagesFetched,
        itemsFetched,
        nextCursor,
      };
      options?.onProgress?.(progress);
    };

    while (pagesFetched < maxPages && itemsFetched < maxItems) {
      const limit = Math.min(pageSize, maxItems - itemsFetched);
      const qs = toQueryString({
        search: options?.search,
        owner: options?.owner,
        dataType: options?.dataType,
        status: options?.status,
        isPublic: options?.isPublic,
        visibility: options?.visibility,
        from: options?.from,
        to: options?.to,
        tags: options?.tags,
        limit,
        cursor,
        sort: options?.sort,
      });

      const result = await this.transport.request<ListDatasetsResult>("GET", `/datasets${qs}`, {
        signal: options?.abortSignal,
      });

      pagesFetched += 1;
      itemsFetched += (result.items ?? []).length;
      report(result.nextCursor);

      yield result;

      if (!result.nextCursor) {
        return;
      }

      cursor = result.nextCursor;
    }
  }

  async *iterateDatasets(
    options?: ListDatasetsAllOptions,
  ): AsyncGenerator<DatasetMetadata, void, void> {
    const maxItems = Math.max(1, options?.maxItems ?? 10_000);
    let yielded = 0;

    for await (const page of this.listDatasetsPages(options)) {
      for (const item of page.items ?? []) {
        yield item;
        yielded += 1;
        if (yielded >= maxItems) {
          return;
        }
      }
    }
  }

  async listDatasetsCsv(options?: ListDatasetsOptions): Promise<string> {
    const qs = toQueryString({
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      tags: options?.tags,
      limit: options?.limit,
      cursor: options?.cursor,
      sort: options?.sort,
    });
    return this.transport.request("GET", `/datasets.csv${qs}`);
  }

  async listDatasetsCsvParsed(
    options?: ListDatasetsOptions,
    maxRows = 1000,
  ): Promise<ListDatasetsCsvParsedResult> {
    const csv = await this.listDatasetsCsv(options);
    return parseCsvWithHeader(csv, maxRows);
  }

  async listDatasetsGeoJson(
    options?: ListDatasetsOptions,
  ): Promise<DatasetsGeoJsonFeatureCollection> {
    const qs = toQueryString({
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      tags: options?.tags,
      limit: options?.limit,
      cursor: options?.cursor,
      sort: options?.sort,
    });
    return this.transport.request("GET", `/datasets.geojson${qs}`);
  }

  async listTags(options?: ListDatasetsOptions): Promise<ListTagsResult> {
    const qs = toQueryString({
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      tags: options?.tags,
      sort: options?.sort,
    });

    return this.transport.request("GET", `/tags${qs}`);
  }

  async getSummary(options?: ListDatasetsOptions): Promise<SummaryResult> {
    const qs = toQueryString({
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      tags: options?.tags,
      sort: options?.sort,
    });

    return this.transport.request("GET", `/summary${qs}`);
  }
}
