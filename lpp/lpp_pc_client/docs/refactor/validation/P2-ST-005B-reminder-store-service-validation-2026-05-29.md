# 验证记录：P2-ST-005B Reminder Store/Service 外壳

日期：2026-05-29

任务编号：P2-ST-005B

## 修改范围

- `src/renderer/data/reminder/reminder-types.ts`
- `src/renderer/data/reminder/reminder-service.ts`
- `src/renderer/data/reminder/reminder-store.ts`
- `src/renderer/data/store.ts`
- `tests/unit/reminder-service.spec.ts`
- `tests/unit/reminder-store.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立提醒/通知能力的底层 owner 外壳，先收口跨模块 reminder 的类型、选择器/action、去重容量规则和桌面通知降级策略，为后续迁移 Gateway、Sidebar、ChatWorkspace、ReminderCenter 的调用方提供统一入口。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 类型 owner | 新增 `PcRealtimeReminder`、`PcRealtimeReminderInput`、`ReminderDesktopChannel` 等类型，旧 `data/store.ts` 只保留兼容导出。 |
| Store 外壳 | 新增 `reminder-store.ts`，提供 selectors、hooks、`getReminderSnapshot`、`getReminderActions`。 |
| 去重与容量 | 新增 `reduceRealtimeReminders`，统一按 `id` 去重、30 分钟 TTL 过期过滤、最多保留 6 条。 |
| dismiss 规则 | 新增 `dismissRealtimeReminderById` 和 `dismissRealtimeRemindersForTarget`，workspace store action 改为复用 reducer。 |
| 设置策略 | 新增 `shouldPushRealtimeReminder`、`shouldShowDesktopNotification`，把 IM/客服/SLA 与设置开关的关系集中到 service。 |
| 桌面通知降级 | 新增 `notifyDesktopOrBrowser`，统一 Electron `desktopApi.notify` 与 Browser Notification fallback。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/reminder-service.spec.ts tests/unit/reminder-store.spec.ts` | 通过 | 2 个测试文件，4 个用例通过，耗时约 148ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，P2-ST-005B 只建立 owner/service 外壳。 |
| 日志入口 | P2-ST-005C 将新增 `data/reminder/reminder-diagnostics.ts`。 |
| traceId/correlationId | P2-ST-005C 统一定义。 |
| 可用于排查的问题 | 去重、过期、设置开关、桌面通知降级会在 P2-ST-005C 接入日志。 |
| 敏感信息处理 | 当前 service 只接受 title/body/conversationId；后续日志不记录消息正文和 token。 |

## 结论

P2-ST-005B 已完成。提醒/通知底层入口已具备，下一步 P2-ST-005C 迁移调用方并补集中诊断日志。
