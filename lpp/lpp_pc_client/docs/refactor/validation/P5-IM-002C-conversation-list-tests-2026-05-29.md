# P5-IM-002C Conversation List Tests

日期：2026-05-29

## 覆盖范围

新增单测：

- `tests/unit/message-conversation-list-model.spec.ts`

覆盖：

- 置顶优先。
- 未读优先。
- 最近消息时间排序。
- friends/groups tab 筛选。
- keyword 命中 last message preview。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-conversation-list-model.spec.ts
```

结果：通过，2 tests。

## 遗留风险

当前测试覆盖模型规则，不覆盖 DOM 渲染。DOM 级交互后续可在 P8/E2E 或页面拆分完成后补 browser smoke。
