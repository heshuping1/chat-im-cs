# P9-IM-004 message cache mutation 验证记录

日期：2026-05-29

## 目标

- 将 `MessageCenter.tsx` 中的消息缓存 mutation 从页面组件下沉到模型层。
- 收敛本地发送、发送成功替换、媒体本地预览、转发插入、撤回、删除、收藏和已读会话缓存更新。
- 保持 IM read model 的发送成功联动不变。

## 变更

- 新增 `src/renderer/messages/models/messageCacheMutationModel.ts`。
- `MessageCenter.tsx` 改为导入 cache mutation 能力，页面行数从 3385 降到 2801。
- 新增 `tests/unit/message-cache-mutation-model.spec.ts`。

## 验证

- `vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/send-state-machine.spec.ts`
  - 结果：通过，5 个测试文件，19 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-004 已完成。消息缓存写入规则已从页面组件收敛到可测试模型层，后续 `MessageCenter.tsx` 的主要剩余风险集中在发送/媒体任务编排、弹窗 orchestration 与主 JSX 结构。
