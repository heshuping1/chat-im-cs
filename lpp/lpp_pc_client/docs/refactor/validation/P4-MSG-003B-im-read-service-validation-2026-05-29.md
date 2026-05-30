# 验证记录：P4-MSG-003B IM Read Service

日期：2026-05-29
任务编号：P4-MSG-003B
状态：已完成

## 目标

将 read model 规则沉淀到 repository/service，减少页面直接修改 unread/readSeq 规则的路径。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/im-read/im-read-service.ts` | 新增 unread/readSeq 纯规则：有效未读、localRead 覆盖、readSeq patch。 |
| `src/renderer/data/message-display.ts` | `effectiveConversationUnreadCount` 改为调用 read service。 |
| `src/renderer/components/MessageCenter.tsx` | `applyReadSeqToConversationListItem` 改为调用 read service。 |
| `tests/unit/im-read-service.spec.ts` | 覆盖 server/local/readState 冲突、self 消息、readSeq patch。 |

## 服务规则

| 函数 | 说明 |
| --- | --- |
| `resolveEffectiveImUnreadCount` | 统一 server unread、lastReadSeq、localReadSeq、自发消息、自会话的有效未读计算。 |
| `isLocalReadCoversLastMessage` | 统一 localRead 对 last message 的覆盖判断，支持 messageKey、readAt、readSeq。 |
| `applyImReadSeqToConversationSnapshot` | 统一 readSeq 应用到会话快照的规则，不降低 readSeq。 |

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/im-read-service.spec.ts tests/unit/im-read-store.spec.ts tests/unit/im-read-storage.spec.ts tests/unit/im-core.spec.ts` | 通过，4 files / 79 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 备注

Vitest 运行 `im-core.spec.ts` 时仍有 Node 26 的既有提示：`ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.` 不影响测试结果。

## 结论

P4-MSG-003B 已完成。read/unread 的首批纯规则已从页面沉淀到底层 service。
