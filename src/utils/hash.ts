import { SdkError } from "../types";

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const sha256HexFromArrayBuffer = async (data: ArrayBuffer) => {
  if (!globalThis.crypto?.subtle) {
    throw new SdkError("E_CRYPTO", "WebCrypto is not available (crypto.subtle).");
  }
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

export const sha256HexFromText = async (text: string) => {
  const bytes = new TextEncoder().encode(text);
  return sha256HexFromArrayBuffer(bytes.buffer);
};

export const readToArrayBuffer = async (
  data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
): Promise<ArrayBuffer> => {
  if (data instanceof ArrayBuffer) return data;
  if (data instanceof Blob) return await data.arrayBuffer();
  return await new Response(data).arrayBuffer();
};

export const computeSha256AndSize = async (
  data: Blob | ArrayBuffer | ReadableStream<Uint8Array>,
): Promise<{
  checksumSha256: string;
  sizeBytes: number;
  uploadData: Blob | ArrayBuffer;
  mimeType?: string;
}> => {
  if (data instanceof Blob) {
    const buffer = await data.arrayBuffer();
    return {
      checksumSha256: await sha256HexFromArrayBuffer(buffer),
      sizeBytes: data.size,
      uploadData: data,
      mimeType: data.type || undefined,
    };
  }

  if (data instanceof ArrayBuffer) {
    return {
      checksumSha256: await sha256HexFromArrayBuffer(data),
      sizeBytes: data.byteLength,
      uploadData: data,
    };
  }

  const buffer = await readToArrayBuffer(data);
  return {
    checksumSha256: await sha256HexFromArrayBuffer(buffer),
    sizeBytes: buffer.byteLength,
    uploadData: buffer,
  };
};

