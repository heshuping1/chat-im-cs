# P9-IM-023 direct read receipt sync 验证记录

日期：2026-05-30

## 目标

- 将单聊 peer 已读回执同步从 `MessageCenter.tsx` 迁出。
- 保留 peer read seq 归一化、IM read state 更新、peer receipt store 更新、消息 cache 标记已读行为。

## 变更

- 新增 `src/renderer/messages/hooks/useDirectReadReceiptSync.ts`。
- `MessageCenter.tsx` 改为向 hook 传入当前会话、direct read status、query client 和 IM read store action。
- `MessageCenter.tsx` 行数从 1146 降到 1102。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/im-read-view-model.spec.ts tests/unit/im-read-store.spec.ts tests/unit/message-display-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，10 个测试用例。

## 诊断日志

- 本次为 direct read receipt 副作用抽离，不新增运行时日志字段。
- 已读回执异常仍通过 IM read state、peer receipt store 和既有 Message/Gateway 诊断链路排查；后续如增加回执延迟监控，应在 `useDirectReadReceiptSync` 集中补结构化日志。

## 结论

P9-IM-023 已完成。后续单聊 peer 已读回执同步应优先修改 `useDirectReadReceiptSync`。
