# P8-EL-006C Diagnostics Export Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/diagnostics-package.spec.ts tests/unit/desktop-api-validation.spec.ts` | 通过 | 验证诊断收集、裁剪、错误摘要、脱敏和 IPC payload validation。 |
| `tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 | 验证 Electron main/preload/shared 类型。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | 验证 renderer/shared 类型。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 不新增新的业务日志，新增诊断包导出聚合能力。 |
| 日志入口 | `window.__lpp*Diagnostics` 缓冲数组，由 `createDiagnosticsExportPayload` 聚合。 |
| traceId/correlationId | 导出包包含 `traceId`，每条原模块记录保留自身 `traceId`。 |
| 可排查问题 | 最近 Gateway、API、发送、消息中心、客服状态等核心链路异常。 |
| Codex 检索方式 | 搜索 `__lpp.*Diagnostics` 或导出的 JSON 中 `diagnostics.<module>.records`。 |
| 敏感信息处理 | collector 与 shared validation 均会脱敏 token、Authorization、secret、credential。 |

## 遗留风险

1. 诊断包目前是用户主动从设置页导出，未接入 crash 自动采集。
2. 各模块诊断字段仍未完全统一，后续可在 P8-ARCH/P8-ENG 中建立结构测试和 lint 约束。
