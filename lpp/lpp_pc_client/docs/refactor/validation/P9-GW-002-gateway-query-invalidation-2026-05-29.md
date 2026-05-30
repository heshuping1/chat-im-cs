# P9-GW-002 Gateway query invalidation 验证记录

日期：2026-05-29

## 目标

- 将 `GatewayBridge.tsx` 内的普通 IM 与客服 query invalidation 规则抽到 Gateway 数据层 helper。
- 保持会话消息、会话列表、客服线程、客服消息的刷新范围不变。
- 为局部刷新和消息 query 检测补单测，避免后续 Gateway 分支重复实现刷新逻辑。

## 变更

- 新增 `src/renderer/data/gateway/gateway-query-invalidation.ts`。
- `GatewayBridge.tsx` 通过 helper 执行 IM/客服 query invalidation，不再内联维护 query key 扫描细节。
- 新增 `tests/unit/gateway-query-invalidation.spec.ts`。

## 验证

- `vitest run tests/unit/gateway-event-registry.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/gateway-diagnostics.spec.ts`
  - 结果：通过，6 个测试文件，21 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-GW-002 已完成。Gateway query 刷新规则已形成可复用、可测试的公共能力，后续新增 Gateway 事件不得在页面或 bridge 中散落实现 query 扫描与刷新策略。
