# P18-FUNC-001 IM Workflow Regression 验证记录

日期：2026-05-30

范围：核心 IM/Gateway workflow 回归验证。

## 覆盖范围

1. 消息 view model、domain、send queue、message cache mutation。
2. Gateway event adapter、query invalidation、IM read service。
3. 新增消息危险操作确认文案单测，防止删除/撤回确认入口散落。

## 验证结果

1. `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/im-read-service.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-queue.spec.ts`：通过。
2. `npm run test:coverage:core`：通过，273 个核心测试通过。

## 遗留风险

Windows 实机收发和系统通知仍归 `P16-WIN-001`。
