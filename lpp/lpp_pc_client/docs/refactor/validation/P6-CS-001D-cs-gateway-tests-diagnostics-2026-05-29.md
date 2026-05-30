# P6-CS-001D CS Gateway Tests & Diagnostics

日期：2026-05-29

## 测试覆盖

新增：

- `tests/unit/cs-gateway-event-adapter.spec.ts`
- `tests/unit/cs-gateway-handler.spec.ts`

覆盖：

- 显式客服消息事件适配。
- 泛消息事件中的客服 payload 识别。
- queue/status 事件适配为 `cs.thread.changed`。
- 缺 thread id 的客服消息输出 invalid reason。
- handler callback 绑定和第一阶段分发。
- 非客服事件不被客服 handler 抢占。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/cs-gateway-handler.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/im-gateway-handler.spec.ts tests/unit/gateway-diagnostics.spec.ts
```

结果：通过，6 files / 20 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 遗留风险

`GatewayBridge.tsx` 仍持有客服 cache merge、提醒和 invalidate 的具体实现。`P6-CS-004` 应继续把客服 cache 更新抽成 adapter，`P6-CS-003` 再收敛客服动作 service。
