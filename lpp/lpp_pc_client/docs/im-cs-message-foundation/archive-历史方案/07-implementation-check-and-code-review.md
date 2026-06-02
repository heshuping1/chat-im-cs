# IM + 在线客服消息地基落地核查与代码评审

日期：2026-06-02

## 1. 对 06 最终方案的落地结论

已落地的工程切面：

| 06 方案切面 | 当前落地 |
| --- | --- |
| Contract Normalizer | 继续复用现有 IM / CS contract normalizer 和 gateway payload utils；本轮未做全量 DTO 重写。 |
| ConversationOwnershipResolver(scopeKey) | 已强制 resolver 入参 `scopeKey`，缺 scope 必须显式传空串并得到 `blocking-missing-scope`；indexed temp session 只在同 scope 命中。 |
| ImConversationReadView | 已新增 `data/im-read/im-conversation-read-view.ts`；会话列表、Header、Sidebar、未读筛选改读该 view。 |
| CustomerServiceUnreadLedger | 已新增 `data/customer-service/customer-service-unread-ledger.ts`；`cs-conversation-index.ts` 只保留 index/cache facade，未读计算下沉到 ledger。 |
| Badge / reminder view | 已新增 `data/customer-service/customer-service-badge-view.ts`；在线客服 badge 不再叠加 realtime reminder 数。 |
| ChatSendRuntime | 已新增 `data/send/chat-send-runtime.ts`；IM 文本/名片、客服文本已迁移到 runtime 管理 local id、scope、outbox 和诊断。媒体发送继续复用现有 shared upload/outbox/state/media-cache 模块，业务 upload orchestration 暂留在 IM/CS adapter。 |

## 2. 代码评审结论

本轮评审修复了两个真实风险：

1. `ImConversationReadView` 原先只看 `paneVisible`，没有显式 `messagesLoaded`。已修复为只有 `paneVisible && messagesLoaded` 才压制当前会话未读；Sidebar 不再根据模块/布局提前压制全局 IM badge。
2. `ConversationOwnershipResolver` 原先类型允许不传 `scopeKey`。已改为必填，缺 scope 的诊断入口必须显式传空串，便于追踪 `blocking-missing-scope`。

当前保留的设计边界：

- IM 和在线客服仍是两个业务域，发送 endpoint、cache merge、未读策略不合并。
- `ChatSendRuntime` 只管底层工程能力，不接管 IM/CS 业务策略。
- `pc-im-conversations.tempSession.unreadCount` 只进入客服 ledger 的 bounded candidate，不直接变成最终客服未读。
- realtime reminder 只用于提醒记录和桌面通知决策，不参与 badge 数字叠加。

## 3. 验证

已通过：

- `npx.cmd vitest run tests/unit`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run build`

