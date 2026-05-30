# P22-STATUS-037 Video Player File Document Host 验证记录

## 背景

用户提供真实样本 `/Users/eric/Documents/chat/tmp/20260530-144935.mp4`，并指出“本质是 Web，然后 Electron 包装，Web 能播放为什么 Electron 不能播放”。排查后确认样本不是 HEVC/H.265，而是常规 H.264/AAC MP4；Electron 失败原因不是 codec，而是播放器窗口用 `data:text/html` 承载 HTML 后加载 `file://` 视频，被 Electron URL safety check 拒绝。

## 样本证据

- `file /Users/eric/Documents/chat/tmp/20260530-144935.mp4`：ISO Media / MP4 Base Media。
- MP4 box 解析：`ftyp isom`，视频 `avc1`，音频 `mp4a`，`Lavf58.20.100`。
- `avcC profile=77 level=42`，分辨率由 Electron 探针读取为 720x1280，时长 17.995s。
- Electron `data:text/html` 探针失败：`MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check`。
- Electron `file://` HTML 探针成功：`loadedmetadata` 与 `canplay`，`readyState=4`，`error=null`。

## 风险边界

- 涉及：Electron main 播放器窗口 HTML 承载方式、`dist/main/*` 构建产物。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、技术替换、删除旧链路、扩大公共抽象。
- 本轮不引入 mpv/libmpv，不改变播放器 IPC payload。

## 改动摘要

- 新增 main 私有 `video-player-document`，把播放器 HTML 写入 `app.getPath('userData')/LPP Player/` 临时 HTML 文件。
- `openVideoPlayerWindow` 改为加载该 `file://` HTML，不再使用 `data:text/html`。
- 播放器窗口关闭后异步清理临时 HTML。
- 保留现有封面、缓存后台注入、失败态、下载、倍速和系统播放器兜底能力。

## 验证

- `npx vitest run tests/unit/video-player-document.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts`：通过，3 files / 8 tests passed。
- `npm run build:electron`：通过，`dist/main/*` 已同步。
- `npx vitest run tests/unit/video-player-document.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，5 files / 12 tests passed。
- `npm run docs:check`：通过，refactor docs ok。
- `git diff --check`：通过。
- `rg -n "data:text/html|createVideoPlayerDocument|loadURL\\(playerDocument.fileUrl\\)" dist/main/video-player-window.js dist/main/video-player-document.js src/main/video-player-window.ts src/main/video-player-document.ts`：通过，source/dist 均加载 file document，`dist/main/video-player-window.js` 不再包含 `data:text/html`。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、architecture/desktop API 单测、docs check、P19 audit 和 shape check。
- Electron 最小探针：
  - `data:text/html` 承载：失败，URL safety check。
  - `file://` HTML 承载：成功，`loadedmetadata/canplay`。

## 手工验收提示

该修复改动 Electron main/window 和 `dist/main/*`，需要完全重启 PC 客户端后复测，`Command+Shift+R` 不足以更新播放器窗口承载方式。
