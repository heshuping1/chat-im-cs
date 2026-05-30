# P6-CS-005B CS Workspace ViewModel 壳

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-workspace-view-model.ts`：

- `selectCustomerServiceThread`
- `createCustomerServiceWorkspaceViewModel`
- `CustomerServiceWorkspaceViewModel`
- `CustomerServiceThreadDetailView`

## 迁移内容

- 当前会话优先级：排队/接待中的临时会话优先，历史会话兜底。
- 显式选择：`selectedThreadId` 命中时优先返回对应线程。
- 派生状态：`threadState/readOnly/replyGate/canReply/status`。
- 展示字段：`title/source/messages/threadType/threadId`。

## 设计边界

ViewModel 不负责：

- 触发网络请求。
- 修改 TanStack Query cache。
- 弹 toast。
- 操作 DOM 或滚动。

这些仍分别由页面生命周期、cache adapter、action service 和 UI 层处理。
