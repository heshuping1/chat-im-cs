# P17-SMELL-002 Gateway Side Effects 验证记录

日期：2026-05-30

变更：`GatewayBridge` 只保留 SignalR 连接、事件订阅、清理和 DEV 注入；事件路由迁到 `gateway-event-router.ts`，IM/客服副作用分别迁到 `gateway-im-side-effects.ts` 与 `gateway-cs-side-effects.ts`。

未改变边界：不改变 Gateway event 名称、React Query query key、handler 返回语义和通知策略。

验证：

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/im-read-service.spec.ts tests/unit/cs-cache-adapter.spec.ts
```

结果：TypeScript 通过；4 个测试文件、15 个用例通过。
