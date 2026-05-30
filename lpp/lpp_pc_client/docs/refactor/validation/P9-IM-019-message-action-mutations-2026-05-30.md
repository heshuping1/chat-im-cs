# P9-IM-019 message action mutations 验证记录

日期：2026-05-30

## 目标

- 将消息撤回、删除、收藏、翻译、语音转文字、转发 mutation 从 `MessageCenter.tsx` 迁出。
- 保留动作成功后的本地 cache 更新、query invalidation、批量转发状态清理和用户提示行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageActionMutations.ts`。
- `MessageCenter.tsx` 改为通过 hook 获取 `recallMutation`、`deleteMutation`、`favoriteMutation`、`translateMutation`、`voiceToTextMutation`、`forwardMutation`。
- `MessageCenter.tsx` 行数从 1520 降到 1353。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-context-menu-model.spec.ts`
  - 结果：通过，4 个测试文件，17 个测试用例。

## 诊断日志

- 本次为消息动作 mutation orchestration 抽离，不新增运行时日志字段。
- 成功/失败仍沿用既有 notice、query invalidation 和 cache mutation；后续如增加动作失败重试或审计记录，应在 `useMessageActionMutations` 内集中补结构化日志。

## 结论

P9-IM-019 已完成。后续消息动作 mutation、动作结果提示和动作后 cache 更新应优先修改 `useMessageActionMutations`，避免继续散落在页面组件内。
