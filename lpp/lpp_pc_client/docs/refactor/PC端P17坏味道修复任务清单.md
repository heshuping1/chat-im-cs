# PC 端 P17 坏味道修复任务清单

状态：执行中

日期：2026-05-30

目标：把人工审查发现的职责方向、核心副作用集中、Electron 模板、DTO helper、normalize 堆叠和 store 副作用坏味道纳入可追踪治理。

边界：

1. 不新增依赖。
2. 不替换技术栈。
3. 不删除核心旧 store facade。
4. 不改变 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract。
5. Windows 实机验证仍由 `P16-WIN-001` 独立完成。

## 任务表

| 任务编号 | 坏味道 | 目标 owner | 稳定入口 | 是否改变边界 | 执行命令 | 验证记录 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P17-SMELL-001 | messages model 反向依赖 hooks/components。 | `messages/models` | `getImConversationType`、群头像类型导出。 | 否 | `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-cache-mutation-model.spec.ts` | `validation/P17-SMELL-001-model-boundary-2026-05-30.md` | 已完成 |
| P17-SMELL-002 | `GatewayBridge` 同时承载连接、事件路由、IM/CS cache、已读和通知副作用。 | `data/gateway` | `GatewayBridge` 组件、Gateway event 名称。 | 否 | `npx vitest run tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/im-read-service.spec.ts tests/unit/cs-cache-adapter.spec.ts` | `validation/P17-SMELL-002-gateway-side-effects-2026-05-30.md` | 已完成 |
| P17-SMELL-003 | composer 组件直接调用截图 IPC。 | `messages/runtime` | `MessageComposer` 截图按钮行为。 | 否 | `npx vitest run tests/unit/architecture-boundaries.spec.ts` | `validation/P17-SMELL-003-desktop-capability-2026-05-30.md` | 已完成 |
| P17-SMELL-004 | Electron 视频/截图模板是不可单测的大字符串。 | `main/*-template` | `openVideoPlayerWindow`、`selectScreenshotRegion`。 | 否 | `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts tests/unit/electron-template.spec.ts` | `validation/P17-SMELL-004-electron-template-2026-05-30.md` | 已完成 |
| P17-SMELL-005 | `api/types.ts` 混入客服历史转换 helper。 | `data/customer-service` | `staffServiceHistoryItemToThread` 兼容导出。 | 否 | `npx vitest run tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts` | `validation/P17-SMELL-005-api-dto-helper-2026-05-30.md` | 已完成 |
| P17-SMELL-006 | `im-message-normalize.ts` 字段兼容逻辑连续堆叠。 | `data/im-message-normalize` | 现有 normalize 导出函数。 | 否 | `npx vitest run tests/unit/im-message-contract.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-message-normalize.spec.ts` | `validation/P17-SMELL-006-im-normalize-tables-2026-05-30.md` | 已完成 |
| P17-SMELL-007 | workspace store core 直接触发 tray IPC。 | `data/workspace-ui` | `useWorkspaceStore`、`setImPresenceStatus`。 | 否 | `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/workspace-ui-store.spec.ts` | `validation/P17-SMELL-007-workspace-store-effects-2026-05-30.md` | 已完成 |

## 总体验收命令

```bash
npm run p12:audit
npm run p10:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

## 开发态启动命令

```bash
screen -S lpp-pc-client-dev -X quit 2>/dev/null || true
pgrep -fl "vite --host 127.0.0.1|electron \\.|concurrently|wait-on tcp:5173|VITE_DEV_SERVER_URL=http://127.0.0.1:5173" | awk '{print $1}' | xargs -r kill 2>/dev/null || true
screen -dmS lpp-pc-client-dev bash -lc 'cd /Users/eric/Documents/chat/chat-im-cs/lpp/lpp_pc_client && npm run dev > /tmp/lpp-pc-client-dev.log 2>&1'
sleep 8
curl -sS -I http://127.0.0.1:5173/ | sed -n '1,4p'
```
