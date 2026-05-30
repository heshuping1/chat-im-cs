# P8-PERF-001C Startup Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/startup-performance.spec.ts tests/unit/diagnostics-package.spec.ts` | 通过 | 验证启动预算记录、缓冲写入和诊断包导出联动。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | 验证 renderer/shared 类型。 |
| `tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 | 验证 Electron main/preload/shared 类型。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是，新增启动性能诊断缓冲。 |
| 日志入口 | `window.__lppStartupDiagnostics` |
| 打印开关 | `localStorage.lpp.startupDiagnostics=1` |
| traceId/correlationId | `startup-<phase>-<timestamp>-<random>` |
| 可排查问题 | renderer entry 慢、首屏可交互超预算、首屏同步 chunk 膨胀。 |
| Codex 检索方式 | `rg -n "__lppStartupDiagnostics|P8-PERF-001B|markFirstInteractive" src/renderer tests/unit` |

## 遗留风险

1. 当前记录是 renderer 侧 performance navigation 时间，未覆盖主进程创建窗口前的耗时。
2. 预算为首版红线，后续需用打包态 Windows 机器采样校准 P75/P95。
