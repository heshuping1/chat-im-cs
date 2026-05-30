# P5-IM-001C MessageCenter Derived State

日期：2026-05-29

## 变更

继续扩展 `useMessageCenterViewModel`：

- conversation list loading。
- conversation list empty text。
- page-level error text。
- message list loading。
- message list empty text。
- selected conversation empty text。

`MessageCenter.tsx` 首批替换：

- 会话列表 loading/empty。
- 消息列表 loading/empty。
- 页面错误文本。
- 未选中会话空态。

## 边界控制

本任务仍只迁移只读派生状态，不迁移：

- send/read/retry/delete 命令。
- React Query cache patch。
- mutation 副作用。
- DOM 结构和样式。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-view-model.spec.ts
```

结果：通过，5 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。页面级诊断日志由 `P5-IM-001E` 统一补齐。

## 遗留风险

`MessageCenter.tsx` 仍直接持有部分 active conversation 基础选择逻辑，因为该值当前用于驱动 `useActiveImConversationQueries`。后续拆 query container 时再进一步下沉。
