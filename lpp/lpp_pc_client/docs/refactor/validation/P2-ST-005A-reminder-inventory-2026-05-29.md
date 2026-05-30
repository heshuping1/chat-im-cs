# 验证记录：P2-ST-005A Reminder/Notification 触发点盘点

日期：2026-05-29

任务编号：P2-ST-005A

## 盘点范围

- `src/renderer/data/store.ts`
- `src/renderer/core/GatewayBridge.tsx`
- `src/renderer/modules/messages/MessageCenter.tsx`
- `src/renderer/modules/messages/ChatWorkspace.tsx`
- `src/renderer/modules/messages/components/ChatToastNotice.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/ReminderCenter.tsx`
- `src/renderer/data/settings/pc-settings.ts`
- `src/main/main.ts`

## 当前能力分布

| 类型 | 位置 | 当前行为 |
| --- | --- | --- |
| 全局实时提醒 | `data/store.ts` | `realtimeReminders` 由 workspace store 持有，`pushRealtimeReminder` 按 `id` 去重并保留最近 6 条。 |
| 提醒中心 | `components/ReminderCenter.tsx` | 读取 `realtimeReminders`，隐藏 `targetModule === "onlineService"` 的提醒，支持点击跳转和 dismiss。 |
| 客服消息提醒 | `core/GatewayBridge.tsx`、`modules/messages/ChatWorkspace.tsx` | 收到客服消息后根据活跃模块/线程推送提醒，并按设置决定是否桌面通知。 |
| 客服队列提醒 | `core/GatewayBridge.tsx`、`components/Sidebar.tsx` | 队列新增时推送实时提醒和桌面通知，去重逻辑分散在局部 `Set/ref`。 |
| 桌面通知 | `core/GatewayBridge.tsx`、`components/Sidebar.tsx`、`modules/messages/ChatWorkspace.tsx`、`src/main/main.ts` | renderer 优先调用 `window.desktopApi?.notify`，否则降级 Browser Notification API；main 进程实际使用 Electron `Notification`。 |
| IM 未读提示 | `modules/messages/MessageCenter.tsx`、`modules/messages/ChatWorkspace.tsx` | 使用 `useWechatBottomFollow` 的 `pendingNewMessageCount` 和 `ChatToastNotice` 展示回到底部提示。 |
| 页面局部 toast | `MessageCenter.tsx`、`ChatWorkspace.tsx`、`MePage.tsx`、`AccountUtilityPages.tsx` 等 | 多数属于局部反馈，不应全部升级为全局 reminder；跨模块通知才进入 reminder owner。 |
| 设置开关 | `data/settings/pc-settings.ts` | `imNotifications`、`serviceQueueNotifications`、`slaTimeoutNotifications`、`desktopNotifications` 已存在，但 gating 逻辑分散在调用方。 |

## 主要问题

| 问题 | 影响 | 后续处理 |
| --- | --- | --- |
| 桌面通知封装重复 | Gateway、Sidebar、ChatWorkspace 都有 Electron/Browser fallback，行为不易保持一致。 | P2-ST-005B 建立 notification service，统一降级和开关判断。 |
| 去重规则分散 | store 只按 reminder id 去重，队列和客服消息另有局部 Set/ref。 | P2-ST-005B 定义 `dedupeKey` 和容量规则，P2-ST-005C 迁移调用方。 |
| 设置开关分散 | `serviceQueueNotifications`、`desktopNotifications` 在不同组件自行判断。 | P2-ST-005B 建立策略函数，P2-ST-005C 替换调用方。 |
| 诊断日志缺失 | 无法快速判断提醒是否触发、被去重、被开关拦截或桌面通知失败。 | P2-ST-005C 新增集中 reminder diagnostics。 |
| 提醒展示边界不清 | `ReminderCenter` 过滤 onlineService，Sidebar 又展示部分 onlineService 提醒，规则未文档化。 | P2-ST-005B 明确 reminder target 和 display channel。 |
| 局部 toast 与全局 reminder 混杂 | 局部表单/页面反馈不应进入全局提醒，跨模块业务提醒需要可查 owner。 | 保留局部 toast，抽象跨模块 reminder/desktop notification。 |

## 不变量建议

| 不变量 | 说明 |
| --- | --- |
| 跨模块业务提醒必须进入 reminder owner | 如客服消息、客服队列、SLA 等需要全局可见和可诊断的提醒。 |
| 页面局部反馈保持局部 | 如保存成功、复制成功、筛选提示，不进入全局 reminder。 |
| 桌面通知只通过 notification service 发起 | 页面和 Gateway 不直接写 Electron/Browser fallback。 |
| 去重必须可解释 | 每次 suppress 都应有稳定 reason，便于日志定位。 |
| 不记录敏感内容 | 日志只记录 threadId、conversationId、queueId、targetModule 等排查字段。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "realtimeReminders|pushRealtimeReminder|dismissRealtimeReminder|dismissRealtimeRemindersForTarget|setNotice|notice|Toast|toast|Notification|new Notification|desktopNotifications|serviceQueueNotifications|notifyDesktop|notifyQueueDesktop|notifyDesktopOrBrowser|unreadJump|pendingNewMessageCount|reminder|提醒|通知" src/renderer src/main src/shared -g '*.ts' -g '*.tsx'` | 通过 | 完成触发点检索。 |
| `sed -n '1,220p' src/renderer/data/store.ts` | 通过 | 确认 workspace store 中实时提醒结构和 action。 |
| `sed -n '1,220p' src/renderer/components/ReminderCenter.tsx` | 通过 | 确认提醒中心展示和 dismiss 行为。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为盘点。 |
| 日志入口 | P2-ST-005C 将新增 `data/reminder/*diagnostics*`。 |
| traceId/correlationId | P2-ST-005C 统一定义。 |
| 可用于排查的问题 | 提醒触发点、去重位置、设置开关位置、桌面通知 fallback 位置。 |
| 敏感信息处理 | 本任务只记录代码位置和字段类型，不记录运行时用户数据。 |

## 结论

P2-ST-005A 已完成。当前提醒/通知功能可用，但 owner 和策略边界不清，适合继续 P2-ST-005B：建立 reminder store/service 壳，并明确去重、容量、过期、设置开关、桌面通知降级规则。
