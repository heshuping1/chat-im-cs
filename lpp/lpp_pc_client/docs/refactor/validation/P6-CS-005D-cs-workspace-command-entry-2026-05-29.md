# P6-CS-005D CS Workspace 命令入口

日期：2026-05-29

## 当前实现

客服线程动作入口已经统一到：

- `src/renderer/data/customer-service/cs-action-permissions.ts`
- `src/renderer/data/customer-service/cs-action-service.ts`

`ChatWorkspace.tsx` 只保留 mutation 生命周期：

- 调用 `executeCustomerServiceThreadAction`
- 成功后执行 cache adapter 更新
- 失败后展示统一错误文案并刷新客服 query

## 覆盖动作

- 接入：`claim`
- 人工接管：`takeover`
- 关闭会话：`close`

评价和转接入口当前页面未形成完整产品闭环，暂不新增 UI 或 API 行为，避免重构阶段凭空造入口。

## 后续边界

当客服命令继续增加时，应新增 `useCustomerServiceWorkspaceCommands` 封装 mutation 生命周期；当前阶段先不拆 hook，避免在 P6 同时改动查询、命令、UI 三条链路。
