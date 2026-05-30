# P17 FINAL Local Acceptance 验证记录

日期：2026-05-30

范围：P17 坏味道整体修复本地闭环。

## 总体验收

```bash
npm run p12:audit
npm run p10:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

1. `p12:audit`：CSS 大文件 none，组件 edge none；剩余 data/main edge 已在职责例外清单登记。
2. `p10:audit`：所有审计项为 `none`。
3. `check:quick`：通过。
4. `build`：通过；仅保留 SignalR/Rollup PURE 注释提示。
5. `docs:check`：通过。
6. `git diff --check`：通过。

## 专项验证

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/im-read-service.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts
npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts tests/unit/electron-template.spec.ts tests/unit/im-message-normalize.spec.ts
```

结果：

1. 核心 IM/Gateway：7 个测试文件、35 个用例通过。
2. 客服缓存/状态/动作：3 个测试文件、10 个用例通过。
3. Electron/template/normalize：4 个测试文件、14 个用例通过。

## 开发态启动

```bash
screen -S lpp-pc-client-dev -X quit 2>/dev/null || true
pgrep -fl "vite --host 127.0.0.1|electron \\.|concurrently|wait-on tcp:5173|VITE_DEV_SERVER_URL=http://127.0.0.1:5173" | awk '{print $1}' | xargs -r kill 2>/dev/null || true
screen -dmS lpp-pc-client-dev bash -lc 'cd /Users/eric/Documents/chat/chat-im-cs/lpp/lpp_pc_client && npm run dev > /tmp/lpp-pc-client-dev.log 2>&1'
sleep 8
curl -sS -I http://127.0.0.1:5173/ | sed -n '1,4p'
```

结果：

1. Vite 返回 `HTTP/1.1 200 OK`。
2. Electron/Vite 开发进程保持运行。
3. 日志位置：`/tmp/lpp-pc-client-dev.log`。

## 未完成项

Windows 实机验证仍由 `P16-WIN-001` 独立完成。
