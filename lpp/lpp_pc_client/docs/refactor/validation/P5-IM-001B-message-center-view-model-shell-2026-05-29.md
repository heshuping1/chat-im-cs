# P5-IM-001B MessageCenter ViewModel Shell

日期：2026-05-29

## 变更

新增普通 IM 页面 ViewModel 壳：

- `src/renderer/messages/hooks/useMessageCenterViewModel.ts`
- `tests/unit/message-center-view-model.spec.ts`

首批迁移内容：

- active conversation 的只读派生结果。
- active conversation key/read state/type/isGroup。
- active conversation draft。
- active header title。
- direct conversation contact fallback。
- conversation unread counts。
- `getImConversationType` 从页面内局部函数迁出，供 hook 和页面复用。

## 边界控制

本任务只搬只读装配/派生，不迁移：

- 发送链路。
- 已读链路。
- cache patch。
- mutation 副作用。
- JSX 结构和样式。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-view-model.spec.ts
```

结果：通过，4 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。它是页面 ViewModel 壳层拆分，后续 `P5-IM-001E` 会补页面级诊断。

## 遗留风险

`MessageCenter.tsx` 仍保留 active conversation 基础选择用于驱动已有 query hook。后续 `P5-IM-001C` 继续迁移 selected conversation、query loading、empty/error 派生状态，逐步减少重复装配。
