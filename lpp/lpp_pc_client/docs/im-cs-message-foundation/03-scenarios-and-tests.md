# 场景与测试矩阵

## 1. IM 场景

| ID | 场景 | 期望 | 测试方向 |
| --- | --- | --- | --- |
| IM-O-01 | direct 会话列表返回 | 显示在消息列表 | `messages-client.spec.ts` |
| IM-O-02 | group 会话列表返回 | 显示在消息列表 | `messages-client.spec.ts` |
| IM-O-03 | `direct_customer` 无 tempSession | 保护为 IM | `conversation-ownership.spec.ts` |
| IM-O-04 | unknown `msg.new` | 默认 IM | `gateway-event-router.spec.ts` |
| IM-R-01 | 非当前会话收到对方消息 | unread +1，消息 badge 增加 | `im-core.spec.ts`、`gateway-im-side-effects.spec.ts` |
| IM-R-02 | 当前 paneVisible 会话收到对方消息 | effective unread 为 0，允许 mark read | `im-read-service.spec.ts`、`message-center-view-model.spec.ts` |
| IM-R-03 | auto selected 但 pane 不可见 | 不 mark read，unread 保留 | `im-read-service.spec.ts` |
| IM-R-04 | 自己发送文本 | 不产生 unread | `im-core.spec.ts` |
| IM-R-05 | 自己发送图片/文件/视频 | 不产生 unread | `message-cache-mutation-model.spec.ts` |
| IM-R-06 | 对方 read receipt | 只更新 peerReadSeq，不清我的 unread | `gateway-im-side-effects.spec.ts` |
| IM-R-07 | 当前用户 read receipt | 清我的 unread | `gateway-im-side-effects.spec.ts` |
| IM-R-08 | API snapshot 旧 unread | 不覆盖本地更新状态 | `im-read-service.spec.ts` |
| IM-R-09 | 本地 readAt 晚于 lastMessageAt 但 serverUnread > 0 | 不能仅凭 readAt 清 unread | `im-read-service.spec.ts` |
| IM-UI-01 | 会话列表 item badge | 使用 effective unread | `message-conversation-list-model.spec.ts` |
| IM-UI-02 | 未读 tab/filter | 使用 effective unread | `message-conversation-list-model.spec.ts` |
| IM-UI-03 | Sidebar 消息菜单 badge | 使用 aggregate effective unread | `workspace-ui-store.spec.ts` 或 `workspace-access.spec.ts` |
| IM-UI-04 | 聊天 header 未读 | 当前可见会话不显示未读 | `message-center-view-model.spec.ts` |

## 2. 在线客服场景

| ID | 场景 | 期望 | 测试方向 |
| --- | --- | --- | --- |
| CS-O-01 | pc-im-conversations 返回 tempSession | 不进 IM，进入客服 compat bridge | `messages-client.spec.ts` |
| CS-O-02 | tempSession gateway message | 只走客服 handler | `gateway-event-router.spec.ts` |
| CS-O-03 | indexed tempSession 命中同 scope | 归在线客服 | `conversation-ownership.spec.ts` |
| CS-O-04 | indexed tempSession 不同 scope | 不命中，默认 IM 或 unknown-default-im | `conversation-ownership.spec.ts` |
| CS-U-01 | 访客发消息 | 客服 ledger unread +1，在线客服 badge 增加 | `cs-cache-adapter.spec.ts` |
| CS-U-02 | 客服自己发送文本 | 只更新摘要，不加 unread | `customer-service-client.spec.ts`、`cs-cache-adapter.spec.ts` |
| CS-U-03 | 客服自己发送图片/文件 | 只更新摘要，不加 unread | `cs-cache-adapter.spec.ts` |
| CS-U-04 | workbench server unread > 0 | 作为可信值参与 final unread | `customer-service-client.spec.ts` |
| CS-U-05 | workbench unread=0 但 gateway overlay 有访客消息 | 保留 overlay unread | `cs-cache-adapter.spec.ts` |
| CS-U-06 | compat raw unread 缺 sender/direction | 不直接等于最终 unread | `messages-client.spec.ts` |
| CS-U-07 | compat raw unread 可扣除本地 staff sent | bounded candidate | `customer-service-client.spec.ts` |
| CS-U-08 | 访客 2 条 + 客服 2 条 | 最终 unread 只统计访客 | `cs-cache-adapter.spec.ts` |
| CS-U-09 | 进入详情加载成功 | ledger、badge、realtime reminder 清零 | `cs-cache-adapter.spec.ts`、`reminder-service.spec.ts` |
| CS-N-01 | 同一 messageId 多来源出现 | 只提醒一次 | `cs-reminder-model.spec.ts` |
| CS-N-02 | 当前打开客服会话收到消息 | 不弹桌面通知，保留必要菜单状态直到 read clear | `reminder-service.spec.ts` |

## 3. 发送场景

| ID | 场景 | 期望 | 测试方向 |
| --- | --- | --- | --- |
| SEND-S-01 | IM 文本发送 | local echo、outbox、API、cache replace、diagnostic | `message-cache-mutation-model.spec.ts` |
| SEND-S-02 | IM 图片/文件发送 | 共享 upload/outbox，IM endpoint 和 cache | `media-message.spec.ts` |
| SEND-S-03 | IM 视频发送 | poster、upload、send、local cache | `media-message.spec.ts` |
| SEND-S-04 | IM 名片发送 | 仅 IM 支持 | `message-composer-model.spec.ts` |
| SEND-S-05 | 客服文本发送 | local echo、workbench endpoint、客服 cache/ledger | `customer-service-client.spec.ts` |
| SEND-S-06 | 客服图片/文件发送 | 共享 upload/outbox，客服 endpoint/cache | `cs-cache-adapter.spec.ts` |
| SEND-S-07 | 发送失败恢复 | 状态 failed，可重试，不影响 unread | `message-status-model.spec.ts` |
| SEND-S-08 | 重启后恢复 outbox | 按 channel + target 隔离 | `send-outbox` 相关测试 |

## 4. 架构边界测试

建议新增或增强 `architecture-boundaries.spec.ts`：

| ID | 边界 | 断言 |
| --- | --- | --- |
| ARCH-01 | Ownership resolver | 新 API 必须接收 `scopeKey` |
| ARCH-02 | IM -> CS | IM models/hooks 不直接写客服 ledger |
| ARCH-03 | CS -> IM | 客服 data/hooks 不写 IM cache |
| ARCH-04 | Send runtime | shared send runtime 不 import IM/CS UI |
| ARCH-05 | Gateway | router 必须先 ownership 再 side effect |
| ARCH-06 | Badge | Sidebar 不读取 raw tempSession unread |

## 5. 回归命令

优先跑：

```powershell
npx.cmd vitest run tests/unit/im-core.spec.ts tests/unit/im-read-service.spec.ts tests/unit/im-read-view-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-conversation-list-model.spec.ts
```

```powershell
npx.cmd vitest run tests/unit/messages-client.spec.ts tests/unit/gateway-event-router.spec.ts tests/unit/gateway-im-side-effects.spec.ts tests/unit/gateway-cs-side-effects.spec.ts
```

```powershell
npx.cmd vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/customer-service-client.spec.ts tests/unit/cs-reminder-model.spec.ts tests/unit/reminder-service.spec.ts tests/unit/architecture-boundaries.spec.ts
```

最后跑：

```powershell
npm.cmd run typecheck -- --pretty false
npm.cmd run build
```

## 6. 人工验收

1. IM 当前打开会话收到对方消息：不显示未读，不弹提醒。
2. IM 非当前会话收到对方消息：消息菜单和任务栏显示未读。
3. IM 自己发送文本/图片/文件：不产生未读。
4. 在线客服访客消息：只在线客服提醒，IM 列表不闪现。
5. 在线客服自己回复：不增加客服未读。
6. 在线客服卡片有最新摘要，不显示错误的“暂无消息”。
7. 进入客服详情后，在线客服未读和任务栏清零。
8. 连续访客消息按有效访客未读计数，不叠加 realtime reminder。
