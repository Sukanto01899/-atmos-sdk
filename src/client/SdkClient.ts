import type {
  BatchOptions,
  BatchResult,
  DatasetId,
  DatasetMetadata,
  DatasetsGeoJsonFeature,
  DatasetBundleManifest,
  DatasetDiffResult,
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
  WatchOptions,
  WatchHandle,
} from "../types";
import { diffDatasetMetadata } from "../utils/diff";
import { httpTransport } from "../transport/http";
import { SdkError } from "../types";
import { runBatch } from "../utils/batch";
import { computeSha256AndSize, sha256HexFromText } from "../utils/hash";
import { toQueryString } from "../utils/query";
import { parseCsvWithHeader } from "../utils/csv";
import { normalizeIpfsCid, toIpfsGatewayUrl, toIpfsUri } from "../utils/ipfs";
import { isValidLatLonDegrees, toLatLonDegreesString, toMicroDegrees } from "../utils/coords";
import { toGeoUri, type GeoUriOptions } from "../utils/geoUri";
import { toGoogleMapsUrl, type GoogleMapsOptions } from "../utils/googleMaps";
import { toOpenStreetMapUrl, type OpenStreetMapOptions } from "../utils/openStreetMap";
import {
  getDatasetLinksFromMetadata,
  type DatasetLinks,
  type DatasetLinksOptions,
} from "../utils/datasetLinks";
import {
  toStacksExplorerAddressUrl,
  type StacksExplorerOptions,
} from "../utils/stacksExplorer";
import { formatDatasetCitationMarkdown, formatDatasetCitationText } from "../utils/citation";
import { getDatasetQualityScore } from "../utils/quality";
import {
  exportDatasets as exportDatasetsUtil,
  type ExportFormat,
  type ExportDatasetsOptions,
} from "../utils/exportDatasets";

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

  /**
   * Poll a dataset for changes and call `options.onChange` whenever the
   * metadata differs from the previous snapshot.
   *
   * Returns a `WatchHandle` whose `stop()` method cancels the watcher.
   * An `AbortSignal` passed via `options.signal` will also stop it.
   *
   * @example
   * const handle = sdk.watch("42", {
   *   intervalMs: 5_000,
   *   onChange(current, previous) {
   *     console.log(`Status changed: ${previous.status} → ${current.status}`);
   *   },
   *   onError(err) { console.error(err); },
   * });
   *
   * // later…
   * handle.stop();
   */
  watch(id: DatasetId, options: WatchOptions): WatchHandle {
    const intervalMs = Math.max(1_000, options.intervalMs ?? 10_000);
    let _stopped = false;
    let previous: DatasetMetadata | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handle: WatchHandle = {
      get stopped() {
        return _stopped;
      },
      stop() {
        if (_stopped) return;
        _stopped = true;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      },
    };

    if (options.signal?.aborted) {
      handle.stop();
      return handle;
    }

    options.signal?.addEventListener("abort", () => handle.stop(), { once: true });

    const poll = async () => {
      if (_stopped) return;
      try {
        // Always fetch fresh — bypass the TTL cache so watchers see real changes.
        this.invalidateMetadataCache(id);
        const current = await this.getMetadata(id);
        if (previous !== null && JSON.stringify(current) !== JSON.stringify(previous)) {
          options.onChange(current, previous);
        }
        previous = current;
      } catch (err) {
        options.onError?.(err);
        if (options.stopOnError) {
          handle.stop();
          return;
        }
      }
      if (!_stopped) {
        timer = setTimeout(poll, intervalMs);
      }
    };

    poll();
    return handle;
  }

  async getDatasetIpfsGatewayUrl(
    id: DatasetId,
    gatewayBase?: string,
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toIpfsGatewayUrl(metadata.ipfsHash ?? "", gatewayBase);
  }

  async getDatasetIpfsUri(id: DatasetId): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toIpfsUri(metadata.ipfsHash ?? "");
  }

  async getDatasetLinks(
    id: DatasetId,
    options?: DatasetLinksOptions,
  ): Promise<DatasetLinks> {
    const metadata = await this.getMetadata(id);
    return getDatasetLinksFromMetadata(metadata, options);
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

  async getDatasetGoogleMapsUrl(
    id: DatasetId,
    options?: GoogleMapsOptions,
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toGoogleMapsUrl(metadata.latitude, metadata.longitude, options);
  }

  async getDatasetGeoUri(
    id: DatasetId,
    options?: GeoUriOptions,
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    const label = String(options?.label ?? metadata.name ?? "").trim();
    return toGeoUri(metadata.latitude, metadata.longitude, {
      ...options,
      label: label || undefined,
    });
  }

  async getDatasetCoordinatesMicroDegrees(
    id: DatasetId,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const metadata = await this.getMetadata(id);
    if (!isValidLatLonDegrees(metadata.latitude, metadata.longitude)) {
      return null;
    }
    const latitude = toMicroDegrees(metadata.latitude);
    const longitude = toMicroDegrees(metadata.longitude);
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  }

  async getDatasetCoordinatesString(
    id: DatasetId,
    options?: { precision?: number },
  ): Promise<string | null> {
    const metadata = await this.getMetadata(id);
    return toLatLonDegreesString(metadata.latitude, metadata.longitude, {
      precision: options?.precision,
    });
  }

  async getDatasetSummaryText(
    id: DatasetId,
    options?: {
      includeLinks?: boolean;
      stacksExplorer?: StacksExplorerOptions;
      ipfsGatewayBase?: string;
      openStreetMap?: OpenStreetMapOptions;
      googleMaps?: GoogleMapsOptions;
    },
  ): Promise<string> {
    const metadata = await this.getMetadata(id);
    const datasetId = metadata.id ?? id;
    const includeLinks = options?.includeLinks ?? true;

    const safe = (value: unknown) => String(value ?? "").trim();
    const coordsOk = isValidLatLonDegrees(metadata.latitude, metadata.longitude);

    const lines = [
      `Dataset #${datasetId}: ${safe(metadata.name)}`,
      `Type: ${safe(metadata.dataType)}`,
      metadata.status ? `Status: ${safe(metadata.status)}` : "",
      `Visibility: ${metadata.isPublic ? "Public" : "Private"}`,
      metadata.owner ? `Owner: ${safe(metadata.owner)}` : "",
      `Collection date: ${safe(metadata.collectionDate)}`,
      typeof metadata.createdAt === "number" ? `Created at: ${safe(metadata.createdAt)}` : "",
      `Altitude: ${safe(metadata.altitudeMin)}-${safe(metadata.altitudeMax)} m`,
      coordsOk ? `Coordinates: ${safe(metadata.latitude)}, ${safe(metadata.longitude)} (deg)` : "",
      metadata.ipfsHash ? `IPFS: ${safe(metadata.ipfsHash)}` : "",
      safe(metadata.description) ? `Description: ${safe(metadata.description)}` : "",
    ].filter(Boolean);

    if (!includeLinks) {
      return lines.join("\n");
    }

    const ownerUrl = metadata.owner
      ? toStacksExplorerAddressUrl(metadata.owner, options?.stacksExplorer)
      : null;
    const ipfsUrl = metadata.ipfsHash
      ? toIpfsGatewayUrl(metadata.ipfsHash, options?.ipfsGatewayBase)
      : null;
    const osmUrl = coordsOk
      ? toOpenStreetMapUrl(metadata.latitude, metadata.longitude, options?.openStreetMap)
      : null;
    const googleUrl = coordsOk
      ? toGoogleMapsUrl(metadata.latitude, metadata.longitude, options?.googleMaps)
      : null;

    const linkLines = [
      ownerUrl ? `Owner explorer: ${ownerUrl}` : "",
      ipfsUrl ? `IPFS gateway: ${ipfsUrl}` : "",
      osmUrl ? `OpenStreetMap: ${osmUrl}` : "",
      googleUrl ? `Google Maps: ${googleUrl}` : "",
    ].filter(Boolean);

    if (linkLines.length === 0) {
      return lines.join("\n");
    }

    return [...lines, "", ...linkLines].join("\n");
  }

  async getDatasetSummaryMarkdown(
    id: DatasetId,
    options?: {
      includeLinks?: boolean;
      stacksExplorer?: StacksExplorerOptions;
      ipfsGatewayBase?: string;
      openStreetMap?: OpenStreetMapOptions;
      googleMaps?: GoogleMapsOptions;
    },
  ): Promise<string> {
    const metadata = await this.getMetadata(id);
    const datasetId = metadata.id ?? id;
    const includeLinks = options?.includeLinks ?? true;

    const safe = (value: unknown) => String(value ?? "").trim();
    const coordsOk = isValidLatLonDegrees(metadata.latitude, metadata.longitude);

    const lines = [
      `## Dataset #${datasetId}: ${safe(metadata.name)}`,
      ``,
      `- Type: ${safe(metadata.dataType)}`,
      metadata.status ? `- Status: ${safe(metadata.status)}` : "",
      `- Visibility: ${metadata.isPublic ? "Public" : "Private"}`,
      metadata.owner ? `- Owner: ${safe(metadata.owner)}` : "",
      `- Collection date: ${safe(metadata.collectionDate)}`,
      typeof metadata.createdAt === "number" ? `- Created at: ${safe(metadata.createdAt)}` : "",
      `- Altitude: ${safe(metadata.altitudeMin)}-${safe(metadata.altitudeMax)} m`,
      coordsOk ? `- Coordinates: ${safe(metadata.latitude)}, ${safe(metadata.longitude)} (deg)` : "",
      metadata.ipfsHash ? `- IPFS: ${safe(metadata.ipfsHash)}` : "",
    ].filter(Boolean);

    const description = safe(metadata.description);
    if (description) {
      lines.push("", description);
    }

    if (!includeLinks) {
      return lines.join("\n");
    }

    const links = await this.getDatasetLinks(id, {
      stacksExplorer: options?.stacksExplorer,
      ipfsGatewayBase: options?.ipfsGatewayBase,
      openStreetMap: options?.openStreetMap,
      googleMaps: options?.googleMaps,
    });

    const linkLines = [
      links.ownerExplorerUrl ? `- Owner explorer: ${links.ownerExplorerUrl}` : "",
      links.ipfsUri ? `- IPFS uri: ${links.ipfsUri}` : "",
      links.ipfsGatewayUrl ? `- IPFS gateway: ${links.ipfsGatewayUrl}` : "",
      links.openStreetMapUrl ? `- OpenStreetMap: ${links.openStreetMapUrl}` : "",
      links.googleMapsUrl ? `- Google Maps: ${links.googleMapsUrl}` : "",
    ].filter(Boolean);

    if (linkLines.length === 0) {
      return lines.join("\n");
    }

    return [...lines, "", "### Links", ...linkLines].join("\n");
  }

  async getDatasetCitationText(
    id: DatasetId,
    options?: { detailUrl?: string | null; accessedAt?: string | Date },
  ): Promise<string> {
    const metadata = await this.getMetadata(id);
    return formatDatasetCitationText(
      {
        ...metadata,
        id: metadata.id ?? id,
      },
      {
        detailUrl: options?.detailUrl,
        accessedAt: options?.accessedAt,
      },
    );
  }

  async getDatasetCitationMarkdown(
    id: DatasetId,
    options?: {
      detailUrl?: string | null;
      accessedAt?: string | Date;
      multiline?: boolean;
    },
  ): Promise<string> {
    const metadata = await this.getMetadata(id);
    return formatDatasetCitationMarkdown(
      {
        ...metadata,
        id: metadata.id ?? id,
      },
      {
        detailUrl: options?.detailUrl,
        accessedAt: options?.accessedAt,
        multiline: options?.multiline,
      },
    );
  }

  async getDatasetQualityScore(id: DatasetId): Promise<number> {
    const metadata = await this.getMetadata(id);
    return getDatasetQualityScore(metadata);
  }

  async getDatasetGeoJsonFeature(id: DatasetId): Promise<DatasetsGeoJsonFeature | null> {
    const metadata = await this.getMetadata(id);
    if (!isValidLatLonDegrees(metadata.latitude, metadata.longitude)) {
      return null;
    }

    return {
      type: "Feature",
      id: metadata.id ?? id,
      geometry: {
        type: "Point",
        coordinates: [metadata.longitude, metadata.latitude],
      },
      properties: {
        name: metadata.name,
        description: metadata.description,
        dataType: metadata.dataType,
        tags: metadata.tags,
        status: metadata.status,
        owner: metadata.owner,
        isPublic: metadata.isPublic,
        collectionDate: metadata.collectionDate,
        createdAt: metadata.createdAt,
        altitudeMin: metadata.altitudeMin,
        altitudeMax: metadata.altitudeMax,
        ipfsHash: metadata.ipfsHash,
      },
    };
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

  /**
   * Fetch two datasets by ID and return a structured diff of their metadata.
   *
   * The result contains both raw snapshots plus a `diff` object that lists
   * which fields changed, were added, or were removed.
   *
   * @example
   * const { diff, previous, current } = await sdk.diff("10", "11");
   * if (!diff.isIdentical) {
   *   diff.changed.forEach(({ field, previous, current }) =>
   *     console.log(`${field}: ${String(previous)} → ${String(current)}`)
   *   );
   * }
   */
  async diff(previousId: DatasetId, currentId: DatasetId): Promise<DatasetDiffResult> {
    const [previous, current] = await Promise.all([
      this.getMetadata(previousId),
      this.getMetadata(currentId),
    ]);
    return { diff: diffDatasetMetadata(previous, current), previous, current };
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

  getDatasetsExportUrls(options?: ListDatasetsOptions): {
    jsonUrl: string;
    csvUrl: string;
    geoJsonUrl: string;
  } {
    return {
      jsonUrl: this.getDatasetsUrl(options),
      csvUrl: this.getDatasetsCsvUrl(options),
      geoJsonUrl: this.getDatasetsGeoJsonUrl(options),
    };
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

  /**
   * Fetch a single dataset by ID, returning `null` instead of throwing when
   * the server responds with 404.
   *
   * @example
   * const ds = await sdk.findById("42");
   * if (!ds) console.log("Not found");
   */
  async findById(id: DatasetId): Promise<DatasetMetadata | null> {
    try {
      return await this.getMetadata(id);
    } catch (err: unknown) {
      if (err instanceof SdkError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Fetch all datasets belonging to `owner`. Convenience wrapper around
   * `listDatasetsAll` that sets `owner` and surfaces a flat array.
   *
   * @example
   * const mine = await sdk.findByOwner("SP1K2XGT5RNGT…");
   */
  async findByOwner(
    owner: string,
    options?: Omit<ListDatasetsAllOptions, "owner">,
  ): Promise<DatasetMetadata[]> {
    const result = await this.listDatasetsAll({ ...options, owner });
    return result.items;
  }

  /**
   * Return the total number of datasets matching `options` without fetching
   * their full metadata. Sends a single page request with `limit=1` and reads
   * the `total` field from the response, falling back to `listDatasetsAll`
   * when the server does not return a `total`.
   *
   * @example
   * const total = await sdk.count({ status: "verified" });
   */
  async count(options?: Omit<ListDatasetsOptions, "limit" | "cursor">): Promise<number> {
    const qs = toQueryString(this.buildDatasetQuery({ ...options, limit: 1 }));
    const result = await this.transport.request<ListDatasetsResult & { total?: number }>(
      "GET",
      `/datasets${qs}`,
    );
    if (typeof result.total === "number") return result.total;
    // Fallback: fetch everything and count.
    const all = await this.listDatasetsAll(options);
    return all.items.length;
  }

  /**
   * Pre-populate the metadata cache for a list of dataset IDs. Useful when
   * you know in advance which datasets will be needed and want to avoid
   * per-ID round-trips during rendering.
   *
   * Requests are sent concurrently (up to 6 in flight at a time). IDs that
   * fail are silently skipped so one 404 doesn't abort the whole batch.
   *
   * @example
   * await sdk.prewarmCache(["1", "2", "3"]);
   */
  async prewarmCache(ids: DatasetId[]): Promise<void> {
    const CONCURRENCY = 6;
    let index = 0;

    const worker = async () => {
      while (index < ids.length) {
        const id = ids[index++];
        if (!id) continue;
        try {
          await this.getMetadata(id);
        } catch {
          // Skip silently — prewarm is best-effort.
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()),
    );
  }

  /**
   * Check reachability of multiple IPFS hashes in parallel.
   *
   * Sends a HEAD request to each configured gateway for every CID. The first
   * gateway that responds with a 2xx marks the CID as `"ok"`; if all gateways
   * fail or time out it is marked `"fail"`.
   *
   * @example
   * const health = await sdk.checkIpfsBatch(["Qm...", "bafyb..."]);
   * health.forEach((status, cid) => console.log(cid, status));
   */
  async checkIpfsBatch(
    hashes: string[],
    options?: {
      timeoutMs?: number;
      concurrency?: number;
      gatewayUrls?: string[];
    },
  ): Promise<Map<string, "ok" | "fail">> {
    const results = new Map<string, "ok" | "fail">();
    if (typeof fetch === "undefined" || !Array.isArray(hashes) || hashes.length === 0) {
      return results;
    }

    const timeoutMs = Math.max(1_000, options?.timeoutMs ?? 8_000);
    const gatewayUrls = options?.gatewayUrls ?? [
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.io/ipfs/",
    ];

    const cidSet = new Set<string>();
    for (const hash of hashes) {
      const cid = normalizeIpfsCid(hash);
      if (cid) cidSet.add(cid);
    }
    const cids = Array.from(cidSet);
    if (cids.length === 0) return results;

    const checkOne = async (cid: string): Promise<void> => {
      for (const base of gatewayUrls) {
        const url = `${base}${encodeURIComponent(cid)}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const resp = await fetch(url, { method: "HEAD", signal: controller.signal });
          if (resp.ok) {
            results.set(cid, "ok");
            return;
          }
        } catch {
          // try next gateway
        } finally {
          clearTimeout(timer);
        }
      }
      results.set(cid, "fail");
    };

    const CONCURRENCY = Math.max(1, options?.concurrency ?? 4);
    let index = 0;
    const worker = async () => {
      while (index < cids.length) {
        const cid = cids[index++];
        if (cid) await checkOne(cid);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cids.length) }, () => worker()));
    return results;
  }

  /**
   * Serialize a dataset collection into a downloadable `Blob`.
   *
   * Delegates to the standalone `exportDatasets` utility. Prefer calling that
   * function directly when you do not need a fully configured `SdkClient`.
   *
   * @example
   * const blob = sdk.exportDatasets(items, "csv");
   * const blob = sdk.exportDatasets(items, "json", { meta: { source: "mine" } });
   */
  exportDatasets(
    datasets: DatasetMetadata[],
    format: ExportFormat,
    options?: ExportDatasetsOptions,
  ): Blob {
    return exportDatasetsUtil(datasets, format, options);
  }
}
