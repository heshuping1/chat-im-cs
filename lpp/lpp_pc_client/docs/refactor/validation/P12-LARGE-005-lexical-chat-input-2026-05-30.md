# P12-LARGE-005 LexicalChatInput 瘦身验证记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 目标

将 `LexicalChatInput.tsx` 降到 700 行以下，把 Lexical 自定义附件节点拆为独立 owner。

## 修改范围

- `src/renderer/components/LexicalChatInput.tsx`
- `src/renderer/components/LexicalAttachmentNode.tsx`

## 结果

```text
657 src/renderer/components/LexicalChatInput.tsx
116 src/renderer/components/LexicalAttachmentNode.tsx
```

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npm run p12:audit
```

## 验证结果

- TypeScript renderer typecheck：通过。
- `npm run p12:audit`：通过，`LexicalChatInput.tsx` 不再出现在 `component-edge-files`。
