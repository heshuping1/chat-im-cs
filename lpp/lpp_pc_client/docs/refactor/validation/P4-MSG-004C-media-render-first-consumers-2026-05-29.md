# 验证记录：P4-MSG-004C Media Render 首批消费点

日期：2026-05-29
任务编号：P4-MSG-004C
状态：已完成

## 目标

替换首批媒体消息渲染消费点并补降级态，先收敛低风险的媒体判断与文件名派生。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/components/MessageCenter.tsx` | `isImageMessage/isVideoMessage/mediaName` 改为使用 media domain。 |

## 替换点

| 消费点 | 重构前 | 重构后 |
| --- | --- | --- |
| 图片判断 | `normalizeMessageType + body.image` | `chatMediaItemsFromMessage(...).some(kind=image)` |
| 视频判断 | `normalizeMessageType + body.video` | `chatMediaItemsFromMessage(...).some(kind=video)` |
| 媒体文件名 | `firstMessageMedia + mediaFileName + preview` | `messageMediaFileName + preview` |

## 约束

- 不改 `MessageBodyView` 布局和媒体组件行为。
- 不改桌面媒体动作 payload。
- 保持 `messageMediaFileName` 的 fallback 规则，确保文件/图片/视频仍有降级文件名。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/media-message.spec.ts tests/unit/message-domain.spec.ts` | 通过，2 files / 10 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-004C 已完成。媒体菜单/预览相关首批判断已收敛到 media domain。
