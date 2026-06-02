export type GatewayConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "retrying"
  | "stopped";

export interface ManagedGatewayConnection {
  start(): Promise<void>;
  stop(): Promise<void>;
  state?: string;
}

export interface GatewayConnectionAttemptContext {
  attempt: number;
  generation: number;
}

export interface GatewayConnectionLifecycleContext {
  attempt: number;
  connection: ManagedGatewayConnection;
  elapsedMs?: number;
  generation: number;
}

export interface GatewayConnectionFailureContext {
  attempt: number;
  elapsedMs?: number;
  error: unknown;
  generation: number;
}

export interface GatewayRetryContext {
  attempt: number;
  delayMs: number;
  generation: number;
}

export interface GatewayConnectionManagerOptions {
  createConnection(context: GatewayConnectionAttemptContext): Promise<ManagedGatewayConnection> | ManagedGatewayConnection;
  now?: () => number;
  onConnected?: (context: GatewayConnectionLifecycleContext) => void;
  onConnectionClosed?: (context: GatewayConnectionFailureContext & { connection: ManagedGatewayConnection }) => void;
  onRetryScheduled?: (context: GatewayRetryContext) => void;
  onStartAttempt?: (context: GatewayConnectionAttemptContext) => void;
  onStartFailed?: (context: GatewayConnectionFailureContext) => void;
  retryDelaysMs?: number[];
  setTimeout?: (callback: () => void, delayMs: number) => unknown;
  clearTimeout?: (timer: unknown) => void;
}

const defaultRetryDelaysMs = [1_000, 2_000, 5_000, 10_000, 30_000];

export class GatewayConnectionManager {
  private attempt = 0;
  private connection: ManagedGatewayConnection | null = null;
  private generation = 0;
  private retryTimer: unknown;
  private status: GatewayConnectionStatus = "idle";

  constructor(private readonly options: GatewayConnectionManagerOptions) {}

  get currentStatus() {
    return this.status;
  }

  get currentConnection() {
    return this.connection;
  }

  start() {
    this.stop();
    this.status = "connecting";
    this.generation += 1;
    this.attempt = 0;
    this.runAttempt(this.generation);
  }

  stop() {
    this.generation += 1;
    this.status = "stopped";
    this.clearRetryTimer();
    const connection = this.connection;
    this.connection = null;
    void connection?.stop().catch(() => undefined);
  }

  handleConnectionClosed(connection: ManagedGatewayConnection, error?: unknown) {
    if (connection !== this.connection || this.status === "stopped") return;
    this.connection = null;
    this.status = "retrying";
    const generation = this.generation;
    this.options.onConnectionClosed?.({
      attempt: this.attempt,
      connection,
      elapsedMs: 0,
      error,
      generation,
    });
    this.scheduleRetry(generation);
  }

  private async runAttempt(generation: number) {
    const attempt = this.attempt + 1;
    this.attempt = attempt;
    this.status = attempt === 1 ? "connecting" : "retrying";
    this.options.onStartAttempt?.({ attempt, generation });
    const startedAt = this.now();
    let connection: ManagedGatewayConnection | null = null;
    try {
      connection = await this.options.createConnection({ attempt, generation });
      if (!this.isCurrentGeneration(generation)) {
        void connection.stop().catch(() => undefined);
        return;
      }
      this.connection = connection;
      await connection.start();
      if (!this.isCurrentGeneration(generation)) {
        void connection.stop().catch(() => undefined);
        return;
      }
      this.status = "connected";
      this.attempt = 0;
      this.options.onConnected?.({
        attempt,
        connection,
        elapsedMs: this.now() - startedAt,
        generation,
      });
    } catch (error) {
      if (connection && connection === this.connection) this.connection = null;
      void connection?.stop().catch(() => undefined);
      if (!this.isCurrentGeneration(generation)) return;
      this.status = "retrying";
      this.options.onStartFailed?.({
        attempt,
        elapsedMs: this.now() - startedAt,
        error,
        generation,
      });
      this.scheduleRetry(generation);
    }
  }

  private scheduleRetry(generation: number) {
    if (!this.isCurrentGeneration(generation)) return;
    const delayMs = this.retryDelayForAttempt(this.attempt);
    this.options.onRetryScheduled?.({ attempt: this.attempt + 1, delayMs, generation });
    this.clearRetryTimer();
    this.retryTimer = this.setTimeout(() => {
      this.retryTimer = undefined;
      if (this.isCurrentGeneration(generation)) this.runAttempt(generation);
    }, delayMs);
  }

  private retryDelayForAttempt(attempt: number) {
    const delays = this.options.retryDelaysMs ?? defaultRetryDelaysMs;
    return delays[Math.min(Math.max(0, attempt - 1), delays.length - 1)] ?? 30_000;
  }

  private clearRetryTimer() {
    if (this.retryTimer === undefined) return;
    this.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  private isCurrentGeneration(generation: number) {
    return this.generation === generation && this.status !== "stopped";
  }

  private now() {
    return this.options.now?.() ?? Date.now();
  }

  private setTimeout(callback: () => void, delayMs: number) {
    return this.options.setTimeout?.(callback, delayMs) ?? globalThis.setTimeout(callback, delayMs);
  }

  private clearTimeout(timer: unknown) {
    if (this.options.clearTimeout) {
      this.options.clearTimeout(timer);
      return;
    }
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>);
  }
}
