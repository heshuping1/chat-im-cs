# P11-LARGE-002 composer slimming validation

日期：2026-05-30

范围：

- `src/renderer/components/MessageComposer.tsx`
- `src/renderer/components/LexicalChatInput.tsx`
- `src/renderer/components/MessageComposerEmojiPanel.tsx`
- `src/renderer/components/LexicalAttachmentNodeView.tsx`

## 变更摘要

1. 抽出 `MessageComposerEmojiPanel`，承接最近/全部表情面板展示。
2. 抽出 `LexicalAttachmentNodeView`，承接 Lexical attachment node 的 JSX 展示。
3. 保留 `MessageComposer.tsx` 和 `LexicalChatInput.tsx` 生产入口，不引入新依赖，不改变编辑器核心命令链路。
4. `MessageComposer.tsx` 降至 779 行；`LexicalChatInput.tsx` 降至 759 行。

## 验证命令

```bash
wc -l src/renderer/components/MessageComposer.tsx src/renderer/components/LexicalChatInput.tsx
```

结果：`MessageComposer.tsx` 779 行，`LexicalChatInput.tsx` 759 行。

```bash
npx tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

```bash
npx vitest run tests/unit/message-composer-model.spec.ts tests/unit/composer-attachment-presentation.spec.ts tests/unit/composer-document.spec.ts tests/unit/composer-screenshot.spec.ts
```

结果：通过，4 个测试文件、14 个测试通过。

```bash
npm run p10:audit
```

结果：通过，`MessageComposer.tsx` 和 `LexicalChatInput.tsx` 不再出现在 `large-files`。

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
