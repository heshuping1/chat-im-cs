# P8-PERF-001A Startup Budget

日期：2026-05-29

## 预算

- 冷启动到首个可交互界面 P75：不超过 2500ms。
- renderer entry：不超过 800ms。

## 记录位置

- 主方案：`docs/refactor/PC端核心架构技术方案.md` 的 `25.4 性能红线`。
- 运行时常量：`src/renderer/data/performance/startup-performance.ts`。

## 执行原则

- 先测量再优化，P8-PERF-002/P8-PERF-003 不做无证据优化。
- 超预算记录进入 `window.__lppStartupDiagnostics`，并随 P8-EL-006 诊断包导出。
