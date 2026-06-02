# PC 图标统一管理手册

## 目标

PC 客户端图标只维护一个源文件：

```text
assets/brand/app-icon-source.png
```

替换源图后运行 `npm.cmd run icon:sync`，脚本会同步普通 PNG 产物，并在工具可用时更新 ICO/ICNS。如果本机已有 `release/win-unpacked/LPP 客服客户端.exe`，脚本还会把 `assets/app-icon-green-bubble.ico` 写入这个 exe，便于不用重新生成 NSIS 安装包也能验收任务栏图标。

## 文件关系

| 用途 | 文件 |
| --- | --- |
| 单一源图 | `assets/brand/app-icon-source.png` |
| Electron 主进程、托盘、通知、打包资源 | `assets/app-icon-green-bubble.ico` |
| 渲染端、浏览器标签、侧边栏品牌 | `public/app-icon-green-bubble.png` |
| 开发态 macOS Dock、资产验收 | `assets/app-icon-green-bubble.png` |
| macOS 打包 | `assets/app-icon-green-bubble.icns` |
| Windows 打包后验收 | `release/win-unpacked/LPP 客服客户端.exe` |

现有 Electron 配置保持不变：

- `package.json` 的 `build.icon`、`build.win.icon`、`build.nsis.installerIcon`
- `src/main/main.ts` 的 `appIconPath`
- `src/renderer/app/appMetadata.ts` 的 `appIconSrc`

这些位置继续指向同步后的统一产物。

## 为什么任务栏图标不是 public PNG 实时生效

Windows 任务栏图标来自正在运行的 exe 资源、窗口 icon、AppUserModelID 和系统图标缓存，不是从 `public/app-icon-green-bubble.png` 实时读取。

`public/*.png` 主要服务渲染端，例如页面 favicon、侧边栏品牌图。它可以在应用重启后更新 UI 图片，但不能直接改变 Windows 任务栏对某个 exe 的图标解析结果。

所以“换一张 PNG 后任务栏立刻变”在 Windows 上不成立。要验收任务栏图标，必须满足至少一个条件：

- 当前运行的是已经内嵌新 ICO 的打包 exe。
- 或者对现有 `release/win-unpacked/LPP 客服客户端.exe` 执行 rcedit 图标修补。
- 并且 Windows 图标缓存没有继续显示旧结果。

## 开发态和打包态差异

### 开发态：`npm.cmd run dev`

开发态启动链路是 Vite + Electron：

```text
node_modules/electron/dist/electron.exe .
```

这时 Windows 任务栏可能优先显示 Electron 开发壳的图标，不能作为最终验收标准。开发态只用于代码调试。

### 打包态：`release/win-unpacked/LPP 客服客户端.exe`

打包态运行的是项目自己的 exe：

```text
release/win-unpacked/LPP 客服客户端.exe
```

任务栏、窗口、通知、托盘图标都应该以这个 exe 和 `assets/app-icon-green-bubble.ico` 为准。图标验收必须看打包态，不看开发态 Electron 图标。

## 更换图标步骤

1. 替换源图：

   ```text
   assets/brand/app-icon-source.png
   ```

2. 同步所有图标产物：

   ```powershell
   npm.cmd run icon:sync
   ```

   脚本会同步：

   - `assets/app-icon-green-bubble.png`
   - `public/app-icon-green-bubble.png`
   - 有 ImageMagick 时生成 `assets/app-icon-green-bubble.ico`
   - 有 ImageMagick 时生成 `assets/app-icon-green-bubble.icns`
   - 有 `release/win-unpacked/LPP 客服客户端.exe` 和 `rcedit-x64.exe` 时修补 exe 图标

3. 如需验收任务栏，启动打包版：

   ```powershell
   npm.cmd run start:packaged
   ```

   这个命令会先停止当前同一路径的打包版进程，再执行 `icon:sync`，最后启动 `release/win-unpacked/LPP 客服客户端.exe`。

4. 提取 exe 内嵌图标做人工确认：

   ```powershell
   npm.cmd run icon:verify
   ```

   输出文件：

   ```text
   tmp/packaged-exe-icon.png
   ```

   这个结果是最终 exe 内嵌图标的准确信号。

5. 如果任务栏仍显示旧图，重启 Explorer 或清 Windows 图标缓存后再启动打包版。

## 修复已安装版任务栏图标

桌面快捷方式或任务栏固定项可能指向已安装目录，而不是工作区的 `release/win-unpacked`。当前常见安装路径是：

```text
D:\Program Files\lpp-pc-client\LPP 客服客户端.exe
```

如果从桌面快捷方式 `LPP 客服客户端.lnk` 打开后任务栏仍是旧图，运行：

```powershell
npm.cmd run icon:fix-taskbar
```

这个命令会：

- 停止工作区打包版和安装版 PC 客户端进程。
- 先执行 `icon:sync`，保证 `release/win-unpacked` 已写入当前 ICO。
- 使用同一个 `assets/app-icon-green-bubble.ico` 修补 `D:\Program Files\lpp-pc-client\LPP 客服客户端.exe`。
- 更新桌面、开始菜单、任务栏固定目录中 LPP 快捷方式的 `IconLocation`。
- 执行 `ie4uinit.exe -ClearIconCache` 和 `ie4uinit.exe -show` 刷新 Windows 图标缓存。

如果提示安装目录没有写权限，请用管理员 PowerShell 重新运行同一命令。

## 常见问题

### NSIS 阶段符号链接权限失败

`npm.cmd run dist:win` 可能在 electron-builder 的 NSIS 阶段因为 Windows 符号链接权限失败，但 `release/win-unpacked` 通常已经生成。此时优先用 `release/win-unpacked/LPP 客服客户端.exe` 验收任务栏图标，不必先阻塞在安装包生成上。

### 任务栏还是旧图

先确认当前运行进程不是开发态：

```text
node_modules/electron/dist/electron.exe .
```

如果当前进程是开发态 Electron，任务栏图标不作为最终标准。请运行：

```powershell
npm.cmd run start:packaged
```

如果当前已经是 `release/win-unpacked/LPP 客服客户端.exe`，再运行：

```powershell
npm.cmd run icon:verify
```

如果 `tmp/packaged-exe-icon.png` 是新图，而任务栏仍旧图，说明是 Windows 图标缓存。重启 Explorer、注销重登，或清理 Windows 图标缓存后再打开打包版。

如果当前进程或桌面快捷方式指向 `D:\Program Files\lpp-pc-client\LPP 客服客户端.exe`，请运行 `npm.cmd run icon:fix-taskbar`。修复后再运行 `npm.cmd run icon:verify`，确认 `tmp/installed-exe-icon.png` 也是新图。

### 缺少图标转换工具

`icon:sync` 找不到 ImageMagick 时会明确提示，并保留现有 ICO/ICNS，不会伪装成已经重新生成。需要重新生成 ICO/ICNS 时，请安装 ImageMagick，或由设计/构建环境提供新的 `assets/app-icon-green-bubble.ico` 和 `assets/app-icon-green-bubble.icns`。

### 找不到 rcedit-x64.exe

如果 `release/win-unpacked/LPP 客服客户端.exe` 存在但找不到 `rcedit-x64.exe`，`icon:sync` 会失败并提示。可选处理：

- 先运行一次 `npm.cmd run dist:win`，让 electron-builder 下载 winCodeSign 工具。
- 或设置环境变量 `RCEDIT_PATH` 指向本机可用的 `rcedit-x64.exe`。

### exe 正在运行导致 patch 失败

Windows 可能锁定正在运行的 exe。请关闭 PC 客户端，或直接运行：

```powershell
npm.cmd run start:packaged
```

该命令会停止当前同一路径打包版进程后再修补并启动。

## 验收清单

- `npm.cmd run icon:sync` 输出每一步结果，失败时有明确错误。
- `npm.cmd run icon:fix-taskbar` 可修补 `D:\Program Files\lpp-pc-client\LPP 客服客户端.exe`。
- `npm.cmd run icon:verify` 生成 `tmp/packaged-exe-icon.png` 和 `tmp/installed-exe-icon.png`。
- `tmp/packaged-exe-icon.png` 是当前期望图标。
- `tmp/installed-exe-icon.png` 是当前期望图标。
- 从桌面快捷方式打开时，当前运行进程是 `D:\Program Files\lpp-pc-client\LPP 客服客户端.exe`。
- 任务栏、窗口、托盘、通知图标在清理 Windows 图标缓存后显示一致。
