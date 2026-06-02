模块编号：M09

模块名称：发送运行时 - ChatSendRuntime

模块职责：
- 为 IM 与在线客服提供共享发送底层能力：本地 identity、outbox scope、target key、blob id、状态记录和诊断。
- 支撑文本、名片、媒体附件、截图等发送任务进入同一 outbox/status 语义。
- 保持 IM 与在线客服 use case 独立处理业务副作用。

上游输入：
- 发送目标：IM conversation 或客服 thread。
- 消息类型：text、contact_card、image、video、file。
- 本地文件、poster、reply、clientMsgId。
- 当前登录 session。

下游输出：
- outbox record：`queued/uploading/sending/failed/sent` 等状态。
- 本地消息 identity：`localMessageId/clientMsgId/createdAt`。
- channel 绑定诊断：`im` 或 `customer_service`。

边界：
- runtime 只管理发送生命周期，不清未读、不发提醒、不读取 IM read view 或客服 unread ledger。
- IM/客服共用 runtime，但 target key 和 channel 必须隔离。
- 发送成功后的缓存合并、未读抑制、客服 staff/self 语义由各自 use case/cache adapter 处理。
- 媒体上传仍沿用当前上传 API 和本地 outbox storage，不更换上传库、不引入本地数据库。

当前 API 支撑：
- IM 文本/媒体 API 支持 clientMsgId。
- 客服文本/媒体 API 支持 clientMsgId。
- 上传 API 沿用当前实现。

服务端缺口：
- 失败重试的服务端幂等需要继续依赖 `clientMsgId`；如果服务端未全量幂等，PC 只能保留 outbox 状态，不能伪造 ack。

不做：
- 不改上传库。
- 不把发送 runtime 与 delivery/gateway ack 去重合并成一个模块。
- 不在 runtime 内写未读、已读、提醒或业务状态。

测试：
- `tests/unit/chat-send-runtime.spec.ts`
- `tests/unit/message-delivery-service.spec.ts`
- `tests/unit/media-message.spec.ts`
- `tests/unit/architecture-boundaries.spec.ts`
