import { describe, expect, it } from "vitest";
import type { ConversationListItem, MessageItemDto } from "../../src/renderer/data/api-client";
import {
  buildAvatarProfilePopover,
  eventMessageText,
  extractMessageText,
  isMineMessage,
  resolveSenderDisplayName,
} from "../../src/renderer/messages/models/messageDisplayModel";

describe("messageDisplayModel", () => {
  it("resolves mine messages by direction and sender identity", () => {
    const identity = { userId: "u1", platformUserId: "p1", lppId: "l1" };

    expect(isMineMessage({ messageId: "m1", direction: "out" } as MessageItemDto, identity)).toBe(true);
    expect(isMineMessage({ messageId: "m2", senderUserId: "u1" } as MessageItemDto, identity)).toBe(true);
    expect(isMineMessage({ messageId: "m3", senderUserId: "u2" } as MessageItemDto, identity)).toBe(false);
  });

  it("extracts direct and nested message text", () => {
    expect(extractMessageText({ messageId: "m1", body: { text: "hello" } } as MessageItemDto)).toBe("hello");
    expect(extractMessageText({
      messageId: "m2",
      body: { parts: [{ body: { content: "nested" } }] },
    } as MessageItemDto)).toBe("nested");
  });

  it("formats group member join event text", () => {
    const message = {
      messageId: "m1",
      messageType: "event",
      body: {
        type: "members_added",
        addedUsers: [{ displayName: "Alice" }, { displayName: "Bob" }],
      },
    } as MessageItemDto;

    expect(eventMessageText(message)).toBe("Alice, Bob加入了群聊");
  });

  it("resolves group sender display and avatar popover", () => {
    const conversation = {
      conversationId: "group-1",
      conversationType: "group",
      title: "Support",
    } as ConversationListItem;
    const members = new Map([
      ["u1", { userId: "u1", displayName: "Agent", avatarUrl: "agent.png", role: "admin" }],
    ]);
    const message = {
      messageId: "m1",
      senderUserId: "u1",
      senderDisplayName: "Fallback",
    } as MessageItemDto;

    expect(resolveSenderDisplayName(message, conversation, members)).toBe("Agent");
    expect(buildAvatarProfilePopover({
      conversation,
      groupMembers: members,
      message,
      mine: false,
      x: 10,
      y: 20,
    })).toMatchObject({
      title: "Agent",
      subtitle: "admin",
      avatarUrl: "agent.png",
    });
  });
});
