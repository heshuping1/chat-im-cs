export interface ApiClientOptions {
  baseUrl: string;
  tenantToken?: string;
  platformToken?: string;
  adminToken?: string;
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
    return this.executeRequest<T>(path, init, token);
  }

  async platformRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.executeRequest<T>(path, init, this.options.platformToken);
  }

  protected uploadFormData<T>(
    path: string,
    body: FormData,
    options: UploadRequestOptions = {},
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let settled = false;
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
      const abort = () => {
        xhr.abort();
        finish(() => reject(new DOMException("Upload aborted", "AbortError")));
      };
      xhr.open("POST", `${this.options.baseUrl}${path}`);
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
      xhr.onerror = () => finish(() => reject(new ApiError(`网络错误 ${path}`)));
      xhr.onabort = () =>
        finish(() => reject(new DOMException("Upload aborted", "AbortError")));
      xhr.onload = () => {
        const payload = parseJson<ApiEnvelope<T> | T | null>(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) {
          const envelope = payload as ApiEnvelope<T> | null;
          finish(() =>
            reject(
              new ApiError(
                envelope?.message ?? `HTTP ${xhr.status} ${path}`,
                envelope?.code,
                envelope?.requestId,
                xhr.status,
              ),
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
            finish(() =>
              reject(
                new ApiError(
                  envelope.message ?? envelope.code,
                  envelope.code,
                  envelope.requestId,
                  xhr.status,
                ),
              ),
            );
            return;
          }
          finish(() => resolve(envelope.data));
          return;
        }
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
    });
  }

  private async executeRequest<T>(
    path: string,
    init: RequestInit,
    token?: string,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("X-Client-Trace-Id", this.options.traceId);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok) {
      const suffix = payload?.requestId ? ` requestId=${payload.requestId}` : "";
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
        throw new ApiError(
          `${payload.message ?? payload.code}${suffix}`,
          payload.code,
          payload.requestId,
          response.status,
        );
      }
      return payload.data;
    }
    return payload as T;
  }
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
