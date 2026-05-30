# P9-GW-001 Gateway Event Registry

日期：2026-05-29

## 修改范围

- 新增 `src/renderer/data/gateway/gateway-event-registry.ts`。
- `GatewayBridge`、`gateway-event-adapter`、`cs-gateway-event-adapter` 统一使用事件注册表。
- 新增 `tests/unit/gateway-event-registry.spec.ts`。

## 设计理由

- Gateway 事件名原来散落在 GatewayBridge、IM adapter、CS adapter，新增或调整事件时容易漏改。
- 事件注册表只承担事件名、分类谓词和 CS change kind 映射，不承载连接生命周期或业务缓存逻辑。
- 这是 GatewayBridge 瘦身的第一步，风险低、回滚点清晰。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/gateway-event-registry.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/gateway-diagnostics.spec.ts` | 通过 | Gateway 事件分类、adapter、dispatcher、诊断回归。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | renderer/shared 类型检查。 |

## 结果

- `GatewayBridge.tsx` 从 1157 行降到 1059 行。
- Gateway 事件订阅表统一可测。
- RISK-001 从待处理更新为缓解中。

## 遗留风险

1. `GatewayBridge.tsx` 仍超过 900 行，仍在 `lint:shape` allowlist。
2. 下一步应继续拆 realtime connection lifecycle 或 dispatch orchestration。
