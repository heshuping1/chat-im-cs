# P8-PERF-001B Startup Diagnostics

日期：2026-05-29

## 修改范围

- 新增 `src/renderer/data/performance/startup-performance.ts`。
- `src/renderer/main.tsx` 在 renderer 入口记录 `startup.renderer-entry`。
- `src/renderer/App.tsx` 首次提交后记录 `startup.first-interactive`。
- `src/renderer/data/diagnostics/diagnostics-package.ts` 将 `startup` 模块纳入诊断包。

## 诊断字段

| 字段 | 说明 |
| --- | --- |
| `traceId` | `startup-<phase>-<timestamp>-<random>` |
| `module` | 固定为 `startup` |
| `event` | `startup.renderer-entry` 或 `startup.first-interactive` |
| `durationMs` | 从 performance navigation 起点到当前采样点的耗时 |
| `budgetMs` | 当前采样点预算 |
| `result` | `ok` 或 `warning` |
| `reason` | 超预算时为 `startup_budget_exceeded` |

## 说明

当前为轻量基线，不引入 Lighthouse、Profiler 或第三方性能 SDK。后续 P8-PERF-002 处理 bundle 时，直接复用该诊断入口观察启动趋势。
