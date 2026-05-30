# P22-STATUS-045 Local Video Open Source Decoupling 验证记录

## 背景

本机发送成功的视频仍偶发显示“打开失败”。复查确认 P22-044 后本地缓存已经成功，失败卡片的 `localPreviewUrl/src` 已是 app cache 下的 `file://`，且直接调用 `desktopApi.openVideoPlayer(file://...)` 可以成功打开。剩余问题在 renderer：消息卡片把 `file://` 当内联 `<video>` 预览源触发失败态，同时点击打开前会尝试把失效 `blob:` 封面转为 data URL，`fetch(blobPoster)` 失败后阻断播放器打开。

## 风险边界

- 涉及：renderer 视频卡片展示模型、桌面播放器打开 runtime、message-center 媒体打开诊断、单测和文档。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload/main contract、Zustand persist key、新依赖、技术替换、删除旧链路或扩大公共抽象。

## 改动摘要

- 将视频消息“内联预览源”和“桌面播放器打开源”解耦：本地 `file://` 缓存只作为 open source，不再挂到消息列表内联 `<video>`。
- `blob/http/https/data` 仍可作为卡片预览源；本地 file 卡片依赖封面、占位和播放按钮进入可点击 ready 态。
- `openDesktopVideoPlayer` 的封面解析改为 best-effort：失效 `blob:` poster 转换失败时记录诊断并继续打开视频，payload 不带坏 poster。
- 新增视频打开诊断：`video.open_attempt`、`video.open_success`、`video.open_failed`、`video.poster_ignored`，只记录 source/poster kind、是否本地缓存、是否有远端源和脱敏错误摘要。
- `message-center` 诊断对 reason/context 中的 `file://` 本地路径、远端 URL 和 bearer token 做脱敏，避免排障日志泄漏敏感信息。

## 验证

- TDD 红灯：新增 `video-player-runtime.spec.ts` 后，旧实现会因失效 `blob:` poster `Failed to fetch` 直接 reject，且缺少 `inlineVideoPreviewSrc`。
- TDD 红灯：新增 `media-message.spec.ts` 静态断言后，旧实现缺少 `openSrc/previewSrc` 分离和 `openable` 卡片状态。
- `npx vitest run tests/unit/message-center-diagnostics.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/media-message.spec.ts`：通过，3 files / 23 tests passed。
- `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/media-message.spec.ts tests/unit/video-poster-runtime.spec.ts tests/unit/message-center-diagnostics.spec.ts`：通过，4 files / 33 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 本机发送成功的视频消息应显示封面和播放按钮，不再因卡片内联 `<video>` 失败显示“视频加载中/打开失败”。
- 点击本地发送成功的视频应直接打开原视频播放器；失效 `blob:` 封面只会被忽略，不应阻断播放。
- 历史/别人发来的视频继续走远端下载缓存和播放器窗口兜底。
- 诊断可区分本地缓存成功但 poster 转换失败、真正 `openVideoPlayer` 失败、以及没有可打开源。
