# P10-CLEAN-004 performance samples reuse 验证记录

日期：2026-05-30

任务编号：P10-CLEAN-004

## 结论

`scripts/report-performance-samples.mjs` 暂保留 Node-only 实现，不直接复用 `src/renderer/data/performance/performance-samples.ts`。

保留理由：

1. CLI 是纯 Node `.mjs`，当前不引入 TS runtime、tsx、ts-node 或构建前置步骤。
2. `performance-samples.ts` 依赖 renderer TS 编译链和 shared TS 类型，直接复用会增加执行复杂度。
3. 两侧逻辑已有 `tests/unit/performance-samples.spec.ts` 和临时 diagnostics CLI 样本验证保护。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/performance-samples.spec.ts` | 通过，3 tests |
| `npm run perf:samples -- <临时 diagnostics.json>` | 通过，输出 startup CSV |

## 下一步

1. 如果后续允许新增构建型 CLI 入口，再把统计模型抽到可同时被 Node CLI 和 renderer TS 复用的 shared module。
