# P9-IM-011 message dialogs layer 验证记录

日期：2026-05-30

## 目标

- 收敛 `MessageCenter.tsx` 底部弹窗装配逻辑。
- 保留转发、新建单聊、新建群聊、二维码创建的 mutation 所属边界。

## 变更

- 新增 `src/renderer/messages/components/MessageDialogsLayer.tsx`。
- `MessageCenter.tsx` 只向弹窗层传入状态、resolver 和 mutation 入口。
- `MessageCenter.tsx` 行数从 2383 降到 2360。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-conversation-list-model.spec.ts`
  - 结果：通过，2 个测试文件，5 个测试用例。

## 诊断日志

- 本次为弹窗 presentation orchestration 抽离，不新增运行时日志。
- 新建会话、转发失败提示仍沿用既有 mutation 和 notice 链路。

## 结论

P9-IM-011 已完成。消息弹窗装配已集中到 `MessageDialogsLayer`，后续新增消息域弹窗应优先进入该层。
