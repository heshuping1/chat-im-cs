# P7-SHARED-002C PanelState 首批迁移

日期：2026-05-29

## 已迁移

- `ChatWorkspace.tsx`
  - 未选择客服会话。
  - 会话 loading/error/empty。
- `MessageConversationListPanel.tsx`
  - IM 会话列表 empty。
- `MessageListPanel.tsx`
  - IM 消息列表 empty。

## 未迁移

- `ThreadList.tsx` 的 `e-empty-state`：后续和客服列表 view model 一起处理。
- `AiAssistantPage`、`KnowledgeBasePage`：带 icon 的业务状态，暂不并入。
- `WorkbenchPage.EmptyBlock`：属于 dashboard 空态卡片，不属于纯文本 panel state。
