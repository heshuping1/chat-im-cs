# 验证记录：P3-API-006C Gateway Contract Diagnostics

日期：2026-05-29
任务编号：P3-API-006C
状态：已完成

## 目标

将 Gateway 合同诊断输出接入统一日志规范，使 invalid、ignored、degraded reason 可查、可测试、可被 Codex 用于排查。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/gateway/gateway-diagnostics.ts` | 增加 `degraded` result、`contract` 结构和任务标识 `P3-API-006C`。 |
| `tests/unit/gateway-contract.spec.ts` | 验证 degraded/invalid/ignored 诊断输出。 |

## 诊断格式补充

```ts
interface GatewayDiagnosticContract {
  status: "degraded" | "invalid" | "ignored";
  issues: Array<{
    code: string;
    level: "warning" | "error";
  }>;
}
```

## 日志规则

- `degraded` 合同：`level=warning`，`result=degraded`，`reason=contract_degraded`。
- `invalid` 合同：`result=invalid`，`contract.status=invalid`。
- `ignored` 合同：`result=ignored`，保留 `reason`，客服事件保持 `customer_service_event`。
- 诊断仍走 `window.__lppGatewayDiagnostics` 和 `localStorage.lpp.gatewayDiagnostics`，没有散落到页面层。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/gateway-contract.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-diagnostics.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过，5 files / 21 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P3-API-006C 已完成。Gateway 合同诊断已经归入底层诊断模块，后续排查不需要页面散落日志。
