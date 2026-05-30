# P8-EL-001C Preload Validation Migration

日期：2026-05-29

## 变更

`src/preload/preload.cts` 新增 `validatedInvoke`：

- 每个 `desktopApi` 方法进入 IPC 前先调用 `validateDesktopApiCall`。
- validation 模块通过动态 import 加载，避免 `.cts` 直接 require ESM shared module。
- IPC channel 名称不变，renderer 调用方式不变。

## 行为保持

- 合法调用仍转发到原 `desktop:*` handler。
- `captureScreenshot/getAppVersion` 保持无参调用。
- `saveFile` 仍是双参数调用。

## 风险控制

- preload 层提前拒绝明显错误 payload。
- 不改变 main handler 执行顺序和返回值。
- 不触碰 Electron 文件动作和 token 持久化策略。
