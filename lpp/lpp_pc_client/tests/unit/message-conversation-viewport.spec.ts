import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createConversationViewportRegistry,
  restoreConversationViewport,
} from "../../src/renderer/messages/models/messageConversationViewportModel";

describe("message conversation viewport model", () => {
  it("restores a previously visited conversation instead of treating every entry as initial", () => {
    const registry = createConversationViewportRegistry();
    registry.remember("c1", {
      atBottom: false,
      pendingNewMessageCount: 2,
      scrollTop: 420,
    });

    expect(restoreConversationViewport(registry, "c1")).toEqual({
      kind: "restore",
      state: {
        atBottom: false,
        pendingNewMessageCount: 2,
        scrollTop: 420,
      },
    });
  });

  it("starts at the latest messages only on the first conversation entry", () => {
    const registry = createConversationViewportRegistry();

    expect(restoreConversationViewport(registry, "c2")).toEqual({
      kind: "initial-bottom",
    });
  });

  it("uses viewport restore in the message bottom-follow hook", () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/useWechatBottomFollow.ts"),
      "utf8",
    );

    expect(hookSource).toContain("restoreConversationViewport");
    expect(hookSource).toContain('restore.kind === "restore"');
    expect(hookSource).toContain("rememberConversationViewport(previousConversationKey)");
    expect(hookSource).toContain("stage.scrollTo({ top: restore.state.scrollTop");
  });
});
