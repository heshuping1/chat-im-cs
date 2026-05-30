# P9-PERF-002 performance samples 验证记录

日期：2026-05-30

## 目标

- 在无法直接访问 Windows 实机的 Mac 开发环境中，先建立可复用的性能采样统计入口。
- 让 Windows 用户导出 diagnostics 后，可以用同一套脚本计算启动性能 P50/P75/P95。

## 变更

- 新增 `src/renderer/data/performance/performance-samples.ts`：
  - 从 `DiagnosticsPayload[]` 中抽取 startup `durationMs`。
  - 计算 nearest-rank P50/P75/P95。
  - 按预算输出 `ok`/`warning`。
- 新增 `scripts/report-performance-samples.mjs`：
  - `npm run perf:samples -- <diagnostics.json>`。
  - 输出 CSV：`metric,count,min,p50,p75,p95,max,budget,status`。
- 新增 `tests/unit/performance-samples.spec.ts`。
- `test:coverage:core` 纳入 `tests/unit/*performance*.spec.ts` 和 `src/renderer/data/performance/**/*.ts`。
- `PC端核心架构技术方案.md` 补充 diagnostics 采样统计方法。

## 验证

- `npx vitest run tests/unit/performance-samples.spec.ts tests/unit/startup-performance.spec.ts tests/unit/diagnostics-package.spec.ts`
  - 结果：通过，3 个测试文件，7 个测试用例。
- `npm run perf:samples -- <临时 diagnostics.json>`
  - 结果：输出 `startup.first-interactive` 与 `startup.renderer-entry` CSV 摘要。
- `npm run lint:core`
  - 结果：通过。
- `npm run test:coverage:core`
  - 结果：通过，58 个测试文件，258 个测试用例；核心覆盖率 lines 72.99%、statements 69.18%、functions 74.70%、branches 58.76%。

## 结论

P9-PERF-002 已完成。性能治理已经具备 diagnostics 导出、采样统计和覆盖率保护；真实 Windows P75/P95 数据仍需 Windows 打包态实机回填。
