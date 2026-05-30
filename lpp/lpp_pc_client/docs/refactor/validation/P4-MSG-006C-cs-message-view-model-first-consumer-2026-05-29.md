# P4-MSG-006C Customer Service Message ViewModel First Consumer

日期：2026-05-29

## 变更

在线客服消息首批消费点接入 `createChatMessageViewModel`：

- `ChatWorkspace.tsx` 的 `ServiceMessage` 在渲染 `ChatMessageBubble` 前生成 message view model。
- 客服发送方 fallback、mine 状态、发送状态文本和时间文本进入 ViewModel。
- `ChatMessageBubble` 继续兼容旧 props，避免一次性重写客服消息列表。

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

本任务不新增运行时日志。客服发送/上传行为由 `P4-MSG-005D` 诊断覆盖。

## 遗留风险

客服消息操作菜单、只读态动作权限、AI 接管态展示仍未进入统一 ViewModel；这些属于 P6 在线客服核心重构范围。
