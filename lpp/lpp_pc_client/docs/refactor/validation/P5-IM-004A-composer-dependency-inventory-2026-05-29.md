# P5-IM-004A Composer Dependency Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/MessageComposer.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/media/runtime/sendQueue.ts`

## 依赖关系

| 能力 | 当前 owner | 依赖 | 判断 |
| --- | --- | --- | --- |
| 文本输入 | `MessageComposer` | draft props、Lexical input、textarea fallback | Composer 负责输入 UI 合理。 |
| 富文本/混排发送 | `MessageComposer` + `sendComposerPartsInOrder` | Lexical sendable parts | 发送顺序已由 runtime 工具统一。 |
| 附件选择 | `MessageComposer` | `detectComposerMediaKind`、本地 preview URL | Composer 负责选择和预览，发送细节不应进入 Composer。 |
| 截图 | `MessageComposer` | screenshot shortcut/runtime | 属于输入来源，保留在 Composer。 |
| 草稿 | `MessageCenter` 持久化 state，`MessageComposer` 受控输入 | `draftsByConversation`、`draftPreviewsByConversation`、`draftEditorStatesByConversation` | 后续可迁到 composer draft hook。 |
| 发送文本 | `MessageCenter` optimistic use case | API、cache、send diagnostics、read model | 不应进入 Composer。 |
| 发送媒体 | `MessageCenter` optimistic use case | upload、poster、cache、send diagnostics、local task registry | 不应进入 Composer。 |
| 翻译草稿 | `MessageCenter` 传 API 回调 | `translateText` | 当前可接受，后续可进 action/use case。 |

## 发现的问题

1. `MessageComposer` 本身没有直接理解 API/Gateway/cache，这是正确方向。
2. `MessageCenter` 曾残留未使用的 `sendTextMutation` / `sendMediaMutation`，会造成“双发送链路”的认知噪音。
3. 现行发送链路是 `sendTextOptimistically` / `sendMediaOptimistically`，带 local echo、send diagnostics、cache merge。
4. Composer 的草稿状态仍散落在 `MessageCenter`，后续可以拆 `useMessageComposerDrafts`。

## 结论

本轮不改 Composer UI，不引入依赖，不改变发送行为。先清理死链路并确认 Composer 只通过统一 command model 触发发送。
