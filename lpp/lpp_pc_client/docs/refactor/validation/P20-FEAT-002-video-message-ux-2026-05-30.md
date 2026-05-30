# P20-FEAT-002 Video Message UX Validation

日期：2026-05-30

任务：P20-FEAT-002

## 变更范围

- `src/renderer/media/components/VideoMessagePreview.tsx`
- `src/renderer/messages/components/message-content/MessageMediaParts.tsx`
- `src/renderer/media/runtime/uploadState.ts`
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
- `src/renderer/messages/models/messageDisplayModel.ts`
- `src/renderer/styles/messages/message-media-content.css`
- `tests/unit/upload-state.spec.ts`

## 结论

1. 视频源加载失败或打开失败时不再丢封面；只要消息里有 `thumbnailUrl/posterUrl/localPosterUrl`，视频卡片仍以封面为主体展示。
2. 上传完成前仍不可播放；失败态中央控件改为重试图标，状态文案缩短为“发送失败，点击重试”，底部消息状态只显示“发送失败”，避免长错误破坏气泡视觉。
3. 发送诊断新增 `failureStage`，可区分 `upload`、`poster_upload`、`send`，并继续保留视频 URL、封面 URL、duration 类型、status/code/requestId/path 等脱敏上下文。
4. Electron 视频播放器打开失败时在当前卡片显示“打开失败”，不再盲目打开浏览器 fallback；浏览器 fallback 仅在没有桌面播放器能力时使用。

## 边界

- 未改变 API DTO wire shape。
- 未改变 React Query query key。
- 未改变 Gateway event。
- 未改变 Electron IPC/preload/main contract。
- 未改变 Zustand persist key。
- 未新增依赖。
- 未删除旧链路或扩大公共抽象。

## 验证命令

```bash
npx vitest run tests/unit/message-display-model.spec.ts tests/unit/video-poster-runtime.spec.ts tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-composer-model.spec.ts tests/unit/message-domain.spec.ts
```

结果：通过，6 个测试文件、34 个测试通过。

## 待人工确认

- 真实账号仍返回“当前账号没有权限执行此操作”时，优先导出 diagnostics，查看 `send` 诊断里的 `failureStage/status/code/requestId/path`。如果 `failureStage=send` 且 `status=403`，高概率是服务端判定当前账号不是会话成员、群禁言或租户权限问题，前端应保留失败消息并允许重试，但不能伪造成功。
