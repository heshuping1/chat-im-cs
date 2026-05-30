# 验证记录：P2-ST-004C IM Read 调用方迁移

日期：2026-05-29

任务编号：P2-ST-004C

## 修改范围

- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/data/message-display.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

迁移 Gateway `msg.read`、消息列表、会话列表对 read model 的更新，使调用方通过 `data/im-read/im-read-store.ts` 访问 read state/actions，不再直接依赖 workspace store read 字段。

## 实现内容

| 项 | 说明 |
| --- | --- |
| Gateway | `mergeImGatewayMessage`、`mergeReadEvent`、`executeImCoreCommands` 改走 `getImReadSnapshot()` 和 `getImReadActions()`。 |
| MessageCenter | 本地已读、对端已读、统一 read state、mark/upsert/clear actions 改走 im-read hooks。 |
| Sidebar | 左侧未读计算改走 `useLocalImConversationReads()` 和 `useImReadStateByConversation()`。 |
| message-display | `LocalImConversationRead` 类型改从 `data/im-read/im-read-storage.ts` 导入。 |
| 兼容边界 | `store.ts` 仍为 backing store；新增调用方不再直接读取 read 字段。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-read-storage.spec.ts tests/unit/im-read-store.spec.ts tests/unit/workspace-ui-store.spec.ts tests/unit/im-core.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/im-gateway-cache.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过 | 7 个测试文件，82 个用例通过，耗时约 251ms；`im-core.spec.ts` 现有 localStorage 用法在 Node 26 下有 ExperimentalWarning。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg -n "useWorkspaceStore\\(\\(state\\) => state\\.(locallyReadImConversationReads\|imPeerReadReceipts\|imReadStateByConversation\|markImConversationReadLocally\|markImPeerReadReceipt\|upsertImReadState\|clearPendingImRead)\|useWorkspaceStore\\.getState\\(\\)\\.imReadStateByConversation\|store\\.imReadStateByConversation\|store\\.upsertImReadState\|store\\.markImConversationReadLocally\|store\\.markImPeerReadReceipt\|store\\.clearPendingImRead" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 除 `im-read-store.ts` 内部 selector/getter 外，无调用方直接读取 read 字段/action。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务迁移调用方；P2-ST-004D 补 read model 诊断日志。 |
| 可排查问题 | Codex 可通过 `getImReadSnapshot/getImReadActions/useImReadStateByConversation` 定位 read 调用链。 |
| Codex 检索方式 | `rg -n "getImReadSnapshot|getImReadActions|useImReadStateByConversation|useMarkImConversationReadLocally" src/renderer` |
| 敏感信息处理 | 未新增日志。 |

## 结论

P2-ST-004C 已完成。Gateway、MessageCenter、Sidebar 已通过 im-read owner 壳访问 read state/actions。

## 下一步

1. P2-ST-004D：补 read model 测试和诊断日志，覆盖当前会话/非当前会话/自己消息。
