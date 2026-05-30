# P4-MSG-005A Send Queue Inventory

日期：2026-05-29

范围：PC 端普通 IM 与在线客服发送链路。

## 现状盘点

| 链路 | local echo | 发送状态 | 成功合并 | 失败处理 | 重试/控制 | 主要位置 |
| --- | --- | --- | --- | --- | --- | --- |
| 普通 IM 文本 | 有，`pc-local-text-*` | `sending` | `replaceLocalMessageInCache` + `replaceLocalOutgoingMessage` | `markLocalMessageFailed` + `markLocalOutgoingMessageFailed` | 无显式重试入口 | `MessageCenter.tsx` |
| 普通 IM 媒体 | 有，`pc-local-media-*` / `pc-upload-*` | `uploading`、`paused`、`canceled`、`failed` | 上传后 `sendConversationMediaMessage`，再替换本地消息 | `patchLocalMediaMessage` | pause/resume/cancel/retry | `MessageCenter.tsx`、`useMediaUploadTaskRegistry.ts` |
| 在线客服文本 | 无统一 local echo，成功后合并服务端结果 | mutation pending | `mergeSentCustomerServiceMessage` | 终态会话写失败切只读提示 | 无显式重试入口 | `ChatWorkspace.tsx` |
| 在线客服媒体 | 有，`pc-cs-local-media-*` / `pc-cs-upload-*` | `uploading`、`paused`、`canceled`、`failed` | 上传后 `sendWorkbenchMediaMessage`，删除本地消息并合并服务端结果 | `patchCustomerServiceLocalMessage` | pause/resume/cancel/retry | `ChatWorkspace.tsx` |
| 撤回/删除 | 非 local queue，直接 mutation | `recalled` 或移除 | cache update + invalidate | toast notice | 无 | `MessageCenter.tsx` |

## 问题判断

1. 发送状态枚举在 `MessageCenter.tsx`、`ChatWorkspace.tsx`、`media/runtime/uploadState.ts` 多处重复。
2. IM 与客服媒体上传有相同生命周期，但任务注册和 cache patch 分散。
3. 普通 IM 文本已经有串行队列，客服文本没有统一 local echo，后续需要在客服核心重构阶段再做行为确认。
4. 发送失败、暂停、取消、重试之前没有底层结构化诊断，Codex 只能靠页面代码排查。
5. `im-local-outgoing.ts` 只把 `sending`、`uploading` 视为 pending local echo，`paused`、`failed`、`canceled` 的合并策略需要在后续 send queue repository 中统一。

## 结论

本任务不新增依赖，不替换技术。先建立底层发送状态机与诊断，再小步接入 IM/客服首批发送入口；暂不删除旧页面发送逻辑，避免一次性重写核心链路。

## 诊断日志

- 是否新增日志：本盘点任务不新增运行时日志，日志在 P4-MSG-005B/C/D 落地。
- Codex 可检索方式：`rg "P4-MSG-005" lpp/lpp_pc_client/src/renderer lpp/lpp_pc_client/docs/refactor/validation`

## 验收

- 文档盘点现有 local echo、sending、sent、failed、retry、撤回路径。
- 未修改业务行为。
