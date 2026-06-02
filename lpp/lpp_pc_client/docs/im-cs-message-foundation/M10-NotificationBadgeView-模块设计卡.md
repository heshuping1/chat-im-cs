模块编号：M10

模块名称：Badge、通知、UI View

模块职责：
- 将 IM effective unread、客服 badge view、好友申请和队列计数汇总到 Sidebar 与 taskbar。
- 统一桌面通知策略：设置开关、免打扰、当前可见目标抑制、短窗口去重。
- 保持 realtime reminder 只是提醒列表，不反向叠加 badge/taskbar。

上游输入：
- `ImReadView` 输出的 IM effective unread。
- `CustomerServiceBadgeView` 输出的客服 active unread、queue count、taskbar unread。
- friend request pending count。
- reminder policy settings、当前 UI active target、窗口焦点。

下游输出：
- Sidebar nav badge。
- Windows taskbar badge。
- realtime reminder push 和 desktop notification decision。

边界：
- Sidebar/taskbar 不解释 raw unread，不读取内部 read store 或客服 ledger。
- Badge 不叠加 realtime reminder 数量。
- 通知决策使用 effective view 和可见性，当前可见目标不弹，自己消息不弹，同一 messageId 去重。
- 关闭通知只影响提醒/桌面通知，不清 badge。

不做：
- 不改 reminder store。
- 不把 notification 模块合并到 IM/客服领域层。
- 不伪造服务端已读或 ack。

测试：
- `tests/unit/reminder-service.spec.ts`
- `tests/unit/customer-service-badge-view.spec.ts`
- `tests/unit/message-center-view-model.spec.ts`
- `tests/unit/workspace-access.spec.ts`
- `tests/unit/architecture-boundaries.spec.ts`
