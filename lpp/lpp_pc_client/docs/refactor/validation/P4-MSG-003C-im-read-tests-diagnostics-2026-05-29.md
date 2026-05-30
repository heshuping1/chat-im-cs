# 验证记录：P4-MSG-003C IM Read Tests & Diagnostics

日期：2026-05-29
任务编号：P4-MSG-003C
状态：已完成

## 目标

补 read model 单测和诊断日志，覆盖乱序、重复、离线恢复。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/im-read-model.ts` | 非活跃会话收到重复/乱序 Gateway 消息时不重复增加 unread，并输出诊断 command。 |
| `tests/unit/im-core.spec.ts` | 新增重复/乱序 Gateway 消息、离线恢复 pending read 重试测试。 |

## 行为规则

| 场景 | 行为 |
| --- | --- |
| 非活跃会话新消息 seq > lastMessageSeq | `unreadCount += 1`。 |
| 非活跃会话重复/乱序消息 seq <= lastMessageSeq | 不增加 unread，输出 `im.read.duplicate_or_out_of_order_message`。 |
| API snapshot 落后于 pendingReadSeq | 输出 `retry_pending_read`。 |
| reader identity 缺失 | 继续输出 `im.read.missing_reader_identity`。 |

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/im-core.spec.ts tests/unit/im-read-service.spec.ts tests/unit/im-read-diagnostics.spec.ts` | 通过，3 files / 77 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 备注

Vitest 运行 `im-core.spec.ts` 时仍有 Node 26 的既有提示：`ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.` 不影响测试结果。

## 结论

P4-MSG-003C 已完成。read model 对重复/乱序 Gateway 消息已有保护，离线恢复 pending read 重试有测试覆盖。
