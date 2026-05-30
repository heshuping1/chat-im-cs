# 验证记录：P3-API-006B Gateway Contract Tests

日期：2026-05-29
任务编号：P3-API-006B
状态：已完成

## 目标

建立 Gateway 合同测试，覆盖 invalid、ignored、degraded reason，避免普通 IM 与客服事件互相串线。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/gateway/gateway-event-types.ts` | 为 IM message handled event 增加可选 `contractStatus/diagnostics`。 |
| `src/renderer/data/gateway/gateway-event-adapter.ts` | 将 `validateGatewayMessageContract` 的 degraded 结果保留到 typed event。 |
| `tests/unit/gateway-contract.spec.ts` | 覆盖 fixture 输出和 degraded/invalid/ignored reason。 |

## 核心规则

- `validation.level === "blocking"`：输出 `invalid`，reason `blocking_contract`。
- `validation.level === "degraded"`：仍输出 `im.message.received`，但带 `contractStatus: "degraded"` 和 diagnostics。
- 客服事件保持 `ignored/customer_service_event`，不得进入普通 IM handler。
- 不支持事件保持 `ignored/unsupported_event`。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/gateway-contract.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-diagnostics.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过，5 files / 21 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P3-API-006B 已完成。Gateway adapter 现在能区分阻断失败、可降级合同问题和忽略事件。
