# P15-GUARD-002 Responsibility Exception Gate 验证记录

日期：2026-05-30

任务：P15-GUARD-002

范围：

1. `tests/unit/architecture-boundaries.spec.ts`
2. `docs/refactor/PC端P13职责审计任务清单.md`

## 变更

新增结构测试：`keeps data/main edge files documented in the responsibility exception ledger`。

规则：

1. 扫描 `src/main/**` 和 `src/renderer/data/**`。
2. 任一文件达到 450 行及以上时，必须在 `PC端P13职责审计任务清单.md` 的职责例外清单中登记。
3. 登记行必须包含 owner、保留理由、触发条件和验证命令。

## 验证

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts
npm run p12:audit
npm run docs:check
```

结果：

1. 架构边界测试通过。
2. 当前 `data-main-edge-files` 均已有职责例外登记。
3. 该门禁不会要求为了行数强拆，只要求超阈值文件的 owner 和后续触发条件可查。

## 遗留风险

该门禁只验证职责例外已登记，不能自动判断例外理由是否充分；后续仍需要在代码评审中按 owner 审查。
