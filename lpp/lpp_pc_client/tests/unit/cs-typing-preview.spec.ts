import { describe, expect, it } from "vitest";

import {
  CUSTOMER_SERVICE_TYPING_PREVIEW_TTL_MS,
  normalizeCustomerServiceTypingPreviewText,
  reduceCustomerServiceTypingPreview,
} from "../../src/renderer/data/customer-service/cs-typing-preview";

describe("customer service typing preview", () => {
  it("creates a short-lived customer typing preview", () => {
    const preview = reduceCustomerServiceTypingPreview(
      {
        isTyping: true,
        previewText: "  hello\nthere  ",
        receivedAt: 100,
        senderRole: "visitor",
        senderUserId: "visitor-1",
        threadId: "thread-1",
        threadType: "temp_session",
      },
      1_000,
    );

    expect(preview).toMatchObject({
      previewText: "hello\nthere",
      senderUserId: "visitor-1",
      threadId: "thread-1",
      threadType: "temp_session",
      receivedAt: 100,
      expiresAt: 1_000 + CUSTOMER_SERVICE_TYPING_PREVIEW_TTL_MS,
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
