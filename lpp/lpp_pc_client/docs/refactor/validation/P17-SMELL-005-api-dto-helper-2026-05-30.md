# P17-SMELL-005 API DTO Helper Owner 验证记录

日期：2026-05-30

变更：新增 `data/customer-service/cs-history-model.ts`，迁入 `staffServiceHistoryItemToThread`、历史标题和短日期格式化；`api/types.ts` 保留兼容导出。

未改变边界：不改变 DTO wire shape、客服历史接口返回结构和 `api-client` facade。

验证：

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
```

结果：TypeScript 通过；客服状态/动作测试通过。
