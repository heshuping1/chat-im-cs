# P24-BRAND-003 Premium IM Service App Icon 验证记录

## 背景

用户在 Dock 截图中指出中间绿色气泡应用 logo 仍不够高级。复查确认 P24-BRAND-002 已闭环图标生效链路，但当前图标小尺寸下仍有硬白底、内部地球线与表情点过碎、气泡轮廓不够强的问题，容易显得像贴图而非系统级 App Icon。

## 风险边界

- 涉及：应用图标视觉资产、Windows `.ico`、macOS `.icns`、web favicon、多尺寸视觉验收图、单测和任务矩阵。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload/main contract、Zustand persist key、新依赖、技术栈替换。
- 本轮不改变应用名称、产品名、图标引用路径和打包配置。

## 实现摘要

- 保留“绿色会话 + 全球沟通”的品牌识别，重绘 `assets/app-icon-startlink.png` 为小尺寸优先的圆角方形系统图标。
- 去掉旧图标的大面积硬白底与过多表情/点阵细节，改为低饱和 emerald 绿、简化气泡轮廓、少量经纬线和客服在线感知点。
- 同步更新 `public/app-icon-startlink.png`、`assets/app-icon-startlink.ico` 与 `assets/app-icon-startlink.icns`，保持浏览器、Windows、macOS 使用同一视觉源。
- 新增 `docs/refactor/validation/P24-BRAND-003-app-icon-size-preview.png`，用于 16/32/64/128/256px 小尺寸验收，避免只看大图通过。
- 扩展 `app-brand-assets.spec.ts`，验证 canonical PNG、favicon PNG 与多尺寸验收图的尺寸和存在性。

## 验证

- `file assets/app-icon-startlink.png assets/app-icon-startlink.ico assets/app-icon-startlink.icns public/app-icon-startlink.png docs/refactor/validation/P24-BRAND-003-app-icon-size-preview.png`：通过，PNG/ICO/ICNS 均可识别。
- `sips -g pixelWidth -g pixelHeight assets/app-icon-startlink.png public/app-icon-startlink.png docs/refactor/validation/P24-BRAND-003-app-icon-size-preview.png`：通过，canonical 与 favicon 为 1254x1254，验收图为 1180x420。
- `sips -g pixelWidth -g pixelHeight assets/app-icon-startlink.icns`：通过，macOS 图标最大尺寸为 1024x1024。
- `npx vitest run tests/unit/app-brand-assets.spec.ts`：通过，4 tests。
- `npm run build`：通过，renderer 和 Electron main 构建成功。
- `npm run build:electron`：通过。
- `npm run check:quick`：通过，包含 typecheck、Electron typecheck、core lint、hooks lint、架构边界、IPC validation、docs check、P19 audit 和 shape lint。
- `npm run docs:check`：通过。
- `git diff --check`：通过。
- 视觉验收图已覆盖 16/32/64/128/256px，确认小尺寸下图标主体仍可识别。

## 手工验收注意

1. `localhost:5173` 页签图标可能受浏览器 favicon 缓存影响，需要强刷或清理缓存。
2. Electron Dock 图标需要完全重启 Electron 进程；只刷新 renderer 不会更新 Dock/App 图标。
3. Windows 安装包、快捷方式和卸载器图标需要重新打包并重装，旧快捷方式可能受系统图标缓存影响。
4. macOS `.app` / Dock 图标需要重新生成打包产物后验证。
