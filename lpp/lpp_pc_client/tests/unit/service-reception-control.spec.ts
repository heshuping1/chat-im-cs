import { describe, expect, it } from "vitest";

import {
  getQueueAutoDisabledReason,
  getReceptionControlLayout,
  getReceptionControlSummary,
  getReceptionQueueMode,
  resolveReceptionQueueModePatch,
  getReceptionStatusOption,
  normalizeReceptionStatus,
} from "../../src/renderer/customer-service/models/serviceReceptionControlModel";

describe("service reception control model", () => {
  it("normalizes supported reception statuses and falls back to offline", () => {
    expect(normalizeReceptionStatus("online")).toBe("online");
    expect(normalizeReceptionStatus("busy")).toBe("busy");
    expect(normalizeReceptionStatus("break")).toBe("break");
    expect(normalizeReceptionStatus("offline")).toBe("offline");
    expect(normalizeReceptionStatus("unexpected")).toBe("offline");
  });

  it("derives status, queue mode, and compact summary text", () => {
    expect(
      getReceptionControlSummary({
        activeSessions: 8,
        maxSessions: 20,
        queueAcceptEnabled: true,
        serviceStatus: "online",
      }),
    ).toMatchObject({
      queueMode: "auto",
      queueModeLabel: "自动分配",
      sessionText: "8/20",
      summaryText: "在线 · 自动分配 · 8/20",
    });

    expect(getReceptionQueueMode(false)).toBe("manual");
    expect(getReceptionStatusOption("busy").label).toBe("忙碌");
  });

  it("keeps unknown reception status visibly busy instead of accepting sessions", () => {
    expect(getReceptionControlSummary({ serviceStatus: undefined })).toMatchObject({
      sessionText: "--",
      status: { label: "忙碌", tone: "busy", value: "busy" },
      statusSynced: false,
      summaryText: "忙碌 · 手动接入 · --",
    });
  });

  it("maps every reception status to a real sidebar label tone", () => {
    expect(getReceptionStatusOption("online")).toMatchObject({
      label: "在线",
      tone: "online",
      value: "online",
    });
    expect(getReceptionStatusOption("busy")).toMatchObject({
      label: "忙碌",
      tone: "busy",
      value: "busy",
    });
    expect(getReceptionStatusOption("break")).toMatchObject({
      label: "短暂离开",
      tone: "away",
      value: "break",
    });
    expect(getReceptionStatusOption("offline")).toMatchObject({
      label: "离线",
      tone: "offline",
      value: "offline",
    });
  });

  it("only allows auto assignment while online", () => {
    expect(getQueueAutoDisabledReason("online")).toBeNull();
    expect(getQueueAutoDisabledReason("busy")).toBe("仅在线状态可以启用自动分配。");
    expect(getQueueAutoDisabledReason("break")).toBe("仅在线状态可以启用自动分配。");
    expect(getQueueAutoDisabledReason("offline")).toBe("仅在线状态可以启用自动分配。");
    expect(getQueueAutoDisabledReason(undefined)).toBe(
      "接待状态未同步，暂不能启用自动分配。",
    );
  });

  it("turns auto assignment clicks into online auto reception patches", () => {
    expect(resolveReceptionQueueModePatch("auto", "break")).toEqual({
      queueAcceptEnabled: true,
      serviceStatus: "online",
    });
    expect(resolveReceptionQueueModePatch("auto", "busy")).toEqual({
      queueAcceptEnabled: true,
      serviceStatus: "online",
    });
    expect(resolveReceptionQueueModePatch("manual", "break")).toEqual({
      queueAcceptEnabled: false,
      serviceStatus: "break",
    });
    expect(resolveReceptionQueueModePatch("manual", undefined)).toBeNull();
  });

  it("maps service layout modes to control density", () => {
    expect(getReceptionControlLayout("full")).toBe("full");
    expect(getReceptionControlLayout("no-assistant")).toBe("full");
    expect(getReceptionControlLayout("no-customer")).toBe("compact");
    expect(getReceptionControlLayout("compact-sidebar")).toBe("compact");
    expect(getReceptionControlLayout("no-sidebar")).toBe("header");
    expect(getReceptionControlLayout("queue-focus")).toBe("header");
  });
});
