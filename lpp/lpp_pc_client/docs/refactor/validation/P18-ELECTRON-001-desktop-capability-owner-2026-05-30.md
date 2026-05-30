# P18-ELECTRON-001 Desktop Capability Owner 验证记录

日期：2026-05-30

范围：Renderer 组件直接 Electron 能力收口。

## 修改范围

1. `mediaActionCapabilities.ts` 新增 current runtime capability helper。
2. `messageMediaDesktopActions.ts` 新增当前 desktopApi 的 cache/open/status helper。
3. `settings/runtime/diagnosticsExport.ts` 承接设置页 diagnostics export。
4. `MessageBodyView`、`MessageOverlayLayer`、`FileMessageContent`、`ServiceMessageContextMenu`、`MePage` 不再直接访问 `window.desktopApi`。
5. `architecture-boundaries.spec.ts` 收紧 direct desktopApi 白名单。

## 验证结果

1. `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

desktop runtime owner 内仍允许 direct desktopApi，这是 Electron 能力边界的预期集中点。
