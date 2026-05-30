# P6-CS-005C CS Workspace 派生状态迁移

日期：2026-05-29

## 变更

`ChatWorkspace.tsx` 已改为通过 `createCustomerServiceWorkspaceViewModel` 获取核心派生状态：

- `messages`
- `readOnly`
- `replyGate`
- `canReply`
- `source`
- `status`
- `threadState`
- `title`

线程选择已改为通过 `selectCustomerServiceThread` 完成，不再由页面组件直接混合当前会话和历史会话。

## 保留在页面的部分

- `detailQuery/profileQuery/threadsQuery/historyQuery` 仍在页面中声明，保持 React Query 生命周期不变。
- 详情 refetch 的 live 判断仍靠当前 `selectedThread` 推导，避免为了抽象 query lifecycle 过早引入新 hook。

## 验收

- 迁移不改变请求 key、enabled 条件、refetch interval。
- 迁移不改变消息渲染顺序和空消息判断。
- 后续 P6-CS-006 可以基于 `readOnly/replyGate/canReply` 统一空态和终态展示。
