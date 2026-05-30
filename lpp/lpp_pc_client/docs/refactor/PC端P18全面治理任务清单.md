# PC 端 P18 全面治理任务清单

状态：已完成

日期：2026-05-30

目标：在 P17 坏味道修复完成后，继续从架构设计、功能设计、代码分层、性能、解耦、复用和发布验证角度治理 PC 客户端，让核心 IM、在线客服、Electron 能力和工程门禁进入可长期维护状态。

边界：

1. 不新增依赖。
2. 不替换技术栈。
3. 不删除核心旧 store facade。
4. 不改变 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract。
5. Windows 实机验证仍由 `P16-WIN-001` 独立完成。

## 任务表

| 任务编号 | 问题类型 | 目标 owner | 涉及边界 | 稳定入口 | 是否改变 API/query key/IPC/Gateway | 执行命令 | 验证记录 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P18-GOV-001 | 治理总账缺失 | `docs/refactor` | 文档/矩阵 | P18 任务清单、任务矩阵 | 否 | `npm run docs:check && git diff --check` | `validation/P18-GOV-001-governance-ledger-2026-05-30.md` | 已完成 |
| P18-ARCH-001 | 页面直接承担数据访问 | `renderer/*/hooks`、domain data owner | 页面 -> hook/controller -> data | 页面组件 import 和原路由入口 | 否 | `npm run check:quick && npx vitest run tests/unit/architecture-boundaries.spec.ts && git diff --check` | `validation/P18-ARCH-001-page-data-boundary-2026-05-30.md` | 已完成 |
| P18-ARCH-002 | 消息应用服务职责混合 | `messages/application`、`messages/models`、`data/message` | React Query cache、消息 API、消息 model | `messageCacheMutationModel` facade | 否 | `npx vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-read-service.spec.ts && npm run check:quick` | `validation/P18-ARCH-002-message-application-service-2026-05-30.md` | 已完成 |
| P18-FUNC-001 | 核心 IM workflow 回归不足 | `tests/unit` | 发送、重试、已读、Gateway cache | 现有 domain/view-model 测试入口 | 否 | `npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-queue.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts` | `validation/P18-FUNC-001-im-workflow-regression-2026-05-30.md` | 已完成 |
| P18-CS-001 | 客服页面/cache 职责继续收口 | `customer-service/*`、`data/customer-service` | thread/message/queue cache、动作权限 | 客服页面和 hook 入口 | 否 | `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts && npm run check:quick` | `validation/P18-CS-001-cs-workspace-boundary-2026-05-30.md` | 已完成 |
| P18-ELECTRON-001 | Renderer 组件直接 Electron 能力 | `renderer/*/runtime`、`main/preload` | desktopApi、IPC payload validation | 现有 UI 操作入口 | 否 | `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts && npm run check:quick` | `validation/P18-ELECTRON-001-desktop-capability-owner-2026-05-30.md` | 已完成 |
| P18-UX-001 | 危险操作确认散落在 hook | `messages/runtime`、消息交互 hook | 删除/撤回/清理确认 | 现有消息菜单行为 | 否 | `npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts && npm run check:quick` | `validation/P18-UX-001-message-confirm-owner-2026-05-30.md` | 已完成 |
| P18-PERF-001 | 高频列表性能缺少守卫 | `messages/models`、`customer-service/models`、diagnostics | 列表分段、query invalidation、性能采样 | 现有列表和 diagnostics 入口 | 否 | `npm run check:quick && npm run build` | `validation/P18-PERF-001-rendering-guardrails-2026-05-30.md` | 已完成 |
| P18-PERF-002 | 媒体/头像缓存生命周期风险 | `media/runtime`、`messages/models`、`data/performance` | object URL、localStorage、poster timeout | 现有媒体预览和头像 snapshot | 否 | `npx vitest run tests/unit/message-domain.spec.ts tests/unit/message-center-view-model.spec.ts && npm run check:quick` | `validation/P18-PERF-002-media-cache-resilience-2026-05-30.md` | 已完成 |
| P18-DATA-001 | data/main 边缘文件复审 | `data/*`、`main/*` | P12 edge file 例外 | 原导出 facade | 否 | `npm run p12:audit && npm run docs:check && git diff --check` | `validation/P18-DATA-001-edge-file-disposition-2026-05-30.md` | 已完成 |
| P18-SEC-001 | Electron 安全边界复核 | `main`、`preload`、`shared/desktop-api-validation` | BrowserWindow、template、file/safeStorage/diagnostics | IPC/preload contract | 否 | `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts && npm run check:quick` | `validation/P18-SEC-001-electron-security-review-2026-05-30.md` | 已完成 |
| P18-TEST-001 | 核心覆盖门槛偏低 | `tests/unit`、`package.json` | core coverage gate | `npm run test:coverage:core` | 否 | `npm run test:coverage:core && npm run check:quick && npm run build` | `validation/P18-TEST-001-core-coverage-gate-2026-05-30.md` | 已完成 |
| P18-RELEASE-001 | 本地发布闭环与 Windows 交接 | `docs/refactor/validation` | Mac dev/build/smoke、Windows handoff | 发布检查清单 | 否 | `npm run p12:audit && npm run p10:audit && npm run check:quick && npm run build && npm run docs:check && git diff --check` | `validation/P18-RELEASE-001-local-release-closure-2026-05-30.md` | 已完成 |

## 执行顺序

1. 第一批：`P18-GOV-001`、`P18-ARCH-001`、`P18-ELECTRON-001`。
2. 第二批：`P18-ARCH-002`、`P18-FUNC-001`、`P18-CS-001`。
3. 第三批：`P18-UX-001`、`P18-PERF-001`、`P18-PERF-002`。
4. 第四批：`P18-DATA-001`、`P18-SEC-001`、`P18-TEST-001`、`P18-RELEASE-001`。

## 默认验收命令

```bash
npm run p10:audit
npm run p12:audit
npm run check:quick
npm run docs:check
git diff --check
```

## 核心 IM/Gateway 专项命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/im-read-service.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-queue.spec.ts
```

## 客服专项命令

```bash
npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
```

## Electron/main/preload 专项命令

```bash
npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```

## 开发态启动命令

```bash
screen -S lpp-pc-client-dev -X quit 2>/dev/null || true
pgrep -fl "vite --host 127.0.0.1|electron \\.|concurrently|wait-on tcp:5173|VITE_DEV_SERVER_URL=http://127.0.0.1:5173" | awk '{print $1}' | xargs -r kill 2>/dev/null || true
screen -dmS lpp-pc-client-dev bash -lc 'cd /Users/eric/Documents/chat/chat-im-cs/lpp/lpp_pc_client && npm run dev > /tmp/lpp-pc-client-dev.log 2>&1'
sleep 8
curl -sS -I http://127.0.0.1:5173/ | sed -n '1,4p'
```
