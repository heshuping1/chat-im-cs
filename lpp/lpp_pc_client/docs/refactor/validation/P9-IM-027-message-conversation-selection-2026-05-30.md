# P9-IM-027 message conversation selection 验证记录

日期：2026-05-30

## 目标

- 将 unread identity、会话过滤排序、当前会话选择、会话 key/read state/type 派生从 `MessageCenter.tsx` 迁出。
- 移除 `MessageCenter.tsx` 在 shape gate 中的 legacy allowlist。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageConversationSelection.ts`。
- 更新 `scripts/check-code-shape.mjs`，删除 `MessageCenter.tsx` allowlist。
- `MessageCenter.tsx` 行数从 931 降到 883，低于 900 行门禁。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-conversation-list-model.spec.ts tests/unit/im-read-view-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，3 个测试文件，7 个测试用例。

## 诊断日志

- 本次为会话选择派生抽离和 shape gate 收口，不新增运行时日志字段。

## 结论

P9-IM-027 已完成。`MessageCenter.tsx` 已退出大文件 allowlist，后续新增 IM 能力不得让该文件重新超过 shape 阈值。
