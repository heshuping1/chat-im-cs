import { describe, expect, it } from "vitest";
import {
  customerServiceMessageEntityToDto,
  normalizeCustomerServiceMessageDto,
} from "../../src/renderer/data/customer-service/cs-message-contract";

describe("customer service message contract", () => {
  it("maps customer-service message dto to shared entity", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-m1",
        conversationId: "cs-conv-1",
        conversationSeq: 5,
        senderRole: "visitor",
        senderDisplayName: "璁垮",
        messageType: "text",
        body: { text: "hello" },
        direction: "incoming",
      },
      {
        threadId: "thread-1",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      id: "cs-m1",
      source: "customer_service",
      threadId: "thread-1",
      threadType: "temp_session",
      conversation: {
        source: "customer_service",
        conversationId: "cs-conv-1",
        conversationType: "temp_session",
        threadId: "thread-1",
      },
      type: "text",
      preview: "hello",
      direction: "incoming",
    });
  });

  it("keeps server preview as the message preview", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-preview-1",
        conversationId: "cs-conv-preview",
        conversationSeq: 6,
        senderDisplayName: "Visitor",
        senderRole: "visitor",
        messageType: "text",
        preview: "server says hello",
        body: {},
      },
      {
        threadId: "thread-preview",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(result.data?.preview).toBe("server says hello");
  });

  it("keeps staff sender role and avoids visitor fallback for transfer notices", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-transfer-notice-1",
        conversationId: "cs-conv-transfer",
        conversationSeq: 10,
        senderDisplayName: "Customer Service 10",
        displayName: "璁垮",
        senderRole: "staff_reply",
        staffDisplayName: "瀹㈡湇10",
        messageType: "text",
        body: { text: "transferred to Customer Service 10" },
        direction: "incoming",
      },
      {
        threadId: "thread-transfer",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(customerServiceMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "cs-transfer-notice-1",
      senderDisplayName: "Customer Service 10",
      senderRole: "staff_reply",
      staffDisplayName: "瀹㈡湇10",
    });
  });

  it("does not fabricate a sender label when a staff message has no display name", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-staff-no-name",
        conversationId: "cs-conv-staff",
        conversationSeq: 11,
        senderRole: "customer_service",
        messageType: "text",
        body: { text: "staff continues handling" },
      },
      {
        threadId: "thread-staff",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("degraded");
    expect(customerServiceMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "cs-staff-no-name",
      senderRole: "customer_service",
    });
    expect(customerServiceMessageEntityToDto(result.data!).senderDisplayName).toBeUndefined();
    expect(result.issues.map((issue) => issue.code)).toContain(
      "cs.message.sender_display_name_missing",
    );
  });

  it("normalizes top-level text content into a renderable text body", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-content-1",
        conversationId: "cs-conv-content",
        conversationSeq: 8,
        senderDisplayName: "Visitor",
        senderRole: "visitor",
        messageType: "text",
        content: "top level content",
      },
      {
        threadId: "thread-content",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(customerServiceMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "cs-content-1",
      messageType: "text",
      body: { text: "top level content", messageType: "text" },
      preview: "top level content",
    });
  });

  it("does not fabricate a generic preview when server text is absent", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-empty-preview",
        conversationId: "cs-conv-empty-preview",
        conversationSeq: 7,
        senderDisplayName: "Visitor",
        senderRole: "visitor",
        messageType: "text",
        body: {},
      },
      {
        threadId: "thread-empty-preview",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(result.data?.preview).toBe("");
    expect(customerServiceMessageEntityToDto(result.data!).preview).toBe("");
  });

  it("keeps messages without id or sequence as degraded for compatibility", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        body: { file: { fileName: "a.pdf" } },
      },
      {
        threadId: "thread-2",
        threadType: "im_direct",
        fallbackConversationId: "conv-2",
        fallbackMessageId: "fallback-message-1",
      },
    );

    expect(result.status).toBe("degraded");
    expect(result.data).toMatchObject({
      id: "fallback-message-1",
      conversation: {
        conversationId: "conv-2",
        conversationType: "im_direct",
      },
      type: "file",
      preview: "[文件]",
    });
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "cs.message.generated_id",
        "cs.message.missing_seq",
        "cs.message.sender_role_missing",
        "cs.message.sender_display_name_missing",
      ]),
    );
  });

  it("maps shared entity back to compatible MessageItemDto", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-m3",
        conversationId: "cs-conv-3",
        conversationSeq: 9,
        senderPlatformUserId: "platform-user-1",
        messageType: "image",
        body: { image: { url: "https://example.com/a.png" } },
        isSelf: true,
        status: "sent",
      },
      {
        threadId: "thread-3",
        threadType: "temp_session",
      },
    );

    expect(customerServiceMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "cs-m3",
      conversationId: "cs-conv-3",
      conversationSeq: 9,
      senderPlatformUserId: "platform-user-1",
      platformUserId: "platform-user-1",
      messageType: "image",
      preview: "[图片]",
      isSelf: true,
      status: "sent",
    });
  });

  it("normalizes customer read receipt aliases", () => {
    const result = normalizeCustomerServiceMessageDto(
      {
        messageId: "cs-read-1",
        conversationId: "cs-conv-read",
        conversationSeq: 12,
        senderDisplayName: "Visitor",
        senderRole: "visitor",
        messageType: "text",
        body: { text: "receipt" },
        customerReadAt: "2026-06-11T09:20:00.000Z",
        readByCustomer: true,
      },
      {
        threadId: "thread-read",
        threadType: "temp_session",
      },
    );

    expect(result.status).toBe("ok");
    expect(customerServiceMessageEntityToDto(result.data!)).toMatchObject({
      messageId: "cs-read-1",
      readAt: "2026-06-11T09:20:00.000Z",
      isRead: true,
    });
  });
});
