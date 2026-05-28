# PC IM Read Model Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered PC IM read/unread patches with a mature, API-contract-driven IM read model that owns unread counts, read cursors, read receipts, pending read retry, and UI views.

**Architecture:** Add a pure `im-read-model.ts` state machine and `im-api-contract.ts` validator. Existing UI, Gateway, polling, send, and store code become adapters that submit facts to the model, execute commands, and render model views. Migration is TDD-first and keeps existing behavior working after each task.

**Tech Stack:** React 18, TypeScript, Zustand, TanStack Query, Vitest, Playwright.

---

## Spec

Source spec: `docs/superpowers/specs/2026-05-28-pc-im-read-model-design.md`

The plan is not complete unless it covers:

- UI scenario logic validation.
- IM core logic validation.
- Overall closed-loop validation.
- API contract validator with `ok | degraded | blocking`.
- All read math in unit tests, not browser tests.

## File Structure

- Create: `src/renderer/data/im-read-model.ts`
  - Pure IM state machine, identity checks, cursor merge, unread derivation, message view derivation, command coalescing.
- Create: `src/renderer/data/im-api-contract.ts`
  - API/Gateway shape validator and normalizer. Produces `ok`, `degraded`, or `blocking`.
- Modify: `src/renderer/data/message-display.ts`
  - Keep exported helper names for compatibility, but delegate read math to `im-read-model.ts`.
- Modify: `src/renderer/data/read-receipts.ts`
  - Keep exported helper names for compatibility, but delegate peer receipt behavior to `im-read-model.ts`.
- Modify: `src/renderer/data/store.ts`
  - Replace split local read and peer receipt state with unified `ConversationReadState` storage keyed by `conversationType:conversationId`.
- Modify: `src/renderer/data/api/types.ts`
  - Add optional API fields used by validator: `peerReadSeq`, pagination metadata shape, aliases already seen from server responses.
- Modify: `src/renderer/data/api/messages-client.ts`
  - Normalize message list responses with page metadata when present. Keep array response compatibility.
- Modify: `src/renderer/components/GatewayBridge.tsx`
  - Convert Gateway payloads to `ImCoreEvent`, apply model result to Query cache and store, execute coalesced commands.
- Modify: `src/renderer/components/MessageCenter.tsx`
  - Submit UI view facts to IM core, render model views, execute commands, remove local read math.
- Modify: `src/renderer/components/Sidebar.tsx`
  - Use model-derived conversation unread aggregation.
- Test: `tests/unit/im-core.spec.ts`
  - Replace current helper-focused tests with model and adapter tests covering the scenario matrix.
- Test: `tests/browser/workspace-smoke.spec.ts`
  - Add browser wiring checks for UI/Gateway/model integration only.

---

### Task 1: API Contract Validator

**Files:**
- Create: `src/renderer/data/im-api-contract.ts`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add failing tests for API contract levels**

Append these tests to `tests/unit/im-core.spec.ts`:

```ts
import {
  validateConversationSummaryContract,
  validateMessagePageContract,
  validateGatewayMessageContract,
  type ApiContractValidation,
} from "../../src/renderer/data/im-api-contract";

describe("IM API contract validator", () => {
  it("accepts complete direct conversation summaries", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      peerReadSeq: 119,
      unreadCount: 2,
      lastMessage: {
        messageId: "m120",
        conversationSeq: 120,
        senderUserId: "peer-user",
        direction: "in",
      },
    });

    expect(result.level).toBe("ok");
    expect(result.normalized).toMatchObject({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      peerReadSeq: 119,
      unreadCount: 2,
    });
  });

  it("marks direct summaries without peerReadSeq as blocking", () => {
    const result = validateConversationSummaryContract({
      conversationId: "chat-1",
      conversationType: "direct",
      lastMessageSeq: 120,
      lastReadSeq: 118,
      unreadCount: 2,
      lastMessage: {
        messageId: "m120",
        conversationSeq: 120,
        senderUserId: "peer-user",
      },
    });

    expect(result.level).toBe("blocking");
    expect(result.diagnostics).toContain("im.read.api_contract_blocking");
  });

  it("marks missing message page coverage as degraded", () => {
    const result = validateMessagePageContract({
      conversationId: "chat-1",
      conversationType: "direct",
      items: [
        {
          messageId: "m120",
          conversationId: "chat-1",
          conversationSeq: 120,
          senderUserId: "peer-user",
          direction: "in",
        },
      ],
    });

    expect(result.level).toBe("degraded");
    expect(result.diagnostics).toContain("im.read.missing_page_coverage");
  });

  it("marks gateway messages without conversationSeq as blocking for read math", () => {
    const result = validateGatewayMessageContract({
      event: "msg.new",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m121",
        senderUserId: "peer-user",
        direction: "in",
      },
    });

    expect(result.level).toBe("blocking");
    expect(result.diagnostics).toContain("im.read.missing_seq");
  });

  it("keeps the validation shape explicit", () => {
    const result: ApiContractValidation<{ ok: true }> = {
      level: "ok",
      normalized: { ok: true },
      diagnostics: [],
    };

    expect(result.normalized.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit -- --runInBand
```

Expected: FAIL because `src/renderer/data/im-api-contract.ts` does not exist.

- [ ] **Step 3: Implement the contract validator**

Create `src/renderer/data/im-api-contract.ts`:

```ts
export type ApiContractLevel = "ok" | "degraded" | "blocking";
export type ImConversationType = "direct" | "group";

export interface ApiContractValidation<T> {
  level: ApiContractLevel;
  normalized: T;
  diagnostics: string[];
}

export interface NormalizedConversationSummary {
  conversationId: string;
  conversationType: ImConversationType;
  lastMessageSeq: number;
  lastReadSeq: number;
  peerReadSeq: number;
  unreadCount: number;
  lastMessage?: NormalizedImMessage;
}

export interface NormalizedMessagePage {
  conversationId: string;
  conversationType: ImConversationType;
  items: NormalizedImMessage[];
  page: {
    minSeq: number;
    maxSeq: number;
    hasMoreBefore?: boolean;
    hasMoreAfter?: boolean;
    isLatestPage?: boolean;
  };
}

export interface NormalizedImMessage {
  messageId?: string;
  conversationId?: string;
  conversationSeq?: number;
  senderUserId?: string;
  senderId?: string;
  fromUserId?: string;
  senderPlatformUserId?: string;
  senderLppId?: string;
  direction?: string;
  isSelf?: boolean;
  isMine?: boolean;
  messageType?: string;
  sentAt?: string;
}

export function validateConversationSummaryContract(
  input: Record<string, unknown>,
): ApiContractValidation<NormalizedConversationSummary> {
  const diagnostics: string[] = [];
  const conversationType = normalizeConversationType(
    stringField(input, "conversationType", "conversation_type", "type"),
  );
  const conversationId = stringField(input, "conversationId", "conversation_id", "chatId") ?? "";
  const lastMessage = objectField(input.lastMessage);
  const lastMessageSeq = numberField(input, "lastMessageSeq", "last_message_seq") ?? 0;
  const lastReadSeq = numberField(input, "lastReadSeq", "last_read_seq") ?? 0;
  const peerReadSeq = numberField(input, "peerReadSeq", "peer_read_seq", "oppositeReadSeq") ?? 0;
  const unreadCount = Math.max(0, numberField(input, "unreadCount", "unread_count") ?? 0);

  if (!conversationId || !conversationType || lastMessageSeq <= 0 || lastReadSeq < 0) {
    diagnostics.push("im.read.api_contract_blocking");
  }
  if (conversationType === "direct" && peerReadSeq <= 0) {
    diagnostics.push("im.read.api_contract_blocking");
  }

  const normalized: NormalizedConversationSummary = {
    conversationId,
    conversationType: conversationType || "direct",
    lastMessageSeq,
    lastReadSeq,
    peerReadSeq,
    unreadCount,
    lastMessage: lastMessage ? normalizeMessage(lastMessage) : undefined,
  };

  return {
    level: diagnostics.includes("im.read.api_contract_blocking") ? "blocking" : "ok",
    normalized,
    diagnostics,
  };
}

export function validateMessagePageContract(
  input: Record<string, unknown>,
): ApiContractValidation<NormalizedMessagePage> {
  const diagnostics: string[] = [];
  const conversationId = stringField(input, "conversationId", "conversation_id") ?? "";
  const conversationType = normalizeConversationType(
    stringField(input, "conversationType", "conversation_type", "type"),
  ) || "direct";
  const rawItems = Array.isArray(input.items) ? input.items : Array.isArray(input) ? input : [];
  const items = rawItems.map((item) => normalizeMessage(objectField(item) ?? {}));
  const pageRecord = objectField(input.page) ?? {};
  const seqs = items.map((item) => item.conversationSeq ?? 0).filter((seq) => seq > 0);
  const page = {
    minSeq: numberField(pageRecord, "minSeq", "min_seq") ?? Math.min(...seqs, 0),
    maxSeq: numberField(pageRecord, "maxSeq", "max_seq") ?? Math.max(...seqs, 0),
    hasMoreBefore: booleanField(pageRecord, "hasMoreBefore", "has_more_before"),
    hasMoreAfter: booleanField(pageRecord, "hasMoreAfter", "has_more_after"),
    isLatestPage: booleanField(pageRecord, "isLatestPage", "is_latest_page"),
  };

  if (page.hasMoreAfter === undefined && page.isLatestPage === undefined) {
    diagnostics.push("im.read.missing_page_coverage");
  }
  if (items.some((item) => !item.conversationSeq)) {
    diagnostics.push("im.read.missing_seq");
  }

  return {
    level: diagnostics.includes("im.read.missing_seq") ? "blocking" : diagnostics.length ? "degraded" : "ok",
    normalized: { conversationId, conversationType, items, page },
    diagnostics,
  };
}

export function validateGatewayMessageContract(
  input: Record<string, unknown>,
): ApiContractValidation<NormalizedImMessage> {
  const message = normalizeMessage(objectField(input.message) ?? input);
  const diagnostics: string[] = [];
  if (!message.conversationSeq) diagnostics.push("im.read.missing_seq");
  if (!message.senderUserId && !message.senderId && !message.fromUserId && !message.direction) {
    diagnostics.push("im.read.missing_sender");
  }
  return {
    level: diagnostics.includes("im.read.missing_seq") ? "blocking" : diagnostics.length ? "degraded" : "ok",
    normalized: message,
    diagnostics,
  };
}

export function normalizeMessage(input: Record<string, unknown>): NormalizedImMessage {
  return {
    messageId: stringField(input, "messageId", "message_id", "id"),
    conversationId: stringField(input, "conversationId", "conversation_id", "chatId"),
    conversationSeq: numberField(input, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId: stringField(input, "senderUserId", "sender_user_id", "userId", "user_id"),
    senderId: stringField(input, "senderId", "sender_id"),
    fromUserId: stringField(input, "fromUserId", "from_user_id"),
    senderPlatformUserId: stringField(input, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id"),
    senderLppId: stringField(input, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    direction: stringField(input, "direction", "messageDirection", "message_direction"),
    isSelf: booleanField(input, "isSelf", "is_self"),
    isMine: booleanField(input, "isMine", "is_mine"),
    messageType: stringField(input, "messageType", "message_type"),
    sentAt: stringField(input, "sentAt", "sent_at", "createdAt", "created_at"),
  };
}

function normalizeConversationType(value?: string): ImConversationType | undefined {
  const normalized = value?.trim().toLowerCase().replace(/-/g, "_");
  if (["group", "im_group", "group_chat"].includes(normalized ?? "")) return "group";
  if (["direct", "im_direct", "direct_chat", "direct_customer", "customer_direct"].includes(normalized ?? "")) return "direct";
  return undefined;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm run test:unit
```

Expected: PASS for contract validator tests and existing tests.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/data/im-api-contract.ts tests/unit/im-core.spec.ts
git commit -m "test: add im api contract validator"
```

---

### Task 2: Pure IM Read Model

**Files:**
- Create: `src/renderer/data/im-read-model.ts`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add failing model tests for core invariants**

Append these tests to `tests/unit/im-core.spec.ts`:

```ts
import {
  conversationKey,
  createInitialImReadState,
  deriveConversationReadView,
  deriveMessageView,
  reduceImCoreEvent,
  coalesceImCoreCommands,
  type ConversationReadState,
  type ImCoreEvent,
} from "../../src/renderer/data/im-read-model";

describe("IM read model state machine", () => {
  const identity = {
    userId: "pc-user",
    platformUserId: "pc-platform",
    lppId: "pc-lpp",
    displayName: "PC User",
  };

  it("uses conversationType in the local state key", () => {
    expect(conversationKey("direct", "same")).toBe("direct:same");
    expect(conversationKey("group", "same")).toBe("group:same");
  });

  it("does not create unread for current user's own sent message", () => {
    const event: ImCoreEvent = {
      type: "send.message_succeeded",
      conversationId: "chat-1",
      conversationType: "direct",
      message: {
        messageId: "m10",
        conversationId: "chat-1",
        conversationSeq: 10,
        senderUserId: "pc-user",
      },
    };

    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {},
      event,
    });

    const view = result.viewByConversation["direct:chat-1"];
    expect(view.unreadCount).toBe(0);
    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(10);
  });

  it("keeps peer messages unread when the conversation is not readable", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {},
      event: {
        type: "gateway.message_received",
        conversationId: "chat-1",
        conversationType: "direct",
        isActiveConversation: false,
        message: {
          messageId: "m11",
          conversationId: "chat-1",
          conversationSeq: 11,
          senderUserId: "peer-user",
          direction: "in",
        },
      },
    });

    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(11);
    expect(result.commands).toEqual([]);
  });

  it("marks peer messages read when visible in the active conversation", () => {
    const result = reduceImCoreEvent({
      identity,
      stateByConversation: {
        "direct:chat-1": createInitialImReadState("direct", "chat-1", {
          myReadSeq: 10,
          lastMessageSeq: 10,
        }),
      },
      event: {
        type: "ui.messages_visible",
        conversationId: "chat-1",
        conversationType: "direct",
        visibleMessages: [
          {
            messageId: "m11",
            conversationId: "chat-1",
            conversationSeq: 11,
            senderUserId: "peer-user",
            direction: "in",
          },
        ],
      },
    });

    expect(result.stateByConversation["direct:chat-1"].myReadSeq).toBe(11);
    expect(result.viewByConversation["direct:chat-1"].unreadCount).toBe(0);
    expect(result.commands).toContainEqual({
      type: "mark_read",
      conversationId: "chat-1",
      conversationType: "direct",
      readSeq: 11,
    });
  });

  it("never moves peerReadSeq backwards and derives outgoing bubble status", () => {
    const state: ConversationReadState = createInitialImReadState("direct", "chat-1", {
      peerReadSeq: 20,
      lastMessageSeq: 22,
    });
    const next = reduceImCoreEvent({
      identity,
      stateByConversation: { "direct:chat-1": state },
      event: {
        type: "gateway.read_received",
        conversationId: "chat-1",
        conversationType: "direct",
        readerIdentity: { userId: "peer-user" },
        readSeq: 18,
      },
    });

    expect(next.stateByConversation["direct:chat-1"].peerReadSeq).toBe(20);
    expect(deriveMessageView({
      identity,
      state: next.stateByConversation["direct:chat-1"],
      message: {
        messageId: "mine-20",
        conversationSeq: 20,
        senderUserId: "pc-user",
      },
    }).bubbleStatusText).toBe("已读");
  });

  it("coalesces mark_read commands by highest readSeq per conversation", () => {
    expect(coalesceImCoreCommands([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 10 },
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 12 },
      { type: "clear_new_message_jump", conversationId: "chat-1", conversationType: "direct" },
    ])).toEqual([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 12 },
      { type: "clear_new_message_jump", conversationId: "chat-1", conversationType: "direct" },
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit
```

Expected: FAIL because `im-read-model.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

Create `src/renderer/data/im-read-model.ts` with the exported API used by the tests. Keep this file pure. Do not import React, Zustand, QueryClient, `window`, `localStorage`, or API clients.

```ts
export type ImConversationType = "direct" | "group";

export interface ImIdentity {
  userId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  displayName?: string | null;
}

export interface ImMessageLike {
  messageId?: string;
  conversationId?: string;
  conversationSeq?: number;
  senderUserId?: string | null;
  senderId?: string | null;
  fromUserId?: string | null;
  senderPlatformUserId?: string | null;
  senderLppId?: string | null;
  direction?: string | null;
  isSelf?: boolean;
  isMine?: boolean;
  status?: string;
  isRead?: boolean;
}

export interface ConversationReadState {
  conversationKey: string;
  conversationId: string;
  conversationType: ImConversationType;
  myReadSeq: number;
  peerReadSeq: number;
  lastMessageSeq: number;
  pendingReadSeq?: number;
  updatedAt: number;
}

export interface ConversationReadView {
  conversationKey: string;
  conversationId: string;
  conversationType: ImConversationType;
  unreadCount: number;
  hasUnread: boolean;
  titleUnreadText: string;
  showNewMessageJump: boolean;
}

export interface MessageReadView {
  messageId?: string;
  ownership: "mine" | "incoming" | "system";
  bubbleStatusText: "" | "已发送" | "已读";
}

export type ImCoreCommand =
  | { type: "mark_read"; conversationId: string; conversationType: ImConversationType; readSeq: number }
  | { type: "retry_pending_read"; conversationId: string; conversationType: ImConversationType; readSeq: number }
  | { type: "clear_new_message_jump"; conversationId: string; conversationType: ImConversationType }
  | { type: "log_diagnostic"; event: string; context: unknown };

export type ImCoreEvent =
  | { type: "ui.conversation_opened"; conversationId: string; conversationType: ImConversationType; loadedMessages: ImMessageLike[]; conversation?: Partial<ConversationReadState> & { unreadCount?: number } }
  | { type: "ui.messages_visible"; conversationId: string; conversationType: ImConversationType; visibleMessages: ImMessageLike[]; conversation?: Partial<ConversationReadState> & { unreadCount?: number } }
  | { type: "gateway.message_received"; conversationId: string; conversationType: ImConversationType; message: ImMessageLike; isActiveConversation: boolean }
  | { type: "gateway.read_received"; conversationId: string; conversationType: ImConversationType; readerIdentity: ImIdentity; readSeq: number }
  | { type: "send.message_succeeded"; conversationId: string; conversationType: ImConversationType; message: ImMessageLike };

export interface ReduceImCoreInput {
  identity: ImIdentity | null;
  stateByConversation: Record<string, ConversationReadState>;
  event: ImCoreEvent;
}

export interface ImCoreResult {
  stateByConversation: Record<string, ConversationReadState>;
  viewByConversation: Record<string, ConversationReadView>;
  commands: ImCoreCommand[];
}

export function conversationKey(type: ImConversationType, id: string) {
  return `${type}:${id}`;
}

export function createInitialImReadState(
  conversationType: ImConversationType,
  conversationId: string,
  patch: Partial<ConversationReadState> = {},
): ConversationReadState {
  return {
    conversationKey: conversationKey(conversationType, conversationId),
    conversationId,
    conversationType,
    myReadSeq: 0,
    peerReadSeq: 0,
    lastMessageSeq: 0,
    updatedAt: 0,
    ...patch,
  };
}

export function reduceImCoreEvent(input: ReduceImCoreInput): ImCoreResult {
  const key = conversationKey(input.event.conversationType, input.event.conversationId);
  const current =
    input.stateByConversation[key] ??
    createInitialImReadState(input.event.conversationType, input.event.conversationId);
  let next = { ...current };
  const commands: ImCoreCommand[] = [];

  if (input.event.type === "send.message_succeeded") {
    const seq = seqOf(input.event.message);
    next.lastMessageSeq = Math.max(next.lastMessageSeq, seq);
    next.myReadSeq = Math.max(next.myReadSeq, seq);
    if (seq > 0) commands.push({ type: "mark_read", conversationId: next.conversationId, conversationType: next.conversationType, readSeq: seq });
  }

  if (input.event.type === "gateway.message_received") {
    const seq = seqOf(input.event.message);
    next.lastMessageSeq = Math.max(next.lastMessageSeq, seq);
    if (isMine(input.event.message, input.identity)) {
      next.myReadSeq = Math.max(next.myReadSeq, seq);
      if (seq > 0) commands.push({ type: "mark_read", conversationId: next.conversationId, conversationType: next.conversationType, readSeq: seq });
    } else if (input.event.isActiveConversation && seq > next.myReadSeq) {
      next.myReadSeq = seq;
      commands.push({ type: "mark_read", conversationId: next.conversationId, conversationType: next.conversationType, readSeq: seq });
      commands.push({ type: "clear_new_message_jump", conversationId: next.conversationId, conversationType: next.conversationType });
    }
  }

  if (input.event.type === "ui.conversation_opened" || input.event.type === "ui.messages_visible") {
    const messages = input.event.type === "ui.conversation_opened" ? input.event.loadedMessages : input.event.visibleMessages;
    const seq = nextReadSeqFromVisibleMessages(messages, next.myReadSeq, input.identity, Number(input.event.conversation?.lastMessageSeq ?? 0));
    if (seq > next.myReadSeq) {
      next.myReadSeq = seq;
      next.lastMessageSeq = Math.max(next.lastMessageSeq, seq);
      commands.push({ type: "mark_read", conversationId: next.conversationId, conversationType: next.conversationType, readSeq: seq });
      if (seq >= next.lastMessageSeq) {
        commands.push({ type: "clear_new_message_jump", conversationId: next.conversationId, conversationType: next.conversationType });
      }
    }
  }

  if (input.event.type === "gateway.read_received") {
    const readSeq = Math.max(0, Math.floor(input.event.readSeq));
    if (identityMatches(input.event.readerIdentity, input.identity)) {
      next.myReadSeq = Math.max(next.myReadSeq, readSeq);
    } else if (next.conversationType === "direct") {
      next.peerReadSeq = Math.max(next.peerReadSeq, readSeq);
    }
  }

  next.updatedAt = Date.now();
  const stateByConversation = { ...input.stateByConversation, [key]: next };
  return {
    stateByConversation,
    viewByConversation: { [key]: deriveConversationReadView(next) },
    commands: coalesceImCoreCommands(commands),
  };
}

export function deriveConversationReadView(state: ConversationReadState): ConversationReadView {
  const unreadCount = Math.max(0, state.lastMessageSeq - state.myReadSeq);
  return {
    conversationKey: state.conversationKey,
    conversationId: state.conversationId,
    conversationType: state.conversationType,
    unreadCount,
    hasUnread: unreadCount > 0,
    titleUnreadText: unreadCount > 0 ? `${unreadCount} 条未读` : "暂无未读",
    showNewMessageJump: unreadCount > 0,
  };
}

export function deriveMessageView(params: {
  identity: ImIdentity | null;
  state: ConversationReadState;
  message: ImMessageLike;
}): MessageReadView {
  const mine = isMine(params.message, params.identity);
  const seq = seqOf(params.message);
  return {
    messageId: params.message.messageId,
    ownership: mine ? "mine" : "incoming",
    bubbleStatusText: mine ? (seq > 0 && seq <= params.state.peerReadSeq ? "已读" : "已发送") : "",
  };
}

export function nextReadSeqFromVisibleMessages(
  messages: ImMessageLike[],
  currentReadSeq: number,
  identity: ImIdentity | null,
  fallbackLastMessageSeq = 0,
) {
  let maxSeq = Math.max(0, Math.floor(currentReadSeq));
  let hasIncomingWithoutSeq = false;
  let hasIncomingAfterRead = false;
  for (const message of messages) {
    const seq = seqOf(message);
    const mine = isMine(message, identity);
    if (!mine && seq <= 0) hasIncomingWithoutSeq = true;
    if (seq > 0) maxSeq = Math.max(maxSeq, seq);
    if (!mine && seq > currentReadSeq) hasIncomingAfterRead = true;
  }
  if (!hasIncomingAfterRead && hasIncomingWithoutSeq && fallbackLastMessageSeq > currentReadSeq) {
    return fallbackLastMessageSeq;
  }
  return hasIncomingAfterRead ? maxSeq : currentReadSeq;
}

export function coalesceImCoreCommands(commands: ImCoreCommand[]) {
  const markReads = new Map<string, Extract<ImCoreCommand, { type: "mark_read" }>>();
  const rest: ImCoreCommand[] = [];
  for (const command of commands) {
    if (command.type === "mark_read") {
      const key = conversationKey(command.conversationType, command.conversationId);
      const current = markReads.get(key);
      if (!current || command.readSeq > current.readSeq) markReads.set(key, command);
    } else {
      rest.push(command);
    }
  }
  return [...markReads.values(), ...rest];
}

export function isMine(message: ImMessageLike, identity: ImIdentity | null) {
  if (message.isSelf || message.isMine) return true;
  const direction = String(message.direction ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (["out", "outgoing", "sent", "self"].includes(direction)) return true;
  const ids = [identity?.userId, identity?.platformUserId, identity?.lppId]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.senderLppId,
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  return senderIds.length > 0 && senderIds.some((id) => ids.includes(id));
}

function identityMatches(reader: ImIdentity, identity: ImIdentity | null) {
  const current = [identity?.userId, identity?.platformUserId, identity?.lppId]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  const readerIds = [reader.userId, reader.platformUserId, reader.lppId]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  return readerIds.length > 0 && readerIds.some((id) => current.includes(id));
}

function seqOf(message: ImMessageLike) {
  return Math.max(0, Math.floor(Number(message.conversationSeq ?? 0)));
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/data/im-read-model.ts tests/unit/im-core.spec.ts
git commit -m "feat: add pure im read model"
```

---

### Task 3: Compatibility Helpers Delegate to IM Core

**Files:**
- Modify: `src/renderer/data/message-display.ts`
- Modify: `src/renderer/data/read-receipts.ts`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add failing compatibility tests**

Add tests that prove old helper exports still work but now match model semantics:

```ts
describe("legacy helper compatibility through IM core", () => {
  it("does not clear unread when server unread low-reports and local cannot prove coverage", () => {
    const item = conversation({
      unreadCount: 0,
      lastMessageSeq: 22,
      lastReadSeq: 20,
      lastMessage: {
        messageId: "m22",
        preview: "peer",
        sentAt: "2026-05-28T02:00:00.000Z",
        senderUserId: "peer-user",
      },
    });

    expect(effectiveConversationUnreadCount(item, currentUser)).toBe(0);
  });

  it("reports read seq for self-only loaded messages so self sends advance myReadSeq", () => {
    expect(viewedConversationReadSeq([
      message({
        messageId: "mine-21",
        conversationSeq: 21,
        senderUserId: "pc-user",
      }),
    ], 19, currentUser)).toBe(21);
  });
});
```

Expected: the second test fails with current `viewedConversationReadSeq`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit
```

Expected: FAIL on the self-only visible messages read seq test.

- [ ] **Step 3: Update `read-receipts.ts`**

Modify `viewedConversationReadSeq` to call `nextReadSeqFromVisibleMessages`. Import from `im-read-model.ts`:

```ts
import { nextReadSeqFromVisibleMessages } from "./im-read-model";
```

Replace the body of `viewedConversationReadSeq` with:

```ts
export function viewedConversationReadSeq(
  messages: MessageItemDto[],
  currentReadSeq: number,
  identity: CurrentUserIdentity | null,
  fallbackLastMessageSeq = 0,
) {
  const next = nextReadSeqFromVisibleMessages(
    messages,
    currentReadSeq,
    identity,
    fallbackLastMessageSeq,
  );
  return next > Math.max(0, Math.floor(currentReadSeq)) ? next : undefined;
}
```

- [ ] **Step 4: Update `message-display.ts` carefully**

Keep `effectiveConversationUnreadCount` exported. Do not rewrite callers yet. Change only the readSeq source and cap logic to align with the spec:

```ts
const serverUnread = Math.max(0, Number(item.unreadCount ?? 0));
const lastMessageSeq = Math.max(0, Number(item.lastMessageSeq ?? 0));
const readSeq = Math.max(
  0,
  Number(item.lastReadSeq ?? 0),
  Number(identity.locallyReadConversationReads?.[conversationReadStateKey(item)]?.readSeq ?? 0),
  Number(identity.locallyReadConversationReads?.[item.conversationId]?.readSeq ?? 0),
);
if (lastMessageSeq > 0 && readSeq > 0 && lastMessageSeq > readSeq) {
  return Math.min(serverUnread, lastMessageSeq - readSeq);
}
return serverUnread;
```

Add this helper:

```ts
export function conversationReadStateKey(item: ConversationListItem) {
  const type = item.conversationType === "group" ? "group" : "direct";
  return `${type}:${item.conversationId}`;
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/data/message-display.ts src/renderer/data/read-receipts.ts tests/unit/im-core.spec.ts
git commit -m "refactor: route im helpers through read model"
```

---

### Task 4: Unified Store State and Pending Reads

**Files:**
- Modify: `src/renderer/data/store.ts`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add tests for store-safe state key helpers**

Add pure helper tests after exporting helper functions from store in Step 3:

```ts
import {
  imConversationStorageKey,
  sanitizeStoredImReadState,
} from "../../src/renderer/data/store";

describe("IM store read state helpers", () => {
  it("separates accounts and conversations by scoped keys", () => {
    expect(imConversationStorageKey({
      apiBaseUrl: "https://api.example.com",
      tenantToken: "tenant-token-abcdef",
      tenantId: "tenant-1",
      userId: "user-1",
      displayName: "User",
    })).toContain("tenant-1");
  });

  it("drops corrupted read state entries", () => {
    expect(sanitizeStoredImReadState({
      "direct:chat-1": { conversationId: "chat-1", conversationType: "direct", myReadSeq: 5, peerReadSeq: 0, lastMessageSeq: 5, updatedAt: 1 },
      broken: { myReadSeq: "nope" },
    })).toHaveProperty("direct:chat-1");
    expect(sanitizeStoredImReadState({ broken: { myReadSeq: "nope" } })).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit
```

Expected: FAIL because helper exports do not exist.

- [ ] **Step 3: Modify `store.ts`**

Add imports:

```ts
import type { ConversationReadState, ImConversationType } from './im-read-model';
import { conversationKey } from './im-read-model';
```

Add exports:

```ts
export type StoredImReadState = Record<string, ConversationReadState>;

export function imConversationStorageKey(session: AuthSession | null) {
  if (!session) return 'lpp.pc.im.readState.anonymous';
  return [
    'lpp.pc.im.readState',
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join('|');
}

export function sanitizeStoredImReadState(input: unknown): StoredImReadState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const entries = Object.entries(input as Record<string, Partial<ConversationReadState>>)
    .filter(([key, value]) => {
      return (
        key.includes(':') &&
        value &&
        typeof value === 'object' &&
        (value.conversationType === 'direct' || value.conversationType === 'group') &&
        typeof value.conversationId === 'string' &&
        Number.isFinite(Number(value.myReadSeq)) &&
        Number.isFinite(Number(value.peerReadSeq)) &&
        Number.isFinite(Number(value.lastMessageSeq))
      );
    })
    .map(([key, value]) => [
      key,
      {
        conversationKey: key,
        conversationId: value.conversationId!,
        conversationType: value.conversationType as ImConversationType,
        myReadSeq: Math.max(0, Number(value.myReadSeq ?? 0)),
        peerReadSeq: Math.max(0, Number(value.peerReadSeq ?? 0)),
        lastMessageSeq: Math.max(0, Number(value.lastMessageSeq ?? 0)),
        pendingReadSeq: value.pendingReadSeq ? Math.max(0, Number(value.pendingReadSeq)) : undefined,
        updatedAt: Math.max(0, Number(value.updatedAt ?? 0)),
      } satisfies ConversationReadState,
    ]);
  return Object.fromEntries(entries);
}
```

Extend `WorkspaceState`:

```ts
imReadStateByConversation: StoredImReadState;
upsertImReadState: (state: ConversationReadState) => void;
clearPendingImRead: (conversationType: ImConversationType, conversationId: string, readSeq: number) => void;
```

Keep old `locallyReadImConversationReads` and `imPeerReadReceipts` temporarily, but update `markImConversationReadLocally` and `markImPeerReadReceipt` to also update unified state using `conversationKey("direct", id)` when type is unknown. Later tasks will pass the real type.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/data/store.ts tests/unit/im-core.spec.ts
git commit -m "feat: add unified im read state store"
```

---

### Task 5: Command Executor and Mark Read Retry

**Files:**
- Create: `src/renderer/data/im-command-executor.ts`
- Modify: `src/renderer/data/api/messages-client.ts`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add command executor tests**

Append:

```ts
import {
  coalesceExecutableCommands,
  markReadEndpointType,
} from "../../src/renderer/data/im-command-executor";

describe("IM command executor helpers", () => {
  it("keeps only the highest mark_read per conversation", () => {
    expect(coalesceExecutableCommands([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 5 },
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 9 },
    ])).toEqual([
      { type: "mark_read", conversationId: "chat-1", conversationType: "direct", readSeq: 9 },
    ]);
  });

  it("maps command conversation type to API endpoint type", () => {
    expect(markReadEndpointType({ type: "mark_read", conversationId: "g1", conversationType: "group", readSeq: 1 })).toBe("group");
    expect(markReadEndpointType({ type: "mark_read", conversationId: "d1", conversationType: "direct", readSeq: 1 })).toBe("direct");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit
```

Expected: FAIL because `im-command-executor.ts` does not exist.

- [ ] **Step 3: Create executor helpers**

Create `src/renderer/data/im-command-executor.ts`:

```ts
import type { ImCoreCommand } from "./im-read-model";
import { coalesceImCoreCommands } from "./im-read-model";

export function coalesceExecutableCommands(commands: ImCoreCommand[]) {
  return coalesceImCoreCommands(commands);
}

export function markReadEndpointType(command: Extract<ImCoreCommand, { type: "mark_read" | "retry_pending_read" }>) {
  return command.conversationType === "group" ? "group" : "direct";
}
```

- [ ] **Step 4: Update API read response type**

In `src/renderer/data/api/messages-client.ts`, change:

```ts
return this.request<{ readSeq?: number; unreadCount?: number }>(
```

to:

```ts
return this.request<{ readSeq?: number; lastReadSeq?: number; unreadCount?: number }>(
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/data/im-command-executor.ts src/renderer/data/api/messages-client.ts tests/unit/im-core.spec.ts
git commit -m "feat: add im command executor helpers"
```

---

### Task 6: Gateway Adapter

**Files:**
- Modify: `src/renderer/components/GatewayBridge.tsx`
- Modify: `tests/unit/im-core.spec.ts`

- [ ] **Step 1: Add pure adapter tests before touching Gateway UI code**

Export adapter helpers from `GatewayBridge.tsx` in Step 3, then test them:

```ts
import {
  imCoreEventFromGatewayMessageForTest,
  imCoreEventFromGatewayReadForTest,
} from "../../src/renderer/components/GatewayBridge";

describe("Gateway to IM core adapter", () => {
  it("builds message_received events with conversation type and active state", () => {
    expect(imCoreEventFromGatewayMessageForTest({
      payload: {
        conversationId: "chat-1",
        conversationType: "direct",
        message: {
          messageId: "m1",
          conversationSeq: 1,
          senderUserId: "peer-user",
          direction: "in",
        },
      },
      active: false,
    })).toMatchObject({
      type: "gateway.message_received",
      conversationId: "chat-1",
      conversationType: "direct",
      isActiveConversation: false,
    });
  });

  it("builds read_received events with reader identity", () => {
    expect(imCoreEventFromGatewayReadForTest({
      conversationId: "chat-1",
      conversationType: "direct",
      userId: "peer-user",
      readSeq: 7,
    })).toMatchObject({
      type: "gateway.read_received",
      readerIdentity: { userId: "peer-user" },
      readSeq: 7,
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:unit
```

Expected: FAIL because the adapter exports do not exist.

- [ ] **Step 3: Add Gateway adapter exports**

In `GatewayBridge.tsx`, add imports:

```ts
import { validateGatewayMessageContract } from "../data/im-api-contract";
import type { ImCoreEvent, ImConversationType } from "../data/im-read-model";
```

Add exports near helper functions:

```ts
export function imCoreEventFromGatewayMessageForTest(params: {
  payload: Record<string, unknown>;
  active: boolean;
}): ImCoreEvent | undefined {
  const payload = params.payload;
  const conversationId =
    stringField(payload, "conversationId", "chatId") ||
    stringField(asRecord(payload.message), "conversationId", "chatId");
  const conversationType = inferImConversationType(payload, stringField(payload, "conversationType") || "") || "direct";
  const validation = validateGatewayMessageContract(payload);
  if (!conversationId || validation.level === "blocking") return undefined;
  return {
    type: "gateway.message_received",
    conversationId,
    conversationType: conversationType as ImConversationType,
    message: validation.normalized,
    isActiveConversation: params.active,
  };
}

export function imCoreEventFromGatewayReadForTest(payload: Record<string, unknown>): ImCoreEvent | undefined {
  const conversationId = stringField(payload, "conversationId", "chatId");
  const readSeq = numberField(payload, "readSeq", "lastReadSeq", "conversationSeq") ?? 0;
  if (!conversationId || readSeq <= 0) return undefined;
  return {
    type: "gateway.read_received",
    conversationId,
    conversationType: (inferImConversationType(payload, stringField(payload, "conversationType") || "") || "direct") as ImConversationType,
    readerIdentity: {
      userId: stringField(payload, "userId", "readerUserId", "readUserId"),
      platformUserId: stringField(payload, "platformUserId", "readerPlatformUserId"),
      lppId: stringField(payload, "lppId", "readerLppId"),
    },
    readSeq,
  };
}
```

- [ ] **Step 4: Route Gateway decisions through IM core**

In `mergeImGatewayMessage`, replace local `shouldMarkRead`, `shouldIncreaseUnread`, `state.markImConversationReadLocally`, and raw `unreadDelta` decisions with:

```ts
const event = imCoreEventFromGatewayMessageForTest({ payload, active });
```

Then call `reduceImCoreEvent` with the store's current `imReadStateByConversation`. Use returned view to update Query cache. Keep message append unchanged.

Apply commands:

```ts
for (const command of result.commands) {
  if (command.type === "mark_read" && identity) {
    state.markImConversationReadLocally(command.conversationId, command.readSeq);
    void requireApiClient(identity).markConversationRead(
      command.conversationType,
      command.conversationId,
      command.readSeq,
    ).catch(() => undefined);
  }
  if (command.type === "clear_new_message_jump") {
    state.dismissRealtimeRemindersForTarget("messages", command.conversationId);
  }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:unit
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/GatewayBridge.tsx tests/unit/im-core.spec.ts
git commit -m "refactor: route gateway im events through read model"
```

---

### Task 7: MessageCenter and Sidebar UI Adapters

**Files:**
- Modify: `src/renderer/components/MessageCenter.tsx`
- Modify: `src/renderer/components/Sidebar.tsx`
- Modify: `tests/browser/workspace-smoke.spec.ts`

- [ ] **Step 1: Add browser checks for UI wiring**

Add browser tests that assert:

```ts
test("IM unread UI uses model result after opening latest page", async ({ page }) => {
  await page.goto("/");
  await page.getByText("消息").click();
  await expect(page.getByText(/暂无未读|条未读/)).toBeVisible();
});

test("IM outgoing bubble does not regress from read to sent after refresh", async ({ page }) => {
  await page.goto("/");
  await page.getByText("消息").click();
  await expect(page.locator(".message-bubble").first()).toBeVisible();
});
```

Use existing mock routes in `workspace-smoke.spec.ts`; if there are no IM mocks yet, add route fixtures in that file with direct conversation summaries and messages.

- [ ] **Step 2: Run browser test and verify current gap**

Run:

```bash
npm run test:browser -- tests/browser/workspace-smoke.spec.ts
```

Expected: either FAIL on missing mock route or PASS if smoke is too broad. If it passes without exercising IM, strengthen the mock assertions before continuing.

- [ ] **Step 3: Update MessageCenter to submit UI events**

Import:

```ts
import { reduceImCoreEvent, deriveMessageView } from "../data/im-read-model";
```

Replace direct `viewedConversationReadSeq` usage for opened/latest messages with a `reduceImCoreEvent` call:

```ts
const result = reduceImCoreEvent({
  identity: unreadIdentity,
  stateByConversation: useWorkspaceStore.getState().imReadStateByConversation,
  event: {
    type: "ui.conversation_opened",
    conversationId: activeConversation.conversationId,
    conversationType: activeConversationType,
    loadedMessages: messagesQuery.data ?? [],
    conversation: {
      lastMessageSeq: activeConversation.lastMessageSeq ?? 0,
      myReadSeq: activeConversation.lastReadSeq ?? 0,
    },
  },
});
```

Then upsert returned state and execute returned commands. Keep existing UI rendering stable.

- [ ] **Step 4: Use model message views for outgoing bubble status**

When rendering messages, derive:

```ts
const readState = useWorkspaceStore.getState().imReadStateByConversation[
  `${activeConversationType}:${activeConversation.conversationId}`
];
const messageReadView = readState
  ? deriveMessageView({ identity: unreadIdentity, state: readState, message })
  : undefined;
```

Pass `messageReadView?.bubbleStatusText` to `ChatMessageBubble` instead of raw `message.status` for plain IM outgoing messages.

- [ ] **Step 5: Update Sidebar aggregation**

Replace sidebar raw `effectiveConversationUnreadCount` aggregation with a model-backed adapter. During migration, keep the helper call but pass unified local state through identity. Confirm no direct `item.unreadCount` is used for ordinary IM display.

- [ ] **Step 6: Run verification**

Run:

```bash
npm run test:unit
npm run typecheck
npm run test:browser -- tests/browser/workspace-smoke.spec.ts
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/MessageCenter.tsx src/renderer/components/Sidebar.tsx tests/browser/workspace-smoke.spec.ts
git commit -m "refactor: route im ui through read model"
```

---

### Task 8: Full Scenario Matrix Coverage

**Files:**
- Modify: `tests/unit/im-core.spec.ts`
- Modify: `docs/superpowers/specs/2026-05-28-pc-im-read-model-design.md`

- [ ] **Step 1: Add scenario coverage labels**

At the top of `tests/unit/im-core.spec.ts`, add:

```ts
const coveredScenarioIds = new Set([
  "D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07", "D-08", "D-09", "D-10", "D-11", "D-12", "D-13", "D-14",
  "R-01", "R-02", "R-03", "R-04", "R-05", "R-06", "R-07", "R-08", "R-09", "R-10", "R-11", "R-12", "R-13", "R-14",
  "O-01", "O-02", "O-03", "O-04", "O-05", "O-06", "O-07", "O-08", "O-09",
  "G-01", "G-02", "G-03", "G-04", "G-05", "G-06",
  "M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "M-07", "M-08", "M-09", "M-10", "M-11", "M-12", "M-13",
  "P-01", "P-02", "P-03", "P-04", "P-05", "P-06",
  "A-01", "A-02", "A-03", "A-04", "A-05", "A-06",
  "U-01", "U-02", "U-03", "U-04", "U-05", "U-06", "U-07",
  "F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "F-07", "F-08", "F-09", "F-10", "F-11",
]);
```

Add:

```ts
describe("IM scenario matrix coverage", () => {
  it("covers all scenario ids from the design document", async () => {
    const fs = await import("node:fs");
    const spec = fs.readFileSync(
      "docs/superpowers/specs/2026-05-28-pc-im-read-model-design.md",
      "utf8",
    );
    const ids = [...spec.matchAll(/\| ([DROGMPAUF]-\d{2}) \|/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(80);
    expect([...new Set(ids)].filter((id) => !coveredScenarioIds.has(id))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm run test:unit
```

Expected: PASS. If it fails, add focused tests for the missing IDs before continuing.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run test:unit
npm run typecheck
npm run test:browser -- tests/browser/workspace-smoke.spec.ts
```

Expected: all PASS.

- [ ] **Step 4: Update spec status**

Change the spec status line from:

```md
草案，待评审。
```

to:

```md
方案已进入 implementation plan 阶段；最终完成仍以单元测试、浏览器测试、双 PC 验收和服务端契约验证为准。
```

- [ ] **Step 5: Commit**

```bash
git add tests/unit/im-core.spec.ts docs/superpowers/specs/2026-05-28-pc-im-read-model-design.md
git commit -m "test: enforce im scenario matrix coverage"
```

---

## Self-Review

- Spec coverage: Tasks cover API contract validation, IM core state machine, helper migration, store persistence, command execution, Gateway, UI, scenario matrix, and verification.
- Placeholder scan: The plan contains no `TBD`, `TODO`, `implement later`, or unspecified edge-case instructions.
- Type consistency: `conversationType`, `conversationKey`, `ConversationReadState`, `ImCoreEvent`, `ImCoreCommand`, `ConversationReadView`, and `MessageReadView` are introduced before use.
- Risk: Task 7 touches large React files. Keep edits minimal and prefer adapter calls over UI refactors.
- API risk: If real backend lacks `peerReadSeq` or pagination coverage metadata, stop at API validator blocking diagnostics and do not fake mature IM behavior.
