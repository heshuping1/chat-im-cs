# P22-STATUS-036 Video Player Server Source Priority 验证记录

## 背景

用户指出“本质是 Web，被 Electron 包装；Web 能播放，Electron 不应该不能播放”。复查历史代码发现桌面视频打开链路存在源选择回归：旧实现优先使用服务端媒体源 `remoteSrc`，当前实现优先使用当前预览源 `displaySrc`。如果 `remoteSrc` 是后端规整/转码后的可播资源，而 `displaySrc` 是原始或预览链路资源，就会出现“之前能播，现在 Electron 弹窗不能播”的体验。

## 风险边界

- 涉及：renderer 视频打开运行时的源选择策略。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload/main contract、Zustand persist key、新依赖、技术替换、删除旧链路、扩大公共抽象。
- 本轮不引入 mpv/libmpv，不新增播放器依赖。

## 改动摘要

- `openDesktopVideoPlayer` 恢复服务端视频源优先：`remoteSrc` 可达时优先传给 `openVideoPlayer`。
- `displaySrc` 保留为兜底：无服务端源或服务端源不可达时继续使用当前显示源。
- 目标是优先使用 IM 后端提供的稳定媒体资源，避免预览源绕开可能存在的后端转码/规整资源。

## 验证

- `npx vitest run tests/unit/video-player-runtime.spec.ts`：先 RED，确认旧逻辑仍优先打开 `displaySrc`。
- `npx vitest run tests/unit/video-player-runtime.spec.ts`：GREEN，2 tests passed。
- `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，4 files / 11 tests passed。
- `npm run docs:check`：通过，refactor docs ok。
- `git diff --check`：通过。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、architecture/desktop API 单测、docs check、P19 audit 和 shape check。

## 样本文件状态

用户提供的本地样本路径在当前环境均未能读取：

- `/Users/eric/Documents/chat/20260530-144935.mp4`
- `/Users/eric/Documents/chat/tmp/20260530-144935.mp4`
- `/Users/eric/Documents/tmp/20260530-144935.mp4`

其中 `/Users/eric/Documents/tmp` 在沙箱内和授权命令下均返回 `Operation not permitted`，疑似 macOS 隐私权限限制。本机当前也未发现 `ffprobe`、`mediainfo` 或 `exiftool`。因此本轮无法对该样本做 codec 实测；后续若样本文件移动到可读工作区或授权成功，应补充真实 codec、Chrome/Electron/系统播放器对比证据。
