# P9-IM-016 message menu action controller 验证记录

日期：2026-05-30

## 目标

- 将消息右键菜单 action 分发从 `MessageCenter.tsx` 迁出。
- 保留复制、媒体文件动作、引用回复、AI 起草、翻译、语音转文字、收藏、撤回、删除、转发行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageMenuActionController.ts`。
- `MessageCenter.tsx` 改为传入 mutations、状态 setter 和会话上下文。
- `MessageCenter.tsx` 行数从 1854 降到 1698。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-context-menu-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-display-model.spec.ts`
  - 结果：通过，3 个测试文件，13 个测试用例。

## 诊断日志

- 本次为菜单 action orchestration 抽离，不新增日志字段。
- 媒体动作失败提示、翻译/语音 mutation 结果、撤回/删除/收藏提示仍沿用既有 notice 与 mutation 链路。

## 结论

P9-IM-016 已完成。消息菜单 action 已进入消息 hook 层，后续右键菜单行为变更应优先修改 `useMessageMenuActionController`。
