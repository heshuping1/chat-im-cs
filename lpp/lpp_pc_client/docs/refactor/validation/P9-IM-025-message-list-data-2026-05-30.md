# P9-IM-025 message list data 验证记录

日期：2026-05-30

## 目标

- 将消息列表派生逻辑从 `MessageCenter.tsx` 迁出。
- 保留服务端消息、本地乐观消息、媒体预览、单聊 peer 已读标记、历史筛选和搜索过滤行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageListData.ts`。
- `MessageCenter.tsx` 通过 hook 获取 `messages`、`visibleMessages`、`historyCounts`。
- `MessageCenter.tsx` 行数从 995 降到 961。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-conversation-list-model.spec.ts`
  - 结果：通过，4 个测试文件，13 个测试用例。

## 诊断日志

- 本次为列表数据派生抽离，不新增运行时日志字段。

## 结论

P9-IM-025 已完成。后续消息列表派生应优先修改 `useMessageListData`。
