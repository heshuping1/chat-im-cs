# P12-LARGE-002 CustomerProfileWorkspace 瘦身验证记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 目标

将 `CustomerProfileWorkspace.tsx` 降到 700 行以下，把客户资料兼容模型和字段映射从页面装配中分离。

## 修改范围

- `src/renderer/components/CustomerProfileWorkspace.tsx`
- `src/renderer/components/CustomerProfileModel.ts`

## 结果

```text
435 src/renderer/components/CustomerProfileWorkspace.tsx
370 src/renderer/components/CustomerProfileModel.ts
```

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npm run p12:audit
```

## 验证结果

- TypeScript renderer typecheck：通过。
- `npm run p12:audit`：通过，`CustomerProfileWorkspace.tsx` 不再出现在 `component-edge-files`。
