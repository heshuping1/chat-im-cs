# P11-LARGE-003 Contacts/Profile 瘦身验证记录

日期：2026-05-30

范围：

- `src/renderer/components/ContactsPage.tsx`
- `src/renderer/components/CustomerProfileWorkspace.tsx`
- `src/renderer/components/ContactSidePanel.tsx`
- `src/renderer/components/CustomerProfileBits.tsx`

## 变更摘要

1. 从 `ContactsPage.tsx` 抽出 `ContactSidePanel`，页面继续保留通讯录装配、筛选和联系人选择逻辑。
2. 从 `CustomerProfileWorkspace.tsx` 抽出 `CustomerProfileMetric`、`CustomerProfileTagList` 到 `CustomerProfileBits`，客户资料页面保留 layout 与业务装配。
3. 未新增依赖，未替换技术，未扩大公共抽象；`PanelState` 空态复用保持不变。

## 行数结果

```text
777 src/renderer/components/ContactsPage.tsx
796 src/renderer/components/CustomerProfileWorkspace.tsx
 55 src/renderer/components/ContactSidePanel.tsx
 23 src/renderer/components/CustomerProfileBits.tsx
```

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/cs-identity-view-model.spec.ts tests/unit/cs-workspace-view-model.spec.ts
npm run p10:audit
npm run check:quick
npm run build
npm run test:coverage:core
```

## 验证结果

- `npx tsc --noEmit --pretty false --skipLibCheck`：通过。
- `npx vitest run tests/unit/cs-identity-view-model.spec.ts tests/unit/cs-workspace-view-model.spec.ts`：通过，2 个文件 / 7 个测试。
- `npm run p10:audit`：通过，`large-files` 为 `none`，`tracked-generated-artifacts` 为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。
- `npm run test:coverage:core`：通过，59 个文件 / 262 个测试；覆盖率阈值通过。

## 遗留事项

- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
