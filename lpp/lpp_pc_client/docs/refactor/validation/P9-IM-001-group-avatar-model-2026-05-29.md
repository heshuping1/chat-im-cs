# P9-IM-001 群头像模型验证记录

日期：2026-05-29

## 目标

- 将 `MessageCenter.tsx` 内的群头像优先级、成员头像九宫格、可见性开关判断抽到消息模型层。
- 避免群头像公共能力散落在页面组件中，便于后续会话列表、资料页、截图快照复用。
- 通过单测锁定正式头像优先、成员去重、可见性和占位名清洗。

## 变更

- 新增 `src/renderer/messages/models/groupAvatarModel.ts`。
- `MessageCenter.tsx` 改为导入 `resolveGroupConversationAvatar`、`groupCompositeAvatarAllowed`、`groupCompositeAvatarCells`。
- 新增 `tests/unit/group-avatar-model.spec.ts`。

## 验证

- `vitest run tests/unit/group-avatar-model.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，3 个测试文件，9 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-001 已完成。群头像能力从页面组件下沉到可复用模型层，`MessageCenter.tsx` 从 4140 行降到 3999 行。后续继续优先抽 message cache mutation 和发送/媒体编排。
