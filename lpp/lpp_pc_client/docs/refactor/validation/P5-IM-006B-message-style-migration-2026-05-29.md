# P5-IM-006B Message Style Migration

日期：2026-05-29

## 变更

已完成：

- 新增 `src/renderer/styles/messages/message-center.css`。
- 从 `src/renderer/styles/app.css` 迁出首批消息模块样式。
- `App.tsx` 新增 `./styles/messages/message-center.css`，导入顺序为 `theme.css` -> `app.css` -> `messages/message-center.css` -> `context-menu.css` -> `toast.css`。
- `app.css` 从 13833 行降到 12599 行，首批迁出 1235 行消息 feature 样式。

## 迁移范围

| 范围 | 代表 class |
| --- | --- |
| 消息列表内联搜索与历史筛选 | `chat-inline-panel`、`chat-history-panel`、`chat-inline-search` |
| 消息跳转与定位 | `pc-chat-unread-jump`、`pc-chat-latest-jump`、`pc-chat-unread-target` |
| 消息行与气泡 | `pc-chat-message`、`pc-chat-select-row`、`pc-chat-bubble` |
| 回复/翻译/时间 | `pc-chat-reply-quote`、`pc-message-translation`、`pc-chat-time` |
| 转发/建聊/二维码弹窗 | `pc-modal-backdrop`、`pc-forward-dialog`、`message-start-dialog`、`message-qr-dialog` |
| 会话资料面板 | `message-info-collapse`、`group-member-list` |
| 气泡内媒体适配 | `pc-chat-bubble .message-media`、`message-file-card`、`message-video-card` |

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vite build
```

结果：通过，CSS 入口可解析，前端构建成功。

## 遗留风险

部分 `pc-chat-*` 样式仍被客服工作台复用。本轮只迁归属，不改 class 名、不改选择器、不改视觉值，因此保持兼容；后续如要彻底拆 IM/客服主题，需要先建立 shared chat style owner。
