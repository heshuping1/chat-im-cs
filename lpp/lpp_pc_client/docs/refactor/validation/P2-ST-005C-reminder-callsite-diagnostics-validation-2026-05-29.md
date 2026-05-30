# 验证记录：P2-ST-005C Reminder 调用方迁移与诊断日志

日期：2026-05-29

任务编号：P2-ST-005C

## 修改范围

- `src/renderer/data/reminder/reminder-diagnostics.ts`
- `src/renderer/data/reminder/reminder-service.ts`
- `src/renderer/data/reminder/reminder-store.ts`
- `src/renderer/data/store.ts`
- `src/renderer/vite-env.d.ts`
- `src/renderer/components/ReminderCenter.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `tests/unit/reminder-diagnostics.spec.ts`
- `tests/unit/reminder-service.spec.ts`
- `tests/unit/reminder-store.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

迁移跨模块提醒调用方，避免页面和 Gateway 继续直接读写 workspace reminder 字段或重复实现桌面通知 fallback，同时补充集中诊断日志，支持 Codex 通过日志排查提醒触发、dismiss、桌面通知发送/跳过/失败。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 调用方迁移 | `ReminderCenter`、`MessageCenter`、`ChatWorkspace`、`Sidebar` 改用 `data/reminder/reminder-store.ts` hooks。 |
| Gateway 迁移 | `GatewayBridge` 非 React 场景改用 `getReminderActions()`，客服提醒使用统一策略函数和桌面通知 service。 |
| 桌面通知收口 | 删除 `GatewayBridge`、`Sidebar`、`ChatWorkspace` 内局部 `notifyDesktopOrBrowser/notifyQueueDesktop`。 |
| 设置策略收口 | 客服队列/客服消息提醒改用 `shouldPushRealtimeReminder` 和 `shouldShowDesktopNotification`。 |
| 诊断日志 | 新增 `reminder-diagnostics.ts`，输出到 `window.__lppReminderDiagnostics`，支持 `localStorage.lpp.reminderDiagnostics=1`。 |
| store 日志 | `pushRealtimeReminder`、`dismissRealtimeReminder`、`dismissRealtimeRemindersForTarget` 记录 before/after 数量和目标信息。 |
| desktop 日志 | `notifyDesktopOrBrowser` 记录 Electron/Browser 成功、权限拒绝、API 不可用和异常。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/reminder-diagnostics.spec.ts tests/unit/reminder-service.spec.ts tests/unit/reminder-store.spec.ts tests/unit/im-core.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过 | 5 个测试文件，76 个用例通过，耗时约 274ms；`im-core.spec.ts` 现有 localStorage 用法在 Node 26 下有 ExperimentalWarning。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg -n "function notifyDesktopOrBrowser|function notifyQueueDesktop|new Notification|desktopApi\\.notify|Notification\\.requestPermission" src/renderer -g '*.ts' -g '*.tsx'` | 通过 | renderer 内桌面通知 fallback 已集中到 `data/reminder/reminder-service.ts`。 |
| `rg -n "useWorkspaceStore\\(\\s*\\(state\\) => state\\.(realtimeReminders|pushRealtimeReminder|dismissRealtimeReminder|dismissRealtimeRemindersForTarget)|state\\.(pushRealtimeReminder|dismissRealtimeReminder|dismissRealtimeRemindersForTarget|realtimeReminders)" src/renderer -g '*.ts' -g '*.tsx'` | 通过 | reminder 直接读写仅剩 `data/store.ts` backing store 和 `data/reminder/reminder-store.ts` owner 外壳。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是 |
| 日志入口 | `src/renderer/data/reminder/reminder-diagnostics.ts` |
| traceId/correlationId | `reminder-<phase>-<timestamp>-<random>` |
| 可排查问题 | reminder 是否入队、是否 dismiss、按目标清理是否生效、桌面通知是否发送/跳过/失败。 |
| Codex 检索方式 | `rg -n "logReminderDiagnostic|__lppReminderDiagnostics|lpp.reminderDiagnostics" src/renderer` |
| 敏感信息处理 | 不记录消息正文、token、用户详情；仅记录 reminderId、targetModule、targetId、conversationId、数量和通道。 |

## 遗留风险

| 风险 | 说明 | 后续任务 |
| --- | --- | --- |
| `notifiedCustomerServiceQueueIds` 仍在 Gateway 局部 | 当前保留既有队列事件去重行为，避免改变核心链路。后续可在服务端事件 contract 稳定后统一纳入 reminder dedupeKey。 | API/Gateway 合同治理阶段 |
| 页面局部 toast 未统一 | 局部保存/复制/错误提示仍保留页面内状态，符合 P2-ST-005A 的边界判断。若第三次出现跨页面 toast 需求，再立 `P*-SHARED-*` 抽象任务。 | Shared UI 治理阶段 |

## 结论

P2-ST-005C 已完成。Reminder/Notification 第一轮治理闭环：触发点可查、owner 可查、桌面通知 fallback 集中、设置策略集中、诊断日志集中。
