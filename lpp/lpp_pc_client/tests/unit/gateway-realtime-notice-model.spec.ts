import { describe, expect, it } from "vitest";

import { gatewayRealtimeStatusNotice } from "../../src/renderer/shell/models/gatewayRealtimeNoticeModel";

describe("gateway realtime notice model", () => {
  it("does not show sidebar chrome while realtime connection is refreshing", () => {
    expect(gatewayRealtimeStatusNotice("connecting")).toBeNull();
    expect(gatewayRealtimeStatusNotice("reconnecting")).toBeNull();
    expect(gatewayRealtimeStatusNotice("retrying")).toBeNull();
  });

  it("shows an offline notice for abnormal realtime states", () => {
    expect(gatewayRealtimeStatusNotice("disconnected")).toEqual({
      kind: "offline",
      label: "实时连接异常",
      title: "消息长连接异常，消息可能延迟同步",
    });
  });
});
