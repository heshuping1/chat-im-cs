# PC IM Message Core Consistency Implementation Plan

> **For agentic workers:** Use `executing-plans` and TDD. Steps use checkbox syntax for tracking.

**Goal:** 收敛普通 IM 消息、会话摘要、发送态、撤回/删除和已读回执的核心归约规则，减少多入口直接 patch cache 带来的时序不一致。

**Architecture:** 新增 `src/renderer/data/message-core/message-core.ts` 作为纯函数内核。Gateway、轮询、本地发送和消息动作继续使用现有 React Query facade，但核心规则先转成 `MessageCoreEvent` 再归约。

**Tech Stack:** TypeScript、React Query、Vitest、Playwright。

---

## Tasks

- [x] `P21-MSG-CORE-001`：新增 `tests/unit/message-core.spec.ts`，覆盖 Gateway/轮询去重、本地发送服务端确认、内容签名兜底、旧 seq 不覆盖 preview、撤回/删除最后一条、read 更新。
- [x] `P21-MSG-CORE-002`：新增 `message-core` reducer，支持 `message.polled`、`message.gateway_received`、`message.local_created`、`message.send_confirmed`、`message.send_failed`、`message.recalled`、`message.deleted`、`read.updated`。
- [x] `P21-MSG-CORE-003`：接入 Gateway cache、本地发送 cache mutation、撤回/删除、会话 read cache、当前消息列表轮询归约和 direct read receipt sync。
- [x] `P21-MSG-CORE-004`：补任务矩阵、计划文件和验证记录。

## Verification

- Focused unit: `./node_modules/.bin/vitest run tests/unit/message-core.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/im-gateway-cache.spec.ts tests/unit/im-core.spec.ts`
- TypeScript: `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck`
- Core gate: `npm run test:core`
- Coverage gate: `npm run test:coverage:core`
- Browser scenario: `npm run test:browser -- tests/browser/im-read-full-scenarios.spec.ts`
- Quick gate: `npm run check:quick`

## Notes

- React Query 仍是当前 UI cache 承载层；本轮不重写 MessageCenter。
- 客服消息链路不进入本轮治理范围。
- 诊断事件目前由 reducer 返回，未写入全局日志缓冲；后续如需要可在 cache facade 统一采集。
