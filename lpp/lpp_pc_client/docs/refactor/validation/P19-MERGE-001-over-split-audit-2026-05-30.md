# P19-MERGE-001 Over Split Audit Validation

日期：2026-05-30

任务：P19-MERGE-001

## 修改范围

- 通过 `npm run p19:audit` 输出 25 行以内的小文件信号。
- 审查 `workspaceTrayStatusEffect.ts`、`diagnosticsExport.ts`、`screenshotCapture.ts`、`useSerialTaskQueue.ts`、`ChatToastNotice.tsx` 等文件。

## 结论

本轮不合并小文件。它们虽然短，但承担 runtime 能力隔离、desktopApi 收口或复用 primitive 的边界价值，合并会让页面/store 重新承担副作用。

## 验证命令

```bash
npm run p19:audit
npx vitest run tests/unit/architecture-boundaries.spec.ts
```

## 结果

通过。`p19:audit` 输出的小文件均有边界价值或兼容入口价值，本轮未发现应合并且低风险的无意义 wrapper。
