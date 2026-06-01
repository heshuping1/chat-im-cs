import { describe, expect, it } from "vitest";

import {
  aiReplyTargetForDirectConversation,
  aiReplyTargetForServiceThread,
} from "../../src/renderer/data/ai/ai-reply-thread-target";
import type {
  ConversationListItem,
  CustomerServiceThread,
  StaffServiceHistoryItem,
} from "../../src/renderer/data/api-client";

describe("ai reply thread target", () => {
  it("uses the real customer-service thread id for online service", () => {
    const thread = {
      conversationId: "conversation-1",
      status: "serving",
      threadId: "thread-1",
      threadType: "temp_session",
      title: "Visitor",
    } as CustomerServiceThread;

    expect(aiReplyTargetForServiceThread(thread)).toMatchObject({
      conversationId: "conversation-1",
      sourceModule: "onlineService",
      threadId: "thread-1",
      threadTitle: "Visitor",
      threadType: "temp_session",
    });
  });

  it("maps a direct IM conversation to its service-history thread id", () => {
    const conversation = {
      conversationId: "direct-conversation-1",
      title: "Alice",
    } as ConversationListItem;
    const historyItems = [
      {
        conversationId: "direct-conversation-1",
        status: "serving",
        threadId: "service-thread-1",
        threadType: "im_direct",
        title: "Alice service",
      },
    ] as StaffServiceHistoryItem[];

    expect(
      aiReplyTargetForDirectConversation({
        conversation,
        historyItems,
        title: "Alice",
      }),
    ).toMatchObject({
      conversationId: "direct-conversation-1",
      sourceModule: "messages",
      threadId: "service-thread-1",
      threadTitle: "Alice",
      threadType: "im_direct",
    });
  });

  it("does not invent a customer-service thread id for ordinary direct IM", () => {
    const conversation = {
      conversationId: "direct-conversation-1",
      title: "Alice",
    } as ConversationListItem;

    const target = aiReplyTargetForDirectConversation({
      conversation,
      historyItems: [],
      title: "Alice",
    });

    expect(target).toMatchObject({
      conversationId: "direct-conversation-1",
      disabledReason: "当前私聊尚未形成客服接待线程，无法生成客服 AI 草稿。",
      sourceModule: "messages",
      threadType: "im_direct",
    });
    expect(target.threadId).toBeUndefined();
  });
});
