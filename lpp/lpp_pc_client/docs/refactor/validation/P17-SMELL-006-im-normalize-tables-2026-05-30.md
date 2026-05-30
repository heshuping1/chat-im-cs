# P17-SMELL-006 IM Normalize Tables 验证记录

日期：2026-05-30

变更：`im-message-normalize.ts` 抽出嵌套 body、文本、事件、联系人、媒体字段别名表；新增 `im-message-normalize.spec.ts` 覆盖常见消息体和未知类型 fallback。

未改变边界：保留现有 normalize 导出函数和消息 view 行为。

验证：

```bash
npx vitest run tests/unit/im-message-normalize.spec.ts tests/unit/im-message-contract.spec.ts tests/unit/message-domain.spec.ts
```

结果：3 个测试文件通过。
