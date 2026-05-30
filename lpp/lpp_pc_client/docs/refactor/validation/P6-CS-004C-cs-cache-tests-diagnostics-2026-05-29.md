# P6-CS-004C CS Cache Tests & Diagnostics

日期：2026-05-29

## 测试覆盖

新增：

- `tests/unit/cs-cache-adapter.spec.ts`

覆盖：

- 发送成功消息合并到详情和线程列表 preview。
- Gateway 消息合并并按 read 标志更新 unread。
- 本地上传消息 append / patch / remove。
- 详情加载合并到线程列表。
- 已读清零。
- 关闭状态 patch。
- cache diagnostics 写入。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-action-permissions.spec.ts tests/unit/cs-action-service.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/cs-gateway-handler.spec.ts
```

结果：通过，6 files / 21 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

```bash
rg -n "setQueriesData|setQueryData" src/renderer/components/ChatWorkspace.tsx src/renderer/components/GatewayBridge.tsx
```

结果：无匹配。

## 诊断日志

- 缓冲：`window.__lppCustomerServiceCacheDiagnostics`
- 开关：`localStorage.lpp.customerServiceCacheDiagnostics=1`
- 任务：`P6-CS-004C`
