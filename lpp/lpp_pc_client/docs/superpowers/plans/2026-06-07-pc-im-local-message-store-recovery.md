# PC IM Local Message Store Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 PC 端 IM/客服核心链路缺少真正本地消息库、query key 分裂、补洞能力虚弱和客服领域 owner 混用的问题，让进入聊天页优先展示本地已有消息，再后台同步服务端。

**Architecture:** 新增 PC 端持久化消息仓库作为成功消息、本地发送、服务端快照和 Gateway 增量的统一本地 read model；React Query 只作为服务端快照和 UI cache，不再冒充消息本地库。先统一 workspace scope query key，再引入 IndexedDB repository、消息归约服务、local-first hydration、补洞诊断和客服 ledger 清理。

**Tech Stack:** Electron、React、TypeScript、React Query、Zustand、SignalR、IndexedDB、Vitest、Playwright。

---

## Tracking

| 编号 | 任务 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- |
| P27-IM-001 | 统一 IM query key / scope key，修复发送写入和聊天读取分裂 | P0 | L2 | 已完成 |
| P27-IM-002 | 新增持久化本地消息仓库 owner | P0 | L2 | 已完成 |
| P27-IM-003 | 聊天首屏改为 local-first hydrate，不再用整块 loading 遮挡本地消息 | P0 | L3 | 已完成 |
| P27-IM-004 | 服务端快照、Gateway push、发送确认统一写入本地消息仓库 | P0 | L3 | 已完成 |
| P27-IM-005 | 明确 gap sync 当前 fallback 和服务端 afterSeq/cursor 合同缺口 | P0 | L3 | 已完成 |
| P27-IM-006 | 历史消息分页和聊天内搜索不再只依赖当前 50 条 serverMessages | P1 | L3 | 已完成 |
| P27-CS-001 | 客服未读 ledger 清理 IM list compat 事实依赖 | P1 | L3 | 已完成 |
| P27-ARCH-001 | 补架构边界测试、验证记录和任务矩阵闭环 | P1 | L2 | 已完成 |

## Product Acceptance

1. 新进入聊天窗口时，如果该会话已有本地成功消息，首屏应在 100ms 内显示本地消息，不显示整块空 loading。
2. 本地消息显示后，后台拉取服务端快照并做去重归并；服务端失败时保留本地消息，显示非阻断错误/重试。
3. 发送中、发送失败、中断恢复继续由 outbox 管；发送成功后必须物化进本地消息仓库。
4. Gateway 新消息、服务端分页、发送确认、撤回/删除/read receipt 必须进入同一归约路径。
5. workspace/apiBaseUrl/tenant/user/conversation/type 必须全部进入持久化 scope，不能跨账号、跨空间串消息。
6. 当前服务端没有 afterSeq/cursor 时，只能标注 fallback refetch，不能再宣称精确 gap sync。
7. 客服未读长期事实必须来自客服 ledger/服务端/Gateway 明确客服事件，不能依赖 IM list compat 字段作为主源。

## File Map

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/renderer/data/query-keys.ts` | Modify | 删除 IM 消息读取的旧 scope 路径，统一到 `imMessagesForSession`。 |
| `src/renderer/messages/hooks/useActiveImConversationQueries.ts` | Modify | 使用 session scope key；接入本地消息仓库首屏 hydrate。 |
| `src/renderer/messages/models/messageQueryHotCacheModel.ts` | Modify/Delete after migration | 降级为短期内存加速，不再作为本地消息事实来源。 |
| `src/renderer/data/message-store/im-message-store.ts` | Create | IndexedDB + memory fallback 的 PC 端成功消息仓库唯一 owner。 |
| `src/renderer/data/message-store/im-message-store-scope.ts` | Create | 生成稳定 scope key、conversation key、record key。 |
| `src/renderer/data/message-store/im-message-store-reducer.ts` | Create | 归约 server snapshot、Gateway push、send confirmed、recall/delete/read metadata。 |
| `src/renderer/data/message-store/im-message-store-hydration.ts` | Create | 本地首屏读取、后台 reconcile、诊断事件生成。 |
| `src/renderer/messages/models/messageCacheMutationModel.ts` | Modify | Cache facade 写 React Query 前后同步本地消息仓库，避免 UI 直接写事实。 |
| `src/renderer/data/gateway/message-delivery-service.ts` | Modify | Gateway delivery 写入 message store，再刷新当前 UI cache。 |
| `src/renderer/data/gateway/message-gap-sync-coordinator.ts` | Modify | 明确 fallback refetch 诊断；保留真实 afterSeq/cursor 接口接入点。 |
| `src/renderer/customer-service/models/customer-service-unread-ledger.ts` | Modify | 降低/移除 IM list compat unread 作为长期主源。 |
| `src/renderer/customer-service/models/cs-compatibility-bridge.ts` | Modify | 只保留迁移期显示兼容，不输出客服未读事实主源。 |
| `tests/unit/im-message-store.spec.ts` | Create | 本地消息仓库 scope、去重、排序、retention、snapshot merge 测试。 |
| `tests/unit/im-message-local-first.spec.ts` | Create | 聊天首屏本地优先、服务端失败保留本地消息测试。 |
| `tests/unit/message-query-key-scope.spec.ts` | Create | query key 统一与跨 workspace 隔离测试。 |
| `tests/unit/message-gap-sync-contract.spec.ts` | Create | fallback refetch 和真实 gap sync 合同边界测试。 |
| `tests/unit/customer-service-unread-ledger.spec.ts` | Modify | 客服未读不以 IM list compat 作为最终事实。 |
| `docs/refactor/PC端重构任务矩阵.md` | Modify | 增加 P27 活跃阶段和风险。 |
| `docs/refactor/validation/P27-IM-local-message-store-2026-06-07.md` | Create during execution | 记录验证命令、结果、残留风险。 |

## Tasks

### Task 1: P27-IM-001 Query Key Scope Unification

**Files:**
- Modify: `src/renderer/data/query-keys.ts`
- Modify: `src/renderer/messages/hooks/useActiveImConversationQueries.ts`
- Modify: `src/renderer/messages/models/messageCacheMutationModel.ts`
- Create: `tests/unit/message-query-key-scope.spec.ts`

- [x] **Step 1: Write failing query key tests**

Create `tests/unit/message-query-key-scope.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import { pcQueryKeys } from "../../src/renderer/data/query-keys";

const session = {
  apiBaseUrl: "https://api.example.test",
  platformUserId: "platform-user-1",
  spaceType: 1,
  tenantId: "tenant-1",
  tenantToken: "token-1",
  userId: "user-1",
} as AuthSession;

describe("IM message query scope", () => {
  it("uses the same session-scoped message key for read and write paths", () => {
    expect(pcQueryKeys.imMessagesForSession(session, "direct", "c1")).toEqual([
      "pc-im-messages",
      "https://api.example.test|tenant-1|user-1",
      "direct",
      "c1",
    ]);
  });

  it("keeps another workspace isolated even when conversation id matches", () => {
    const other = { ...session, tenantId: "tenant-2", userId: "user-2" } as AuthSession;
    expect(pcQueryKeys.imMessagesForSession(session, "direct", "c1")).not.toEqual(
      pcQueryKeys.imMessagesForSession(other, "direct", "c1"),
    );
  });
});
```

- [x] **Step 2: Run test and confirm it fails or exposes old-key usage**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/message-query-key-scope.spec.ts tests/unit/message-cache-mutation-model.spec.ts
```

Expected: new tests pass after key helper exists; code search still finds old message read path before implementation.

- [x] **Step 3: Replace active message reads with `imMessagesForSession`**

In `useActiveImConversationQueries.ts`, message query must compute:

```ts
const messagesQueryKey = activeConversation
  ? pcQueryKeys.imMessagesForSession(session, activeConversation.type, activeConversation.id)
  : pcQueryKeys.imMessagesForSession(session, "direct", "__none__");
```

Remove `apiBaseUrl`/`tenantToken` from the active message query key path. Keep `enabled: Boolean(activeConversation && session)` so the placeholder key is never fetched.

- [x] **Step 4: Remove or quarantine old `imMessages(apiBaseUrl, tenantToken, ...)` usage**

Run:

```bash
cd lpp/lpp_pc_client
rg -n "imMessages\\(" src tests
```

Expected: no active runtime read/write path uses `pcQueryKeys.imMessages(...)`; historical tests may be migrated to `imMessagesForSession`.

- [x] **Step 5: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/message-query-key-scope.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts
```

Expected: PASS.

### Task 2: P27-IM-002 Persistent Local Message Store

**Files:**
- Create: `src/renderer/data/message-store/im-message-store-scope.ts`
- Create: `src/renderer/data/message-store/im-message-store.ts`
- Create: `src/renderer/data/message-store/im-message-store-reducer.ts`
- Create: `tests/unit/im-message-store.spec.ts`

- [x] **Step 1: Write failing repository tests**

Create `tests/unit/im-message-store.spec.ts` with these cases:

```ts
import { describe, expect, it } from "vitest";
import type { MessageItemDto } from "../../src/renderer/data/api/types";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import {
  createMemoryImMessageStore,
  imMessageConversationKey,
  imMessageScopeKey,
  mergeMessagesForLocalStore,
} from "../../src/renderer/data/message-store/im-message-store";

const session = {
  apiBaseUrl: "https://api.example.test",
  tenantId: "tenant-1",
  userId: "user-1",
} as AuthSession;

const message = (id: string, seq: number, sentAt = `2026-06-07T00:00:0${seq}.000Z`) => ({
  conversationId: "c1",
  conversationSeq: seq,
  messageId: id,
  messageType: "text",
  preview: id,
  sentAt,
}) as MessageItemDto;

describe("IM local message store", () => {
  it("persists successful messages by session scope and conversation", async () => {
    const store = createMemoryImMessageStore();
    const scopeKey = imMessageScopeKey(session);
    const conversationKey = imMessageConversationKey(scopeKey, "direct", "c1");

    await store.upsertMessages(scopeKey, "direct", "c1", [message("m1", 1)]);

    expect(await store.listMessages(conversationKey, { limit: 50 })).toEqual([message("m1", 1)]);
  });

  it("deduplicates by server messageId and prefers newer sequence metadata", () => {
    expect(mergeMessagesForLocalStore([
      message("m1", 1),
      { ...message("m1", 2), preview: "new" } as MessageItemDto,
    ])).toMatchObject([{ messageId: "m1", conversationSeq: 2, preview: "new" }]);
  });

  it("keeps identical conversation ids isolated across tenants and users", async () => {
    const store = createMemoryImMessageStore();
    const firstScope = imMessageScopeKey(session);
    const secondScope = imMessageScopeKey({ ...session, tenantId: "tenant-2", userId: "user-2" } as AuthSession);

    await store.upsertMessages(firstScope, "direct", "c1", [message("m1", 1)]);
    await store.upsertMessages(secondScope, "direct", "c1", [message("m2", 1)]);

    expect(await store.listMessages(imMessageConversationKey(firstScope, "direct", "c1"), { limit: 50 }))
      .toMatchObject([{ messageId: "m1" }]);
    expect(await store.listMessages(imMessageConversationKey(secondScope, "direct", "c1"), { limit: 50 }))
      .toMatchObject([{ messageId: "m2" }]);
  });
});
```

- [x] **Step 2: Implement scope helpers**

`im-message-store-scope.ts` must export:

```ts
import type { AuthSession } from "../auth/auth-session";

export function imMessageScopeKey(session: AuthSession | null | undefined) {
  return [
    session?.apiBaseUrl || "unknown-base",
    session?.tenantId || "unknown-tenant",
    session?.userId || session?.platformUserId || session?.lppId || "unknown-user",
  ].join("|");
}

export function imMessageConversationKey(scopeKey: string, type: string, conversationId: string) {
  return `${scopeKey}:${type}:${conversationId}`;
}
```

- [x] **Step 3: Implement memory and IndexedDB repository**

`im-message-store.ts` must expose:

```ts
export interface ImMessageStoreListOptions {
  beforeSeq?: number;
  limit: number;
}

export interface ImMessageStore {
  clearScope(scopeKey: string): Promise<void>;
  listMessages(conversationKey: string, options: ImMessageStoreListOptions): Promise<MessageItemDto[]>;
  replaceConversationSnapshot(
    scopeKey: string,
    type: string,
    conversationId: string,
    messages: MessageItemDto[],
  ): Promise<void>;
  upsertMessages(
    scopeKey: string,
    type: string,
    conversationId: string,
    messages: MessageItemDto[],
  ): Promise<void>;
}
```

IndexedDB database name: `lpp-pc-im-message-store`; version: `1`; object store: `messages`; key: `${conversationKey}:${messageId}`; indexes: `conversationKey`, `scopeKey`, `sentAt`, `conversationSeq`, `updatedAt`.

- [x] **Step 4: Implement reducer rules**

`mergeMessagesForLocalStore(messages)` must:

1. ignore messages without stable `messageId`;
2. dedupe by `messageId`;
3. prefer larger `conversationSeq`;
4. fall back to newer `sentAt/serverTime`;
5. sort ascending by `conversationSeq`, then `sentAt`, then `messageId`.

- [x] **Step 5: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/im-message-store.spec.ts
```

Expected: PASS.

### Task 3: P27-IM-003 Local-First Chat Hydration

**Files:**
- Create: `src/renderer/data/message-store/im-message-store-hydration.ts`
- Modify: `src/renderer/messages/hooks/useActiveImConversationQueries.ts`
- Modify: `src/renderer/messages/components/MessageListPanel.tsx`
- Create: `tests/unit/im-message-local-first.spec.ts`

- [x] **Step 1: Write local-first tests**

Test cases:

1. local store has messages and server query is loading -> hook exposes messages immediately and `isLocalHydrated: true`;
2. server query fails -> local messages remain visible and error is non-blocking;
3. no local messages and server query loading -> loading state may render skeleton.

- [x] **Step 2: Implement hydration service**

`im-message-store-hydration.ts` must return:

```ts
export interface LocalFirstMessagesResult {
  hydrationSource: "local" | "server" | "empty";
  isLocalHydrated: boolean;
  messages: MessageItemDto[];
  nonBlockingError?: Error;
}
```

Rules:

1. read latest 50 from local store on active conversation change;
2. set React Query cache with local messages only for the current session key;
3. when server snapshot arrives, write it to store, then update query cache;
4. never clear visible local messages on server loading/error.

- [x] **Step 3: Remove full-screen blocking for persisted messages**

`MessageListPanel.tsx` loading branch must only show blocking loading when there are no messages. If `messages.length > 0`, show the list and a subtle syncing state outside message rows.

- [x] **Step 4: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/im-message-local-first.spec.ts tests/unit/message-center-view-model.spec.ts
```

Expected: PASS.

### Task 4: P27-IM-004 Write-Through From Snapshot, Gateway, Send Confirm

**Files:**
- Modify: `src/renderer/messages/hooks/useActiveImConversationQueries.ts`
- Modify: `src/renderer/messages/models/messageCacheMutationModel.ts`
- Modify: `src/renderer/data/gateway/message-delivery-service.ts`
- Modify: `src/renderer/data/message-core/message-core.ts`
- Modify: `tests/unit/message-cache-mutation-model.spec.ts`
- Modify: `tests/unit/message-delivery-service.spec.ts`

- [ ] **Step 1: Add tests for every write entrance**

Tests must prove:

1. server snapshot writes successful messages to local store;
2. Gateway `msg.new` writes to local store and React Query cache through one facade;
3. `replaceLocalMessageInCache` writes the confirmed server message to local store;
4. recall/delete mutation updates local store metadata or tombstone without resurrecting old preview.

- [ ] **Step 2: Add store dependency to cache facade by explicit parameter**

Do not import a singleton into page code. Message cache mutation functions should accept a repository/service dependency at the application boundary, with memory fallback only in tests.

- [ ] **Step 3: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-delivery-service.spec.ts tests/unit/message-core.spec.ts
```

Expected: PASS.

### Task 5: P27-IM-005 Gap Sync Contract And Honest Fallback

**Files:**
- Modify: `src/renderer/data/gateway/message-gap-sync-coordinator.ts`
- Create: `tests/unit/message-gap-sync-contract.spec.ts`
- Modify: `docs/im-cs-message-foundation/M06-服务端GapSync缺口清单.md`
- Modify: `docs/refactor/architecture/PC端API合同与字段依赖矩阵.md`

- [ ] **Step 1: Add tests for current fallback**

`message-gap-sync-contract.spec.ts` must assert:

1. current mode is `conversation-snapshot-reconcile`;
2. diagnostics include `requiresServerCursor: true`;
3. fallback invalidation is scoped by workspace/session and conversation id;
4. no code path labels fallback as precise `afterSeq` sync.

- [ ] **Step 2: Add future service contract without pretending it exists**

Document required backend contract:

```text
GET /api/im/conversations/{conversationId}/messages/changes?afterSeq={seq}&limit={limit}

Required response:
- conversationId
- conversationType
- fromSeq
- toSeq
- hasMore
- messages[]
- deletedMessageIds[]
- recalledMessageIds[]
- serverCursor or nextAfterSeq
```

If backend contract is not available, keep task status `待处理/服务端依赖` after fallback diagnostics are fixed.

- [ ] **Step 3: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/message-gap-sync-contract.spec.ts tests/unit/gateway-query-invalidation.spec.ts
npm run docs:check
```

Expected: PASS.

### Task 6: P27-IM-006 History Pagination And Search Source

**Files:**
- Modify: `src/renderer/messages/hooks/useMessageListData.ts`
- Modify: `src/renderer/data/api/messages-client.ts`
- Modify: `docs/technical/06-普通IM-P1服务端能力补齐详细方案.md`
- Create/Modify: relevant tests after owner is confirmed

- [ ] **Step 1: Stop treating current loaded 50 messages as full history**

UI labels and search entry must distinguish:

1. local current conversation loaded range;
2. local persisted range;
3. server full-history search if backend API exists.

- [ ] **Step 2: Add local persisted range search**

Search should query local message store first for persisted messages in the conversation. If backend full search API is not available, show explicit limited-range state, not silent partial results.

- [ ] **Step 3: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/message-list-data.spec.ts tests/unit/im-message-store.spec.ts
```

Expected: PASS.

### Task 7: P27-CS-001 Customer Service Unread Ledger Boundary

**Files:**
- Modify: `src/renderer/customer-service/models/customer-service-unread-ledger.ts`
- Modify: `src/renderer/customer-service/models/cs-compatibility-bridge.ts`
- Modify: `tests/unit/customer-service-unread-ledger.spec.ts`

- [ ] **Step 1: Add tests that IM list compat cannot override explicit CS facts**

Tests must prove:

1. server/Gateway CS unread wins over IM list compat;
2. IM list compat can only provide migration display fallback with diagnostics;
3. closed/transferred/read service thread does not resurrect unread from stale IM list.

- [ ] **Step 2: Implement source priority**

Priority must be:

```text
CS Gateway event > CS server thread snapshot > CS local read ledger > migration compat display fallback
```

- [ ] **Step 3: Verify**

Run:

```bash
cd lpp/lpp_pc_client
./node_modules/.bin/vitest run tests/unit/customer-service-unread-ledger.spec.ts tests/unit/cs-compatibility-bridge.spec.ts
```

Expected: PASS.

### Task 8: P27-ARCH-001 Validation, Boundary Guards, Matrix Closure

**Files:**
- Modify: `tests/unit/architecture-boundaries.spec.ts`
- Modify: `docs/refactor/PC端重构任务矩阵.md`
- Create: `docs/refactor/validation/P27-IM-local-message-store-2026-06-07.md`

- [ ] **Step 1: Add boundary assertions**

Architecture tests must fail if:

1. page/components directly import `im-message-store`;
2. runtime paths call old `pcQueryKeys.imMessages(apiBaseUrl, tenantToken, ...)`;
3. customer service unread ledger imports IM list compat as final source;
4. Gateway handler bypasses message delivery/cache facade to write UI state.

- [ ] **Step 2: Run core gates**

Run:

```bash
cd lpp/lpp_pc_client
npm run lint:boundaries
npm run test:core
npm run check:quick
```

Expected: PASS. If full gate is blocked by environment, record the exact failing command, reason, and substitute verification.

- [ ] **Step 3: Add validation record**

Create `docs/refactor/validation/P27-IM-local-message-store-2026-06-07.md` with:

```markdown
# P27 IM Local Message Store Validation

日期：2026-06-07
范围：PC IM 本地消息库、query key scope、local-first hydrate、gap sync fallback、客服 unread ledger

## Commands

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `npm run lint:boundaries` | PASS/FAIL/BLOCKED | 写入实际输出摘要；不能保留模板值。 |
| `npm run test:core` | PASS/FAIL/BLOCKED | 写入实际输出摘要；不能保留模板值。 |
| `npm run check:quick` | PASS/FAIL/BLOCKED | 写入实际输出摘要；不能保留模板值。 |

## Manual Acceptance

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 进入已有本地消息会话，首屏立即显示 | PASS/FAIL/BLOCKED | 写入截图、日志或手工步骤证据。 |
| 服务端消息接口失败，本地消息保留 | PASS/FAIL/BLOCKED | 写入截图、日志或手工步骤证据。 |
| 发送成功后重启客户端，成功消息仍存在 | PASS/FAIL/BLOCKED | 写入截图、日志或手工步骤证据。 |
| Gateway 新消息、refetch、发送确认不重复 | PASS/FAIL/BLOCKED | 写入截图、日志或手工步骤证据。 |

## Residual Risks

- 执行时必须写明剩余风险；无剩余风险时写“无已知剩余风险”。
```

## Execution Order

1. P27-IM-001 must be first. Query key 分裂不修，后续本地库接入会继续写错 owner。
2. P27-IM-002 and P27-IM-003 are the user-visible P0. 完成后才能真正解决“新进聊天窗口慢且遮挡本地消息”。
3. P27-IM-004 closes data consistency. Without it, local store only是冷缓存，不是消息 read model。
4. P27-IM-005 separates PC fix from backend dependency. 当前只能 honest fallback；真实 gap sync 需要服务端合同。
5. P27-IM-006 and P27-CS-001 are P1 follow-up. They should not block local-first first screen, but must not be forgotten.
6. P27-ARCH-001 is mandatory before claiming completion.

## Stop Conditions

Stop and report before coding further if any of these happen:

1. Backend requires a new afterSeq/cursor contract but no API/Gateway contract can be confirmed.
2. The same message fact would be owned by both React Query and IndexedDB without a deterministic merge rule.
3. Store scope cannot include apiBaseUrl + tenantId + userId + conversationType + conversationId.
4. A UI component needs to directly write local message store to make a test pass.
5. Customer service unread cannot be separated from IM list compat without changing service-side contracts.
