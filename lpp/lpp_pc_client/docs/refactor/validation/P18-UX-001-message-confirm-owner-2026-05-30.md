# P18-UX-001 Message Confirm Owner 验证记录

日期：2026-05-30

范围：消息危险操作确认入口治理。

## 修改范围

1. 新增 `messages/runtime/messageConfirm.ts`，集中撤回、删除消息、删除会话、批量删除确认文案。
2. `useMessageMenuActionController` 与 `useMessageInteractionHandlers` 不再直接调用 `window.confirm`。
3. 新增 `message-confirm.spec.ts` 文案单测。
4. `architecture-boundaries.spec.ts` 新增 `window.confirm` 只能出现在消息确认 runtime owner 的结构测试。

## 验证结果

1. `npx vitest run tests/unit/message-confirm.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

当前 runtime 内部仍使用原生 confirm；后续如要升级为自定义 modal，只替换 runtime 实现即可，不改业务 hook。
