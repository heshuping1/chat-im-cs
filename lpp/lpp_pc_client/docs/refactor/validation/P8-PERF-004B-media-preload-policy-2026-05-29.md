# P8-PERF-004B Media Preload Policy

日期：2026-05-29

## 修改范围

- 新增 `src/renderer/media/runtime/mediaPerformancePolicy.ts`。
- `VideoMessagePreview` 使用 `videoPreviewPreloadMode`：
  - 未播放：`metadata`
  - 已播放或正在播放：`auto`

## 设计理由

- 未播放的视频只需要时长、尺寸和 poster，不应该在长列表中默认拉取完整视频。
- 播放后切回 `auto`，保留用户继续观看时的流畅性。
- 策略函数独立可测，后续可扩展弱网、移动网络或用户设置。
