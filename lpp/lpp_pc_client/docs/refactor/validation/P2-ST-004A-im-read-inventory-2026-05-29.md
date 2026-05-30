# 验证记录：P2-ST-004A IM Read 读写点盘点

日期：2026-05-29

任务编号：P2-ST-004A

## 目标

盘点 unread、readSeq、localRead、peerRead、lastReadAt 的读写点，明确 IM read owner 拆分边界。

## 当前状态

| 类别 | 当前实现 | 风险 |
| --- | --- | --- |
| Read Model | `src/renderer/data/im-read-model.ts` 已有纯函数 reducer 和 read view。 | 领域模型相对清晰，可作为 owner 核心，不应重写。 |
| Store 状态 | `store.ts` 持有 `locallyReadImConversationReads`、`imPeerReadReceipts`、`imReadStateByConversation`。 | 与 auth、settings、UI、reminder 混在一个 Store；读写副作用散。 |
| 持久化 | `store.ts` 使用 `lpp.pc.im.localReads`、`lpp.pc.im.peerReads`、`lpp.pc.im.readState`。 | key 构造、读写、sanitize 和更新 action 都在大 Store。 |
| Gateway 写入 | `GatewayBridge.tsx` 通过 `reduceImCoreEvent`、`upsertImReadState`、`markImConversationReadLocally`、`markImPeerReadReceipt` 更新。 | Gateway 仍直接依赖 Store read action。 |
| UI 写入 | `MessageCenter.tsx` 在会话打开、消息可见、发送成功、读回执等场景更新 read state。 | 复杂页面直接调用 read action，后续应迁到 im-read selectors/actions。 |
| UI 读取 | `MessageCenter.tsx`、`Sidebar.tsx` 读取 read state 计算未读和已读状态。 | 多处 merge legacy local read 和 new read state，存在重复逻辑。 |
| 缓存更新 | `data/gateway/im-gateway-cache.ts` 更新 React Query 会话列表和消息已读状态。 | 已抽出 cache 层，但 read owner 还没有统一入口。 |

## 读写点清单

| 文件 | 读/写点 | 用途 | 迁移建议 |
| --- | --- | --- | --- |
| `src/renderer/data/im-read-model.ts` | `reduceImCoreEvent`、`deriveConversationReadView`、`deriveMessageView` | IM read 领域模型。 | 保持为核心 domain，不重写。 |
| `src/renderer/data/store.ts` | `LocalImConversationRead`、`LocalImPeerReadReceipt`、`StoredImReadState` | read 状态类型和 Store 字段。 | P2-ST-004B 建立 im-read owner 壳并兼容导出。 |
| `src/renderer/data/store.ts` | `readStoredLocalImConversationReads`、`readStoredLocalImPeerReadReceipts`、`readStoredImReadState` | 本地 read state 恢复。 | 迁到 `data/im-read/im-read-storage.ts`。 |
| `src/renderer/data/store.ts` | `persistLocalImConversationReads`、`persistLocalImPeerReadReceipts`、`persistImReadState` | 本地 read state 持久化。 | 迁到 read storage/repository。 |
| `src/renderer/data/store.ts` | `markImConversationReadLocally`、`markImPeerReadReceipt`、`upsertImReadState`、`clearPendingImRead` | read action。 | P2-ST-004B 先建立 selectors/actions；P2-ST-004C 再迁调用方。 |
| `src/renderer/components/GatewayBridge.tsx` | `store.imReadStateByConversation`、`store.upsertImReadState`、`store.markImConversationReadLocally`、`store.markImPeerReadReceipt`、`store.clearPendingImRead` | Gateway 新消息和读回执更新。 | 非 React 路径需要 snapshot/action getter。 |
| `src/renderer/components/MessageCenter.tsx` | `locallyReadImConversationReads`、`imPeerReadReceipts`、`imReadStateByConversation`、read actions | 会话未读、消息已读、打开会话自动已读、发送成功已读。 | 迁到 im-read hooks/actions，页面只表达 UI 时机。 |
| `src/renderer/components/Sidebar.tsx` | `locallyReadImConversationReads`、`imReadStateByConversation` | 左侧总未读数。 | 迁到 im-read hooks，避免重复 merge 逻辑。 |
| `src/renderer/data/gateway/im-gateway-cache.ts` | `unreadCount`、`lastReadSeq`、`peerReadSeq` | React Query cache 更新。 | 保持在 gateway data 层；输入来自 read owner。 |
| `src/renderer/data/message-display.ts` | `effectiveConversationUnreadCount`、`conversationReadStateKey` | 展示层未读计算。 | 可保留；后续考虑统一从 read view 输入。 |

## 不变量

1. `myReadSeq` 只能单调递增。
2. `peerReadSeq` 只能单调递增。
3. `lastMessageSeq` 只能单调递增。
4. 当前会话消息可见后，`unreadCount` 应清零并触发 mark read。
5. 自己发送成功后，本端应推进 `myReadSeq`，不产生未读。
6. 非当前会话收到对方消息，应增加 unread 或保留服务端 unread。
7. 本地 legacy read 与新 `imReadStateByConversation` 需要合并，直到旧字段完全移除。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "unread\|readSeq\|lastReadSeq\|lastMessageSeq\|conversationSeq\|localRead\|locallyRead\|peerRead\|readReceipt\|markImConversationReadLocally\|markImPeerReadReceipt\|upsertImReadState\|clearPendingImRead\|imReadStateByConversation\|imPeerReadReceipts\|readState" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 识别 read state 和 unread 读写点。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务为盘点，不改运行时。 |
| 可排查问题 | 后续 Codex 可按本清单拆 read owner。 |
| Codex 检索方式 | `rg -n "markImConversationReadLocally|upsertImReadState|imReadStateByConversation|peerReadSeq|unreadCount" src/renderer` |
| 敏感信息处理 | 未输出用户数据。 |

## 结论

P2-ST-004A 已完成。IM read 已有可复用 domain，重构重点是 owner/storage/action 迁出，而不是重写 read 算法。

## 下一步

1. P2-ST-004B：建立 im-read store/repository 壳，定义不变量和持久化边界。
