# 验证记录：P4-MSG-004A Media Model 盘点

日期：2026-05-29
任务编号：P4-MSG-004A
状态：已完成

## 目标

盘点图片、视频、文件、截图、联系人卡片的消息表达，为统一 media message entity 和 preview adapter 做依据。

## 当前模型来源

| 来源 | 文件 | 说明 |
| --- | --- | --- |
| API 媒体资源 | `src/renderer/data/api/types.ts` | `MediaResourceDto`：url、fileName、mimeType、sizeBytes、width、height、durationSeconds、thumbnailUrl。 |
| 消息内容解析 | `src/renderer/data/im-message-normalize.ts` | `NormalizedMessagePart` 已覆盖 text/markdown/image/file/voice/video/location/contact/call/event。 |
| 媒体 domain | `src/renderer/media/domain/mediaMessage.ts` | `ImMediaItem`、open/copy/save payload、video player payload。 |
| 消息渲染 | `MessageBodyView.tsx` | 根据 `NormalizedMessagePart` 分派 Image/File/Voice/Video/Location/Contact/Call。 |
| 气泡容器 | `ChatMessageBubble.tsx` | 仍直接接收 `MessageItemDto`。 |
| 发送本地预览 | `MessageCenter.tsx`、`ChatWorkspace.tsx` | 构造 localPreviewUrl、localPosterUrl、uploadProgress、localTaskId。 |
| 桌面动作 | `media/runtime/desktopMediaActions.ts` | save/copy/open/reveal/download，Windows/macOS 都要靠 preload 能力。 |

## 媒体类型表达

| 类型 | body 字段 | 当前展示 | 当前动作 |
| --- | --- | --- | --- |
| 图片 | `image/images/picture/photo/imageUrl` | `ImageMessageFrame`，支持缓存和预览 | 复制图片、另存、打开、显示文件夹、编辑 |
| 视频 | `video/videoUrl` | `VideoMessagePreview`，支持 poster/localPoster | 打开播放器、另存、显示文件夹 |
| 文件 | `file/files/attachment/fileUrl` | `FileMessageCard` | 复制路径/文件、另存、打开、显示文件夹 |
| 语音 | `voice/audio/audioUrl` | `VoicePart` | 语音转文字入口在 MessageCenter |
| 截图 | composer 产生 `File` -> image message | 本质是 image，本地 preview 用 data/blob | 走图片发送/预览链路 |
| 联系人卡片 | `contact/contactCard/contact_card/nameCard/businessCard` | `ContactPart` | 点击打开资料浮层 |
| 位置 | `location/locationMessage` | `LocationPart` | 当前展示为位置卡 |
| 通话记录 | `callLog/call_log/call` | `CallPart` | 当前展示为通话卡 |

## 当前已具备的公共能力

- `normalizeMessageParts` 已是内容解析中心，不需要重写解析器。
- `normalizeMediaPart` 已可产出 `ImMediaItem`，覆盖 url、fileName、localPreview、poster、imageCacheKey。
- `messageMediaActionPayload` 和 `messageVideoPlayerPayload` 已统一桌面媒体动作输入。
- `uploadState.ts` 已把 `status/uploadProgress/localError/localTaskId` 映射为上传 UI 状态。
- 图片预缓存、视频 poster、桌面下载/复制/打开能力已经模块化。

## 主要问题

1. `ImMediaItem` 名称偏 IM，但客服也复用，后续应改为中性 `ChatMediaItem` 或导出别名。
2. `MessageBodyView` 仍直接消费 `MessageItemDto`，未接 P4 新增 `ChatMessageEntity`。
3. `MessageCenter` 和 `ChatWorkspace` 各自构造 local media、poster、preview、patch，重复明显。
4. 联系人卡片解析在 `im-message-normalize`，资料浮层构造在 `MessageCenter`，后续应抽成 shared contact-card adapter。
5. 截图本质是 image，但发送侧和普通图片上传的入口仍分散在 composer/page。

## 推荐 P4-MSG-004B 切入

1. 在 `media/domain/mediaMessage.ts` 增加中性类型别名：`ChatMediaKind/ChatMediaItem`，保留旧 `ImMedia*` 兼容。
2. 新增 `chatMediaItemsFromMessage(message, assetBaseUrl)`，统一从消息得到可渲染媒体列表。
3. 不改 UI 组件行为，先让 `MessageBodyView` 或测试使用新 adapter。
4. 对 screenshot/contact card 暂不合并发送链路，先明确它们是 image/contact content adapter。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `sed -n '1,260p' src/renderer/media/domain/mediaMessage.ts` | 通过 |
| `sed -n '1,260p' src/renderer/components/MessageBodyView.tsx` | 通过 |
| `rg -n "image\|video\|file\|voice\|screenshot\|contactCard\|localPreviewUrl\|MediaResourceDto" src/renderer -g '*.ts' -g '*.tsx'` | 通过 |

## 结论

P4-MSG-004A 已完成。媒体能力已有较好基础，后续应以命名中性化和 adapter 收敛为主，不重造媒体解析轮子。
