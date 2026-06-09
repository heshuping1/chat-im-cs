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

  it("follows appended own messages with instant bottom alignment", () => {
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
    ).toEqual({ kind: "follow-bottom", behavior: "auto" });

    expect(
      decideConversationViewportAfterAppend({
        addedIncomingCount: 0,
        addedMineCount: 1,
        wasAtBottom: true,
      }),
    ).toEqual({ kind: "follow-bottom", behavior: "auto" });
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

  it("marks message rows with the stable render key for viewport anchoring", () => {
    const stageSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
      "utf8",
    );

    expect(stageSource).toContain("const renderKey = chatMessageRenderKey(message)");
    expect(stageSource).toContain("data-message-render-key={renderKey}");
    expect(stageSource).toContain("key={renderKey}");
  });

  it("does not reveal transient scrollbars for programmatic bottom-follow scrolling", () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/useWechatBottomFollow.ts"),
      "utf8",
    );
    const appSource = readFileSync(resolve(process.cwd(), "src/renderer/App.tsx"), "utf8");

    expect(hookSource).toContain("programmaticScrollSuppressMs");
    expect(hookSource).toContain("layoutBottomFollowSuppressMs");
    expect(hookSource).toContain("recentOwnAppendSuppressMs");
    expect(hookSource).toContain("markProgrammaticScroll(stage)");
    expect(hookSource).toContain("hasSuppressedLayoutBottomFollow");
    expect(hookSource).toContain("hasRecentOwnAppend");
    expect(hookSource).toContain("stabilizeViewportFromSnapshot(viewportSnapshotRef.current)");
    expect(hookSource).toContain('stage.dataset.programmaticScroll = "true"');
    expect(appSource).toContain("target.dataset.programmaticScroll === 'true'");
    expect(appSource).toContain("target.classList.remove('is-scrolling')");
  });

  it("keeps automatic bottom alignment single-pass and anchor-compensated", () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/useWechatBottomFollow.ts"),
      "utf8",
    );

    expect(hookSource).not.toContain("scheduledScrollFrameRef");
    expect(hookSource).not.toContain("requestAnimationFrame(restoreScroll)");
    expect(hookSource).not.toContain("followBottomIfNeeded");
    expect(hookSource).not.toContain("shouldKeepBottomPinnedAfterLayout");
    expect(hookSource).toContain("Math.abs(stage.scrollTop - nextTop) > 1");
    expect(hookSource).toContain("stage.scrollTop = nextTop");
    expect(hookSource).toContain("captureViewportSnapshot");
    expect(hookSource).toContain("restoreAnchorPosition");
    expect(hookSource).toContain("viewportSnapshotRef");
    expect(hookSource).toContain("addedMessages.length === 0");
    expect(hookSource).toContain("recentOwnAppendUntilRef.current = Date.now() + recentOwnAppendSuppressMs");
    expect(hookSource).toContain("if (hasRecentOwnAppend())");
    expect(hookSource).toContain("stabilizeViewportFromSnapshot(previousSnapshot)");
  });

  it("leaves IM send bottom-follow scrolling to the viewport hook", () => {
    const textSendSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageTextSendController.ts"),
      "utf8",
    );
    const mediaSendSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageMediaSendController.ts"),
      "utf8",
    );

    expect(textSendSource).not.toContain('scrollMessagesToBottom("smooth")');
    expect(mediaSendSource).not.toContain('scrollMessagesToBottom("smooth")');
    expect(textSendSource).toContain('stage: "send.server_ack.observed"');
  });

  it("starts local echo before clearing the composer draft", () => {
    const composerSource = readFileSync(
      resolve(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
      "utf8",
    );
    const sendDraftBlock = composerSource.slice(
      composerSource.indexOf("const sendDraft = async () => {"),
      composerSource.indexOf("const sendRichDraft = async () => {"),
    );
    const sendRichDraftBlock = composerSource.slice(
      composerSource.indexOf("const sendRichDraft = async () => {"),
      composerSource.indexOf("const addFiles = async"),
    );

    expect(sendDraftBlock.indexOf("const sendPromise = sendComposerPartsInOrder")).toBeLessThan(
      sendDraftBlock.indexOf('updateDraft("")'),
    );
    expect(sendRichDraftBlock.indexOf("const sendPromise = sendComposerPartsInOrder")).toBeLessThan(
      sendRichDraftBlock.indexOf("lexicalInputRef.current?.clear()"),
    );
    expect(sendRichDraftBlock.indexOf("const sendPromise = sendComposerPartsInOrder")).toBeLessThan(
      sendRichDraftBlock.indexOf('updateDraft("")'),
    );
  });

  it("does not double-write text local echo into the outgoing overlay", () => {
    const textSendSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageTextSendController.ts"),
      "utf8",
    );
    const sendTextBlock = textSendSource.slice(
      textSendSource.indexOf("const sendTextOptimistically = useCallback("),
      textSendSource.indexOf("const sendContactCardOptimistically = useCallback("),
    );

    expect(sendTextBlock).toContain("appendLocalMessage(");
    expect(sendTextBlock).not.toContain("upsertLocalOutgoingMessage(");
    expect(sendTextBlock).not.toContain("replaceLocalOutgoingMessage(");
    expect(sendTextBlock).not.toContain("markLocalOutgoingMessageFailed(");
    expect(sendTextBlock).not.toContain("setLocalOutgoingMessagesByConversation((current)");
  });

  it("keeps a compact bottom gap after the latest message", () => {
    const messageCenterCss = readFileSync(
      resolve(process.cwd(), "src/renderer/styles/messages/message-center.css"),
      "utf8",
    );

    expect(messageCenterCss).toContain("--chat-bottom-safe-gap");
    expect(messageCenterCss).toContain("--chat-bottom-safe-gap: 0px");
    expect(messageCenterCss).toContain("overflow-anchor: none");
    expect(messageCenterCss).toContain("scroll-padding-bottom: var(--chat-bottom-safe-gap");
    expect(messageCenterCss).toContain("flex: 0 0 var(--chat-bottom-safe-gap");
    expect(messageCenterCss).not.toContain("height: 1px;\n  flex: 0 0 1px;");
  });
});
