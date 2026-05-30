# P9-IM-017 message start conversation controller 验证记录

日期：2026-05-30

## 目标

- 将发起单聊、创建群聊、生成好友二维码的 mutation 编排从 `MessageCenter.tsx` 迁出。
- 保留成功后刷新会话列表、切换当前会话、关闭弹窗和错误提示行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageStartConversationController.ts`。
- `MessageCenter.tsx` 改为通过 hook 获取 `createDirectChatMutation`、`createGroupChatMutation`、`createInviteQrMutation`。
- `createdConversationId` 与 `stringField` 从页面移入 hook。
- `MessageCenter.tsx` 行数从 1698 降到 1656。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，2 个测试文件，5 个测试用例。

## 诊断日志

- 本次为启动会话 mutation orchestration 抽离，不新增运行时日志。
- 成功刷新和失败提示仍沿用既有 query invalidation 与 notice 链路。

## 结论

P9-IM-017 已完成。启动会话相关 mutation 已进入消息 hook 层，后续发起聊天/建群/二维码逻辑应优先修改 `useMessageStartConversationController`。
