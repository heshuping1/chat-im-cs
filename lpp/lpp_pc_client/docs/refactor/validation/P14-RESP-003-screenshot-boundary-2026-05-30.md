# P14-RESP-003 Screenshot Boundary Migration 验证记录

日期：2026-05-30

任务：P14-RESP-003

范围：

1. `src/main/screenshot-selection-window.ts`
2. `src/main/screenshot-selection-window-options.ts`
3. `src/main/screenshot-selection-template.ts`

## 职责结论

保留职责：

1. `selectScreenshotRegion` 仍是截图选择窗口的唯一稳定入口。
2. `screenshot-selection-window.ts` 只保留窗口生命周期、IPC listener 清理、加载模板和回传截图结果。

迁出职责：

1. `screenshot-selection-window-options.ts` 承接 BrowserWindow options 和 preload 参数组装。
2. `screenshot-selection-template.ts` 承接截图选择页 HTML/CSS/交互脚本模板。

未改变边界：

1. 未新增依赖。
2. 未新增 IPC channel。
3. 未改变 `desktop:screenshot-selection:` channel 前缀。
4. 未改变 `screenshot-selector-preload.cjs` 路径。
5. 未改变 `contextIsolation: true`、`nodeIntegration: false` 和当前 sandbox 策略。
6. 未扩大 renderer 能力。

## 验证

```bash
npx tsc -p tsconfig.electron.json --noEmit --pretty false
npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
npm run p12:audit
```

结果：

1. Electron TypeScript 校验通过。
2. Electron 边界单测通过：2 个测试文件、9 个用例。
3. `p12:audit` 中 `src/main/screenshot-selection-window.ts` 已不再进入 `data-main-edge-files`。

## 遗留风险

Windows 实机截图窗口交互仍需在 `P16-WIN-001` 验证，不阻塞 Mac 本地职责治理。
