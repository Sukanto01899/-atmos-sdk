export type DatasetId = string;
export type DatasetStatus = "active" | "verified" | "pending" | "rejected" | "deprecated";

export interface DatasetMetadata {
  id?: DatasetId;
  name: string;
  description: string;
  dataType: string;
  owner?: string;
  status?: DatasetStatus;
  isPublic: boolean;
  collectionDate: number;
  createdAt?: number;
  altitudeMin: number;
  altitudeMax: number;
  latitude: number; // degrees
  longitude: number; // degrees
  ipfsHash?: string;
  tags?: string[];
  sizeBytes?: number;
  checksum?: string; // hex or base64
  mimeType?: string;
}

export interface UploadOptions {
  metadata: DatasetMetadata;
  contentLength?: number;
  checksum?: string;
  chunkSize?: number;
  onProgress?: (progress: UploadProgress) => void;
  abortSignal?: AbortSignal;
  resumable?: boolean;
  sessionId?: string;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes?: number;
  percent?: number;
  part?: number;
  totalParts?: number;
}

export interface UploadResult {
  id: DatasetId;
  location: string; // ipfs://, s3://, https://
  checksum?: string;
  sessionId?: string;
}

export interface BundleUploadFile {
  path: string;
  data: Blob | ArrayBuffer | ReadableStream<Uint8Array>;
  mimeType?: string;
}

export interface DatasetBundleFileEntry {
  path: string;
  sizeBytes: number;
  checksumSha256: string;
  mimeType?: string;
}

export interface DatasetBundleManifest {
  manifestVersion: 1;
  createdAt: number; // unix epoch seconds
  metadata?: DatasetMetadata;
  files: DatasetBundleFileEntry[];
}

export interface UploadBundleProgress {
  stage: "hashing" | "uploading";
  file?: string;
  completedFiles?: number;
  totalFiles?: number;
}

export interface UploadBundleOptions {
  metadata: DatasetMetadata;
  files: BundleUploadFile[];
  includeMetadataInManifest?: boolean;
  manifestPath?: string; // default: "manifest.json"
  onProgress?: (progress: UploadBundleProgress) => void;
  abortSignal?: AbortSignal;
}

export interface UploadBundleResult {
  id: DatasetId; // directory CID
  location: string; // ipfs://, s3://, https://
  manifest: DatasetBundleManifest;
  manifestCid?: DatasetId;
  fileCids?: Record<string, DatasetId>;
}

export interface DownloadBundleOptions {
  manifestPath?: string; // default: "manifest.json"
  abortSignal?: AbortSignal;
}

export interface VerifyBundleResult {
  ok: boolean;
  reason?: string;
  mismatches?: { path: string; expected: string; actual: string }[];
}

export interface BatchOptions {
  concurrency?: number;
  stopOnError?: boolean;
  retries?: number;
  retryDelayMs?: number;
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  inFlight: number;
}

export type BatchResult<TItem, TResult> =
  | { item: TItem; status: "fulfilled"; result: TResult }
  | { item: TItem; status: "rejected"; error: unknown };

export interface UploadBatchItem {
  data: Blob | ArrayBuffer | ReadableStream<Uint8Array>;
  options: UploadOptions;
}

export interface DownloadBatchItem {
  id: DatasetId;
  options?: DownloadOptions;
}

export interface DownloadOptions {
  range?: { start: number; end?: number };
  asStream?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
  abortSignal?: AbortSignal;
}

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes?: number;
  percent?: number;
}

export interface DownloadResult {
  data?: ArrayBuffer;
  stream?: ReadableStream<Uint8Array>;
  metadata?: DatasetMetadata;
}

export interface PreviewOptions {
  format?: "csv" | "json" | "parquet" | "auto";
  maxRows?: number;
  columns?: string[];
}

export interface PreviewResult {
  rows: Record<string, unknown>[];
  schema?: Record<string, string>;
}

export interface VerifyOptions {
  checksum?: string;
  sizeBytes?: number;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export interface ListDatasetsOptions {
  owner?: string;
  dataType?: string;
  status?: DatasetStatus;
  isPublic?: boolean;
  from?: number;
  to?: number;
  tags?: string[];
  limit?: number;
  cursor?: string;
  sort?: string;
  visibility?: "public" | "private";
}

export interface ListDatasetsResult {
  items: DatasetMetadata[];
  nextCursor?: string;
}

export interface HealthResult {
  ok: boolean;
  [key: string]: unknown;
}

export interface AuthProvider {
  getAccessToken: () => Promise<string>;
}

export interface Transport {
  request: <T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      signal?: AbortSignal;
    },
  ) => Promise<T>;
}

export interface StorageAdapter {
  upload: (
    data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
    options: UploadOptions,
  ) => Promise<UploadResult>;
  download: (id: DatasetId, options?: DownloadOptions) => Promise<DownloadResult>;
  preview: (id: DatasetId, options?: PreviewOptions) => Promise<PreviewResult>;
  verify: (id: DatasetId, options?: VerifyOptions) => Promise<VerifyResult>;

  uploadBundle?: (options: UploadBundleOptions) => Promise<UploadBundleResult>;
  downloadBundleManifest?: (
    id: DatasetId,
    options?: DownloadBundleOptions,
  ) => Promise<DatasetBundleManifest>;
  downloadBundleFile?: (
    id: DatasetId,
    path: string,
    options?: DownloadOptions,
  ) => Promise<DownloadResult>;
  verifyBundle?: (id: DatasetId, options?: DownloadBundleOptions) => Promise<VerifyBundleResult>;
}

export interface RegistryAdapter {
  registerDataset: (metadata: DatasetMetadata) => Promise<{
    datasetId: string | number;
    receipt?: unknown;
  }>;
}

export interface OnChainPublisher {
  buildRegisterDatasetTx: (metadata: DatasetMetadata) => Promise<unknown> | unknown;
  submitTx?: (tx: unknown) => Promise<{ txId: string; receipt?: unknown }>;
}

export type PublishTarget = "api" | "onchain" | "both" | "none";

export type PublishInput =
  | {
      kind: "file";
      data: Blob | ArrayBuffer | ReadableStream<Uint8Array>;
      upload?: Omit<UploadOptions, "metadata">;
    }
  | {
      kind: "bundle";
      files: BundleUploadFile[];
      bundle?: Omit<UploadBundleOptions, "metadata" | "files">;
    };

export type PublishOptions = PublishInput & {
  metadata: DatasetMetadata;
  target?: PublishTarget;
  broadcastOnChainTx?: boolean;
};

export interface PublishResult {
  metadata: DatasetMetadata;
  upload: UploadResult | UploadBundleResult;
  api?: { datasetId: string | number; receipt?: unknown };
  onchain?: { tx: unknown; txId?: string; receipt?: unknown };
}

export interface SdkClientOptions {
  baseUrl: string;
  auth?: AuthProvider;
  transport?: Transport;
  storage?: StorageAdapter;
  registry?: RegistryAdapter;
  onchain?: OnChainPublisher;
}

export class SdkError extends Error {
  code: string;
  status?: number;
  details?: unknown;
  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
