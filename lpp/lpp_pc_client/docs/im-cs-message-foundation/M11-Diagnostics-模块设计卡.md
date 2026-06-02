模块编号：M11

模块名称：诊断与可观测性

模块职责：
- 将 gateway、delivery、gap sync、IM read、客服提醒、send state machine 诊断路由到可恢复的日志面。
- 为消息链路关键阶段保留 reason、scopeKey、messageId、conversationId/threadId 等解释字段。
- 默认脱敏内容和敏感字段，允许本地排查期通过显式开关启用明文诊断。

上游输入：
- gateway event diagnostic。
- message delivery / gap sync diagnostic。
- IM read / CS unread / reminder diagnostic。
- send state machine diagnostic。

下游输出：
- `gateway-health.jsonl`
- `message-delivery.jsonl`
- `message-gap-sync.jsonl`
- `im-read.jsonl`
- `customer-service-reminder.jsonl`
- `message-reminder.jsonl`
- send diagnostics local buffer / diagnostics package。

边界：
- 诊断模块只记录与路由，不改变业务状态。
- classification 放可检索字段；summary 可放结构摘要但默认脱敏。
- raw payload 只能进入 summary，并受 `summarizeDiagnosticValue` 脱敏策略保护。
- 明文诊断只受本地开关控制，不作为默认行为。

不做：
- 不把诊断写回 store/cache/ledger/read view。
- 不在 PC 端伪造服务端缺失字段。
- 不扩大 Electron IPC 暴露面。

测试：
- `tests/unit/message-reminder-diagnostics.spec.ts`
- `tests/unit/send-state-machine.spec.ts`
- `tests/unit/desktop-api-validation.spec.ts`
- `tests/unit/architecture-boundaries.spec.ts`
