# P9-IM-026 message auxiliary data 验证记录

日期：2026-05-30

## 目标

- 将群成员缓存和图片预取副作用从 `MessageCenter.tsx` 迁出。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageAuxiliaryData.ts`。
- 图片预取继续保留 `assetBaseUrl`、auth token、accountId、conversationId 和 messages 入参。
- `MessageCenter.tsx` 行数从 961 降到 931。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-display-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/media-policy.spec.ts`
  - 结果：通过，2 个测试文件，7 个测试用例。

## 诊断日志

- 本次为辅助数据副作用抽离，不新增运行时日志字段。

## 结论

P9-IM-026 已完成。后续群成员缓存和图片预取应优先修改 `useMessageAuxiliaryData`。
