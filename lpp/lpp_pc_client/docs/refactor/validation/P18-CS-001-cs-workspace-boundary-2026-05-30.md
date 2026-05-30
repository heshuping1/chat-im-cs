# P18-CS-001 CS Workspace Boundary 验证记录

日期：2026-05-30

范围：客服工作台 query/cache/action 职责继续收口。

## 修改范围

1. 新增 `useCustomerServiceWorkspaceController`，承接客服工作台查询、详情、profile、thread action mutation 和 view model 装配。
2. `ChatWorkspace.tsx` 保留页面装配、滚动、菜单和 composer 布局。
3. cache adapter 仍由客服 hooks/data owner 使用，页面不新增 cache 合并规则。

## 验证结果

1. `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

`ThreadList`、`OnlineServicePage`、`CustomerContextPanel`、`AiAssistantPage` 仍可作为后续受治理页面逐批收口。
