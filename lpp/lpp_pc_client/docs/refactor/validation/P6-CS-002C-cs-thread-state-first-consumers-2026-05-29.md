# P6-CS-002C CS Thread State First Consumers

日期：2026-05-29

## 变更

已迁移 `ChatWorkspace.tsx` 首批调用方：

- 当前线程列表过滤：使用 `createCustomerServiceThreadState(status).readOnly`。
- 详情轮询开关：使用 `readOnly`。
- 标题栏状态标签：使用 `threadState.label`。
- composer 是否可回复：使用 `threadState.replyGate`。
- 动作按钮：使用 `replyGate` 决定 `claim/takeover/close`。
- 移除页面内 `receptionLabel`、`customerServiceReplyGate`、`normalizeStatus`。

## 保留行为

未改变：

- close/claim/takeover API 调用。
- 发送文本/媒体逻辑。
- 只读态提示文案。
- 历史状态文案仍由 `customerServiceHistoryStatusLabel` 提供。

## 回滚点

如果真实状态枚举与假设不一致，只需要调整 `cs-thread-state.ts` 的状态规则，不需要回退页面 JSX。
