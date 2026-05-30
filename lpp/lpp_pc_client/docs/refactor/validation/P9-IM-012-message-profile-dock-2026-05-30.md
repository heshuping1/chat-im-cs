# P9-IM-012 message profile dock 验证记录

日期：2026-05-30

## 目标

- 将右侧资料栏 dock 的 resize 和 `ConversationInfoPanel` 装配从 `MessageCenter.tsx` 抽离。
- 保持单聊资料、群资料、群头像和成员加载状态输入不变。

## 变更

- 新增 `src/renderer/messages/components/MessageProfileDock.tsx`。
- `MessageCenter.tsx` 只负责计算资料栏输入数据，并将 resize setter 传入 dock。
- `MessageCenter.tsx` 行数从 2360 降到 2347。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-center-view-model.spec.ts tests/unit/group-avatar-model.spec.ts`
  - 结果：通过，2 个测试文件，7 个测试用例。

## 诊断日志

- 本次为资料栏 presentation 抽离，不新增运行时日志。
- 会话选择、群成员加载、头像快照仍沿用既有 query 与 message center 诊断链路。

## 结论

P9-IM-012 已完成。右侧资料栏 dock 已进入消息组件层，后续资料栏交互变更不应回流到 `MessageCenter` 主 JSX。
