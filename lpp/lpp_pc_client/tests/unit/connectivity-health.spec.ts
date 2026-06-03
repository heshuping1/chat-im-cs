import { describe, expect, it } from "vitest";
import {
  createConnectivityHealthViewModel,
  type ConnectivityHealthInput,
} from "../../src/renderer/settings/models/connectivityHealth";

describe("connectivity health view model", () => {
  it("builds phase one observable checks from real local signals", () => {
    const input: ConnectivityHealthInput = {
      apiBaseUrl: "https://chat.example.com",
      currentSiteName: "主站",
      diagnostics: [
        {
          at: "2026-06-03T10:01:00.000Z",
          event: "gateway.health",
          logLine: "18:01:00 [网关] ok heartbeat trace=gateway-1",
          module: "gateway",
          moduleLabel: "网关",
          phase: "heartbeat",
          reason: "--",
          result: "ok",
          traceId: "gateway-1",
        },
      ],
      lineCount: 3,
    };

    const viewModel = createConnectivityHealthViewModel(input);

    expect(viewModel.phaseOne.map((item) => item.id)).toEqual([
      "api-base",
      "site-lines",
      "gateway-runtime",
      "media-recent-errors",
      "customer-service-routing",
    ]);
    expect(viewModel.phaseOne[0]).toMatchObject({
      label: "当前 API",
      status: "observable",
      value: "https://chat.example.com",
    });
    expect(viewModel.phaseOne[1]).toMatchObject({
      label: "线路配置",
      status: "observable",
      value: "主站 / 3 条线路",
    });
    expect(viewModel.phaseOne[2]).toMatchObject({
      label: "实时连接",
      status: "observable",
      value: "最近记录 18:01:00",
    });
    expect(viewModel.phaseOne[3].status).toBe("no-sample");
  });

  it("keeps phase two health endpoint checks explicit as pending integration", () => {
    const viewModel = createConnectivityHealthViewModel({});

    expect(viewModel.phaseTwo).toHaveLength(5);
    expect(viewModel.phaseTwo.every((item) => item.status === "pending")).toBe(true);
    expect(viewModel.phaseTwo.map((item) => item.label)).toEqual([
      "API 健康端点",
      "Gateway 健康端点",
      "媒体上传/下载端点",
      "在线客服队列端点",
      "客服测试夹具",
    ]);
  });

  it("summarizes failed observable checks without marking unknown checks healthy", () => {
    const viewModel = createConnectivityHealthViewModel({
      diagnostics: [
        {
          at: "2026-06-03T10:00:00.000Z",
          event: "request",
          logLine: "18:00:00 [API 错误] failed request timeout trace=api-1",
          module: "api-error",
          moduleLabel: "API 错误",
          phase: "request",
          reason: "timeout",
          result: "failed",
          traceId: "api-1",
        },
      ],
    });

    expect(viewModel.summary).toEqual({
      failedCount: 1,
      observableCount: 0,
      pendingCount: 9,
      totalCount: 10,
    });
  });
});
