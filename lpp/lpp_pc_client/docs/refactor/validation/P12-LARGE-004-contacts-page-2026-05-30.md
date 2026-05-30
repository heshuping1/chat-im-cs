# P12-LARGE-004 ContactsPage 瘦身验证记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 目标

将 `ContactsPage.tsx` 降到 700 行以下，把联系人详情展示按 owner 拆出。

## 修改范围

- `src/renderer/components/ContactsPage.tsx`
- `src/renderer/components/ContactDetailViews.tsx`

## 结果

```text
627 src/renderer/components/ContactsPage.tsx
155 src/renderer/components/ContactDetailViews.tsx
```

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npm run p12:audit
```

## 验证结果

- TypeScript renderer typecheck：通过。
- `npm run p12:audit`：通过，`ContactsPage.tsx` 不再出现在 `component-edge-files`。
