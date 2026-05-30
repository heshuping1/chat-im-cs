# P17-SMELL-007 Workspace Store Effects 验证记录

日期：2026-05-30

变更：新增 `workspaceTrayStatusEffect.ts` 承接 tray IPC，`workspace-store-core.ts` 保留 `setImPresenceStatus` 状态入口但不直接访问 `window.desktopApi`。

未改变边界：不删除旧 store facade，不改持久化 key，不改 `useWorkspaceStore` 对外入口。

验证：

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/workspace-ui-store.spec.ts
```

结果：结构测试和 workspace store 测试通过。
