# 验证记录：P3-API-001C API/Contract 诊断日志

日期：2026-05-29

任务编号：P3-API-001C

## 修改范围

- `src/renderer/data/api-contract/contract-diagnostics.ts`
- `src/renderer/vite-env.d.ts`
- `tests/unit/contract-diagnostics.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 API/contract 层诊断日志格式，支持记录接口名、处理阶段、contract 状态、字段缺失/降级 reason、必要上下文和错误摘要，后续 normalizer 可以直接复用。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 结构化记录 | `ApiContractDiagnosticRecord` 包含 `traceId/module/taskId/api/phase/result/issues/context/error`。 |
| 阶段 | 支持 `normalize`、`validate`、`view-model`。 |
| 状态 | 复用 `ContractStatus`：`ok/degraded/invalid/failed`。 |
| issue 摘要 | 只记录 `code/field/level`，不记录完整 raw DTO 或消息正文。 |
| 缓冲区 | 浏览器环境写入 `window.__lppApiContractDiagnostics`，最多保留 160 条。 |
| 控制台输出 | 开发环境或 `localStorage.lpp.apiContractDiagnostics=1` 时输出 `[lpp:api-contract]`。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/contract-diagnostics.spec.ts tests/unit/contract-result.spec.ts tests/unit/reminder-diagnostics.spec.ts` | 通过 | 3 个测试文件，4 个用例通过，耗时约 122ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是 |
| 日志入口 | `src/renderer/data/api-contract/contract-diagnostics.ts` |
| traceId/correlationId | `api-contract-<phase>-<timestamp>-<random>` |
| 可排查问题 | 哪个接口/事件的 DTO 解析出现 degraded/invalid/failed，缺哪个字段，使用哪个 reason code。 |
| Codex 检索方式 | `rg -n "logApiContractDiagnostic|__lppApiContractDiagnostics|lpp.apiContractDiagnostics" src/renderer` |
| 敏感信息处理 | 不记录 token、Authorization、完整 raw DTO、消息正文、用户隐私字段；只记录 ID、queryKey、itemCount 和 issue 摘要。 |

## 结论

P3-API-001C 已完成。P3-API-001 基础闭环：规范模板、统一 result 类型、诊断日志格式均已落地。
