# P9-IM-006 message info presentation 验证记录

日期：2026-05-30

## 目标

- 将 `MessageCenter.tsx` 中的会话资料 standalone view 与头像资料 popover 抽到消息组件层。
- 复用公共 `PanelState`，避免页面继续维护局部空态实现。
- 继续降低 IM 页面 presentation 体积，为后续拆 message stage 和弹窗编排做准备。

## 变更

- 新增 `src/renderer/messages/components/ConversationInfoViews.tsx`。
- `MessageCenter.tsx` 改为导入 `StandaloneConversationInfoView`、`AvatarProfilePopover` 和公共 `PanelState`。
- `MessageCenter.tsx` 行数从 2696 降到 2607。

## 验证

- `vitest run tests/unit/message-composer-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，16 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-006 已完成。会话资料相关 presentation 已从页面组件拆出，公共空态已复用 `PanelState`，后续继续处理 message stage 和弹窗 orchestration。
