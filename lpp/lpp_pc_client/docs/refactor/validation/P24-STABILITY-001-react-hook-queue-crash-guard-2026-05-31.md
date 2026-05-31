# P24-STABILITY-001 React Hook Queue Crash Guard 验证记录

## 风险边界

- 涉及：renderer 错误边界、runtime diagnostics、hooks lint 门禁、相关单测。
- 不涉及：API DTO、React Query key、Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖、技术替换。

## 实现范围

- `AppErrorBoundary` 不再向用户展示 React 内部英文错误，改为中文恢复文案、错误编号、「重试界面」和「重新加载」两级恢复动作。
- runtime error diagnostics 增加可选 context，记录 activeModule、resetKey、componentStack 和当前 URL，并继续脱敏 token/password/Bearer。
- 新增 `lint:hooks`，覆盖 `src/renderer/**/*.{ts,tsx}` 的 React hooks 顺序规则，并屏蔽历史 unused/no-extra-boolean-cast/no-regex-spaces 噪声。
- `check:quick` 纳入 `lint:hooks`，避免 hooks 顺序问题只靠手工发现。

## 验证命令

```bash
npm run lint:hooks
npx vitest run tests/unit/app-error-boundary.spec.ts tests/unit/runtime-error-diagnostics.spec.ts tests/unit/contact-directory.spec.ts tests/unit/media-message.spec.ts
npm run check:quick
npm run docs:check
git diff --check
```

## 手工验收要点

- `localhost:5173` 正常刷新不出现 `Should have a queue` 英文崩溃页。
- 若 renderer 发生异常，用户看到中文恢复界面，可先重试界面，再重新加载。
- 诊断导出中可看到 runtime-error context，且不泄漏 token 或 URL query 密钥。

## 遗留说明

- 本次未复现稳定崩溃堆栈，按单次开发态 HMR/hooks 签名异常治理。后续若 diagnostics 指向具体组件，应优先修对应组件的 hooks 调用顺序。
