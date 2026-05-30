# P17-SMELL-001 Model Boundary Direction 验证记录

日期：2026-05-30

变更：迁出 `getImConversationType` 到 `messages/models/messageConversationTypeModel.ts`，迁出群头像类型到 `messages/models/groupAvatarTypes.ts`，并新增结构测试禁止 `messages/models/**` 依赖 hooks/components。

未改变边界：不改变消息 DTO、query key、页面 props 和渲染行为。

验证：

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-cache-mutation-model.spec.ts
```

结果：3 个测试文件、20 个用例通过。
