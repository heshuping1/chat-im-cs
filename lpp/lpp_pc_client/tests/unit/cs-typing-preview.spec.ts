import { describe, expect, it } from "vitest";

import {
  normalizeCustomerServiceTypingPreviewText,
  reduceCustomerServiceTypingPreview,
} from "../../src/renderer/data/customer-service/cs-typing-preview";

describe("customer service typing preview", () => {
  it("creates a customer typing preview until the input is empty", () => {
    const preview = reduceCustomerServiceTypingPreview({
      isTyping: true,
      previewText: "  hello\nthere  ",
      receivedAt: 100,
      senderRole: "visitor",
      senderUserId: "visitor-1",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(preview).toMatchObject({
      previewText: "hello\nthere",
      senderUserId: "visitor-1",
      threadId: "thread-1",
      threadType: "temp_session",
      receivedAt: 100,
    });
  });

  it("clears the preview when typing stops", () => {
    expect(
      reduceCustomerServiceTypingPreview({
        isTyping: false,
        receivedAt: 100,
        senderRole: "visitor",
        threadId: "thread-1",
        threadType: "temp_session",
      }),
    ).toBeNull();
  });

  it("clears the preview when the customer input text is empty", () => {
    expect(
      reduceCustomerServiceTypingPreview({
        isTyping: true,
        previewText: "   ",
        receivedAt: 100,
        senderRole: "visitor",
        threadId: "thread-1",
        threadType: "temp_session",
      }),
    ).toBeNull();
  });

  it("ignores staff typing so staff drafts are not exposed", () => {
    expect(
      reduceCustomerServiceTypingPreview({
        isTyping: true,
        previewText: "internal draft",
        receivedAt: 100,
        senderRole: "customer_service",
        threadId: "thread-1",
        threadType: "temp_session",
      }),
    ).toBeUndefined();
  });

  it("caps preview text at the server contract limit", () => {
    expect(normalizeCustomerServiceTypingPreviewText("x".repeat(520))).toHaveLength(500);
  });
});
