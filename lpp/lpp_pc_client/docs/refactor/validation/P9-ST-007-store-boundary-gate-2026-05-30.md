# P9-ST-007 store boundary gate 验证记录

日期：2026-05-30

## 目标

- 将“页面/feature 不得直连 workspace backing store”从人工约定升级为自动化边界门禁。
- 保留 `store.ts` 作为内部兼容实现，但要求外部调用通过 auth、workspace-ui、im-read、settings、reminder 等 owner 门面进入。

## 变更

- `architecture-boundaries.spec.ts` 增加页面/feature 禁止 import `src/renderer/data/store.ts` 的结构测试。
- `workspace-ui-store.ts` 重新导出 `MessageLayoutMode`，让消息模块类型依赖也通过 UI owner 门面进入。
- `MessageChatHeader.tsx`、`useMessageResponsiveLayout.ts` 从 `workspace-ui-store` 读取 `MessageLayoutMode` 类型，移除对 backing store 的类型直连。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/workspace-ui-store.spec.ts`
  - 结果：通过，2 个测试文件，6 个测试用例。
- `rg -n "useWorkspaceStore|from .*data/store|from \"../data/store\"|from \"../../data/store\"" src/renderer/components src/renderer/messages src/renderer/customer-service src/renderer/settings src/renderer/App.tsx src/renderer/main.tsx -g'*.ts' -g'*.tsx'`
  - 结果：无命中。

## 诊断日志

- 本次为架构边界门禁，不新增运行时日志字段。
- 后续若新增状态 owner 或迁移旧状态，应同步更新边界测试和验证记录。

## 结论

P9-ST-007 已完成。Store 边界不再只依赖文档约束，页面/feature 层回填 `useWorkspaceStore` 或直接 import `data/store.ts` 会被单测阻断。
