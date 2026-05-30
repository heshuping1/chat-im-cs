# P5-IM-002A Conversation List Panel

日期：2026-05-29

## 变更

新增会话列表 container：

- `src/renderer/messages/components/MessageConversationListPanel.tsx`

迁移范围：

- 搜索输入。
- plus menu。
- filter tabs。
- error notice。
- conversation row 列表。
- 会话列表 loading/empty。

`ConversationRow` 仍保持 presentation 组件，由新面板组合使用。

## 边界控制

本任务只迁移 JSX 装配，不迁移：

- conversations query。
- conversation filter/sort 规则。
- unread 计算。
- group avatar 计算。
- active conversation 选择。
- 右键菜单动作。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-center-diagnostics.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/send-state-machine.spec.ts
```

结果：通过，10 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。页面级入口日志已由 `P5-IM-001E` 覆盖。

## 遗留风险

会话筛选、排序、置顶、未读派生仍在 `MessageCenter.tsx`，下一步 `P5-IM-002B` 继续下沉到可测试的模型函数。
