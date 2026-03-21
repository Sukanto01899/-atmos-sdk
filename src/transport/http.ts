import type { SdkClientOptions, Transport } from "../types";
import { SdkError } from "../types";

export const httpTransport = (options: SdkClientOptions): Transport => ({
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    req?: {
      headers?: Record<string, string>;
      body?: unknown;
      signal?: AbortSignal;
    },
  ) {
    const url = `${options.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(req?.headers ?? {}),
    };

    if (options.auth) {
      const token = await options.auth.getAccessToken();
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: req?.body ? JSON.stringify(req.body) : undefined,
      signal: req?.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SdkError(
        "E_HTTP",
        `Request failed with ${response.status}`,
        response.status,
        text,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  },
});
