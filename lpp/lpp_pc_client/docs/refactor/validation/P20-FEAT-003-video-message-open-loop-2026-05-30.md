# P20-FEAT-003 视频消息打开失败与上传控件闭环验证

日期：2026-05-30

## 任务信息

- 任务编号：P20-FEAT-003
- 模块：Media Video Player
- 风险等级：P1
- 验收等级：L2
- 状态：已完成

## 修改范围

- `src/renderer/media/runtime/videoPlayer.ts`
- `src/renderer/media/runtime/uploadState.ts`
- `src/renderer/media/runtime/videoPosterRuntime.ts`
- `src/renderer/media/components/VideoMessagePreview.tsx`
- `src/renderer/styles/messages/message-media-content.css`
- `src/main/video-player-template.ts`
- `src/main/media-storage.ts`
- `src/main/runtime-diagnostics.ts`
- `src/main/main.ts`
- `tests/unit/video-player-runtime.spec.ts`
- `tests/unit/electron-template.spec.ts`
- `tests/unit/upload-state.spec.ts`
- `tests/unit/electron-runtime-diagnostics.spec.ts`

## 根因与处理

- 根因 1：消息卡片已可展示的当前视频源和桌面播放器实际打开源存在优先级差异；播放器会优先使用 `remoteSrc`，导致卡片可见但打开窗口可能拿到旧远端源、鉴权失败或不可播文件。
- 处理：桌面播放器优先使用当前可传给主进程缓存的 `displaySrc`，`blob:` 不可跨进程时再回退 `remoteSrc`。
- 根因 2：播放器模板只有 `video.onerror -> video.load()` 的简单失败逻辑，用户点击重试时容易形成反复闪烁/刷新感。
- 处理：模板增加 `loading/ready/failed/unsupported` 状态机，失败后保留封面，重试是一次明确动作，并提供系统播放器兜底。
- 根因 3：上传队列态被规整为 `0% + pause`，视觉上像已经开始上传且可以暂停。
- 处理：队列态不再伪造进度；上传圆环改为 SVG stroke 进度，未知进度才使用轻量 indeterminate 圆弧。

## 边界确认

- 未改变 API DTO wire shape。
- 未改变 React Query query key。
- 未改变 Gateway event。
- 未改变 Electron IPC/preload/main contract；仅复用已有 `openVideoPlayer/openMediaFile/saveMediaAs` 能力。
- 未改变 Zustand persist key。
- 未新增依赖。
- 未删除核心旧链路。

## 诊断证据

- `media-storage` 在媒体缓存失败时记录 `media.cache_failed` 到 electron-runtime 诊断，包含脱敏后的 kind、urlType、fileName、accountId、conversationId 和错误摘要。
- HTTP 下载失败错误保留 HTTP status 与 content-type，便于区分鉴权 JSON、空文件、不可下载文件和本地不可播问题。

## 已执行验证

```bash
npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/upload-state.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```

结果：通过，13 tests passed。

## 待执行人工验证

- 单进程下点击已发送视频，播放器不再持续刷新。
- 可播视频可正常打开播放。
- 下载失败、鉴权失败或格式不支持时，播放器稳定显示失败态并保留封面。
- 上传中、暂停中、失败态的圆形控件视觉清晰，上传完成前不能播放。
