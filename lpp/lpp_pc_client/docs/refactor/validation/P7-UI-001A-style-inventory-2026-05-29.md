# P7-UI-001A Styles 盘点

日期：2026-05-29

## 当前状态

- `src/renderer/styles/app.css` 仍约 1.2 万行。
- 已存在 feature 样式：
  - `styles/messages/message-center.css`
  - `styles/messages/context-menu.css`
  - `styles/messages/toast.css`
- 新增共享状态组件后，`panel-state` 已具备迁出条件。

## 可迁出块

| 样式块 | 归属 | 本轮处理 |
| --- | --- | --- |
| `.panel-state` | shared state UI | 迁出到 `styles/shared/panel-state.css` |
| `.pc-chat-*` | messages/customer-service 复用聊天 UI | 暂不继续迁，需分批视觉检查。 |
| `.message-*` | 旧消息样式/媒体样式 | 已有部分 message feature 样式，剩余需按组件分批。 |
| `.h-thread-*`、`.h-chat-*` | 客服工作台 | 后续和客服页面拆分一起迁。 |
| account/sidebar/contact/workbench | 各页面 | 暂不在 P7 首批迁移。 |

## 判断

首批只迁 `panel-state`，因为它已经有 `PanelState` 组件承接，视觉风险最低。
