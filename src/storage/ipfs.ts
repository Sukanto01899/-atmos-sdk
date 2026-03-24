import type {
  DatasetId,
  DatasetBundleManifest,
  DownloadBundleOptions,
  DownloadOptions,
  DownloadResult,
  PreviewOptions,
  PreviewResult,
  StorageAdapter,
  UploadBundleOptions,
  UploadBundleResult,
  UploadOptions,
  UploadResult,
  VerifyOptions,
  VerifyBundleResult,
  VerifyResult,
} from "../types";
import { SdkError } from "../types";

export interface IpfsAdapterOptions {
  endpoint: string;
  headers?: Record<string, string>;
  pin?: boolean;
  timeoutMs?: number;
  cidVersion?: 0 | 1;
  cidBase?: string;
  mfsRoot?: string;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs?: number) => {
  if (!timeoutMs) return promise;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        controller.signal.addEventListener("abort", () =>
          reject(new SdkError("E_TIMEOUT", "Request timed out.")),
        ),
      ),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

const ensureEndpoint = (endpoint: string) => endpoint.replace(/\/$/, "");

const toBlob = async (
  data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
): Promise<Blob> => {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data]);
  const buffer = await new Response(data).arrayBuffer();
  return new Blob([buffer]);
};

const readStreamChunks = async (
  stream: ReadableStream<Uint8Array>,
  chunkSize: number,
  onChunk: (chunk: Uint8Array) => Promise<void>,
) => {
  const reader = stream.getReader();
  let buffered = new Uint8Array(0);
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const next = new Uint8Array(buffered.length + result.value.length);
      next.set(buffered);
      next.set(result.value, buffered.length);
      buffered = next;

      while (buffered.length >= chunkSize) {
        const chunk = buffered.slice(0, chunkSize);
        buffered = buffered.slice(chunkSize);
        await onChunk(chunk);
      }
    }

    if (buffered.length > 0) {
      await onChunk(buffered);
    }
  } finally {
    reader.releaseLock();
  }
};

const fetchJson = async <T>(
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<T> => {
  const response = await withTimeout(fetch(url, init), timeoutMs);
  if (!response.ok) {
    const text = await response.text();
    throw new SdkError("E_IPFS", `IPFS request failed: ${text}`, response.status);
  }
  return (await response.json()) as T;
};

const parseCsv = (text: string, maxRows: number) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((col) => col.trim());
  return lines.slice(1, maxRows + 1).map((line) => {
    const values = line.split(",");
    const row: Record<string, unknown> = {};
    header.forEach((key, index) => {
      row[key] = values[index]?.trim() ?? "";
    });
    return row;
  });
};

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (data: ArrayBuffer) => {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

const normalizeBundlePath = (input: string) => {
  const trimmed = input.replace(/\\/g, "/").trim();
  if (!trimmed) {
    throw new SdkError("E_BUNDLE", "Bundle file path is required.");
  }
  if (trimmed.startsWith("/")) {
    throw new SdkError("E_BUNDLE", "Bundle file paths must be relative.");
  }
  const parts = trimmed.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new SdkError("E_BUNDLE", "Bundle file path is invalid.");
  }
  for (const part of parts) {
    if (part === "." || part === "..") {
      throw new SdkError("E_BUNDLE", "Bundle file paths cannot contain '.' or '..'.");
    }
    if (part.includes("\0")) {
      throw new SdkError("E_BUNDLE", "Bundle file paths cannot contain null bytes.");
    }
  }
  return parts.join("/");
};

const parseIpfsAddNdjson = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items: { Name?: string; Hash: string }[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { Name?: string; Hash?: string };
      if (typeof parsed.Hash !== "string" || parsed.Hash.length === 0) continue;
      items.push({ Name: parsed.Name, Hash: parsed.Hash });
    } catch {
      // ignore malformed lines
    }
  }
  return items;
};

export const createIpfsAdapter = (options: IpfsAdapterOptions): StorageAdapter => {
  const endpoint = ensureEndpoint(options.endpoint);
  const headers = options.headers ?? {};
  const cidVersion = options.cidVersion ?? 0;
  const cidBase = options.cidBase ?? (cidVersion === 1 ? "base32" : "base58btc");
  const mfsRoot = options.mfsRoot ?? "/atmos";
  const defaultChunkSize = 5 * 1024 * 1024;

  const writeMfsChunk = async (
    path: string,
    chunk: Uint8Array,
    offset: number,
    signal?: AbortSignal,
  ) => {
    const form = new FormData();
    const safeChunk = new Uint8Array(chunk.length);
    safeChunk.set(chunk);
    form.append("file", new Blob([safeChunk]));
    const url = new URL(`${endpoint}/api/v0/files/write`);
    url.searchParams.set("arg", path);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("create", "true");
    url.searchParams.set("truncate", "false");
    url.searchParams.set("parents", "true");

    const response = await withTimeout(
      fetch(url.toString(), {
        method: "POST",
        headers,
        body: form,
        signal,
      }),
      options.timeoutMs,
    );
    if (!response.ok) {
      const text = await response.text();
      throw new SdkError("E_IPFS", `MFS write failed: ${text}`, response.status);
    }
  };

  const statMfs = async (path: string) =>
    fetchJson<{ Hash: string; Size: number }>(
      `${endpoint}/api/v0/files/stat?arg=${encodeURIComponent(path)}&hash=true&size=true`,
      { method: "POST", headers },
      options.timeoutMs,
    );

  const formatCid = async (cid: string) => {
    if (cidVersion !== 1) return cid;
    const url = `${endpoint}/api/v0/cid/format?arg=${cid}&v=1&b=${cidBase}`;
    try {
      const formatted = await fetchJson<{ String: string }>(
        url,
        { method: "POST", headers },
        options.timeoutMs,
      );
      return formatted.String ?? cid;
    } catch {
      return cid;
    }
  };

  return {
    async upload(
      data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
      uploadOptions: UploadOptions,
    ): Promise<UploadResult> {
      const chunkSize = uploadOptions.chunkSize ?? defaultChunkSize;

      if (uploadOptions.resumable) {
        const sessionId =
          uploadOptions.sessionId ??
          `${uploadOptions.metadata.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
        const path = `${mfsRoot}/${sessionId}`;

        let offset = 0;
        try {
          const stat = await statMfs(path);
          offset = stat.Size;
        } catch {
          offset = 0;
        }

        let uploadedBytes = offset;
        const reportProgress = () => {
          if (uploadOptions.onProgress) {
            const totalBytes =
              uploadOptions.contentLength ?? (data instanceof Blob ? data.size : undefined);
            const percent =
              totalBytes && totalBytes > 0
                ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100))
                : undefined;
            uploadOptions.onProgress({ uploadedBytes, totalBytes, percent });
          }
        };

        if (data instanceof Blob || data instanceof ArrayBuffer) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          for (let start = offset; start < blob.size; start += chunkSize) {
            const chunk = await blob.slice(start, start + chunkSize).arrayBuffer();
            await writeMfsChunk(path, new Uint8Array(chunk), start, uploadOptions.abortSignal);
            uploadedBytes = Math.min(blob.size, start + chunk.byteLength);
            reportProgress();
          }
        } else {
          await readStreamChunks(data, chunkSize, async (chunk) => {
            await writeMfsChunk(path, chunk, uploadedBytes, uploadOptions.abortSignal);
            uploadedBytes += chunk.byteLength;
            reportProgress();
          });
        }

        const stat = await statMfs(path);
        const cid = await formatCid(stat.Hash);
        return {
          id: cid,
          location: `ipfs://${cid}`,
          checksum: uploadOptions.checksum,
          sessionId,
        };
      }

      const blob = await toBlob(data);
      const form = new FormData();
      form.append("file", blob, uploadOptions.metadata.name || "dataset");

      const url = new URL(`${endpoint}/api/v0/add`);
      url.searchParams.set("pin", String(options.pin ?? true));
      url.searchParams.set("cid-version", String(cidVersion));
      if (cidVersion === 1) {
        url.searchParams.set("cid-base", cidBase);
        url.searchParams.set("raw-leaves", "true");
      }
      if (uploadOptions.chunkSize) {
        url.searchParams.set("chunker", `size-${uploadOptions.chunkSize}`);
      }

      const response = await withTimeout(
        fetch(url.toString(), {
          method: "POST",
          headers,
          body: form,
          signal: uploadOptions.abortSignal,
        }),
        options.timeoutMs,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new SdkError("E_IPFS", `Upload failed: ${text}`, response.status);
      }

      const result = (await response.json()) as { Hash: string };
      return {
        id: result.Hash,
        location: `ipfs://${result.Hash}`,
        checksum: uploadOptions.checksum,
      };
    },

    async download(
      id: DatasetId,
      downloadOptions?: DownloadOptions,
    ): Promise<DownloadResult> {
      const url = new URL(`${endpoint}/api/v0/cat`);
      url.searchParams.set("arg", id);
      const response = await withTimeout(
        fetch(url.toString(), {
          method: "POST",
          headers,
          signal: downloadOptions?.abortSignal,
        }),
        options.timeoutMs,
      );
      if (!response.ok) {
        const text = await response.text();
        throw new SdkError("E_IPFS", `Download failed: ${text}`, response.status);
      }

      if (downloadOptions?.asStream) {
        if (!response.body) {
          throw new SdkError("E_STREAM", "Readable stream not supported.");
        }
        return { stream: response.body };
      }

      const data = await response.arrayBuffer();
      return { data };
    },

    async preview(id: DatasetId, previewOptions?: PreviewOptions): Promise<PreviewResult> {
      const maxRows = previewOptions?.maxRows ?? 10;
      const format = previewOptions?.format ?? "auto";
      const { data } = await this.download(id);
      if (!data) return { rows: [] };

      const text = new TextDecoder().decode(data);
      if (format === "json" || (format === "auto" && text.trim().startsWith("{"))) {
        const parsed = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[];
        const rows = Array.isArray(parsed)
          ? parsed.slice(0, maxRows)
          : [parsed].slice(0, maxRows);
        return { rows };
      }

      const rows = parseCsv(text, maxRows);
      return { rows };
    },

    async verify(id: DatasetId, verifyOptions?: VerifyOptions): Promise<VerifyResult> {
      if (!verifyOptions?.checksum && !verifyOptions?.sizeBytes) {
        return { ok: true };
      }

      if (verifyOptions.sizeBytes) {
        const stat = await fetchJson<{ CumulativeSize: number }>(
          `${endpoint}/api/v0/object/stat?arg=${id}`,
          { method: "POST", headers },
          options.timeoutMs,
        );
        if (stat.CumulativeSize !== verifyOptions.sizeBytes) {
          return {
            ok: false,
            reason: "Size mismatch.",
          };
        }
      }

      if (verifyOptions.checksum) {
        const { data } = await this.download(id);
        if (!data) {
          return { ok: false, reason: "Unable to fetch data." };
        }
        const hash = await sha256Hex(data);
        if (hash.toLowerCase() !== verifyOptions.checksum.toLowerCase()) {
          return { ok: false, reason: "Checksum mismatch." };
        }
      }

      return { ok: true };
    },

    async uploadBundle(bundleOptions: UploadBundleOptions): Promise<UploadBundleResult> {
      const manifestPath = normalizeBundlePath(bundleOptions.manifestPath ?? "manifest.json");
      const includeMetadata = bundleOptions.includeMetadataInManifest ?? true;

      if (!bundleOptions.files || bundleOptions.files.length === 0) {
        throw new SdkError("E_BUNDLE", "Bundle must include at least one file.");
      }

      const seen = new Set<string>();
      const totalFiles = bundleOptions.files.length + 1; // include manifest
      let completedFiles = 0;

      const report = (progress: { stage: "hashing" | "uploading"; file?: string }) => {
        if (!bundleOptions.onProgress) return;
        bundleOptions.onProgress({
          stage: progress.stage,
          file: progress.file,
          completedFiles,
          totalFiles,
        });
      };

      const prepared: {
        path: string;
        blob: Blob;
        checksumSha256: string;
        sizeBytes: number;
        mimeType?: string;
      }[] = [];

      for (const file of bundleOptions.files) {
        const path = normalizeBundlePath(file.path);
        if (path === manifestPath) {
          throw new SdkError("E_BUNDLE", `Bundle file path conflicts with manifest: ${path}`);
        }
        if (seen.has(path)) {
          throw new SdkError("E_BUNDLE", `Duplicate bundle file path: ${path}`);
        }
        seen.add(path);

        report({ stage: "hashing", file: path });
        const blob = await toBlob(file.data);
        const checksumSha256 = await sha256Hex(await blob.arrayBuffer());
        prepared.push({
          path,
          blob,
          checksumSha256,
          sizeBytes: blob.size,
          mimeType: file.mimeType ?? (blob.type || undefined),
        });
        completedFiles += 1;
      }

      const manifest: DatasetBundleManifest = {
        manifestVersion: 1,
        createdAt: Math.floor(Date.now() / 1000),
        metadata: includeMetadata ? bundleOptions.metadata : undefined,
        files: prepared.map((file) => ({
          path: file.path,
          sizeBytes: file.sizeBytes,
          checksumSha256: file.checksumSha256,
          mimeType: file.mimeType,
        })),
      };

      report({ stage: "hashing", file: manifestPath });
      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      });
      completedFiles += 1;

      report({ stage: "uploading" });
      const form = new FormData();
      for (const file of prepared) {
        form.append("file", file.blob, file.path);
      }
      form.append("file", manifestBlob, manifestPath);

      const url = new URL(`${endpoint}/api/v0/add`);
      url.searchParams.set("pin", String(options.pin ?? true));
      url.searchParams.set("cid-version", String(cidVersion));
      if (cidVersion === 1) {
        url.searchParams.set("cid-base", cidBase);
        url.searchParams.set("raw-leaves", "true");
      }
      url.searchParams.set("wrap-with-directory", "true");

      const response = await withTimeout(
        fetch(url.toString(), {
          method: "POST",
          headers,
          body: form,
          signal: bundleOptions.abortSignal,
        }),
        options.timeoutMs,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new SdkError("E_IPFS", `Bundle upload failed: ${text}`, response.status);
      }

      const items = parseIpfsAddNdjson(await response.text());
      if (items.length === 0) {
        throw new SdkError("E_IPFS", "Bundle upload returned no CIDs.");
      }

      const fileCids: Record<string, DatasetId> = {};
      let manifestCid: DatasetId | undefined;
      for (const item of items.slice(0, -1)) {
        const name = typeof item.Name === "string" ? item.Name.replace(/\\/g, "/") : "";
        if (!name) continue;
        if (name === manifestPath) {
          manifestCid = item.Hash;
        } else {
          fileCids[name] = item.Hash;
        }
      }

      const dirCid = items[items.length - 1].Hash;
      return {
        id: dirCid,
        location: `ipfs://${dirCid}`,
        manifest,
        manifestCid,
        fileCids,
      };
    },

    async downloadBundleManifest(
      id: DatasetId,
      options?: DownloadBundleOptions,
    ): Promise<DatasetBundleManifest> {
      const manifestPath = normalizeBundlePath(options?.manifestPath ?? "manifest.json");
      const { data } = await this.download(`${id}/${manifestPath}`, {
        abortSignal: options?.abortSignal,
      });
      if (!data) {
        throw new SdkError("E_BUNDLE", "Bundle manifest not found.");
      }
      const text = new TextDecoder().decode(data);
      return JSON.parse(text) as DatasetBundleManifest;
    },

    async downloadBundleFile(
      id: DatasetId,
      path: string,
      options?: DownloadOptions,
    ): Promise<DownloadResult> {
      const normalized = normalizeBundlePath(path);
      return this.download(`${id}/${normalized}`, options);
    },

    async verifyBundle(id: DatasetId, options?: DownloadBundleOptions): Promise<VerifyBundleResult> {
      const manifest = await this.downloadBundleManifest!(id, options);
      const mismatches: { path: string; expected: string; actual: string }[] = [];

      for (const file of manifest.files) {
        const { data } = await this.downloadBundleFile!(id, file.path, {
          abortSignal: options?.abortSignal,
        });
        if (!data) {
          return { ok: false, reason: `Missing bundle file: ${file.path}` };
        }
        const actual = await sha256Hex(data);
        if (actual.toLowerCase() !== file.checksumSha256.toLowerCase()) {
          mismatches.push({ path: file.path, expected: file.checksumSha256, actual });
        }
      }

      if (mismatches.length > 0) {
        return { ok: false, reason: "Checksum mismatch.", mismatches };
      }

      return { ok: true };
    },
  };
};
