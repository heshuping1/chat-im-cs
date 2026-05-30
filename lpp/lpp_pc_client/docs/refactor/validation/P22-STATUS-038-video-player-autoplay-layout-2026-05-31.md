# P22-STATUS-038 Video Player Autoplay Layout 验证记录

## 背景

P22-STATUS-037 修复后，真实 H.264/AAC MP4 已能在 Electron 内置播放器中播放。用户继续提出：点击聊天视频后，原视频窗口应默认播放，而不是再点击播放；同时窗口尺寸不应过度撑满屏幕，应更接近微信/客服 IM 的媒体查看器体验。

## 风险边界

- 涉及：Electron main/template、播放器窗口尺寸模型、`dist/main/*` 构建产物。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、技术替换、删除旧链路、扩大公共抽象。

## 改动摘要

- 播放器模板增加自动播放意图：用户点击聊天视频打开窗口后，视频在 `loadeddata/canplay` 后自动调用 `video.play()`。
- 自动播放被系统策略拒绝时只同步播放按钮状态，不进入失败态。
- 点击视频画面、底部播放按钮和空格键继续作为播放/暂停控制。
- 播放中控制条短暂显示，鼠标移动时再显示；暂停时保持可见。
- 新增 main 私有窗口尺寸模型，按竖屏、横屏、方形视频使用更克制的首屏尺寸，并保留小屏边界保护。

## 验证

- TDD 红灯：新增自动播放断言后，旧模板缺少 `shouldAutoplay/requestAutoplay`，按预期失败。
- `npx vitest run tests/unit/electron-template.spec.ts tests/unit/video-player-window-layout.spec.ts`：通过，2 files / 9 tests passed。
- `npx vitest run tests/unit/electron-template.spec.ts tests/unit/video-player-window-layout.spec.ts tests/unit/video-player-document.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，6 files / 16 tests passed。
- `npm run build:electron`：通过，`dist/main/*` 已同步。
- `rg -n "shouldAutoplay|requestAutoplay|createVideoPlayerWindowLayout|controls-visible" dist/main src/main tests/unit`：通过，source/test/dist 均包含自动播放与窗口尺寸策略关键逻辑。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 该修复改动 Electron main/template 和 `dist/main/*`，复测前必须完全重启 PC 客户端。
- 点击聊天视频后，原视频窗口应自动播放。
- 竖屏视频窗口应明显小于工作区满高，不再像审片工具一样贴满屏幕。
