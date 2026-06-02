import { describe, expect, it, vi } from "vitest";
import {
  GatewayConnectionManager,
  type ManagedGatewayConnection,
} from "../../src/renderer/data/gateway/gateway-connection-manager";

function fakeConnection(): ManagedGatewayConnection & { started: boolean; stopped: boolean } {
  return {
    started: false,
    stopped: false,
    state: "Disconnected",
    async start() {
      this.started = true;
      this.state = "Connected";
    },
    async stop() {
      this.stopped = true;
      this.state = "Disconnected";
    },
  };
}

describe("GatewayConnectionManager", () => {
  it("retries initial start failures without requiring an app restart", async () => {
    const timers: Array<() => void> = [];
    const attempts: number[] = [];
    const retryDelays: number[] = [];
    const createConnection = vi.fn<[], ManagedGatewayConnection>(function () {
      const connection = fakeConnection();
      if (createConnection.mock.calls.length === 1) {
        connection.start = async () => {
          throw new Error("negotiate failed");
        };
      }
      return connection;
    });
    const manager = new GatewayConnectionManager({
      createConnection: ({ attempt }) => {
        attempts.push(attempt);
        return createConnection();
      },
      onRetryScheduled: ({ delayMs }) => retryDelays.push(delayMs),
      retryDelaysMs: [10, 20],
      setTimeout: (callback) => {
        timers.push(callback);
        return callback;
      },
      clearTimeout: () => undefined,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(attempts).toEqual([1]);
    expect(retryDelays).toEqual([10]);
    expect(manager.currentStatus).toBe("retrying");

    timers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(attempts).toEqual([1, 2]);
    expect(manager.currentStatus).toBe("connected");
  });

  it("cancels stale retries when the manager is stopped", async () => {
    const timers: Array<() => void> = [];
    const createConnection = vi.fn(() => {
      const connection = fakeConnection();
      connection.start = async () => {
        throw new Error("start failed");
      };
      return connection;
    });
    const manager = new GatewayConnectionManager({
      createConnection,
      retryDelaysMs: [10],
      setTimeout: (callback) => {
        timers.push(callback);
        return callback;
      },
      clearTimeout: () => undefined,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    manager.stop();
    timers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(manager.currentStatus).toBe("stopped");
  });

  it("restarts after a connected SignalR connection closes", async () => {
    const timers: Array<() => void> = [];
    const first = fakeConnection();
    const second = fakeConnection();
    const createConnection = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const manager = new GatewayConnectionManager({
      createConnection,
      retryDelaysMs: [10],
      setTimeout: (callback) => {
        timers.push(callback);
        return callback;
      },
      clearTimeout: () => undefined,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.currentStatus).toBe("connected");

    manager.handleConnectionClosed(first, new Error("closed"));
    expect(manager.currentStatus).toBe("retrying");
    timers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(createConnection).toHaveBeenCalledTimes(2);
    expect(manager.currentConnection).toBe(second);
    expect(manager.currentStatus).toBe("connected");
  });

  it("ignores stale connection close callbacks after a new generation starts", async () => {
    const timers: Array<() => void> = [];
    const first = fakeConnection();
    const second = fakeConnection();
    const third = fakeConnection();
    const createConnection = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    const closedGenerations: number[] = [];
    const manager = new GatewayConnectionManager({
      createConnection,
      onConnectionClosed: ({ generation }) => closedGenerations.push(generation),
      retryDelaysMs: [10],
      setTimeout: (callback) => {
        timers.push(callback);
        return callback;
      },
      clearTimeout: () => undefined,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.currentConnection).toBe(first);

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.currentConnection).toBe(second);

    manager.handleConnectionClosed(first, new Error("stale close"));
    await Promise.resolve();
    await Promise.resolve();

    expect(closedGenerations).toEqual([]);
    expect(timers).toEqual([]);
    expect(createConnection).toHaveBeenCalledTimes(2);
    expect(manager.currentConnection).toBe(second);
    expect(manager.currentStatus).toBe("connected");
  });

  it("emits health lifecycle callbacks for failed start, retry, connected and closed", async () => {
    const timers: Array<() => void> = [];
    const events: string[] = [];
    const failed = fakeConnection();
    failed.start = async () => {
      throw new Error("start failed");
    };
    const connected = fakeConnection();
    const createConnection = vi.fn()
      .mockReturnValueOnce(failed)
      .mockReturnValueOnce(connected);
    const manager = new GatewayConnectionManager({
      createConnection,
      onConnected: ({ generation }) => events.push(`connected:${generation}`),
      onConnectionClosed: ({ generation }) => events.push(`closed:${generation}`),
      onRetryScheduled: ({ delayMs, generation }) => events.push(`retry:${generation}:${delayMs}`),
      onStartAttempt: ({ attempt, generation }) => events.push(`start:${generation}:${attempt}`),
      onStartFailed: ({ generation }) => events.push(`failed:${generation}`),
      retryDelaysMs: [10],
      setTimeout: (callback) => {
        timers.push(callback);
        return callback;
      },
      clearTimeout: () => undefined,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    timers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
    manager.handleConnectionClosed(connected, new Error("closed"));

    expect(events).toEqual([
      "start:2:1",
      "failed:2",
      "retry:2:10",
      "start:2:2",
      "connected:2",
      "closed:2",
      "retry:2:10",
    ]);
  });
});
