# P9-ST-006 store compatibility callsite cleanup 验证记录

日期：2026-05-30

## 目标

- 清理页面层和 Gateway 对 `useWorkspaceStore` 的直接读写。
- 继续保留 `store.ts` 作为内部 backing store，避免一次性物理拆 store 扩大风险。

## 变更

- `workspace-ui-store.ts` 增加已存在状态的 selector/hook：
  - `useImPresenceStatus`
  - `useSetImPresenceStatus`
  - `useCustomerServiceStatus`
  - `useSetCustomerServiceStatus`
- `Sidebar.tsx` 迁移 IM 在线状态读写到 workspace-ui owner。
- `ThreadList.tsx` 迁移客服接待状态读写到 workspace-ui owner。
- `GatewayBridge.tsx` 迁移客服状态 setter 到 workspace-ui owner，非 React auth 快照改用 `getAuthSessionSnapshot()`。
- 移除 `MePage.tsx` 未使用的 `useWorkspaceStore` 导入。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/workspace-ui-store.spec.ts tests/unit/auth-store.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/cs-gateway-handler.spec.ts tests/unit/im-gateway-handler.spec.ts`
  - 结果：通过，6 个测试文件，12 个测试用例。
- `rg -n "useWorkspaceStore" src/renderer/components src/renderer/App.tsx src/renderer/main.tsx -g'*.ts' -g'*.tsx'`
  - 结果：无页面层直接调用；仅 owner/backing store 内部仍使用。

## 诊断日志

- 本次为 store 兼容调用点收敛，不新增运行时日志字段。
- 既有 Gateway、IM read、settings、reminder 诊断链路保持不变。

## 结论

P9-ST-006 已完成。后续新增页面/feature 代码不得直接读写 `useWorkspaceStore`，必须通过对应 owner selectors/actions。
