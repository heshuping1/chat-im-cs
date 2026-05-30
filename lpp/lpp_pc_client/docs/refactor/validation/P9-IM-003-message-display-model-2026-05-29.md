# P9-IM-003 消息展示模型验证记录

日期：2026-05-29

## 目标

- 将 `MessageCenter.tsx` 中的消息展示纯逻辑抽到模型层。
- 收敛自发消息识别、发送者展示名、头像资料弹层、事件消息文本、首条未读定位和 inline 状态判断。
- 让消息列表组件和页面 orchestration 只消费模型结果，不重复解释消息 DTO。

## 变更

- 新增 `src/renderer/messages/models/messageDisplayModel.ts`。
- `MessageCenter.tsx` 改为导入展示模型能力，页面行数从 3886 降到 3385。
- 新增 `tests/unit/message-display-model.spec.ts`。

## 验证

- `vitest run tests/unit/message-display-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，14 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-003 已完成。消息展示相关判断已从页面组件下沉到模型层，后续优先抽 message cache mutation 与发送/媒体任务编排，继续降低 `MessageCenter.tsx` 的变更耦合。
