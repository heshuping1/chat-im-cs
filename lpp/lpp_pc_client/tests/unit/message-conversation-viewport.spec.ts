import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  conversationBottomScrollTop,
  createConversationViewportRegistry,
  decideConversationViewportAfterAppend,
  restoreConversationViewport,
  shouldKeepBottomPinnedAfterLayout,
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

  it("uses the maximum scrollable top as the bottom target", () => {
    expect(conversationBottomScrollTop({ scrollHeight: 420, clientHeight: 700 })).toBe(0);
    expect(conversationBottomScrollTop({ scrollHeight: 1000, clientHeight: 420 })).toBe(580);
  });

  it("uses viewport restore in the message bottom-follow hook", () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/useWechatBottomFollow.ts"),
      "utf8",
    );

    expect(hookSource).toContain("restoreConversationViewport");
    expect(hookSource).toContain("conversationBottomScrollTop");
    expect(hookSource).toContain('restore.kind === "restore"');
    expect(hookSource).toContain("rememberConversationViewport(previousConversationKey)");
    expect(hookSource).toContain("stage.scrollTo({ top: restore.state.scrollTop");
  });

  it("only follows appended messages when the user is already at bottom or sends a message", () => {
    expect(
      decideConversationViewportAfterAppend({
        addedIncomingCount: 3,
        addedMineCount: 0,
        wasAtBottom: true,
      }),
    ).toEqual({ kind: "follow-bottom", behavior: "auto" });

    expect(
      decideConversationViewportAfterAppend({
        addedIncomingCount: 2,
        addedMineCount: 0,
        wasAtBottom: false,
      }),
    ).toEqual({ kind: "keep-position", pendingNewMessageDelta: 2 });

    expect(
      decideConversationViewportAfterAppend({
        addedIncomingCount: 0,
        addedMineCount: 1,
        wasAtBottom: false,
      }),
    ).toEqual({ kind: "follow-bottom", behavior: "smooth" });
  });

  it("does not let layout shifts or resource loads fight recent user scrolling", () => {
    expect(
      shouldKeepBottomPinnedAfterLayout({
        atBottom: true,
        recentUserScroll: false,
      }),
    ).toBe(true);
    expect(
      shouldKeepBottomPinnedAfterLayout({
        atBottom: true,
        recentUserScroll: true,
      }),
    ).toBe(false);
    expect(
      shouldKeepBottomPinnedAfterLayout({
        atBottom: false,
        recentUserScroll: false,
      }),
    ).toBe(false);
  });

  it("keeps chat click and media load from forcing a full message-stage re-scroll", () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/useWechatBottomFollow.ts"),
      "utf8",
    );
    const stageSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
      "utf8",
    );
    const unreadControllerSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageUnreadJumpController.ts"),
      "utf8",
    );

    expect(hookSource).not.toContain("conversationBottomLock");
    expect(hookSource).not.toContain("scrollIntoView");
    expect(stageSource).not.toContain("onLoadCapture");
    expect(unreadControllerSource).not.toContain("invalidateQueries");
  });

  it("keeps a bottom safe area after the latest message", () => {
    const messageCenterCss = readFileSync(
      resolve(process.cwd(), "src/renderer/styles/messages/message-center.css"),
      "utf8",
    );

    expect(messageCenterCss).toContain("--chat-bottom-safe-gap");
    expect(messageCenterCss).toContain("scroll-padding-bottom: var(--chat-bottom-safe-gap");
    expect(messageCenterCss).toContain("flex: 0 0 var(--chat-bottom-safe-gap");
    expect(messageCenterCss).not.toContain("height: 1px;\n  flex: 0 0 1px;");
  });
});
