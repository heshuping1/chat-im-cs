# P15-GUARD-001 架构边界机械约束验证

日期：2026-05-30

## 变更

- 扩展 `tests/unit/architecture-boundaries.spec.ts`。
- 增加 cache adapter、message cache mutation owner、direct desktopApi 调用的职责回流守卫。
- 采用当前 owner 白名单，不改变运行时代码。

## 验证命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts
npm run check:quick
```

## 结果

- 架构边界测试通过。
- 后续新增散落 owner 入口会被测试捕获。

## 遗留

- 白名单内的历史入口后续随 P14 迁移逐步收窄。
