# P27-IM-002/003 Local Store And Hydration Validation

日期：2026-06-07

范围：PC IM 本地成功消息库 owner、IndexedDB/memory fallback、local-first 聊天首屏、server snapshot/Gateway/send confirmed 首批写穿。

## 变更摘要

1. 新增 `src/renderer/data/message-store/im-message-store-scope.ts`，本地消息库 scope 复用 `workspaceScopeKeyFromSession`，避免另起一套隔离 key。
2. 新增 `src/renderer/data/message-store/im-message-store-reducer.ts`，负责成功消息去重、排序和新旧版本选择。
3. 新增 `src/renderer/data/message-store/im-message-store.ts`，提供 `ImMessageStore` 接口、memory fallback 和 IndexedDB 实现。
4. 新增 `src/renderer/data/message-store/im-message-store-hydration.ts`，负责 local-first 消息显示源选择。
5. `useActiveImConversationQueries` 接入 local-first hydrate：本地有消息时优先显示，server 成功后写回本地 store。
6. `replaceLocalMessageInCache` 和 `mergeImGatewayMessage` 已写穿 server-confirmed / Gateway received 消息到本地 store。

## 验证命令

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-message-store.spec.ts` | PASS | 1 file / 8 tests |
| `./node_modules/.bin/vitest run tests/unit/im-message-store.spec.ts tests/unit/im-message-local-first.spec.ts` | PASS | 2 files / 14 tests |
| `./node_modules/.bin/vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/gateway-im-side-effects.spec.ts tests/unit/im-message-store.spec.ts tests/unit/im-message-local-first.spec.ts` | PASS | 4 files / 37 tests |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | PASS | 无输出，exit 0 |

## 残留风险

1. P27-IM-004 尚未完成：撤回、删除和 read metadata 写穿到本地 store 仍需继续。
2. P27-IM-005 尚未开始：当前 gap sync 仍是 fallback refetch。
3. 本轮未跑完整 `npm run test:core` 和 `npm run check:quick`，等待后续 P27 批次收口时集中验证。
