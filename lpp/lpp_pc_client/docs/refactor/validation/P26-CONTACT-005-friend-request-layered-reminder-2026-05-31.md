# P26-CONTACT-005 Friend Request Layered Reminder

日期：2026-05-31

## 目标

新的好友申请采用分层提醒：应用内入口同步显示待处理数，新增申请进入全局提醒中心；桌面通知继续受现有 IM 通知和桌面通知开关控制。

## 修改范围

- `contacts/models/friendRequestReminderModel`：统一待处理 incoming 申请口径、提醒去重 key 和提醒文案。
- `contacts/hooks/useFriendRequestReminderController`：复用 `pc-friend-requests` 查询，首屏只显示 badge，后续新增申请触发 reminder 和桌面通知。
- `Sidebar`、`ReminderCenter`、消息页 `+`入口、通讯录“新的朋友”：同步展示或处理好友申请提醒。

## 风险边界

- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key。
- 不新增依赖。
- 不改变添加好友、通过和拒绝申请的服务端合同。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx vitest run tests/unit/friend-request-reminder.spec.ts tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts` | 通过 | 先红后绿，覆盖提醒模型、消息入口、通讯录 owner。 |
| `npx vitest run tests/unit/friend-request-reminder.spec.ts tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts tests/unit/reminder-service.spec.ts tests/unit/reminder-store.spec.ts tests/unit/reminder-diagnostics.spec.ts` | 通过 | 覆盖分层提醒和既有 reminder 基础能力回归。 |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 | 验证新增 hook、reminder icon 和联系人入口类型闭环。 |
| `npm run check:quick` | 通过 | 类型检查、核心 lint、hooks lint、架构边界、docs、P19 审计和 shape 均通过。 |
| `git diff --check` | 通过 | 未发现空白错误或冲突标记。 |

## 手工验证

- 已尝试通过临时 Electron/Playwright 读取登录后 DOM；当前运行实例触发 Electron 单实例/窗口关闭，无法稳定取得登录 DOM。
- 待补：使用当前已登录浏览器授权或真实待处理申请样本，确认左侧 `通讯录`、消息页 `+`、`+`菜单中的 `好友申请`以及通讯录 `新的朋友`显示同一待处理数。
- 待补：新增申请时出现 `新的好友申请`提醒卡，点击后进入 `通讯录 > 新的朋友`。
- 待补：位于 `通讯录 > 新的朋友`时新增申请只刷新列表和 badge，不弹重复提醒。
- 待补：通过或拒绝申请后，相关 badge 同步减少。

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，复用现有 reminder diagnostics。 |
| 诊断入口 | `window.__lppReminderDiagnostics`，由 `pushRealtimeReminder`、`dismissRealtimeRemindersForTarget`、`notifyDesktopOrBrowser`写入。 |
| 敏感信息处理 | 提醒文案只使用申请人展示名，不记录申请验证信息和 raw payload。 |

## 遗留风险

1. 若服务端不推送 `friend.*`，依赖 30 秒 refetch 兜底，提醒会有短暂延迟。
2. 本轮不新增独立“好友申请通知”设置，继续受现有 IM 通知策略控制。
