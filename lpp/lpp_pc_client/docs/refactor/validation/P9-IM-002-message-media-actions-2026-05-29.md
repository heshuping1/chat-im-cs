# P9-IM-002 消息媒体动作 runtime 验证记录

日期：2026-05-29

## 目标

- 将 `MessageCenter.tsx` 内的桌面媒体动作包装抽到 runtime 层。
- 统一复制图片、复制文件、另存、打开、编辑、文件夹展示和 mac/Windows 文案判断入口。
- 为后续 Windows 桌面端验证保留集中适配点。

## 变更

- 新增 `src/renderer/messages/runtime/messageMediaActions.ts`。
- `MessageCenter.tsx` 改为通过 runtime 调用媒体动作，不再直接依赖 `desktopMediaActions`。

## 验证

- `vitest run tests/unit/group-avatar-model.spec.ts tests/unit/media-message.spec.ts tests/unit/message-context-menu-model.spec.ts`
  - 结果：通过，3 个测试文件，16 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-002 已完成。消息媒体桌面动作已从页面组件下沉到 runtime，`MessageCenter.tsx` 从 3999 行降到 3886 行。后续继续抽 message cache mutation 与发送编排。
