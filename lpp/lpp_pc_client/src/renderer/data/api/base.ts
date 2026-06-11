import { logApiErrorDiagnostic } from "./api-error-diagnostics";
import {
  logApiTrafficDiagnostic,
  summarizeRequestBody,
} from "./api-traffic-diagnostics";
import { getAppInstanceHeaders } from "../app-instance/app-instance";

export interface ApiClientOptions {
  baseUrl: string;
  adminBaseUrl?: string;
  tenantToken?: string;
  platformToken?: string;
  adminToken?: string;
  tenantId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName?: string;
  spaceType?: number;
  userId?: string;
  membershipRole?: number;
  traceId: string;
}

export interface ApiEnvelope<T> {
  code: string;
  message?: string;
  requestId?: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly requestId?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type UploadRequestOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: { loaded: number; total?: number; percent?: number }) => void;
};

export class ApiBaseClient {
  constructor(protected readonly options: ApiClientOptions) {}

  async request<T>(
    path: string,
    init: RequestInit = {},
    admin = false,
  ): Promise<T> {
    const token = admin ? this.options.adminToken : this.options.tenantToken;
    return this.executeRequest<T>(
      path,
      init,
      token,
      admin ? adminApiBaseUrl(this.options) : this.options.baseUrl,
    );
  }

  async platformRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.executeRequest<T>(
      path,
      init,
      this.options.platformToken,
      this.options.baseUrl,
    );
  }

  protected uploadFormData<T>(
    path: string,
    body: FormData,
    options: UploadRequestOptions = {},
  ): Promise<T> {
    const startedAt = Date.now();
    const method = "POST";
    const requestBody = summarizeRequestBody(body);
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let settled = false;
      let trafficLogged = false;
      let abortListener: (() => void) | undefined;
      const cleanup = () => {
        if (abortListener) {
          options.signal?.removeEventListener("abort", abortListener);
        }
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const rejectWithDiagnostic = (error: unknown) =>
        finish(() => {
          if (!trafficLogged) {
            trafficLogged = true;
            logApiTrafficDiagnostic({
              phase: "upload",
              result: "failed",
              method,
              path,
              durationMs: Date.now() - startedAt,
              requestBody,
              error,
            });
          }
          logApiErrorDiagnostic({
            phase: "upload",
            method,
            path,
            durationMs: Date.now() - startedAt,
            error,
          });
          reject(error);
        });
      const abort = () => {
        xhr.abort();
        rejectWithDiagnostic(new DOMException("Upload aborted", "AbortError"));
      };
      void getAppInstanceHeaders().then((appHeaders) => {
        xhr.open("POST", `${this.options.baseUrl}${path}`);
        Object.entries(appHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      xhr.setRequestHeader("X-Client-Trace-Id", this.options.traceId);
      if (this.options.tenantToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.options.tenantToken}`);
      }
      xhr.upload.onprogress = (event) => {
        options.onProgress?.({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : undefined,
          percent:
            event.lengthComputable && event.total > 0
              ? Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)))
              : undefined,
        });
      };
      xhr.onerror = () => rejectWithDiagnostic(new ApiError(`Network error ${path}`));
      xhr.onabort = () =>
        rejectWithDiagnostic(new DOMException("Upload aborted", "AbortError"));
      xhr.onload = () => {
        const payload = parseJson<ApiEnvelope<T> | T | null>(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) {
          const envelope = payload as ApiEnvelope<T> | null;
          trafficLogged = true;
          logApiTrafficDiagnostic({
            phase: "upload",
            result: "failed",
            method,
            path,
            status: xhr.status,
            durationMs: Date.now() - startedAt,
            requestId: envelope?.requestId,
            requestBody,
            responseBody: payload,
          });
          rejectWithDiagnostic(
            new ApiError(
              envelope?.message ?? `HTTP ${xhr.status} ${path}`,
              envelope?.code,
              envelope?.requestId,
              xhr.status,
            ),
          );
          return;
        }
        if (
          payload &&
          typeof payload === "object" &&
          "code" in payload &&
          "data" in payload
        ) {
          const envelope = payload as ApiEnvelope<T>;
          if (envelope.code !== "OK" && envelope.code !== "SUCCESS") {
            trafficLogged = true;
            logApiTrafficDiagnostic({
              phase: "upload",
              result: "failed",
              method,
              path,
              status: xhr.status,
              durationMs: Date.now() - startedAt,
              requestId: envelope.requestId,
              requestBody,
              responseBody: payload,
            });
            rejectWithDiagnostic(
              new ApiError(
                envelope.message ?? envelope.code,
                envelope.code,
                envelope.requestId,
                xhr.status,
              ),
            );
            return;
          }
          logApiTrafficDiagnostic({
            phase: "upload",
            result: "success",
            method,
            path,
            status: xhr.status,
            durationMs: Date.now() - startedAt,
            requestId: envelope.requestId,
            requestBody,
            responseBody: envelope.data,
          });
          finish(() => resolve(envelope.data));
          return;
        }
        logApiTrafficDiagnostic({
          phase: "upload",
          result: "success",
          method,
          path,
          status: xhr.status,
          durationMs: Date.now() - startedAt,
          requestBody,
          responseBody: payload,
        });
        finish(() => resolve(payload as T));
      };
      if (options.signal) {
        if (options.signal.aborted) {
          abort();
          return;
        }
        abortListener = abort;
        options.signal.addEventListener("abort", abortListener, { once: true });
      }
        xhr.send(body);
      }).catch(rejectWithDiagnostic);
    });
  }

  private async executeRequest<T>(
    path: string,
    init: RequestInit,
    token?: string,
    baseUrl = this.options.baseUrl,
  ): Promise<T> {
    const startedAt = Date.now();
    const method = init.method ?? "GET";
    const requestBody = summarizeRequestBody(init.body);
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("X-Client-Trace-Id", this.options.traceId);
    Object.entries(await getAppInstanceHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    if (this.options.tenantId) {
      headers.set("X-Tenant-Id", this.options.tenantId);
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: "omit",
        headers,
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<T> | null;
      if (!response.ok) {
        const suffix = payload?.requestId ? ` requestId=${payload.requestId}` : "";
        logApiTrafficDiagnostic({
          phase: "request",
          result: "failed",
          method,
          path,
          status: response.status,
          durationMs: Date.now() - startedAt,
          requestId: payload?.requestId,
          requestBody,
          responseBody: payload,
        });
        throw new ApiError(
          payload?.message ?? `HTTP ${response.status} ${path}${suffix}`,
          payload?.code,
          payload?.requestId,
          response.status,
        );
      }
      if (
        payload &&
        typeof payload === "object" &&
        "code" in payload &&
        "data" in payload
      ) {
        if (payload.code !== "OK" && payload.code !== "SUCCESS") {
          const suffix = payload.requestId ? ` requestId=${payload.requestId}` : "";
          logApiTrafficDiagnostic({
            phase: "request",
            result: "failed",
            method,
            path,
            status: response.status,
            durationMs: Date.now() - startedAt,
            requestId: payload.requestId,
            requestBody,
            responseBody: payload,
          });
          throw new ApiError(
            `${payload.message ?? payload.code}${suffix}`,
            payload.code,
            payload.requestId,
            response.status,
          );
        }
        logApiTrafficDiagnostic({
          phase: "request",
          result: "success",
          method,
          path,
          status: response.status,
          durationMs: Date.now() - startedAt,
          requestId: payload.requestId,
          requestBody,
          responseBody: payload.data,
        });
        return payload.data;
      }
      logApiTrafficDiagnostic({
        phase: "request",
        result: "success",
        method,
        path,
        status: response.status,
        durationMs: Date.now() - startedAt,
        requestBody,
        responseBody: payload,
      });
      return payload as T;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        logApiTrafficDiagnostic({
          phase: "request",
          result: "failed",
          method,
          path,
          durationMs: Date.now() - startedAt,
          requestBody,
          error,
        });
      }
      logApiErrorDiagnostic({
        phase: "request",
        method,
        path,
        durationMs: Date.now() - startedAt,
        error,
      });
      throw error;
    }
  }
}

function adminApiBaseUrl(options: ApiClientOptions) {
  return options.adminBaseUrl?.trim() || deriveAdminApiBaseUrl(options.baseUrl);
}

export function deriveAdminApiBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/$/, "");
  try {
    const url = new URL(normalized);
    if (url.hostname === "chat.hearteasechat.com") {
      url.hostname = "admin.hearteasechat.com";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return normalized;
  }
  return normalized;
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
