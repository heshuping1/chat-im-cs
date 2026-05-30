# P12-LARGE-006 MessageBodyView 瘦身验证记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 目标

将 `MessageBodyView.tsx` 降到 700 行以下，把非媒体消息卡片展示拆为独立 owner。

## 修改范围

- `src/renderer/components/MessageBodyView.tsx`
- `src/renderer/components/MessageNonMediaParts.tsx`

## 结果

```text
576 src/renderer/components/MessageBodyView.tsx
175 src/renderer/components/MessageNonMediaParts.tsx
```

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npm run p12:audit
```

## 验证结果

- TypeScript renderer typecheck：通过。
- `npm run p12:audit`：通过，`MessageBodyView.tsx` 不再出现在 `component-edge-files`。
