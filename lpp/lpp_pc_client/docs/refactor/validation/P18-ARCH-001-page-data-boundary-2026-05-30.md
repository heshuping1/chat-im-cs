# P18-ARCH-001 Page Data Boundary 验证记录

日期：2026-05-30

范围：联系人页和客服工作台首批页面数据访问职责收口。

## 修改范围

1. 新增 `contacts/hooks/useContactsDirectoryController.ts`，承接联系人 query、mutation、目录派生和打开会话命令。
2. 新增 `customer-service/hooks/useCustomerServiceWorkspaceController.ts`，承接客服 threads/history/detail/profile query 和 thread action mutation。
3. `ContactsPage.tsx`、`ChatWorkspace.tsx` 保留页面装配、布局、菜单和局部 UI 状态。
4. `architecture-boundaries.spec.ts` 新增受治理页面不得直接导入 API runtime 的结构测试。

## 边界确认

不改变 API DTO、React Query query key、Gateway event、Electron IPC contract。

## 验证结果

1. `npx vitest run tests/unit/architecture-boundaries.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

其他页面仍存在直接 query/API client，后续按 P18 清单继续分批纳入受治理页面集合。
