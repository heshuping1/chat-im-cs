模块编号：M08

模块名称：在线客服领域层 - CustomerServiceUnreadLedger

模块职责：
- 统一解释在线客服访客未读、客服自己消息抑制、已读清理和 badge view。
- 将 gateway overlay、workbench server unread、IM 列表兼容候选值合并为一个最终线程未读值。
- 提供客服线程 read visibility，确保只有显式打开且详情加载完成的线程允许清未读。

上游输入：
- gateway 客服消息缓存写入：`threadId`、`conversationId`、`message`、`read`。
- workbench 线程快照：`unreadCount`、`lastMessageSeq/statusVersion`、线程状态。
- IM 列表兼容候选值：仅在明确识别为 temp_session 且有方向/身份依据时作为候选输入。
- UI 线程可见性：active module、active thread、open source、detail loaded。

下游输出：
- `resolveCustomerServiceThreadUnread` 的最终未读值和原因。
- `resolveCustomerServiceBadgeView` 的 active unread、queue count、taskbar unread。
- `canMarkCustomerServiceThreadRead` 的清未读许可。

边界：
- 在线客服未读只由 `CustomerServiceUnreadLedger` 和客服 badge/read visibility 解释。
- staff/self message 只更新摘要，不增加未读；访客 gateway message 才增加 overlay 未读。
- workbench server unread 是可信输入，但必须受 M05 snapshot reconcile 保护，不能覆盖更新的 push overlay。
- badge 不叠加 realtime reminder 数量。
- IM read view 不读取客服 ledger；客服 ledger/view 不读取 IM read store 或 IM effective view。

服务端缺口：
- 当前 gateway/API 仍需要稳定、统一的客服消息方向/角色字段，例如 `senderRole`、`direction`、`isMine`，PC 只使用现有标准输入和当前身份判断，不在本模块伪造角色。
- workbench snapshot 需要稳定递增的 `lastMessageSeq` 或 `statusVersion`，否则只能作为弱合并输入。

不做：
- 不兼容 PC 字段别名。
- 不把客服未读并入 IM 未读。
- 不将 reminder 数量写入 badge view。
- 不在 UI 里根据 raw thread/message 自行重算客服未读。

测试：
- `tests/unit/customer-service-unread-ledger.spec.ts`
- `tests/unit/customer-service-read-visibility.spec.ts`
- `tests/unit/customer-service-badge-view.spec.ts`
- `tests/unit/cs-cache-adapter.spec.ts`
- `tests/unit/gateway-cs-side-effects.spec.ts`
- `tests/unit/customer-service-client.spec.ts`
- `tests/unit/architecture-boundaries.spec.ts`
