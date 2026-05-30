# 验证记录：P4-MSG-003A IM Read Model 不变量

日期：2026-05-29
任务编号：P4-MSG-003A
状态：已完成

## 目标

编写 unread/readSeq/localRead/peerRead 不变量表和冲突处理规则，为后续 read repository/service 收敛提供依据。

## 当前 owner

| 能力 | 当前 owner | 说明 |
| --- | --- | --- |
| read 状态归约 | `src/renderer/data/im-read-model.ts` | `reduceImCoreEvent` 是核心规则中心。 |
| read store 入口 | `src/renderer/data/im-read/im-read-store.ts` | 当前仍兼容 workspace store，但新调用方应从这里读写。 |
| read 本地持久化 | `src/renderer/data/im-read/im-read-storage.ts` | local reads、peer reads、conversation read state。 |
| read 诊断 | `src/renderer/data/im-read/im-read-diagnostics.ts` | P2 已建立底层日志。 |
| 页面补丁 | `MessageCenter.tsx`、`Sidebar.tsx` | 仍存在部分 read 派生和 cache patch。 |
| Gateway cache | `data/gateway/im-gateway-cache.ts` | Gateway 消息/已读更新 query cache。 |

## 不变量表

| 不变量 | 规则 |
| --- | --- |
| seq 非负整数 | 所有 `myReadSeq/peerReadSeq/lastMessageSeq/unreadCount/pendingReadSeq` 必须归一到 `>= 0` 的整数。 |
| 会话 key 稳定 | `conversationKey = {conversationType}:{conversationId}`，只允许 `direct/group`。 |
| 我的已读单调递增 | `myReadSeq` 只能取 `max(current, incoming)`，不能回退。 |
| 对方已读单调递增 | `peerReadSeq` 只能取 `max(current, incoming)`，且仅 direct 会话展示对方已读。 |
| 服务端快照不降低本地已读 | API snapshot 可更新 `lastMessageSeq/unreadCount`，但不能把 `myReadSeq/peerReadSeq` 降低。 |
| 自己发送即本地已读 | `send.message_succeeded` 和自己 Gateway 消息应推进 `myReadSeq` 并清 unread。 |
| 当前会话可见即本地已读 | 活跃会话收到对方新消息或可见消息推进时，应生成 mark_read 命令并清 unread。 |
| 非活跃对方新消息增加 unread | Gateway 对方消息且非活跃时，`unreadCount += 1`。 |
| mark_read 失败需要 pending | 本地先乐观更新，失败后保留 `pendingReadSeq`，后续 snapshot 低于 pending 时重试。 |
| 本地 localRead 兼容旧 UI | `locallyReadImConversationReads` 仍用于 sidebar/list 兼容，但最终应从 `ConversationReadState` 派生。 |

## 冲突处理规则

| 冲突 | 处理 |
| --- | --- |
| API unread > 本地已读推导 | 如果本地 `readSeq >= lastMessageSeq`，显示 unread 必须为 0。 |
| localRead 与 server read 不一致 | 取更大的 readSeq；若 messageKey 命中当前 lastMessage，也视为已读。 |
| peer read 无身份 | 记录 `im.read.missing_reader_identity` 诊断，不更新 peerReadSeq。 |
| peer read 是自己 | 更新 `myReadSeq`，不更新 peerReadSeq。 |
| group peer read | 暂不展示对方已读；避免错误地把群成员 read 当单一 peerRead。 |
| 乱序 Gateway 消息 | `lastMessageSeq` 取 max；旧消息不降低状态。 |
| 重复 Gateway 消息 | `unreadCount` 当前可能重复加，P4-MSG-003C 需要补去重/乱序测试。 |
| 本地发送 echo 与 server 消息 | 由 send/local outgoing 逻辑合并，read model 只看 seq 和 ownership。 |

## 仍需收敛的页面路径

| 路径 | 问题 |
| --- | --- |
| `MessageCenter.applyReadSeqToConversationListItem` | 页面直接 patch `lastReadSeq/unreadCount`。 |
| `MessageCenter.mergeUnifiedReadStateForIdentity` | 页面合并旧 localRead 与新 readState。 |
| `Sidebar` unread 统计 | 仍通过 `effectiveConversationUnreadCount` + localRead 计算。 |
| `message-display.ts` | 仍承担部分 read 判断，后续应被 read repository/service 替代。 |

## 推荐 P4-MSG-003B 切入

1. 新增或扩展 `data/im-read/im-read-service.ts`。
2. 把 `effectiveConversationUnreadCount` 相关规则以纯函数形式沉淀到底层。
3. 页面保留调用，但不再自己拼 localRead/readState。
4. 补单测覆盖 server/local/readState 三方冲突。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `sed -n '1,300p' src/renderer/data/im-read-model.ts` | 通过 |
| `sed -n '1,280p' src/renderer/data/im-read/im-read-storage.ts` | 通过 |
| `rg -n "lastReadSeq\|peerReadSeq\|readSeq\|unreadCount\|localRead" src/renderer/components src/renderer/data -g '*.ts' -g '*.tsx'` | 通过 |

## 结论

P4-MSG-003A 已完成。下一步应把 unread/readSeq 派生规则沉淀到底层 service，减少页面直接改规则。
