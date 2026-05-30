# P8-EL-003B IPC Channel Whitelist

日期：2026-05-29

## 变更

`src/shared/desktop-api.ts` 新增：

- `desktopIpcChannelByMethod`
- `DesktopIpcChannel`

`src/main/main.ts` 新增：

- `handleDesktopIpc`
- `registeredDesktopIpcChannels`

## 作用

- main 进程固定 desktop channel 不再散落裸 `ipcMain.handle('desktop:*')`。
- 重复注册 channel 会立即抛错。
- channel 名称和 `DesktopApiMethod` 一一对应。

## 边界

- preload 仍保留原 channel 字符串，避免 `.cts` 静态 require ESM shared runtime。
- main 是权限执行边界，因此白名单注册优先落在 main。
