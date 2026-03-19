import type {
  DatasetId,
  DownloadOptions,
  DownloadResult,
  PreviewOptions,
  PreviewResult,
  StorageAdapter,
  UploadOptions,
  UploadResult,
  VerifyOptions,
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
    form.append("file", new Blob([chunk]));
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
  };
};
