# P6-CS-002D CS Thread State Tests & Diagnostics

日期：2026-05-29

## 测试覆盖

新增：

- `tests/unit/cs-thread-state.spec.ts`

覆盖：

- queued -> `replyGate=claim`
- ai/bot -> `replyGate=takeover`
- closed/rated -> `readOnly=true`
- unknown active status -> `serving/open`
- transition diagnostic buffer 写入

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/cs-thread-state.spec.ts tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/cs-gateway-handler.spec.ts
```

结果：通过，3 files / 12 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

- 缓冲：`window.__lppCustomerServiceStateDiagnostics`
- 开关：`localStorage.lpp.customerServiceStateDiagnostics=1`
- 任务：`P6-CS-002D`

## 遗留风险

状态枚举仍来自现有代码和合同层推断。后续如果后端提供明确枚举，应把 `cs-thread-state.ts` 的规则收敛到正式枚举，并补 ADR 或合同记录。
