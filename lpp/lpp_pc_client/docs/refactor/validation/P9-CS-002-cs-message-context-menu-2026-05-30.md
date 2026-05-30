# P9-CS-002 CS message context menu 验证记录

日期：2026-05-30

## 目标

- 将客服消息媒体右键菜单从 `ChatWorkspace.tsx` 抽离。
- 复用消息域 `ChatToastNotice` 与 `isNoticeErrorText`，避免 toast 规则重复实现。

## 变更

- 新增 `src/renderer/customer-service/components/ServiceMessageContextMenu.tsx`。
- `ChatWorkspace.tsx` 删除局部 `ServiceMessageContextMenu`、`ChatToastNotice`、`isNoticeErrorText`、媒体类型判断 wrapper。
- `ChatWorkspace.tsx` 行数从 1337 降到 1217。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/cs-workspace-view-model.spec.ts tests/unit/message-context-menu-model.spec.ts`
  - 结果：通过，2 个测试文件，11 个测试用例。

## 诊断日志

- 本次为客服媒体菜单 presentation 抽离，不新增运行时日志。
- 菜单 action 仍由 `ChatWorkspace` 既有 handler 承接，媒体动作失败提示保持不变。

## 结论

P9-CS-002 已完成。客服媒体菜单已进入客服组件层，toast 错误判定复用消息域公共组件。
