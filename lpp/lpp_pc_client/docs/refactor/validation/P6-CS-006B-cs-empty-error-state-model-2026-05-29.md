# P6-CS-006B CS Empty/Error State Model

日期：2026-05-29

## 变更

`src/renderer/data/customer-service/cs-workspace-view-model.ts` 新增统一状态输出：

- `CustomerServiceWorkspaceInlineState`
- `createCustomerServiceNoThreadState`
- `createCustomerServiceMessageStageState`
- `messageStageState`
- `receptionText`
- `composerDisabledText`
- `modeLabel`

`ChatWorkspace.tsx` 改为消费状态模型，不再散落以下文案：

- 请选择一个在线客服会话
- 正在加载会话...
- 会话加载失败
- 暂无消息记录
- 当前会话仍在排队中
- 当前会话仍由 AI 接待
- 只读查看/当前接待接待条说明

## 设计边界

- 本阶段不抽全局 Empty/Error 组件，避免和 P7 公共 UI 体系收敛重复。
- 组件层仍保留 `ChatPanelState` 极薄渲染函数，只接收模型，不拼业务文案。
- source 展示文案通过 `formatSourceLabel` 注入，避免 data 层直接依赖 UI 组件。

## 验收

- `ChatWorkspace.tsx` 不再直接拼客服工作台的核心空态/错误态/终态文案。
- 单测覆盖 no-thread、loading、error、empty、reception、composer disabled。
