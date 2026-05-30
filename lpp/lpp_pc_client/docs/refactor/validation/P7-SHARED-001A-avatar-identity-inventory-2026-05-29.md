# P7-SHARED-001A Avatar/Identity 盘点

日期：2026-05-29

## 已有公共基础

- `src/renderer/components/PcAvatar.tsx`
  - 已支持 person/group/tenant。
  - 已支持头像缓存、失败 fallback、blob/data URL。
  - 已暴露 `avatarInitial`。
- `src/renderer/messages/components/ConversationListParts.tsx`
  - 已有 `ConversationAvatar`，处理群头像宫格、群默认 icon、未读 badge。
- `src/renderer/data/message/message-view-model.ts`
  - 已沉淀消息发送人 display/avatar fallback。

## 重复/分散规则

| 能力 | 当前位置 | 问题 |
| --- | --- | --- |
| 名称 fallback | `ChatWorkspace`、`ConversationListParts`、`CustomerProfileWorkspace`、`MessageListPanel` | “未知客户/访客/未命名会话”等默认值按页面散落。 |
| 头像 URL 优先级 | `ChatWorkspace`、`ThreadList`、`CustomerContextPanel`、`CustomerProfileWorkspace` | `profile.avatarUrl/customerAvatarUrl/avatarUrl/conversation.avatarUrl/contact.avatarUrl` 优先级重复。 |
| 首字 fallback | `avatarInitial` 调用散落在客服和 IM 消息列表 | 逻辑已有公共函数，但调用方仍自己决定 fallback 名称。 |
| 群头像 | `ConversationListParts`、`MessageCenter` group avatar helpers | 群头像 cells 生成和展示分离，后续可收敛到 identity model。 |
| 未读 badge | `ConversationAvatar`、`ThreadList` | badge DOM 和阈值展示未统一，进入 P7-SHARED-003 处理。 |

## 首批低风险迁移点

1. `ChatWorkspace` 客服头部头像：
   - 当前直接拼 `profile?.avatarUrl || selectedThread.customerAvatarUrl || selectedThread.avatarUrl`。
   - 可迁入 `customerServiceWorkspaceViewModel` 的 identity 字段，页面只传给 `PcAvatar`。
2. `ThreadList` 客服列表头像：
   - 当前和客服头部有相同 URL 优先级。
   - 可复用同一个 customer service identity helper。
3. `ChatMessageBubble` 消息头像：
   - 已通过 message view model 输出 `model.sender`，只需补测试，不优先改 UI。

## 不立即做的事

- 不替换 `PcAvatar`，只升级复用。
- 不引入新头像库或图片处理依赖。
- 不把未读 badge 强行塞进 `PcAvatar`，badge/time 归 P7-SHARED-003。
- 不碰 Electron 文件、通知、IPC 安全边界。
