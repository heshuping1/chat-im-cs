# P9-IM-009 window dismiss hook 验证记录

日期：2026-05-30

## 目标

- 收敛 `MessageCenter.tsx` 中重复的窗口点击/键盘关闭 effect。
- 让 message menu、plus menu、conversation menu、avatar popover 使用统一 hook。

## 变更

- 新增 `src/renderer/messages/hooks/useWindowDismiss.ts`。
- `MessageCenter.tsx` 删除重复 `useEffect`，改为 `useWindowDismiss`。
- `MessageCenter.tsx` 行数从 2477 降到 2437。

## 验证

- `vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-composer-model.spec.ts`
  - 结果：通过，2 个测试文件，8 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-009 已完成。窗口关闭交互已收敛为消息域 hook，后续菜单和 popover 不再重复写 window listener。
