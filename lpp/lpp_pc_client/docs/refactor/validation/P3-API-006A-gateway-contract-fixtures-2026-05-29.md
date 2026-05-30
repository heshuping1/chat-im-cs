# 验证记录：P3-API-006A Gateway Contract Fixtures

日期：2026-05-29
任务编号：P3-API-006A
状态：已完成

## 目标

为 Gateway payload 建立字段合同 fixtures，明确区分普通 IM、客服事件、非法事件和不支持事件。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `tests/unit/gateway-contract-fixtures.ts` | 新增 Gateway 合同 fixtures。 |
| `tests/unit/gateway-contract.spec.ts` | 新增 fixture 驱动测试。 |

## Fixture 覆盖

| 场景 | 预期 |
| --- | --- |
| 普通 direct IM 消息 | `im.message.received`，合同 `ok` |
| 嵌套 group IM 消息 | `im.message.received`，合同 `ok` |
| 缺 sender 的 IM 消息 | `im.message.received`，合同 `degraded` |
| 缺 conversationSeq 的 IM 消息 | `invalid`，reason `blocking_contract` |
| 客服临时会话消息 | `ignored`，reason `customer_service_event` |
| 不支持事件 | `ignored`，reason `unsupported_event` |

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/gateway-contract.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-diagnostics.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过，5 files / 21 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P3-API-006A 已完成。Gateway 字段合同已有可执行 fixtures，后续新增 Gateway 类型必须先补 fixture。
