# 验证记录：P4-MSG-002B Conversation Domain Entity

日期：2026-05-29
任务编号：P4-MSG-002B
状态：已完成

## 目标

定义 conversation entity、thread entity、共享 view model 边界，使普通 IM 与客服线程可以进入同一会话领域模型。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/conversation/conversation-domain.ts` | 新增 `ChatConversationEntity`、IM 扩展、客服扩展和两个 adapter。 |
| `tests/unit/conversation-domain.spec.ts` | 覆盖普通 IM、客服线程、客服终态映射。 |

## 核心模型

| 字段 | 说明 |
| --- | --- |
| `source` | `im` 或 `customer_service`，防止主键语义混淆。 |
| `stableId` | 跨模块稳定 key，如 `im:direct:{id}`、`customer_service:temp_session:{threadId}`。 |
| `kind` | `direct/group/temp_session/im_direct` 等会话类型。 |
| `title/avatar/lastMessage/unreadCount/lastActivityAt` | IM 与客服共享展示字段。 |
| `im` | 普通 IM 扩展，包含 readSeq、置顶、免打扰、群信息等。 |
| `customerService` | 客服扩展，包含 threadId、status、渠道、VIP、标签等。 |

## 设计约束

- 客服 `threadId` 不伪装成普通 IM `conversationId`，统一放入 `stableId` 和客服扩展。
- 普通 IM read model 不污染客服线程模型。
- 客服状态不污染普通 IM conversation 模型。
- 当前只新增 adapter 和测试，不替换页面消费点。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/conversation-domain.spec.ts tests/unit/im-conversation-contract.spec.ts tests/unit/cs-contract.spec.ts` | 通过，3 files / 12 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-002B 已完成。普通 IM 会话和客服线程已有统一 conversation domain，可继续替换首批消费点。
