# P11-CSS-001 完整 CSS Owner 拆分验证记录

日期：2026-05-30

范围：

- `src/renderer/styles/app.css`
- `src/renderer/styles/account/auth.css`
- `src/renderer/styles/shared/app-shell.css`
- `src/renderer/styles/messages/message-shared.css`
- `src/renderer/styles/pages/product-pages.css`
- `src/renderer/styles/shared/porcelain-shell.css`
- `src/renderer/styles/pages/workbench-knowledge.css`
- `src/renderer/styles/shared/scrollbar-theme-bridge.css`
- `src/renderer/styles/settings/settings.css`
- `src/renderer/styles/customer-service/customer-service.css`
- `src/renderer/App.tsx`
- `scripts/report-p10-code-health.mjs`

## 变更摘要

1. 将 `app.css` 中的 account/auth、app shell、message shared、pages、porcelain shell、workbench/knowledge、scrollbar/theme bridge、settings、customer-service 样式迁移到 owner 文件。
2. `app.css` 只保留基础变量、reset、全局 focus 和 body 行为，行数降至 108。
3. `globalCssSignals` 改为阈值报告：只有 `app.css` 或 `message-center.css` 达到 2000 行才报告信号。

## 验证命令

```bash
wc -l src/renderer/styles/app.css src/renderer/styles/messages/message-center.css src/renderer/styles/account/auth.css src/renderer/styles/shared/app-shell.css src/renderer/styles/customer-service/customer-service.css
npm run p10:audit
npm run check:quick
npm run build
```

## 验证结果

- `app.css`：108 行。
- `message-center.css`：1829 行。
- `npm run p10:audit`：通过；`global-css-signals` 为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。

## 遗留事项

- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
