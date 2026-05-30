# P9-IM-018 IM read command executor 验证记录

日期：2026-05-30

## 目标

- 将 IM 已读命令执行、会话列表快照同步、当前会话打开标已读从 `MessageCenter.tsx` 迁出。
- 保留本地已读状态、服务端 `markConversationRead`、会话列表 cache 更新、新消息跳转清理和实时提醒清理行为。

## 变更

- 新增 `src/renderer/messages/hooks/useImReadCommandExecutor.ts`。
- `MessageCenter.tsx` 改为向 hook 传入会话、消息、身份、store action、query client 和 notice setter。
- 修正已读 cache 更新依赖，统一复用 `messageCacheMutationModel.applyConversationReadToCache`。
- `MessageCenter.tsx` 行数从约 1657 降到 1520。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/im-read-view-model.spec.ts tests/unit/im-read-service.spec.ts tests/unit/im-read-store.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，11 个测试用例。

## 诊断日志

- 本次为已读链路副作用抽离，不新增运行时日志字段。
- 已读异常仍通过既有 notice、query invalidation、IM read store 快照和 Gateway/Message 诊断链路排查；后续如果补已读失败重试队列，再统一补结构化日志。

## 结论

P9-IM-018 已完成。后续 IM 已读命令执行、会话快照同步、当前会话打开标已读应优先修改 `useImReadCommandExecutor`，避免继续散落在 `MessageCenter.tsx`。
