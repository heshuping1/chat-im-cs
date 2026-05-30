# 验证记录：P4-MSG-004B Media Message Entity

日期：2026-05-29
任务编号：P4-MSG-004B
状态：已完成

## 目标

定义 media message entity 和 preview adapter，优先复用现有媒体能力，不重造解析器。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/media/domain/mediaMessage.ts` | 新增中性 `ChatMediaKind/ChatMediaItem`，保留 `ImMedia*` 兼容；新增 `chatMediaItemsFromMessage`。 |
| `tests/unit/media-message.spec.ts` | 覆盖从消息构建中性 media item。 |

## 设计策略

- `ChatMediaKind` 复用现有 `image/file/voice/video`。
- `ChatMediaItem` 兼容现有 `ImMediaItem` 字段：sourceUrl、remoteSourceUrl、localPreviewUrl、posterUrl、imageCacheKey。
- `chatMediaItemsFromMessage` 复用 `normalizeMessageParts` 和 `normalizeMediaPart`，不新增解析链路。
- 当前不改 UI 行为，后续 P4-MSG-004C 再替换渲染消费点。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/media-message.spec.ts tests/unit/composer-screenshot.spec.ts tests/unit/video-poster-runtime.spec.ts` | 通过，3 files / 13 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-004B 已完成。媒体 domain 已具备中性 adapter，IM 与客服可共享同一媒体表达。
