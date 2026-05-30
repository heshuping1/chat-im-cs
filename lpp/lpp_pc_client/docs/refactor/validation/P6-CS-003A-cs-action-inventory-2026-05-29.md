# P6-CS-003A CS Action Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/OnlineServicePage.tsx`
- `src/renderer/data/api/customer-service-client.ts`

## 动作入口

| 动作 | 当前入口 | API/执行方式 | 状态 |
| --- | --- | --- | --- |
| 接入 | `ThreadActionButton` -> `threadActionMutation` | `claimCustomerServiceThread` | 已实现 |
| AI 接管 | `ThreadActionButton` -> `threadActionMutation` | `takeoverCustomerServiceThread` | 已实现 |
| 关闭 | `ThreadActionButton` -> `threadActionMutation` | `closeCustomerServiceThread` | 已实现 |
| 回复文本 | `MessageComposer.onSendText` | `sendWorkbenchTextMessage` | 已实现 |
| 回复媒体 | `MessageComposer.onSendMedia` / upload queue | `uploadMedia` + `sendWorkbenchMediaMessage` | 已实现 |
| 转接 | 页面暂无真实入口 | 缺少明确 API 封装 | 记录为 unsupported |
| 评价 | 页面暂无真实入口 | 缺少明确 API 封装 | 记录为 unsupported |
| 只读查看 | 历史/终态会话 | 本地 UI 状态 | 已实现 |

## 发现的问题

1. 接入/接管/关闭原来由页面 switch 直接调用 API。
2. 回复、关闭、只读、接入/接管权限依赖页面状态字符串判断。
3. 转接和评价属于未来能力，应在权限矩阵显式标记 unsupported，避免后续随手补按钮。
