# P22-STATUS-009 文本发送转圈稳定性验证

## 范围

- 任务编号：P22-STATUS-009
- 范围：普通 IM 与在线客服文本消息发送态展示节奏。
- owner：`data/message/message-status-model.ts`、`data/message/message-view-model.ts`、`components/ChatMessageBubble.tsx`、`styles/messages/message-center.css`

## 问题

文本消息发送时，成熟 IM 不应在网络正常时持续打扰用户。只有请求明显变慢时才需要显示轻量“发送中”反馈；失败后再进入红色 `!` 和重发确认闭环。

## 修改

1. 本地文本消息写入 `localSendStartedAt`，该字段只用于客户端展示，不进入发送 API body。
2. 消息状态纯模型新增 `showSendingIndicator`，默认 700ms 内静默，超过阈值才允许展示 spinner。
3. `ChatMessageBubble` 在阈值到达时触发一次本地重算，避免依赖额外轮询或网络刷新。
4. 新增 `pc-chat-sending-marker`，与失败红点同位置、同尺寸，避免状态切换时布局跳动。
5. 媒体消息继续使用现有上传进度和暂停/继续/重试控件，不受文本静默规则影响。

## 未改变边界

- 未改变 API DTO。
- 未改变 React Query query key。
- 未改变 Gateway event。
- 未改变 Electron IPC/preload/main。
- 未改变 Zustand persist key。
- 未新增依赖。
- 未删除旧链路。

## 验证命令

```bash
npx vitest run tests/unit/message-failure-marker-style.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts
```

结果：通过。

## 人工验收建议

1. 正常网络发送文本：消息立即上屏，不应看到“发送中”文字或红色 `!` 闪烁。
2. 慢网络发送文本：约 700ms 后气泡外出现灰色小转圈。
3. 发送成功：小转圈消失，私聊进入 `未读/已读`。
4. 发送失败：小转圈切换为红色 `!`，点击进入“重发该消息?”确认。
