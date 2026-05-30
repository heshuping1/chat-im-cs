# P5-IM-006A Message Style Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/styles/app.css`
- `src/renderer/styles/messages/context-menu.css`
- `src/renderer/styles/messages/toast.css`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/messages/components/*`

## 样式归属

| 样式族 | 主要消费点 | 当前归属判断 |
| --- | --- | --- |
| `message-context-menu` | `ChatContextMenus.tsx`、客服右键菜单 | 已在 `styles/messages/context-menu.css`，保持。 |
| `pc-chat-toast` | `ChatToastNotice`、客服 toast | 已在 `styles/messages/toast.css`，保持。 |
| `chat-inline-*` / `chat-history-*` | `MessageListPanel` | 消息列表 feature 样式，应迁出 `app.css`。 |
| `pc-chat-*` | `ChatMessageBubble`、`MessageListPanel`、客服消息复用 | 消息气泡基础样式，应迁出 `app.css`；仍以全局 CSS 方式引入以保持客服复用。 |
| `pc-forward-*` / `message-start-*` / `message-qr-*` | `ForwardDialog`、`MessageStartDialogs`、`InviteQrDialog` | 消息模块弹窗样式，应迁出 `app.css`。 |
| `group-member-*` / `message-info-collapse` | `ConversationInfoPanel` | 消息资料面板样式，应迁出 `app.css`。 |
| `e-composer` / `h-service-composer` | IM 与客服共用 composer shell | 暂不迁移，属于跨模块共用布局，后续需要单独治理。 |
| `composer-*` attachment 基础样式 | `MessageComposer` / `LexicalChatInput` | 部分跨 IM 与客服复用，本轮只迁随消息气泡强相关的视频预览样式。 |

## 结论

首批迁移选择“消息中心强相关、低行为风险”的连续样式段：消息列表辅助面板、消息气泡、转发/建聊/二维码弹窗、群成员资料面板、消息内媒体适配。跨客服共用 composer shell 暂留 `app.css`，避免一次性扩大影响面。
