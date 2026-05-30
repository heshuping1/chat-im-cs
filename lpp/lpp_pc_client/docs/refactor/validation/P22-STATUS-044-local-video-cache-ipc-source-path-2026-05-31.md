# P22-STATUS-044 Local Sent Video Cache IPC Arg Preservation 验证记录

## 背景

本机发送成功的视频消息点击后仍提示“打开失败”。日志显示 `cache_local_video` 连续失败，原因是 `desktop:cache-local-media-file` 返回“本地媒体文件不可用”。排查确认 preload 已按安全边界通过 `webUtils.getPathForFile(file)` 派生本地源路径，但 main 通用 IPC 校验层只保留 `payload`，把第二个 `sourcePath` 参数丢弃，导致本地视频缓存直开链路失效。

## 风险边界

- 涉及：Electron IPC main validation、桌面文件 handler、本地媒体缓存失败诊断、单测和文档。
- 不涉及：公开 `desktopApi.cacheLocalMediaFile(payload, file)` contract、API DTO、React Query query key、Gateway event、Zustand persist key、新依赖、技术替换、删除旧链路或扩大公共抽象。

## 改动摘要

- 新增 `validateDesktopIpcCall` 作为 main-only IPC 校验入口；普通 renderer/preload 校验继续使用 `validateDesktopApiCall`。
- `cacheLocalMediaFile` 的 main IPC 校验保留 preload 派生的第二个 `sourcePath` 参数，同时继续清洗 payload 内伪造的 `sourcePath` 字段。
- `main.ts` 的 IPC handler 改用 main-only 校验入口，避免安全派生参数再次被通用校验吞掉。
- 本地媒体缓存失败诊断新增 `media.local_cache_failed`，只记录 `source_path_missing/source_file_unavailable` 原因，不记录完整本地路径。

## 验证

- TDD 红灯：新增 `validateDesktopIpcCall` 断言后，旧实现失败为 `validateDesktopIpcCall is not a function`，证明覆盖了 main IPC 缺少参数保留入口的问题。
- `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/desktop-file-handlers.spec.ts tests/unit/media-storage.spec.ts`：通过，3 files / 14 tests passed。
- `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/desktop-file-handlers.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，4 files / 18 tests passed。
- `npm run build:electron`：通过。
- `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/desktop-file-handlers.spec.ts tests/unit/media-storage.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/media-message.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过，6 files / 36 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 本机发送视频后，`cache_local_video` 不应再因 IPC 参数丢失报“本地媒体文件不可用”。
- 发送成功消息的 `body.video.localPreviewUrl` 应保留为 app cache 下的 `file://`。
- 点击自己刚发送成功的视频应直开本地缓存播放器；远端/历史视频仍走原有远端下载缓存兜底。
