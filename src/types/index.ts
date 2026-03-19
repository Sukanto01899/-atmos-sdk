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
  limit?: number;
  cursor?: string;
}

export interface ListDatasetsResult {
  items: DatasetMetadata[];
  nextCursor?: string;
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
}

export interface SdkClientOptions {
  baseUrl: string;
  auth?: AuthProvider;
  transport?: Transport;
  storage?: StorageAdapter;
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
