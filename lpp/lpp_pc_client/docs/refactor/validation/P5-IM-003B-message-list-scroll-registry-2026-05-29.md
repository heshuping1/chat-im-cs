# P5-IM-003B Message List Scroll Registry

日期：2026-05-29

## 变更

新增消息滚动注册 hook：

- `src/renderer/messages/hooks/useMessageListScrollRegistry.ts`

迁移内容：

- 消息 DOM element 注册/注销。
- 按 messageId 定位滚动。
- 定位高亮 class。
- 未加载消息 fallback。

`MessageCenter.tsx` 不再直接持有 `messageElementRefs`。

## 边界控制

本任务不迁移 `useWechatBottomFollow`。底部跟随、最新消息跳转、近底判断仍保持原 hook 行为，避免一次性改变滚动体验。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-list-model.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts
```

结果：通过，8 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。滚动定位失败仍通过现有 notice 告知；如后续需要排查滚动问题，可在 P8 诊断包中加入 UI scroll diagnostics。

## 遗留风险

长消息列表仍未虚拟化，滚动性能风险见 `P5-IM-003C` 评估记录。
