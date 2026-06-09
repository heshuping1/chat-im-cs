import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import { chatMessageRenderKey } from "../../src/renderer/messages/models/messageRenderKey";

function message(overrides: Partial<MessageItemDto> & Record<string, unknown>): MessageItemDto {
  return {
    messageId: "server-message",
    ...overrides,
  } as MessageItemDto;
}

describe("chatMessageRenderKey", () => {
  it("keeps local-to-server message replacement mounted with client ids", () => {
    const local = message({
      clientMsgId: "pc-local-1",
      localTaskId: "task-1",
      messageId: "pc-local-1",
    });
    const confirmed = message({
      clientMsgId: "pc-local-1",
      localTaskId: "task-1",
      messageId: "server-1",
    });

    expect(chatMessageRenderKey(local)).toBe("client:pc-local-1");
    expect(chatMessageRenderKey(confirmed)).toBe(chatMessageRenderKey(local));
  });

  it("falls back through compatible client ids before server message id", () => {
    expect(chatMessageRenderKey(message({ clientMessageId: "client-message-1" })))
      .toBe("client:client-message-1");
    expect(chatMessageRenderKey(message({ localTaskId: "task-1" }))).toBe("client:task-1");
    expect(chatMessageRenderKey(message({ messageId: "server-1" }))).toBe("message:server-1");
  });

  it("wires the stable key into the PC message list row", () => {
    const messageCenter = readFileSync(
      resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
      "utf8",
    );
    const messageListPanel = readFileSync(
      resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
      "utf8",
    );

    expect(messageCenter).toContain('from "../messages/models/messageRenderKey"');
    expect(messageCenter).toContain("messageKey: chatMessageRenderKey");
    expect(messageListPanel).toContain("chatMessageRenderKey");
    expect(messageListPanel).toContain("const renderKey = chatMessageRenderKey(message)");
    expect(messageListPanel).toContain("data-message-render-key={renderKey}");
    expect(messageListPanel).toContain("key={renderKey}");
  });
});
