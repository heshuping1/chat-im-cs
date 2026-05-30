# P7-SHARED-005A Notification 盘点

日期：2026-05-29

## 已有公共能力

- `src/renderer/data/reminder/reminder-service.ts`
  - reminder 去重、容量、TTL。
  - `shouldPushRealtimeReminder`
  - `shouldShowDesktopNotification`
  - `notifyDesktopOrBrowser`
- `src/renderer/data/reminder/reminder-store.ts`
  - reminder selectors/hooks/actions。
- `src/renderer/data/reminder/reminder-diagnostics.ts`
  - 集中记录提醒触发、dismiss、桌面通知发送/跳过/失败。

## 当前触发点

| 触发点 | 类型 | 边界 |
| --- | --- | --- |
| `GatewayBridge` | Gateway 客服消息/队列事件 | 跨模块提醒，使用 reminder owner。 |
| `ChatWorkspace` | 当前客服会话新消息 | 跨模块提醒，使用 reminder owner。 |
| `Sidebar` | 客服队列和新消息摘要 | 跨模块提醒，使用 reminder owner。 |
| `MessageCenter` | 打开会话时 dismiss IM reminder | reminder owner。 |
| 页面 `setNotice` | 局部 toast | 不进入全局 reminder。 |

## 判断

- P7 不再新增 notification adapter，避免重复 P2 已完成的 reminder owner。
- 局部 toast 暂不升级为全局通知。
- 桌面通知最终会触发 Electron/browser API，安全边界进入 P8。
