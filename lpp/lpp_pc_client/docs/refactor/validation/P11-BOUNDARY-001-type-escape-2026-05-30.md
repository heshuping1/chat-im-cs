# P11-BOUNDARY-001 Type Escape 收窄验证记录

日期：2026-05-30

范围：

- `src/main/main.ts`
- `src/main/desktop-file-handlers.ts`

## 变更摘要

1. `handleDesktopIpc` 和 `DesktopIpcRegister` 的 handler 参数从 `any[]` 收窄为泛型 `unknown[]`。
2. validated IPC args 在 `handleDesktopIpc` 内部完成一次泛型参数适配，不扩大 renderer 能力边界。
3. 为 `cacheMediaPoster` 和 `openVideoPlayer` handler 补齐 payload 类型，避免隐式 unknown 传播。
4. `auth/settings/workspace-ui/im-read/reminder` 对 `data/store` 的引用继续保留为 owner facade：这些文件当前承担兼容导出和状态 owner 门面职责，本批不删除旧 store 链路。

## 验证命令

```bash
rg -n "\\bas any\\b|:\\s*any\\b|from ['\\\"]\\.\\./store|from ['\\\"].*data/store" src/main src/renderer/data tests
npx tsc -p tsconfig.electron.json --noEmit --pretty false
npm run p10:audit
npm run check:quick
npm run build
```

## 验证结果

- `npx tsc -p tsconfig.electron.json --noEmit --pretty false`：通过。
- `npm run p10:audit`：通过；`type-escape-signals` 为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。

## 遗留事项

- `compat-store-imports` 仍保留 owner facade 信号，已登记保留理由；删除旧 `data/store` 核心链路需要单独确认和更大迁移窗口。
- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
