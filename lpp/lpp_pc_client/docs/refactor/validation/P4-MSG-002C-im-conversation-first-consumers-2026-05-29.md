# 验证记录：P4-MSG-002C IM Conversation 首批消费点

日期：2026-05-29
任务编号：P4-MSG-002C
状态：已完成

## 目标

替换普通 IM 会话列表第一批消费点，使页面派生逻辑开始通过共享 conversation domain 获取稳定字段。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/components/MessageCenter.tsx` | 在排序时间、搜索文本、直聊联系人派生中使用 `chatConversationEntityFromImConversation`。 |

## 替换点

| 消费点 | 重构前 | 重构后 |
| --- | --- | --- |
| 会话排序时间 | 直接读 `conversation.lastMessage?.sentAt` | 读 `ChatConversationEntity.lastActivityAt` |
| 会话搜索 | 直接拼 `item.title + item.lastMessage?.preview` | 拼 `entity.title + entity.lastMessage?.preview` |
| 直聊联系人派生 | 直接解释 `conversationId/title/avatar/lastMessage/isMuted` | 从 `entity.im/entity.avatar/entity.lastMessage` 读取 |

## 约束

- 保持联系人 fallback `id=conversation-{conversationId}` 不变，避免影响现有选择逻辑。
- 不替换整个 `MessageCenter`，只迁移低风险派生 helper。
- 不改变接口返回结构。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/conversation-domain.spec.ts tests/unit/im-conversation-contract.spec.ts` | 通过，2 files / 7 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-002C 已完成。普通 IM 会话列表首批派生逻辑已开始使用统一 conversation domain。
