# P7-SHARED-003A Badge/Time 盘点

日期：2026-05-29

## 已有公共能力

- `formatBadgeCount`: 已提供 `99+` 封顶。
- `formatChatTime`: 会话列表/资料页短时间展示。
- `formatChatMessageTime`: 消息气泡时间展示。
- `formatShortDate/formatMonthDayTime/formatClockTime`: 其他页面辅助格式。

## 重复入口

| 能力 | 位置 | 问题 |
| --- | --- | --- |
| 未读 badge | `Sidebar`、`ConversationListParts`、`ThreadList`、`MessageConversationListPanel` | 部分调用点直接显示原始数字，未统一 `99+`。 |
| 时间展示 | `ThreadList`、`MessageListPanel`、`CustomerProfileWorkspace`、`ConversationInfoPanel` | 多数已用 `formatChatTime`，少数业务排序仍直接 `new Date`。 |
| 排序时间戳 | `messageConversationListModel`、`MessageCenter`、`MessageContextMenuModel` | 属于业务排序/权限窗口，不直接替换展示 formatter。 |

## 判断

- 首批只统一展示型 badge，不改排序逻辑。
- 时间展示已有 formatter，先记录入口，避免为了 P7 改动消息排序和撤回窗口判断。
