# P10-CLEAN-002 message composer entry 验证记录

日期：2026-05-30

任务编号：P10-CLEAN-002

## 结论

`MessageComposer.tsx` 仍是生产入口，不删除。

当前引用关系：

- `src/renderer/messages/components/MessageComposerSurface.tsx` 引用 `MessageComposer`。
- `src/renderer/customer-service/components/CustomerServiceComposerSurface.tsx` 引用 `MessageComposer`。
- `MessageComposer.tsx` 内部引用 `LexicalChatInput`。

## 验证

| 命令 | 结果 |
| --- | --- |
| `rg -n "MessageComposer|LexicalChatInput|MessageComposerSurface" src tests` | 通过，确认生产引用存在 |
| `wc -l src/renderer/components/MessageComposer.tsx src/renderer/components/LexicalChatInput.tsx src/renderer/messages/components/MessageComposerSurface.tsx` | 通过，记录体积 |

## 下一步

1. `MessageComposer.tsx` 和 `LexicalChatInput.tsx` 仍在大文件列表，后续应单独拆分 composer 工具区和 Lexical plugins。
