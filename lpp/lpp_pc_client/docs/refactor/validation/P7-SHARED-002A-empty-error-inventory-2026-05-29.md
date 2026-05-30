# P7-SHARED-002A Empty/Error 盘点

日期：2026-05-29

## 重复入口

| 类型 | 位置 | 现状 |
| --- | --- | --- |
| `panel-state` | `ChatWorkspace`、`MessageCenter`、`CustomerProfileWorkspace`、`ConversationInfoPanel`、`InviteQrDialog` | 多个局部 `PanelState` 重复实现。 |
| `e-panel-state` | `MessageConversationListPanel`、`MessageListPanel` | IM feature 局部状态样式重复。 |
| `e-empty-state` | `ThreadList` | 客服列表空态/错误态仍直接写 DOM。 |
| `utility-inline-state` | `AccountUtilityPages`、`MePage` | 设置/账号页内联状态重复。 |
| 业务专用 state | `AiAssistantPage`、`KnowledgeBasePage`、`WorkbenchPage` | 有图标和专属样式，暂不强行合并。 |

## 治理判断

- 先统一“无图标、纯文本”的状态渲染组件。
- 业务文案和 error formatting 仍放在业务 view model 或页面装配层。
- 带 icon、动作按钮、复杂布局的空态暂不迁移，避免公共组件过早膨胀。
