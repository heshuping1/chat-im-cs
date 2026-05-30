# P18-PERF-001 Rendering Guardrails 验证记录

日期：2026-05-30

范围：高频渲染和性能门禁复核。

## 本次结论

1. `p12:audit` 显示 CSS 大文件和 700 行以上组件观察项均为 `none`。
2. 现有 `message-list-windowing.spec.ts`、`thread-list-windowing.spec.ts`、`startup-performance.spec.ts`、`performance-samples.spec.ts` 仍纳入 core coverage。
3. `check:quick`、`test:coverage:core` 均通过，未发现本批迁移造成 shape 或性能门禁回退。

## 验证结果

1. `npm run p12:audit`：通过。
2. `npm run test:coverage:core`：通过。
3. `npm run check:quick`：通过。

## 遗留风险

真实长列表滚动帧率和 Windows 打包态性能仍需实机 diagnostics/perf sample 回填。
