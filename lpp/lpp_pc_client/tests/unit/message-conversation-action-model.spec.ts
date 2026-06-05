import { describe, expect, it } from "vitest";

import type { ConversationListItem } from "../../src/renderer/data/api-client";
import {
  conversationActionRequiresDeleteConfirmation,
  conversationVisibilityHidden,
  nextConversationMuted,
  nextConversationPinned,
} from "../../src/renderer/messages/models/messageConversationActionModel";

describe("messageConversationActionModel", () => {
  it("derives next pin and mute values from the current conversation", () => {
    expect(nextConversationPinned({ isPinned: false } as ConversationListItem)).toBe(true);
    expect(nextConversationPinned({ isPinned: true } as ConversationListItem)).toBe(false);
    expect(nextConversationMuted({ isMuted: false } as ConversationListItem)).toBe(true);
    expect(nextConversationMuted({ isMuted: true } as ConversationListItem)).toBe(false);
  });

  it("keeps hide/delete/restore semantics explicit", () => {
    expect(conversationVisibilityHidden("hide")).toBe(true);
    expect(conversationVisibilityHidden("delete")).toBe(true);
    expect(conversationVisibilityHidden("restore")).toBe(false);
    expect(conversationActionRequiresDeleteConfirmation("delete")).toBe(true);
    expect(conversationActionRequiresDeleteConfirmation("hide")).toBe(false);
  });
});
