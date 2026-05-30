# 验证记录：P4-MSG-002D CS Thread 首批消费点

日期：2026-05-29
任务编号：P4-MSG-002D
状态：已完成

## 目标

替换客服线程列表第一批消费点，使客服会话展示派生开始通过共享 conversation domain。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/components/ThreadList.tsx` | 在线程搜索、标题、最近消息、未读 badge 派生中使用 `chatConversationEntityFromCustomerServiceThread`。 |

## 替换点

| 消费点 | 重构前 | 重构后 |
| --- | --- | --- |
| 搜索 | 直接拼 `thread.title/lastMessagePreview/source/sourceChannel` | 拼 `entity.title/entity.lastMessage.preview/entity.customerService.source/sourceChannel` |
| 头像名称 | 直接读 `thread.title` | 读 `entity.title` |
| 未读 badge | 直接读 `thread.unreadCount` | 读 `entity.unreadCount` |
| 最近消息 | 直接读 `thread.lastMessagePreview` | 读 `entity.lastMessage.preview` |

## 约束

- 不改变 thread 选择 key、React key、状态标签、接入动作。
- 不迁移客服状态机，状态机在 P6-CS-002 单独处理。
- 不改变接口返回结构。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/conversation-domain.spec.ts tests/unit/cs-contract.spec.ts` | 通过，2 files / 8 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-002D 已完成。客服线程列表首批派生逻辑已开始使用统一 conversation domain。
