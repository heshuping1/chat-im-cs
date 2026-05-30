# P8-EL-004B Screenshot Preload Isolation

日期：2026-05-29

## 变更

新增 `src/preload/screenshot-selector-preload.cts`：

- `onSource(callback)`
- `sendReady()`
- `sendResult(value)`

截图窗口改为：

- `contextIsolation: true`
- `nodeIntegration: false`
- `preload: screenshot-selector-preload.cjs`
- channel 通过 `additionalArguments` 注入 preload

## Channel 约束

preload 只接受以 `desktop:screenshot-selection:` 开头的 channel/readyChannel。

inline HTML 不再拿到 `ipcRenderer`，只能调用 `window.screenshotSelector` 的三个方法。
