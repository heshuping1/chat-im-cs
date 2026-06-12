import { describe, expect, it, vi } from "vitest";

import {
  applyCustomerServiceTypingPreviewCache,
  clearCustomerServiceTypingPreviewCache,
} from "../../src/renderer/data/customer-service/cs-typing-preview-cache";

const session = {
  apiBaseUrl: "https://api.example.test",
  tenantToken: "tenant-token",
} as never;

function createQueryClient() {
  return {
    setQueryData: vi.fn(),
  };
}

describe("customer service typing preview cache", () => {
  it("clears the typing preview when typing stops", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "still typing",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: false,
      receivedAt: 200,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      [
        "pc-cs-typing-preview",
        "https://api.example.test",
        "tenant-token",
        "temp_session",
        "thread-1",
      ],
      null,
    );
  });

  it("writes a new preview after a typing stop event", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "first",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: false,
      receivedAt: 200,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "second",
      receivedAt: 300,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ previewText: "second" }),
    );
  });

  it("clears the preview when the typing event carries an explicitly empty input", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "stale draft",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      hasPreviewText: true,
      isTyping: true,
      previewText: "   ",
      receivedAt: 200,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      [
        "pc-cs-typing-preview",
        "https://api.example.test",
        "tenant-token",
        "temp_session",
        "thread-1",
      ],
      null,
    );
  });

  it("keeps the preview when typing continues without a preview text field", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "draft",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      receivedAt: 200,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1);
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ previewText: "draft" }),
    );
  });

  it("writes and clears alias thread ids with the primary thread id", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      aliasThreadIds: ["conversation-1"],
      isTyping: true,
      previewText: "draft",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "session-1",
      threadType: "temp_session",
    });
    clearCustomerServiceTypingPreviewCache(queryClient as never, session, {
      aliasThreadIds: ["conversation-1"],
      reason: "message-received",
      threadId: "session-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      [
        "pc-cs-typing-preview",
        "https://api.example.test",
        "tenant-token",
        "temp_session",
        "session-1",
      ],
      null,
    );
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      [
        "pc-cs-typing-preview",
        "https://api.example.test",
        "tenant-token",
        "temp_session",
        "conversation-1",
      ],
      null,
    );
  });

  it("does not clear typing preview for staff messages", () => {
    const queryClient = createQueryClient();

    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      isTyping: true,
      previewText: "customer draft",
      receivedAt: 100,
      senderRole: "visitor",
      threadId: "thread-1",
      threadType: "temp_session",
    });
    applyCustomerServiceTypingPreviewCache(queryClient as never, session, {
      hasPreviewText: true,
      isTyping: true,
      previewText: "agent draft",
      receivedAt: 200,
      senderRole: "staff",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1);
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ previewText: "customer draft" }),
    );
  });
});
