# P24-BRAND-002 App Icon Asset Closure 验证记录

## 背景

用户提供的绿色气泡应用图片位于 Lark 缓存目录，但该路径不是 PC 客户端构建输入。排查确认仓库中已有同款 `assets/app-icon-green-bubble.png` 和 Windows `.ico`，但图标生效链路不完整：`index.html` 没有 favicon，打包配置没有 `mac.icon`，仓库没有 `.icns`，macOS Dock/应用包图标和浏览器页签不会可靠更新。

## 风险边界

- 涉及：应用图标资源、`package.json` 打包配置、`index.html` favicon、Electron main 开发态 Dock 图标、单测和文档。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、技术栈替换。
- 本轮不改变应用名称和产品名。

## 实现摘要

- 以 `assets/app-icon-green-bubble.png` 作为 canonical source，并复制为 `public/app-icon-green-bubble.png` 供 Vite dev/build favicon 使用。
- 保留 `assets/app-icon-green-bubble.ico` 作为 Windows 窗口、NSIS 安装器、卸载器和 extraResources 图标。
- 新增 `assets/app-icon-green-bubble.icns`，用于 macOS 应用包/Dock 图标。
- `package.json` 新增 `build.mac.icon = assets/app-icon-green-bubble.icns`，Windows/NSIS 配置继续指向 `.ico`。
- `index.html` 增加 `rel="icon"`。
- macOS 开发态通过 `app.dock?.setIcon(...)` 设置 Dock 图标；不影响 Windows。

## 验证

- TDD 红灯：新增 `app-brand-assets.spec.ts` 后，旧实现因缺少 ICNS、`mac.icon`、favicon 和 Dock 图标设置按预期失败。
- 绿灯验证：
  - `npx vitest run tests/unit/app-brand-assets.spec.ts`：通过，3 tests。
  - `npm run build`：通过；`dist/renderer/index.html` 已包含 favicon，`dist/renderer/app-icon-green-bubble.png` 已生成，`dist/main/main.js` 已包含 macOS dev Dock 图标设置。
  - `npm run build:electron`：通过。
  - `npm run check:quick`：通过，包含 typecheck、Electron typecheck、core lint、hooks lint、架构边界、IPC validation、docs check、P19 audit 和 shape lint。
  - `npm run docs:check`：通过。
  - `git diff --check`：通过。

## 手工验收注意

1. `localhost:5173` 页签图标需要刷新页面；浏览器可能缓存 favicon。
2. Electron main 图标变更需要完全重启 Electron 进程。
3. 安装包、桌面快捷方式、卸载器图标必须重新打包并重装；Windows 旧快捷方式和系统图标缓存可能需要重新创建快捷方式或清理缓存。
4. macOS `.app` / Dock 图标需要 macOS 打包产物重新生成后验证。
