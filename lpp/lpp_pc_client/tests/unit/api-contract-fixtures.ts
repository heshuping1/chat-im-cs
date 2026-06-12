import { normalizeCustomerProfileDto, normalizeCustomerServiceThreadDto } from "../../src/renderer/data/customer-service/cs-contract";
import { normalizeCustomerServiceMessageDto } from "../../src/renderer/data/customer-service/cs-message-contract";
import { normalizeImConversationDto } from "../../src/renderer/data/im/im-conversation-contract";
import { normalizeImMessageDto } from "../../src/renderer/data/im/im-message-contract";

type ContractFixtureResult = {
  status: string;
  data?: unknown;
  issues?: Array<{ code: string }>;
};

export interface ApiContractFixture {
  name: string;
  normalize: () => ContractFixtureResult;
  expected: {
    status: string;
    data?: Record<string, unknown>;
    issues?: string[];
  };
}

export const apiContractFixtures: ApiContractFixture[] = [
  {
    name: "im conversation accepts modern direct dto",
    normalize: () =>
      normalizeImConversationDto({
        conversationId: "im-c1",
        conversationType: "direct",
        title: "客户 A",
        unreadCount: 2,
        lastReadSeq: 8,
        lastMessageSeq: 10,
        peerReadSeq: 9,
        lastMessage: {
          messageId: "im-m1",
          messageType: "text",
          preview: "hello",
        },
      }),
    expected: {
      status: "ok",
      data: {
        id: "im-c1",
        type: "direct",
        title: "客户 A",
        unreadCount: 2,
        lastReadSeq: 8,
        lastMessageSeq: 10,
        peerReadSeq: 9,
      },
    },
  },
  {
    name: "im conversation accepts legacy group aliases",
    normalize: () =>
      normalizeImConversationDto({
        chat_id: "im-g1",
        type: "group-chat",
        name: "项目群",
        member_avatar_urls: ["a.png", "b.png"],
        unread_count: "1",
        last_read_seq: "4",
        message_seq: "6",
        opposite_read_seq: "5",
      }),
    expected: {
      status: "ok",
      data: {
        id: "im-g1",
        type: "group",
        title: "项目群",
        unreadCount: 1,
        lastReadSeq: 4,
        lastMessageSeq: 6,
        peerReadSeq: 5,
      },
    },
  },
  {
    name: "im conversation blocks missing identity",
    normalize: () =>
      normalizeImConversationDto({
        conversationType: "direct",
        title: "无 id 会话",
      }),
    expected: {
      status: "invalid",
      issues: ["im.conversation.missing_id"],
    },
  },
  {
    name: "im message accepts modern text dto",
    normalize: () =>
      normalizeImMessageDto({
        messageId: "im-m2",
        conversationId: "im-c1",
        conversationSeq: 11,
        senderUserId: "u1",
        messageType: "text",
        body: { text: "hello" },
      }),
    expected: {
      status: "ok",
      data: {
        id: "im-m2",
        source: "im",
        conversationId: "im-c1",
        conversationSeq: 11,
        type: "text",
        preview: "hello",
      },
    },
  },
  {
    name: "im message accepts snake case media dto",
    normalize: () =>
      normalizeImMessageDto({
        message_id: "im-m3",
        conversation_id: "im-c1",
        conversation_seq: "12",
        sender_user_id: "u2",
        message_type: "image",
        message_body: {
          image: { url: "https://example.com/image.png" },
        },
      }),
    expected: {
      status: "ok",
      data: {
        id: "im-m3",
        conversationId: "im-c1",
        conversationSeq: 12,
        type: "image",
        preview: "[图片]",
      },
    },
  },
  {
    name: "im message blocks missing id and sequence",
    normalize: () =>
      normalizeImMessageDto({
        messageType: "text",
        body: { text: "missing identity" },
      }),
    expected: {
      status: "invalid",
      issues: [
        "im.message.missing_seq",
        "im.message.missing_id",
        "im.message.missing_conversation_id",
      ],
    },
  },
  {
    name: "customer-service thread accepts queued temp session",
    normalize: () =>
      normalizeCustomerServiceThreadDto({
        threadId: "cs-t1",
        conversationId: "cs-c1",
        threadType: "temp-session",
        status: "queued",
        visitorName: "访客 A",
        sourceChannel: "web",
        unreadCount: 3,
      }),
    expected: {
      status: "ok",
      data: {
        id: "cs-t1",
        conversationId: "cs-c1",
        type: "temp_session",
        normalizedStatus: "queued",
        title: "访客 A",
        unreadCount: 3,
      },
    },
  },
  {
    name: "customer-service thread accepts legacy closed direct aliases",
    normalize: () =>
      normalizeCustomerServiceThreadDto({
        session_id: "cs-s1",
        thread_type: "direct",
        thread_status: "closed-by-staff",
        customer_nickname: "客户 B",
        unread_count: "0",
      }),
    expected: {
      status: "ok",
      data: {
        id: "cs-s1",
        conversationId: "cs-s1",
        type: "im_direct",
        normalizedStatus: "closed_by_staff",
        isTerminal: true,
        title: "客户 B",
      },
    },
  },
  {
    name: "customer-service timeout-closed temp session is terminal in thread normalization",
    normalize: () =>
      normalizeCustomerServiceThreadDto({
        session_id: "cs-timeout-1",
        thread_type: "temp_session",
        thread_status: "closed_timeout",
        visitorName: "Visitor C",
        unread_count: "2",
      }),
    expected: {
      status: "ok",
      data: {
        id: "cs-timeout-1",
        type: "temp_session",
        normalizedStatus: "closed_timeout",
        isTerminal: true,
        title: "Visitor C",
        unreadCount: 2,
      },
    },
  },
  {
    name: "customer profile keeps display and risk fields",
    normalize: () =>
      normalizeCustomerProfileDto({
        customer_user_id: "u-cs-1",
        customerDisplayName: "客户 C",
        avatar_url: "https://example.com/customer.png",
        risk_status: "medium",
        tags: ["vip"],
        tab_counts: { orders: 2 },
      }),
    expected: {
      status: "ok",
      data: {
        customerUserId: "u-cs-1",
        displayName: "客户 C",
        avatarUrl: "https://example.com/customer.png",
        riskLevel: "medium",
        tags: ["vip"],
      },
    },
  },
  {
    name: "customer-service message degrades fallback identity",
    normalize: () =>
      normalizeCustomerServiceMessageDto(
        {
          content: { file: { fileName: "contract.pdf" } },
        },
        {
          threadId: "cs-t2",
          threadType: "temp_session",
          fallbackConversationId: "cs-c2",
          fallbackMessageId: "cs-fallback-m1",
        },
      ),
    expected: {
      status: "degraded",
      data: {
        id: "cs-fallback-m1",
        source: "customer_service",
        threadId: "cs-t2",
        type: "file",
        preview: "[文件]",
      },
      issues: ["cs.message.generated_id", "cs.message.missing_seq"],
    },
  },
];
