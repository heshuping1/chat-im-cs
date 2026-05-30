# P6-CS-002B CS Thread State Machine

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-thread-state.ts`：

- `createCustomerServiceThreadState`
- `transitionCustomerServiceThreadState`
- `normalizeCustomerServiceThreadStateStatus`
- `logCustomerServiceThreadStateTransition`

输出模型：

- `kind`
- `rawStatus`
- `normalizedStatus`
- `readOnly`
- `terminal`
- `replyGate`
- `label`

## 设计边界

状态机只做状态归一和不变量派生，不执行 API、不改 cache、不触发 toast。后续 `P6-CS-003` 的动作权限矩阵应消费 `replyGate/readOnly/kind`，不要重新解析字符串。
