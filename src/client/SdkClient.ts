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
  Bbox,
} from "../types";
import { httpTransport } from "../transport/http";
import { SdkError } from "../types";
import { runBatch } from "../utils/batch";
import { computeSha256AndSize, sha256HexFromText } from "../utils/hash";
import { toQueryString } from "../utils/query";
import { parseCsvWithHeader } from "../utils/csv";
import { toIpfsGatewayUrl } from "../utils/ipfs";
import { toOpenStreetMapUrl, type OpenStreetMapOptions } from "../utils/openStreetMap";
import { toStacksExplorerAddressUrl } from "../utils/stacksExplorer";

export class SdkClient {
  private readonly baseUrl;
  private readonly transport;
  private readonly storage?: StorageAdapter;
  private readonly registry?: RegistryAdapter;
  private readonly onchain?: OnChainPublisher;
  private readonly cacheOptions;
  private readonly metadataCache = new Map<string, { value: DatasetMetadata; expiresAt: number }>();
  private readonly metadataInFlight = new Map<string, Promise<DatasetMetadata>>();

  constructor(options: SdkClientOptions) {
    this.baseUrl = String(options.baseUrl ?? "").replace(/\/+$/, "");
    this.transport = options.transport ?? httpTransport(options);
    this.storage = options.storage;
    this.registry = options.registry;
    this.onchain = options.onchain;
    this.cacheOptions = options.cache;
  }

  clearMetadataCache(): void {
    this.metadataCache.clear();
  }

  invalidateMetadataCache(id: DatasetId): void {
    this.metadataCache.delete(String(id));
  }

  private buildAbsoluteUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (!this.baseUrl) {
      throw new SdkError("E_VALIDATION", "Missing baseUrl.");
    }
    return `${this.baseUrl}${normalizedPath}`;
  }

  private getCacheMaxAgeMs() {
    return Math.max(0, this.cacheOptions?.maxAgeMs ?? 0);
  }

  private getCacheMaxEntries() {
    return Math.max(1, this.cacheOptions?.maxEntries ?? 500);
  }

  private getCachedMetadata(id: DatasetId) {
    const key = String(id);
    const entry = this.metadataCache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.metadataCache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCachedMetadata(id: DatasetId, value: DatasetMetadata) {
    const maxAgeMs = this.getCacheMaxAgeMs();
    if (maxAgeMs <= 0) return;

    const key = String(id);
    // Bump insertion order for LRU-ish behavior.
    this.metadataCache.delete(key);
    this.metadataCache.set(key, { value, expiresAt: Date.now() + maxAgeMs });

    const maxEntries = this.getCacheMaxEntries();
    while (this.metadataCache.size > maxEntries) {
      const firstKey = this.metadataCache.keys().next().value as string | undefined;
      if (!firstKey) break;
      this.metadataCache.delete(firstKey);
    }
  }

  private getStorage(): StorageAdapter {
    if (!this.storage) {
      throw new SdkError("E_STORAGE", "No storage adapter configured.");
    }
    return this.storage;
  }

  private getBundleUploadStorage(): Required<Pick<StorageAdapter, "uploadBundle">> &
    StorageAdapter {
    const storage = this.getStorage();
    if (!storage.uploadBundle) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle uploads.");
    }
    return storage as Required<Pick<StorageAdapter, "uploadBundle">> & StorageAdapter;
  }

  private getBundleDownloadStorage(): Required<
    Pick<StorageAdapter, "downloadBundleManifest" | "downloadBundleFile">
  > &
    StorageAdapter {
    const storage = this.getStorage();
    if (!storage.downloadBundleManifest || !storage.downloadBundleFile) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle downloads.");
    }
    return storage as Required<
      Pick<StorageAdapter, "downloadBundleManifest" | "downloadBundleFile">
    > &
      StorageAdapter;
  }

  private getBundleVerifyStorage(): Required<Pick<StorageAdapter, "verifyBundle">> &
    StorageAdapter {
    const storage = this.getStorage();
    if (!storage.verifyBundle) {
      throw new SdkError("E_STORAGE", "Storage adapter does not support bundle verification.");
    }
    return storage as Required<Pick<StorageAdapter, "verifyBundle">> & StorageAdapter;
  }

  private normalizeBboxParam(bbox: ListDatasetsOptions["bbox"]): string | undefined {
    if (bbox === undefined || bbox === null) return undefined;
    if (typeof bbox === "string") {
      const normalized = bbox.trim();
      return normalized ? normalized : undefined;
    }

    const asNumbers = (values: unknown[]) => {
      if (values.length !== 4) return null;
      const nums = values.map((value) => Number(value));
      if (nums.some((value) => !Number.isFinite(value))) return null;
      return nums as [number, number, number, number];
    };

    if (Array.isArray(bbox)) {
      const nums = asNumbers(bbox);
      if (!nums) {
        throw new SdkError(
          "E_VALIDATION",
          "Invalid bbox tuple. Expected [minLon, minLat, maxLon, maxLat] numbers.",
          0,
          bbox,
        );
      }
      return nums.map((value) => String(value)).join(",");
    }
    if (typeof bbox === "object") {
      const record = bbox as Partial<Bbox>;
      const nums = asNumbers([record.minLon, record.minLat, record.maxLon, record.maxLat]);
      if (!nums) {
        throw new SdkError(
          "E_VALIDATION",
          "Invalid bbox object. Expected { minLon, minLat, maxLon, maxLat } numbers.",
          0,
          bbox,
        );
      }
      return nums.map((value) => String(value)).join(",");
    }
    throw new SdkError(
      "E_VALIDATION",
      "Invalid bbox. Expected string, tuple, or { minLon, minLat, maxLon, maxLat }.",
      0,
      bbox,
    );
  }

  private buildDatasetQuery(options?: ListDatasetsOptions) {
    return {
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      verified: options?.verified,
      metadataFrozen: options?.metadataFrozen,
      bbox: this.normalizeBboxParam(options?.bbox),
      altitudeMin: options?.altitudeMin,
      altitudeMax: options?.altitudeMax,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      createdAtFrom: options?.createdAtFrom,
      createdAtTo: options?.createdAtTo,
      tags: options?.tags,
      limit: options?.limit,
      cursor: options?.cursor,
      sort: options?.sort,
    };
  }

  private buildDatasetCollectionQuery(
    options?: ListDatasetsAllOptions,
    cursor?: string,
    limit?: number,
  ) {
    return {
      search: options?.search,
      owner: options?.owner,
      dataType: options?.dataType,
      status: options?.status,
      isPublic: options?.isPublic,
      verified: options?.verified,
      metadataFrozen: options?.metadataFrozen,
      bbox: this.normalizeBboxParam(options?.bbox),
      altitudeMin: options?.altitudeMin,
      altitudeMax: options?.altitudeMax,
      visibility: options?.visibility,
      from: options?.from,
      to: options?.to,
      createdAtFrom: options?.createdAtFrom,
      createdAtTo: options?.createdAtTo,
      tags: options?.tags,
      limit,
      cursor,
      sort: options?.sort,
    };
  }

  async upload(
    data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
    options: UploadOptions,
  ): Promise<UploadResult> {
    return this.getStorage().upload(data, options);
  }

  async uploadBatch(
    items: UploadBatchItem[],
    options?: BatchOptions,
  ): Promise<BatchResult<UploadBatchItem, UploadResult>[]> {
    const storage = this.getStorage();
    return runBatch(items, (item) => storage.upload(item.data, item.options), options);
  }

  async download(id: DatasetId, options?: DownloadOptions): Promise<DownloadResult> {
    return this.getStorage().download(id, options);
  }

  async downloadBatch(
    items: DownloadBatchItem[],
    options?: BatchOptions,
  ): Promise<BatchResult<DownloadBatchItem, DownloadResult>[]> {
    const storage = this.getStorage();
    return runBatch(items, (item) => storage.download(item.id, item.options), options);
  }

  async preview(id: DatasetId, options?: PreviewOptions): Promise<PreviewResult> {
    return this.getStorage().preview(id, options);
  }

  async verify(id: DatasetId, options?: VerifyOptions): Promise<VerifyResult> {
    return this.getStorage().verify(id, options);
  }

  async uploadBundle(options: UploadBundleOptions): Promise<UploadBundleResult> {
    return this.getBundleUploadStorage().uploadBundle(options);
  }

  async downloadBundleManifest(
    id: DatasetId,
    options?: DownloadBundleOptions,
  ): Promise<DatasetBundleManifest> {
    return this.getBundleDownloadStorage().downloadBundleManifest(id, options);
  }

  async downloadBundleFile(
    id: DatasetId,
    path: string,
    options?: DownloadOptions,
  ): Promise<DownloadResult> {
    return this.getBundleDownloadStorage().downloadBundleFile(id, path, options);
  }

  async verifyBundle(id: DatasetId, options?: DownloadBundleOptions): Promise<VerifyBundleResult> {
    return this.getBundleVerifyStorage().verifyBundle(id, options);
  }

  async health(): Promise<HealthResult> {
    return this.transport.request("GET", `/health`);
  }

  async publish(options: PublishOptions): Promise<PublishResult> {
    const storage = this.getStorage();

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

      upload = await storage.upload(uploadData, uploadOptions);
    } else {
      const bundleStorage = this.getBundleUploadStorage();

      const bundleUpload = await bundleStorage.uploadBundle({
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
    const cached = this.getCachedMetadata(id);
    if (cached) {
      return cached;
    }

    const key = String(id);
    const existing = this.metadataInFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = this.transport
      .request<DatasetMetadata>("GET", `/datasets/${id}`)
      .then((value) => {
        this.setCachedMetadata(id, value);
        return value;
      })
      .finally(() => {
        this.metadataInFlight.delete(key);
      });

    this.metadataInFlight.set(key, promise);
    return promise;
  }

  async getDatasetIpfsGatewayUrl(
    id: DatasetId,
    gatewayBase?: string,
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toIpfsGatewayUrl(metadata.ipfsHash ?? "", gatewayBase);
  }

  async getDatasetOwnerExplorerUrl(
    id: DatasetId,
    options?: { chain?: "mainnet" | "testnet"; baseUrl?: string },
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toStacksExplorerAddressUrl(metadata.owner ?? "", options);
  }

  async getDatasetOpenStreetMapUrl(
    id: DatasetId,
    options?: OpenStreetMapOptions,
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toOpenStreetMapUrl(metadata.latitude, metadata.longitude, options);
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
    const qs = toQueryString(this.buildDatasetQuery(options));
    return this.transport.request("GET", `/datasets${qs}`);
  }

  getDatasetUrl(id: DatasetId): string {
    return this.buildAbsoluteUrl(`/datasets/${id}`);
  }

  getDatasetsUrl(options?: ListDatasetsOptions): string {
    const qs = toQueryString(this.buildDatasetQuery(options));
    return this.buildAbsoluteUrl(`/datasets${qs}`);
  }

  getDatasetsCsvUrl(options?: ListDatasetsOptions): string {
    const qs = toQueryString(this.buildDatasetQuery(options));
    return this.buildAbsoluteUrl(`/datasets.csv${qs}`);
  }

  getDatasetsGeoJsonUrl(options?: ListDatasetsOptions): string {
    const qs = toQueryString(this.buildDatasetQuery(options));
    return this.buildAbsoluteUrl(`/datasets.geojson${qs}`);
  }

  getHealthUrl(): string {
    return this.buildAbsoluteUrl("/health");
  }

  getTagsUrl(options?: ListDatasetsOptions): string {
    const qs = toQueryString({
      ...this.buildDatasetQuery(options),
      limit: undefined,
      cursor: undefined,
    });
    return this.buildAbsoluteUrl(`/tags${qs}`);
  }

  getSummaryUrl(options?: ListDatasetsOptions): string {
    const qs = toQueryString({
      ...this.buildDatasetQuery(options),
      limit: undefined,
      cursor: undefined,
    });
    return this.buildAbsoluteUrl(`/summary${qs}`);
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
      const qs = toQueryString(
        this.buildDatasetCollectionQuery(
          options,
          cursor,
          Math.min(pageSize, maxItems - items.length),
        ),
      );

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
      const qs = toQueryString(this.buildDatasetCollectionQuery(options, cursor, limit));

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
    const qs = toQueryString(this.buildDatasetQuery(options));
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
    const qs = toQueryString(this.buildDatasetQuery(options));
    return this.transport.request("GET", `/datasets.geojson${qs}`);
  }

  async listTags(options?: ListDatasetsOptions): Promise<ListTagsResult> {
    const qs = toQueryString({
      ...this.buildDatasetQuery(options),
      limit: undefined,
      cursor: undefined,
    });

    return this.transport.request("GET", `/tags${qs}`);
  }

  async getSummary(options?: ListDatasetsOptions): Promise<SummaryResult> {
    const qs = toQueryString({
      ...this.buildDatasetQuery(options),
      limit: undefined,
      cursor: undefined,
    });

    return this.transport.request("GET", `/summary${qs}`);
  }
}
