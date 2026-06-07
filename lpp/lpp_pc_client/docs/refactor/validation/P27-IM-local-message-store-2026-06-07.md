# P27 IM Local Message Store Validation

日期：2026-06-07

范围：PC IM 本地消息库、query key scope、local-first hydrate、服务端/Gateway/send/read 写穿、gap sync fallback 合同、聊天内查找范围提示、客服 unread ledger 边界、P27 架构守卫。

## 变更摘要

1. IM 活跃消息读取、发送写入、Gateway invalidation 统一使用 session/workspace scope，旧 `pcQueryKeys.imMessages(apiBaseUrl, token, ...)` 不再作为运行时路径。
2. 新增 `src/renderer/data/message-store/`，由 IndexedDB + memory fallback 承载 PC 端成功消息 read model，scope 包含 workspace/apiBaseUrl/tenant/user/conversation type/id。
3. 聊天进入链路改为 local-first：本地已有成功消息先显示，服务端快照后台同步并写回本地库，避免整块 loading 遮挡本地消息。
4. 服务端快照、Gateway push、发送确认、撤回、删除、read metadata 统一写穿到本地消息库。
5. Gap Sync 当前明确为 `fallback-refetch`，诊断和文档记录真实 `afterSeq/cursor` 服务端合同缺口。
6. 聊天内查找/历史面板检索 local-first 消息范围，并展示本地缓存范围/已加载范围/已同步范围，避免把当前范围冒充完整服务端历史。
7. 客服 unread ledger 不再把 IM list compat candidate 作为最终 unread source；compat 只保留迁移期显示 fallback 和诊断。
8. 架构边界测试新增：UI 组件不得直接 import 持久化 IM 消息库；运行时不得回退旧 token-scoped IM message query key；客服 compat unread 不得成为最终 unread source。

## 验证命令

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/message-list-model.spec.ts tests/unit/message-lookup-ui.spec.ts tests/unit/customer-service-unread-ledger.spec.ts tests/unit/customer-service-client.spec.ts tests/unit/architecture-boundaries.spec.ts tests/unit/message-query-key-scope.spec.ts tests/unit/im-message-store.spec.ts tests/unit/im-message-local-first.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/gateway-im-side-effects.spec.ts tests/unit/im-gateway-cache.spec.ts tests/unit/message-gap-sync-contract.spec.ts tests/unit/message-gap-sync-coordinator.spec.ts tests/unit/gateway-query-invalidation.spec.ts` | PASS | 14 files / 141 tests |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | PASS | exit 0 |
| `npm run lint:boundaries` | PASS | 1 file / 35 tests |
| `npm run docs:check` | PASS | `refactor docs ok` |
| `git diff --check -- lpp/lpp_pc_client` | PASS | exit 0 |
| `npm run test:core` | PASS | 199 files / 1201 tests |
| `npm run p19:audit` | PASS | `ai-context-split-candidates = none` |
| `npm run check:quick` | PASS | 类型、lint、hooks、边界、docs、P19 audit、shape 全部通过；仅输出已登记的大文件 shape warnings |

## 产品验收

| 验收项 | 结果 | 证据 |
| --- | --- | --- |
| 进入已有本地消息会话，首屏优先显示本地消息 | PASS | `resolveLocalFirstMessages`、`useActiveImConversationQueries`、`im-message-local-first.spec.ts` |
| 服务端消息接口失败，本地消息保留 | PASS | `im-message-local-first.spec.ts` 覆盖 server error + local messages |
| 发送成功后物化进本地消息仓库 | PASS | `message-cache-mutation-model.spec.ts` 覆盖 server-confirmed sent message write-through |
| Gateway 新消息写入同一本地消息仓库 | PASS | `gateway-im-side-effects.spec.ts` 覆盖 received message write-through |
| 撤回/删除/read metadata 写穿本地消息仓库 | PASS | `im-message-store.spec.ts` 与 `message-cache-mutation-model.spec.ts` 覆盖 |
| workspace scope 隔离 | PASS | `message-query-key-scope.spec.ts`、`im-message-store.spec.ts`、`gateway-query-invalidation.spec.ts` |
| Gap Sync 不宣称精确补洞 | PASS | `message-gap-sync-contract.spec.ts`、`M06-服务端GapSync缺口清单.md` |
| 客服 unread 不依赖 IM list compat 最终事实 | PASS | `customer-service-unread-ledger.spec.ts`、`customer-service-client.spec.ts`、`architecture-boundaries.spec.ts` |

## 残留风险

1. 真实精确 gap sync 仍依赖服务端新增 afterSeq/cursor 合同；当前 PC 端只做 honest fallback refetch。
2. 当前未做 Electron 真实窗口手工首屏计时；本轮以 repository/hydration/model 单测和核心门禁验证代码路径。
3. P19 台账补登记了若干既有超审查线文件，未在本轮拆分；后续若继续增长，应按清单中的 owner 拆分方向处理。
