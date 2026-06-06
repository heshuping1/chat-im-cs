# 开放平台字段与枚举速查

> 文档校对快照:2026-05-14

本文档补充 [open-platform.md](./open-platform.md) 中没有逐项展开的字段、匿名响应和值域，范围对应 `/api/open/v1` 当前实现。
缺失字段与补充枚举统一见 [field-enum-reference.md](./field-enum-reference.md)。

鉴权边界:

- 只接受租户空间客户端业务 Token
- 平台 `platformToken` 不可用
- 个人空间客户端业务 Token 不可用
- 请求缺少 `tenant_id`、`user_id` 或 token 类型不是客户端业务 token 时,会返回 **401**(无响应体)
- 应用管理类接口(创建 / 轮转 / 配置 webhook / 配置订阅 / 上传媒体 / 查询投递)还要求操作者具备 `bot_app.manage` 权限,否则返回 **403** `{ code: "AUTH_FORBIDDEN" }`;`POST /messages/send` 不要求该权限
- 速率限制:当前在应用层**未启用**;公网部署请在网关或反向代理处自行限流

## 1. 接口总览

Base URL：`/api/open/v1`

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/apps` | POST | `appCode` `appName` `environment` | `appId` `appCode` `appName` `secret` | `environment=sandbox` 会映射到沙箱，其它任意非空值都会映射到生产 |
| `/apps/{appId}/credentials/rotate` | POST | 无 | `appId` `secret` | 返回新密钥明文，只返回一次 |
| `/apps/{appId}/webhook` | PUT | `callbackUrl` `callbackSecret` `timeoutSeconds` `maxAttempts` | `appId` | `callbackUrl` 必须是公开可达的绝对 `http/https` 地址；投递时会把 `timeoutSeconds` 限制到 `1..30`，`maxAttempts` 限制到 `1..20` |
| `/apps/{appId}/subscriptions` | PUT | `eventTypes[]` | `appId` | 大小写不敏感去重后整体覆盖旧订阅 |
| `/apps/{appId}/media/upload` | POST | `multipart/form-data`，文件字段名 `file` | `MediaUploadResponse` | `mediaKind=image/video/voice/file` |
| `/apps/{appId}/messages/send` | POST | `OpenSendMessageRequest` | `messageId` `conversationId` `conversationSeq` `serverTime` | 当前只支持 `text/markdown/image/video`；目标会话必须先由管理员授权给该 BOT |
| `/apps/{appId}/deliveries` | GET | 无 | `DeliveryLogDto[]` | 最多返回最近 100 条 |

## 2. 请求字段速查

### 2.1 `CreateBotAppRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `appCode` | string | 是 | 应用编码，同租户唯一 |
| `appName` | string | 是 | 应用名称 |
| `environment` | string | 是 | 公开建议值为 `sandbox` 或 `production`；代码中只有 `sandbox` 会映射为沙箱，其它值统一视为生产 |

### 2.2 `UpdateWebhookRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `callbackUrl` | string | 是 | 回调地址；必须是绝对 `http/https` URL，不能带凭证，不能使用 `localhost`、回环、链路本地或私网 IP |
| `callbackSecret` | string | 是 | 用于签名校验的 HMAC 密钥 |
| `timeoutSeconds` | int | 是 | 请求超时秒数；实际投递时会被收敛到 `1..30` |
| `maxAttempts` | int | 是 | 最大尝试次数；实际投递时会被收敛到 `1..20` |

补充：

- `callbackUrl` 不能包含 `userinfo`(`user:pass@host`)
- 域名形式:**保存配置时**就会同步解析所有 A / AAAA 记录,任一记录落入私网/回环/链路本地等非公网段则直接拒绝(防 SSRF);**投递前**还会再次实时解析(带 5 秒硬超时),防 DNS rebinding 与 TOCTOU
- DNS 解析失败 / 超时不算"地址非法",会视为传输层瞬时错误并按重试规则退避
- 生产环境会**直接拒绝**私网 / 回环回调,不论是 IP 还是解析到这些地址段的域名
- 修改 `callbackUrl` 后,旧 URL 待重试的投递会被立即标记为最终失败(原因 `callback url has changed`)

### 2.3 `UpdateSubscriptionsRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `eventTypes` | string[] | 是 | 订阅主题列表；当前公开值为 `message.created`、`message.read`、`message.received`、`message.recalled`，其中 `message.received` 当前等价于 `message.created` |

### 2.4 `OpenSendMessageRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `idempotencyKey` | string | 是 | 幂等键，按 `appId + idempotencyKey` 去重 |
| `conversationId` | GUID | 是 | 目标会话 ID；必须已被管理员授权给当前 `appId` |
| `messageType` | string | 是 | `text` `markdown` `image` `video` |
| `body` | object | 是 | 消息正文对象；支持字段 `text?` `image?` `video?` `voice?` `file?`，其中当前开放平台只允许实际发送 `text`、`markdown`、`image`、`video` 对应正文 |
| `replyToMessageId` | GUID? | 否 | 回复目标消息 ID |
| `mentions` | array? | 否 | 群消息中的 @ 提及，单聊无意义 |

发送规则：

- `text` / `markdown` 要求 `body.text` 非空
- `image` 要求 `body.image.url` 非空，且媒体必须由同一 `appId` 上传
- `video` 要求 `body.video.url` 非空，且媒体必须由同一 `appId` 上传
- `voice` / `file` 当前会直接被拒绝

## 3. 响应字段速查

### 3.1 创建应用 / 轮转密钥

| DTO | 字段 |
|---|---|
| `CreateBotAppResponse` | `appId` `appCode` `appName` `secret` |
| `RotateCredentialResponse` | `appId` `secret` |

### 3.2 媒体与消息

| DTO | 字段 | 说明 |
|---|---|---|
| `MediaUploadResponse` | `mediaId` `mediaKind` `url` `relativePath` `fileName` `mimeType` `sizeBytes` `thumbnailUrl?` | `mediaKind` 取值通常为 `image`、`video`、`voice`、`file` |
| 发送消息响应 | `messageId` `conversationId` `conversationSeq` `serverTime` | 分别表示消息 ID、目标会话 ID、会话内顺序号、服务端入库时间 |

### 3.3 投递日志

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递 ID |
| `topic` | string | 事件主题，当前常见为 `message.created`、`message.read`、`message.recalled` |
| `status` | short | 投递状态：`0=pending`、`1=delivered`、`2=retrying`、`3=dead_letter`（最终失败）；内部处理中会短暂使用 `9=processing`，公开接口通常不返回 |
| `retryCount` | int | 已重试次数 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `deliveredAt` | DateTimeOffset? | 成功投递时间，未成功时为 `null` |

当前公开接口不返回：

- `lastError`
- 下游 HTTP 状态码
- 下游响应体
- 内部处理中状态

## 4. 共享消息体字段

开放平台和客户端共用同一套消息正文结构：

### 4.1 `MessageBodyDto`

`POST /messages/send` 接受的字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | string? | 文本 / Markdown 正文 |
| `image` | `MediaResourceDto?` | 图片正文 |
| `video` | `MediaResourceDto?` | 视频正文 |
| `voice` | `MediaResourceDto?` | **当前 BOT 不能发送**,但 webhook 入站可能携带 |
| `file` | `MediaResourceDto?` | **当前 BOT 不能发送**,但 webhook 入站可能携带 |

Webhook 入站 `body` 可能额外携带以下字段(BOT 不发,但订阅者要做好兼容):

| 字段 | 类型 | 出现条件 |
|---|---|---|
| `contactCard` | object? | `messageType = contact_card` |
| `callLog` | object? | `messageType = call_log` |
| `location` | object? | `messageType = location` |
| `event` | object? | `messageType = event` |
| `kind` | string? | 扩展类型的细分标记 |

### 4.2 `MediaResourceDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 媒体地址,通常是 `/media/{mediaId}` |
| `signedUrl` | string? | **仅在 webhook 入站 payload 中由服务端注入**,带签名的可访问 URL(有效期短);消费端下载请优先用本字段 |
| `downloadUrl` | string? | 同 `signedUrl`,签名后的强制下载 URL |
| `fileName` | string? | 文件名 |
| `mimeType` | string? | MIME 类型 |
| `sizeBytes` | long? | 文件大小 |
| `width` | int? | 图片 / 视频宽度 |
| `height` | int? | 图片 / 视频高度 |
| `durationSeconds` | int? | 音视频时长 |
| `thumbnailUrl` | string? | 缩略图地址 |

> `signedUrl` / `downloadUrl` 在调用 `POST /messages/send` 时**不接受集成方填写**;只会出现在 webhook 入站 payload 里。

### 4.3 `MentionDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 被 @ 的群成员用户 ID |
| `offset` | int | 在正文中的起始偏移 |
| `length` | int | 提及文本长度 |

## 5. 枚举和值域

### 5.1 应用与消息

| 字段 | 可选值 | 说明 |
|---|---|---|
| `environment` | `sandbox` `production` | 建议只传这两个;实现中 `sandbox` 之外的值都按 `production` 处理 |
| `messageType`(发送侧) | `text` `markdown` `image` `video` | `POST /messages/send` 只允许这四种,其它返回 `MSG_TYPE_UNSUPPORTED` |
| `messageType`(webhook 入站) | 上面 4 个 + `voice` `file` `contact_card` `call_log` `location` `event` | 订阅者实现 switch 时务必覆盖此全集 |
| `mediaKind` | `image` `video` `voice` `file` | 上传接口会自动识别;主动发消息只消费 `image` / `video` |

### 5.2 订阅主题

| 字段 | 可选值 | 说明 |
|---|---|---|
| `eventTypes` | `message.created` `message.read` `message.received` `message.recalled` | `message.received` 当前等价于 `message.created` |
| `temp_session.*` 系列(前缀订阅) | 已知子主题:`temp_session.created` `temp_session.assigned` `temp_session.closed` `temp_session.rated` `temp_session.transferred` | 访客客服子系统事件;以 `temp_session.` 开头的所有事件均会匹配,后续可能新增其它子主题 |
| `im_customer_service.*` 系列(前缀订阅) | 已知子主题:`im_customer_service.created` `.assigned` `.transferred` `.closed` `.rated` `.ai_disabled` | IM 直聊客服线程事件 |

### 5.3 投递状态

接口返回的 `status` 字段是**数值类型**;下表的英文符号仅作语义说明,不会出现在响应中。

| 数值 | 语义 | 说明 |
|---|---|---|
| `0` | pending | 待投递 |
| `1` | delivered | 投递成功 |
| `2` | retrying | 等待重试 |
| `3` | failed | 最终失败 |
| `9` | processing | 处理中(可能短暂出现) |

补充:

- 如果在投递列表中看到 `9`,消费端**应当按 `2` 处理**(继续等待)
- 公开接口当前没有 cursor / page 等分页参数,固定按 `createdAt DESC` 返回最近 100 条

### 5.4 BOT 应用状态(`botAppStatus`)

| 字符串 | 含义 |
|---|---|
| `active` | 已启用,事件正常投递 |
| `disabled` | 已禁用,事件不再投递 |

## 6. Webhook 请求体速查

### 6.1 通用包结构

| 字段 | 类型 | 说明 |
|---|---|---|
| `topic` | string | 当前事件主题 |
| `data` | object | 具体事件负载 |

### 6.2 `message.created`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 会话内消息序号 |
| `messageType` | string | 取值见 §5.5(订阅者收到的全集多于 BOT 自己能发的子集) |
| `body` | `MessageBodyDto` | 消息正文;子字段按 `messageType` 选用 |
| `clientMsgId` | string? | 客户端消息 ID;BOT 自己产生的消息**为 null**,普通用户/客服消息通常有值——可作为消费端幂等键 |
| `senderUserId` | GUID | 发送者用户 ID;BOT 触发时**固定**为 `00000000-0000-0000-0000-000000000000` |
| `deviceId` | GUID? | 设备 ID;BOT 发消息时为 `null` |
| `appId` | GUID? | 触发该消息的 BOT App ID;非 BOT 触发的消息为 `null` |
| `replyToMessageId` | GUID? | 回复目标消息 |
| `forwardFromMessageId` | GUID? | 转发来源消息 |
| `mentions` | `MentionDto[]?` | 群消息的 @ 信息 |
| `sentAt` | DateTimeOffset | 消息发送时间(服务端入库时间) |
| `isRecalled` | bool | 是否已被撤回;新消息投递时固定为 `false` |

### 6.3 `message.read`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `conversationId` | GUID | 会话 ID |
| `userId` | GUID | 标记已读的用户 ID |
| `readSeq` | long | 已读到的会话内序号 |

### 6.4 `message.recalled`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `messageId` | GUID | 被撤回的消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 该消息在会话内的序号 |
| `operatorUserId` | GUID | 执行撤回操作的用户 ID |

## 7. 请求头速查

入站(集成方调用 `/api/open/v1/*`):

| 请求头 | 说明 |
|---|---|
| `Authorization: Bearer <tenant_access_token>` | 必填,必须是租户空间客户端业务 Token;不接受平台 Token,也不接受个人空间 Token |
| `Content-Type` | 根据接口要求(`application/json` 或 `multipart/form-data`) |

出站(服务端调用集成方 `callbackUrl`):

| 请求头 | 说明 |
|---|---|
| `Content-Type` | 固定 `application/json; charset=utf-8` |
| `X-IM-AppId` | 应用 ID |
| `X-IM-Timestamp` | Unix 秒级时间戳;服务端只生成,不带反重放校验,消费端如需防重放请用 `X-IM-Delivery-Id` |
| `X-IM-Nonce` | 随机串(GUID v7 hex,32 字符无连字符) |
| `X-IM-Signature` | HMAC-SHA256 签名,小写十六进制;原文 `{timestamp}\n{nonce}\n{rawBody}`,密钥为 `callbackSecret` |
| `X-IM-Delivery-Id` | 投递 ID;**跨重试稳定**,消费端用它做幂等键 |

## 8. 错误码速查

| `code` | HTTP | 触发条件 |
|---|---|---|
| (无 envelope) | 401 | 缺 token / token 类型不对 / 空间类型不对 |
| `AUTH_FORBIDDEN` | 403 | 缺 `bot_app.manage` 等所需权限 |
| `BOT_APP_CODE_EXISTS` | 409 | 同租户、同 `environment` 下 `appCode` 已存在 |
| `BOT_APP_NOT_FOUND` | 404 / 409 | 应用不存在 / 已禁用 |
| `BOT_APP_CALLBACK_URL_INVALID` | 400 | `callbackUrl` 不满足 §2.2 约束(私网 IP、IPv6 链路本地、含 userinfo、相对地址等) |
| `BOT_APP_CONVERSATION_FORBIDDEN` | 403 | 目标 `conversationId` 没被授权给本 BOT |
| `BOT_DELIVERY_DUPLICATE` | 400 / 409 | 缺 `idempotencyKey`(400)或同键已存在(409) |
| `MSG_BODY_INVALID` | 400 | `body` 字段格式不合法 |
| `MSG_TYPE_UNSUPPORTED` | 400 | `messageType` 不在 `text/markdown/image/video` 中 |
| `MSG_CONVERSATION_NOT_FOUND` | 404 | 会话不存在 |
| `MSG_CONVERSATION_FROZEN` | 403 | 会话已归档或被冻结 |
| `MSG_MEMBER_FORBIDDEN` | 403 | 群里没有活跃成员 |
| `MSG_SEQ_CONFLICT` | 409 | 会话内 seq 冲突,客户端可重试 |
| `MEDIA_FORM_REQUIRED` | 400 | 上传请求不是 multipart/form-data |
| `MEDIA_FILE_REQUIRED` | 400 | multipart 中缺 `file` 字段 |
| `MEDIA_URL_INVALID` | 400 | 发消息时 `body.{image|video}.url` 无法解析出 `mediaId` |
| `MEDIA_NOT_FOUND` | 404 | 引用的媒体不存在 |
| `MEDIA_FORBIDDEN` | 403 | 媒体不属于本 BOT |
| `MEDIA_TYPE_MISMATCH` | 400 | 媒体 kind 与 `messageType` 不匹配 |
| `MEDIA_ALREADY_BOUND` | 409 | 该 `mediaId` 已被绑定到其它消息,不能再次引用 |
