# P10-CLEAN-003 im-command-executor 验证记录

日期：2026-05-30

任务编号：P10-CLEAN-003

## 变更

- 将 `markReadEndpointType` 迁入真实 owner `src/renderer/data/im-read-model.ts`。
- `tests/unit/im-core.spec.ts` 改为直接引用 `im-read-model`。
- 删除旧测试 facade `src/renderer/data/im-command-executor.ts`。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/im-core.spec.ts` | 通过，71 tests |
| `rg -n "im-command-executor|coalesceExecutableCommands" src tests` | 通过，无引用 |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 |
