# P11-LARGE-001 message center slimming validation

日期：2026-05-30

范围：

- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/messages/components/MessageConversationSidebar.tsx`
- `src/renderer/messages/components/MessageComposerDock.tsx`
- `src/renderer/messages/models/messageComposerLayoutModel.ts`
- `tests/unit/message-composer-layout-model.spec.ts`

## 变更摘要

1. 抽出 `MessageConversationSidebar`，承接会话列表、加号菜单和列表 resizer。
2. 抽出 `MessageComposerDock`，承接回复预览、多选 action bar 和底部 composer surface。
3. 抽出 `messageComposerLayoutModel`，统一 composer 高度 clamp 规则，供页面 effect 和 composer resize 复用。
4. `MessageCenter.tsx` 从 883 行降至 785 行，低于 800 行目标。

## 验证命令

```bash
wc -l src/renderer/components/MessageCenter.tsx src/renderer/messages/components/MessageConversationSidebar.tsx src/renderer/messages/components/MessageComposerDock.tsx
```

结果：`MessageCenter.tsx` 为 785 行。

```bash
npx tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

```bash
npx vitest run tests/unit/message-composer-layout-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/message-conversation-list-model.spec.ts
```

结果：通过，4 个测试文件、10 个测试通过。

```bash
npm run p10:audit
```

结果：通过，`MessageCenter.tsx` 不再出现在 `large-files`。

```bash
npm run check:quick
```

结果：通过。

```bash
npm run build
```

结果：通过。Rollup 仍输出 SignalR `/*#__PURE__*/` 注释位置告警，属于既有第三方依赖构建告警。

```bash
npm run test:coverage:core
```

结果：通过，59 个测试文件、262 个测试通过；覆盖率阈值通过。

## 未执行

- Windows 实机验证：按要求跳过，归 `P11-WIN-001`。
