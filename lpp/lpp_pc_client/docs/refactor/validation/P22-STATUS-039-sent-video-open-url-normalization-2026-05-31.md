# P22-STATUS-039 Sent Video Open URL Normalization 验证记录

## 背景

PC 端发送视频成功后，聊天卡片内联预览可显示，但点击原视频提示“打开失败”。本地 `chat/tmp` 样本已验证为 H.264/AAC，且项目同版本 Electron 可直接 `canplay/play`，因此问题不在编码格式。

## 风险边界

- 涉及：renderer 视频打开 runtime 的 URL 规整逻辑。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、技术替换、删除旧链路、扩大公共抽象。
- 不需要同步 `dist/main/*`：本次未修改 Electron main/template。

## 根因

发送后的消息会保留本地 `blob:` 预览，同时服务端视频地址可能是相对路径。renderer 内联 `<video>` 会按当前 web origin 解析相对地址，但 Electron main 侧缓存下载没有页面 origin，收到相对路径会进入“不支持的媒体地址”，导致卡片显示“打开失败”。

## 改动摘要

- `openDesktopVideoPlayer` 在调用 `desktopApi.openVideoPlayer` 前，将非 `data/http/file` 的视频 URL 按 `window.location.origin` 转为绝对 URL。
- 同步规整非 `blob:` poster URL，避免播放器临时 HTML 以 `file://` 加载时把相对封面解析到本地目录。
- 继续拒绝把 `blob:` 视频 URL 传给 Electron main，避免扩大桌面 IPC 能力边界。

## 验证

- TDD 红灯：新增“相对服务端视频和封面 URL 进入 Electron main 前必须绝对化”断言，旧逻辑按预期失败。
- `npx vitest run tests/unit/video-player-runtime.spec.ts`：通过，1 file / 3 tests passed。
- `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，4 files / 13 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。
