# P22-STATUS-041 Video Player Opening State Polish 验证记录

## 背景

本机上传视频已经具备本地缓存直开能力，但点击后的原视频窗口仍会在正常准备阶段露出偏工程化的 loading 弹层、系统播放器兜底按钮和 `00:00 / 00:00` 控制条，容易让用户误以为播放失败。专业 IM 的目标是：本地视频秒开，慢机只出现克制准备态，真实失败时才给明确兜底。

## 风险边界

- 涉及：Electron main 播放器模板、`dist/main/*` 构建产物、播放器模板单测。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、播放器技术替换、删除旧链路、扩大公共抽象。
- `openVideoPlayer` payload contract、P22-040 本机发送视频本地缓存直开策略保持不变。

## 改动摘要

- `loading` 初始不立即展示大弹层，延迟 320ms 后才展示轻量“视频打开中”状态。
- `loading` 阶段隐藏“重试 / 用系统播放器打开”等主操作，避免正常准备期出现失败暗示。
- ready 前隐藏并禁用底部控制条，避免误导性的 `00:00 / 00:00`。
- `loadedmetadata/canplay` 后进入 ready 并恢复控制条；自动播放失败进入 `gesture` 状态，只显示居中“播放”按钮，不误判为加载失败。
- `failed/unsupported` 继续保留明确文案与系统播放器兜底。

## 验证

- TDD 红灯：新增 opening state 单测后，旧模板缺少延迟 loading、gesture 状态和 ready 前控制条隐藏，按预期失败。
- `npx vitest run tests/unit/electron-template.spec.ts`：通过，1 file / 8 tests passed。
- `npm run build:electron`：通过，`dist/main/video-player-template.js` 已包含 P22-041 模板逻辑。
- `rg -n "loadingChromeDelayMs|showLoadingChrome|setPlayerState\\('gesture'|video-wrap:not\\(\\.ready\\)|视频打开中|视频加载中|&#35270;&#39057;&#25171;&#24320;&#20013;|&#35270;&#39057;&#21152;&#36733;&#20013;" src/main/video-player-template.ts dist/main/video-player-template.js tests/unit/electron-template.spec.ts`：通过，source/test/dist 均包含新打开态逻辑，旧初始 loading 文案实体未命中。
- `npx vitest run tests/unit/electron-template.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/video-player-document.spec.ts tests/unit/media-storage.spec.ts`：通过，4 files / 16 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。
- `npm run dev`：已完全重启开发态 Electron，Vite 运行在 `http://127.0.0.1:5173/`，Electron 主进程已重新加载 `dist/main`。

## 手工验收提示

- 本次修改 Electron main/template 与 `dist/main/*`，复测前必须完全重启 PC 客户端。
- 本地上传视频发送成功后点击，窗口应快速进入播放；大视频或慢机器超过约 320ms 才出现克制“视频打开中”。
- 正常准备阶段不应显示“用系统播放器打开”；真实失败或编码不支持时才出现兜底。
