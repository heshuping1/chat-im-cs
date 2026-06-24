import { describe, expect, it } from "vitest";

import {
  createMessageRenderWindow,
  defaultMessageRenderWindowSize,
  effectiveMessageRenderWindowExpandedOlderCount,
  expandMessageRenderWindowOlder,
  messageRenderWindowExpandStep,
  messageRenderWindowResetKey,
  resetMessageRenderWindowExpansion,
} from "../../src/renderer/messages/models/messageListWindowing";

describe("message list windowing", () => {
  it("renders the full list when windowing is disabled", () => {
    const messages = Array.from({ length: 500 }, (_, index) => index);

    expect(createMessageRenderWindow({ enabled: false, messages })).toEqual({
      hiddenBeforeCount: 0,
      renderedMessages: messages,
      totalCount: 500,
      windowed: false,
    });
  });

  it("renders the latest message segment by default", () => {
    const messages = Array.from({ length: 500 }, (_, index) => index);
    const window = createMessageRenderWindow({ enabled: true, messages });

    expect(window.hiddenBeforeCount).toBe(500 - defaultMessageRenderWindowSize);
    expect(window.renderedMessages[0]).toBe(260);
    expect(window.renderedMessages.at(-1)).toBe(499);
    expect(window.windowed).toBe(true);
  });

  it("expands older messages in fixed steps", () => {
    const messages = Array.from({ length: 600 }, (_, index) => index);
    const window = createMessageRenderWindow({
      enabled: true,
      expandedOlderCount: messageRenderWindowExpandStep,
      messages,
    });

    expect(window.hiddenBeforeCount).toBe(120);
    expect(window.renderedMessages[0]).toBe(120);
  });

  it("ignores stale expanded windows before a new conversation paints", () => {
    const firstKey = messageRenderWindowResetKey({
      conversationId: "conversation-a",
      messageCount: 600,
    });
    const secondKey = messageRenderWindowResetKey({
      conversationId: "conversation-b",
      messageCount: 600,
    });
    const expanded = expandMessageRenderWindowOlder({
      resetKey: firstKey,
      state: resetMessageRenderWindowExpansion(firstKey),
    });

    expect(effectiveMessageRenderWindowExpandedOlderCount(expanded, firstKey)).toBe(
      messageRenderWindowExpandStep,
    );
    expect(effectiveMessageRenderWindowExpandedOlderCount(expanded, secondKey)).toBe(0);
    expect(
      createMessageRenderWindow({
        enabled: true,
        expandedOlderCount: effectiveMessageRenderWindowExpandedOlderCount(
          expanded,
          secondKey,
        ),
        messages: Array.from({ length: 600 }, (_, index) => index),
      }).renderedMessages[0],
    ).toBe(600 - defaultMessageRenderWindowSize);
  });
});
