# P20-FEAT-001 Video Thumbnail Upload Validation

日期：2026-05-30

任务：P20-FEAT-001

## 目标

视频消息发送时，客户端必须本地生成 JPEG 首帧封面，再把封面图片作为独立媒体上传，最后把封面上传响应的 `url` 写入 `body.video.thumbnailUrl`。视频本地乐观消息、上传中、暂停、失败、取消和成功态都必须保留消息并优先显示封面；上传中展示微信式封面卡片、暗色遮罩、中央圆形进度/暂停控件，上传完成前禁止播放。

## 修改范围

- `src/renderer/media/runtime/videoPosterMedia.ts`
  - 新增 `uploadVideoPosterForSend`，统一等待视频 poster 生成并上传封面图片。
  - 新增 `sanitizeVideoSendPayload`，发送前只保留服务端接受的媒体字段，过滤 `localPreviewUrl`、`localPosterUrl`、`posterUrl`、`blob:` 和 `data:` 本地展示值。
  - 新增 `localMediaResourceForSend`，本地视频消息创建时立即写入 `thumbnailUrl/posterUrl/localPosterUrl`，避免上传前和失败态黑屏。
  - 新增 `requireVideoSendPayload`，发送前要求视频远程 `url` 和远程 `thumbnailUrl` 同时存在，缺失时只置本地失败，不调用发送 API。
  - `durationSeconds/width/height/sizeBytes` 发送前规整为非负整数，避免浮点视频时长触发服务端 400。
  - 新增 `videoSendDiagnosticsContext`，发送失败日志记录脱敏诊断：status、code、requestId、messageKind、hasVideoUrl、hasThumbnailUrl、durationSecondsType。
- `src/renderer/media/runtime/uploadState.ts`
  - 新增 `videoUploadOverlayState`，把 `queued/uploading/paused/failed/canceled/sent` 映射为视频卡片上传覆盖态、可播放状态和暂停/继续/重试动作。
- `src/renderer/media/components/VideoMessagePreview.tsx`
  - 增加视频上传覆盖层 props，上传中显示封面、暗色遮罩、中央圆形进度/暂停控件；上传完成后恢复普通播放按钮。
- `src/renderer/styles/messages/message-media-content.css`
  - 增加视频上传覆盖层样式，使用 CSS 变量承载进度环角度，保持右下角时长可见。
  - 精修视频卡片为封面主体、圆角、底部柔和暗色遮罩、中央白色圆形控件，竖视频按真实比例约束卡片尺寸。
- `src/renderer/messages/components/message-content/MessageMediaParts.tsx`
  - 视频上传未完成时阻断播放器入口，中央圆形控件转为暂停/继续/重试动作；上传完成后才允许打开播放器。
  - 按视频宽高计算卡片比例，避免竖视频被强制压成横向黑框。
  - 视频播放器打开失败时，不再直接停在“打开失败”；如果 Electron 下载/缓存远程视频失败，会退回当前可见视频源打开，优先保证用户能播放。
- `src/renderer/lib/videoPoster.ts`
  - 发送封面生成策略改为先抓本地视频第一帧；只有第一帧抓取失败时，才退到早期 fallback 帧。
- `src/renderer/media/runtime/videoPosterRuntime.ts`
  - 展示侧本地 poster 生成策略同步改为先抓第一帧，避免发送封面和展示封面取帧位置不一致。
- `src/renderer/messages/models/messageCacheMutationModel.ts`
  - 本地消息 patch 支持同步更新 `body`，重试时可把后补生成的本地封面写回原失败消息。
- `src/renderer/data/customer-service/cs-cache-adapter.ts`
  - 客服本地消息 patch 支持同步更新 `body`，普通 IM 和客服都能复用同一失败保留/重试路径。
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
  - 普通 IM 选择视频后先生成本地封面，再创建本地乐观消息；封面生成失败时消息保留为 failed，不调用上传或发送 API。
  - 普通 IM 视频发送复用 `uploadVideoPosterForSend`，不再用短超时跳过封面上传。
  - 发送服务端 payload 时复用 `requireVideoSendPayload`，本地展示字段只保留在本地消息缓存。
  - 上传失败、封面上传失败和发送 API 失败都只 patch 原本地消息为 failed，不删除消息。
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
  - 在线客服视频发送复用同一封面上传 helper 和 payload 强校验。
  - 在线客服视频发送服务端 payload 同步清洗本地展示字段。
  - 上传失败、封面上传失败和发送 API 失败都保留原本地消息，并继续提供重试入口。
- `tests/unit/video-poster-runtime.spec.ts`
  - 覆盖慢速 poster 生成时仍等待并上传封面、`thumbnailUrl` 使用封面上传响应 `url`、发送 payload 不包含本地展示字段、本地视频消息立即带本地封面、浮点时长规整为整数、缺远程封面时拒绝发送。
- `tests/unit/upload-state.spec.ts`
  - 覆盖微信式视频上传覆盖态：上传中暂停、暂停中继续、失败重试、取消/上传完成前不可播放。

## 边界确认

- 不新增依赖。
- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不删除旧链路，不扩大公共抽象。

## 验证命令

```bash
npx vitest run tests/unit/video-poster-runtime.spec.ts tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-composer-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/cs-cache-adapter.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

## 结果

通过。新增测试先出现 RED：`uploadVideoPosterForSend is not a function`、`videoUploadOverlayState is not a function`；实现后 `video-poster-runtime.spec.ts`、`upload-state.spec.ts`、媒体/消息专项、IM/客服本地消息 patch 专项、`check:quick`、`build`、`docs:check`、`p10:audit`、`p12:audit`、`p19:audit` 和 `git diff --check` 均通过。

补充验证结论：

1. 黑屏原因已从数据链路上处理：普通 IM 和客服视频本地消息在进入列表前先生成本地 JPEG 首帧，并同步写入 `thumbnailUrl/posterUrl/localPosterUrl`。
2. 发送失败的高概率原因已处理：服务端视频 payload 中的 `durationSeconds/width/height/sizeBytes` 不再携带浮点值，且发送前强制要求远程视频 URL 和远程封面 URL，缺失则本地失败并保留消息。
3. 失败/取消闭环已处理：上传失败、封面上传失败、发送 API 失败、取消都不会 remove local message；成功时才用服务端消息替换本地消息。
4. 诊断闭环已增强：视频发送失败日志携带脱敏的 `hasVideoUrl`、`hasThumbnailUrl`、`durationSecondsType`、`status/code/requestId/path`，便于继续定位 400。
5. `npm run build` 通过；构建期间仅出现 `@microsoft/signalr` 包内 PURE 注释提示，非本次代码错误。
6. “同一个视频封面不同”的原因已确认：此前客户端按早期时间点抓帧，不是严格首帧；现在发送侧和展示侧都先取第一帧，和“JPEG 首帧封面”的产品口径一致。
7. “打开失败”的高概率原因已确认：Electron 视频播放器只接受可下载/可缓存的远程或本地文件地址；当当前消息仍保留 `blob:` 本地预览或远程缓存失败时会失败。现在已增加可见视频源 fallback。
