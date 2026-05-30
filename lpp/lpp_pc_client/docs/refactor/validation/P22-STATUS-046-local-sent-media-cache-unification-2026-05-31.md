# P22-STATUS-046 Local Sent Media Cache Unification 验证记录

日期：2026-05-31

## 范围

统一 PC 端本机发送媒体的本地缓存与打开模型：选择文件走 preload 派生真实路径后由 main 复制到 app 管理缓存；粘贴文件无路径时走 bytes 物化；图片、视频、普通文件发送成功后通过 `localOpenUrl` 优先打开本机缓存，服务端 URL 仅作为跨设备、历史消息和缓存缺失兜底。

## 风险边界

- 涉及：Electron preload/main IPC 内部参数、main 本地媒体缓存、renderer 媒体发送模型、消息媒体 normalizer、文件/视频打开策略、诊断和测试。
- 未涉及：服务端 API DTO、React Query query key、Gateway event、Zustand persist key、新依赖、播放器技术替换。
- renderer 仍只能调用 `desktopApi.cacheLocalMediaFile(payload, file)`，不能直接传任意本地路径；路径只由 preload 的 `webUtils.getPathForFile(file)` 派生。

## 关键结论

1. `localPreviewUrl` 只负责消息卡片视觉预览，可继续使用 `blob:`。
2. `localOpenUrl` 只负责本机稳定打开源，成功缓存后写入 app cache `file://`。
3. 选择文件有系统路径时复制原文件；粘贴文件无系统路径时把 `File.arrayBuffer()` 作为 bytes 写入同一套 `Images/Videos/Files` 目录。
4. 文件卡片和视频播放器打开链路均优先 `localOpenUrl`，再回退服务端 URL；`blob:` 不作为长期打开源。
5. 上传 payload 继续清洗 `blob:/file:/localOpenUrl` 等本地字段，不污染服务端媒体体。

## 验证命令

- `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/media-storage.spec.ts tests/unit/media-message.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/send-outbox.spec.ts tests/unit/desktop-file-handlers.spec.ts`：通过，6 files / 46 tests。
- `npm run build:electron`：通过。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、架构/IPC 单测、docs check、P19 audit、shape lint。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收建议

- 选择本地图片、视频、普通文件发送成功后，点击应优先从 app cache 打开。
- 复制粘贴图片/文件发送成功后，点击也应从 app cache 打开，不依赖 OS 临时目录或 `blob:`。
- 断网或远端 URL 暂不可访问时，自己刚发送且已缓存成功的媒体仍应可打开。
- 历史消息、别人发来的消息和缓存缺失场景仍走远端下载缓存兜底。

## 后续关注

- outbox 恢复时，如果缓存任务尚未完成就中断，仍依赖恢复出的 File Blob 重新发送；成功缓存后会重新写入 `localOpenUrl`。
- 若未来要跨重启保留更多失败/暂停消息的本地打开能力，可在 outbox record 中显式保存已验证存在的 `localOpenUrl` 可用性状态。
