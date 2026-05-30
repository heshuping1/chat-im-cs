# P4-MSG-006B IM Message ViewModel First Consumer

日期：2026-05-29

## 变更

普通 IM 消息列表首批消费点接入 `createChatMessageViewModel`：

- `MessageCenter.tsx` 在渲染 `ChatMessageBubble` 前生成 message view model。
- sender fallback、avatar fallback、statusText、timeText、translationText 先收敛到 ViewModel。
- `ChatMessageBubble` 支持传入 `viewModel`，保留旧 props 兼容未迁移入口。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-state-machine.spec.ts
```

结果：通过，10 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。展示模型变更通过单测和类型检查验证；IM 发送/上传行为仍由 `P4-MSG-005C` 诊断覆盖。

## 遗留风险

`MessageCenter.tsx` 仍负责 multi-select、context menu、read status、消息操作权限等装配逻辑；这些留给 P5 页面瘦身继续拆。
