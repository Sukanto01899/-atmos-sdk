import type { SdkClientOptions, Transport } from "../types";
import { SdkError } from "../types";
import { toQueryString } from "../utils/query";

const normalizeBaseUrl = (baseUrl: string) => String(baseUrl ?? "").replace(/\/+$/, "");
const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

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

    const baseUrl = `${normalizeBaseUrl(options.baseUrl)}${normalizePath(path)}`;
    const url =
      query && baseUrl.includes("?") ? `${baseUrl}&${query.slice(1)}` : `${baseUrl}${query}`;
    const hasJsonBody = !isQueryBodyMethod && req?.body !== undefined;
    const headers: Record<string, string> = {
      ...(hasJsonBody ? { "content-type": "application/json" } : {}),
      ...(req?.headers ?? {}),
    };

    if (options.auth) {
      const token = await options.auth.getAccessToken();
      headers.authorization = `Bearer ${token}`;
    }

    // Merge caller's AbortSignal with an optional per-request timeout signal.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let signal = req?.signal;

    if (options.timeoutMs && options.timeoutMs > 0) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

      if (req?.signal) {
        // Forward external abort into our controller.
        req.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
      signal = controller.signal;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: hasJsonBody ? JSON.stringify(req?.body) : undefined,
        signal,
      });
    } catch (error: unknown) {
      const isTimeout =
        error instanceof DOMException && error.name === "AbortError" && options.timeoutMs
          ? true
          : false;
      throw new SdkError(
        isTimeout ? "E_TIMEOUT" : "E_HTTP",
        isTimeout
          ? `Request timed out after ${options.timeoutMs}ms.`
          : "Network request failed.",
        0,
        { url, error },
      );
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new SdkError(
        "E_HTTP",
        `Request failed with ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
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
