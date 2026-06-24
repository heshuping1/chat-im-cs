import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createMessageCenterDiagnosticRecord } from "../../src/renderer/messages/diagnostics/message-center-diagnostics";

describe("message center diagnostics", () => {
  it("creates sanitized page diagnostics", () => {
    expect(
      createMessageCenterDiagnosticRecord({
        event: "command.invoked",
        phase: "command",
        result: "ok",
        reason: "send_media",
        context: {
          conversationId: "c1",
          localPath: "/Users/eric/Desktop/private.png",
          token: "Bearer secret-token",
        },
      }),
    ).toMatchObject({
      module: "message-center",
      taskId: "P5-IM-001E",
      event: "command.invoked",
      phase: "command",
      result: "ok",
      reason: "send_media",
      context: {
        conversationId: "c1",
        localPath: "[local-path]",
        token: "Bearer ***",
      },
    });
  });

  it("creates sanitized video open diagnostics without local paths", () => {
    expect(
      createMessageCenterDiagnosticRecord({
        event: "video.poster_ignored",
        phase: "media",
        result: "ignored",
        reason: "Failed to fetch file:///Users/eric/private/clip.mp4",
        context: {
          hasLocalCache: true,
          localPath: "/Users/eric/Library/Application Support/startlink/startlink-files/u1/c1/video.mp4",
          posterKind: "blob",
          sourceKind: "file",
        },
      }),
    ).toMatchObject({
      event: "video.poster_ignored",
      phase: "media",
      result: "ignored",
      reason: "Failed to fetch file://[local-path]",
      context: {
        hasLocalCache: true,
        localPath: "[local-path]",
        posterKind: "blob",
        sourceKind: "file",
      },
    });
  });

  it("persists IM render and scroll traces for flicker diagnosis", () => {
    const messageCenterDiagnosticsSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/diagnostics/message-center-diagnostics.ts"),
      "utf8",
    );
    const chatScrollTraceSource = readFileSync(
      resolve(process.cwd(), "src/renderer/lib/chatScrollTrace.ts"),
      "utf8",
    );

    expect(messageCenterDiagnosticsSource).toContain("recordMessageReminderDiagnostic");
    expect(messageCenterDiagnosticsSource).toContain("event: `im.message-center.${record.event}`");
    expect(messageCenterDiagnosticsSource).toContain("route: record.event");
    expect(chatScrollTraceSource).toContain("recordMessageReminderDiagnostic");
    expect(chatScrollTraceSource).toContain("isMessageReminderDiagnosticsEnabled");
    expect(chatScrollTraceSource).toContain("if (!traceEnabled && !isMessageReminderDiagnosticsEnabled())");
    expect(chatScrollTraceSource).toContain('event: "im.chat-scroll.trace"');
    expect(chatScrollTraceSource).toContain("route: event");
    expect(chatScrollTraceSource).toContain("metrics: record.metrics");
  });

  it("records IM conversation selection latency in traceable stages", () => {
    const selectionPerformanceSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/diagnostics/message-selection-performance.ts"),
      "utf8",
    );
    const conversationListPanelSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageConversationListPanel.tsx"),
      "utf8",
    );
    const unreadJumpControllerSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useMessageUnreadJumpController.ts"),
      "utf8",
    );
    const messageCenterSource = readFileSync(
      resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
      "utf8",
    );
    const messageListPanelSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
      "utf8",
    );
    const imReadCommandExecutorSource = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/hooks/useImReadCommandExecutor.ts"),
      "utf8",
    );
    const workspaceStoreSource = readFileSync(
      resolve(process.cwd(), "src/renderer/data/workspace-ui/workspace-store-core.ts"),
      "utf8",
    );

    expect(selectionPerformanceSource).toContain('event: "im.ui.selection-performance"');
    expect(selectionPerformanceSource).toContain("startConversationTargetActionTrace");
    expect(selectionPerformanceSource).toContain("conversationSelectionOpenTraceFor");
    expect(selectionPerformanceSource).toContain("elapsedMs");
    expect(selectionPerformanceSource).toContain("traceId");
    expect(selectionPerformanceSource).toContain("trace.fallback-start");
    expect(conversationListPanelSource).toContain("startConversationSelectionTrace(conversation");
    expect(unreadJumpControllerSource).toContain('"selection.handler.enter"');
    expect(unreadJumpControllerSource).toContain('"selection.handler.after-set-active"');
    expect(messageCenterSource).toContain('"active-conversation.resolved"');
    expect(messageCenterSource).toContain('"messages.query-state"');
    expect(messageCenterSource).toContain('"im.ui.set-active.request"');
    expect(messageCenterSource).toContain('"start-conversation-controller"');
    expect(messageCenterSource).toContain('"conversation-action"');
    expect(messageCenterSource).toContain('"unread-jump-controller"');
    expect(messageCenterSource).toContain('"start-direct.target-click"');
    expect(messageCenterSource).toContain('"start-group.submit"');
    expect(messageCenterSource).toContain('"forward.target-click"');
    expect(messageListPanelSource).toContain('"message-list.render-window"');
    expect(imReadCommandExecutorSource).toContain("readUiContextRef");
    expect(imReadCommandExecutorSource).toContain("activeConversationId: readUiContext.activeConversationId");
    expect(imReadCommandExecutorSource).toContain('snapshotSource: "consistency-check"');
    expect(workspaceStoreSource).toContain("callerStack");
    expect(workspaceStoreSource).toContain("workspaceActionCallerStack");
    expect(workspaceStoreSource).toContain("hasTrace");
  });

  it("records customer-service thread selection latency in traceable stages", () => {
    const selectionPerformanceSource = readFileSync(
      resolve(process.cwd(), "src/renderer/customer-service/diagnostics/service-selection-performance.ts"),
      "utf8",
    );
    const threadListSource = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ThreadList.tsx"),
      "utf8",
    );
    const workspaceControllerSource = readFileSync(
      resolve(process.cwd(), "src/renderer/customer-service/hooks/useCustomerServiceWorkspaceController.ts"),
      "utf8",
    );
    const chatWorkspaceSource = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
      "utf8",
    );
    const messageStageSource = readFileSync(
      resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceMessageStage.tsx"),
      "utf8",
    );

    expect(selectionPerformanceSource).toContain('event: "cs.ui.selection-performance"');
    expect(selectionPerformanceSource).toContain("recordCsRoutingDiagnostic");
    expect(selectionPerformanceSource).toContain("elapsedMs");
    expect(selectionPerformanceSource).toContain("traceId");
    expect(selectionPerformanceSource).toContain("trace.fallback-start");
    expect(threadListSource).toContain("startServiceThreadSelectionTrace(thread");
    expect(workspaceControllerSource).toContain('"workspace.selected-thread.resolved"');
    expect(workspaceControllerSource).toContain('"workspace.detail-query.state"');
    expect(chatWorkspaceSource).toContain('"chat-workspace.render-state"');
    expect(messageStageSource).toContain('"message-stage.rendered"');
  });
});
