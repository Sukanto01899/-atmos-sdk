import type { SdkClientOptions, Transport } from "../types";
import { SdkError } from "../types";
import { toQueryString } from "../utils/query";

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
    const isQueryBodyMethod = method === "GET" || method === "DELETE";
    const query =
      isQueryBodyMethod && req?.body && typeof req.body === "object"
        ? toQueryString(req.body as Record<string, string | number | boolean | undefined>)
        : "";

    const url = `${options.baseUrl}${path}${query}`;
    const hasJsonBody = !isQueryBodyMethod && req?.body !== undefined;
    const headers: Record<string, string> = {
      ...(hasJsonBody ? { "content-type": "application/json" } : {}),
      ...(req?.headers ?? {}),
    };

    if (options.auth) {
      const token = await options.auth.getAccessToken();
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: hasJsonBody ? JSON.stringify(req.body) : undefined,
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

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  },
});
