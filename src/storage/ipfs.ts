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

  return {
    async upload(
      data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
      uploadOptions: UploadOptions,
    ): Promise<UploadResult> {
      const blob = await toBlob(data);
      const form = new FormData();
      form.append("file", blob, uploadOptions.metadata.name || "dataset");

      const url = new URL(`${endpoint}/api/v0/add`);
      url.searchParams.set("pin", String(options.pin ?? true));
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
