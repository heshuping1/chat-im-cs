# P22-STATUS-008 失败红点稳定性验证

## 范围

- 任务编号：P22-STATUS-008
- 范围：普通 IM / 在线客服消息失败红点的可见性节奏。
- owner：`src/renderer/styles/messages/message-center.css`

## 问题

文本消息发送过程中，若本地发送状态短暂进入 `failed` 又很快被成功态替换，红色 `!` 会一闪而过。这个瞬时状态对用户没有操作价值，反而会制造“是不是发送失败了”的错觉。

## 修改

1. 在失败红点样式中增加 `--pc-chat-failed-marker-reveal-delay`。
2. 红点进入 DOM 后先保持不可见，超过稳定窗口后再淡入。
3. 稳定失败消息仍显示红点，并保留点击重发、tooltip 和确认弹层能力。

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
npx vitest run tests/unit/message-failure-marker-style.spec.ts
```

结果：通过。

## 人工验收建议

1. 发送一条文本消息，正常成功时不应看到红色 `!` 闪烁。
2. 制造稳定失败，红色 `!` 应短暂延迟后出现。
3. 点击红色 `!` 仍应进入“重发该消息?”确认弹层。
