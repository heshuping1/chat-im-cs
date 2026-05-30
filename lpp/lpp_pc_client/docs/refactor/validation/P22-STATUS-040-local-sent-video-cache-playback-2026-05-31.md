# P22-STATUS-040 Local Sent Video Cache Playback 验证记录

## 背景

PC 端自己刚发送的视频不应在点击播放时再依赖服务端 URL 下载。专业 IM 的预期是：用户选择了本地视频，发送成功后应优先用本机缓存直开；远端 URL 只用于历史消息、跨设备消息或本地缓存失败后的兜底。

## 风险边界

- 涉及：Electron IPC/preload/main、renderer IM/客服视频发送链路、播放器打开源优先级。
- 不涉及：API DTO、React Query query key、Gateway event、Zustand persist key、新依赖、播放器技术替换、删除旧链路。
- `openVideoPlayer` payload contract 保持不变；新增能力是独立窄 IPC `cacheLocalMediaFile`。

## 改动摘要

- preload 新增 `cacheLocalMediaFile(payload, file)`，通过 Electron `webUtils.getPathForFile(file)` 获取用户选择文件路径；renderer 不能直接提交 source path。
- main 新增本地媒体复制缓存能力，将 preload 派生的源文件复制进既有 `LPP Files/{account}/{conversation}/Videos/{month}` 缓存目录，并返回 `filePath/fileUrl`。
- IM 与在线客服发送视频时后台缓存本地文件；缓存成功后将本地乐观消息和发送成功消息的 `localPreviewUrl` 升级为稳定 `file://`。
- 播放打开时优先使用本地 `file://` display source；没有本机缓存时再使用服务端 `remoteSrc` 下载缓存。
- 本地缓存失败不阻断发送，只写入 send diagnostics，并继续使用远端兜底链路。

## 验证

- TDD 红灯：新增 IPC whitelist、main 本地复制缓存、播放器本地 file 优先测试后，旧逻辑按预期失败。
- `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/media-storage.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/media-message.spec.ts tests/unit/send-outbox.spec.ts`：通过，5 files / 32 tests passed。
- `npm run build:electron`：通过，`dist/main`、`dist/preload`、`dist/shared` 已包含 `cacheLocalMediaFile`。
- `rg -n "cacheLocalMediaFile|cache-local-media-file|getPathForFile|cacheLocalVideoFileForDesktop|localCachedPreviewPromise" src dist tests/unit`：通过，source/test/dist 均包含关键逻辑。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 本次新增 preload/main IPC，复测前必须完全重启 PC 客户端。
- 发送 `chat/tmp/IMG_1316.MP4` 或 `chat/tmp/Lark20260531-030618.mp4` 后，发送成功点击视频应直接打开并自动播放。
- 临时断开远端资源时，自己刚发送且已本地缓存成功的视频应仍可打开。
