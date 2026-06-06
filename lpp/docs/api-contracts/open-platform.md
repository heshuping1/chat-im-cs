# 开放平台接入文档

> 文档校对快照:2026-05-22

Base URL：`/api/open/v1`

本文档面向租户内第三方集成方，覆盖 BOT / App 创建、Webhook、媒体上传与主动发消息。

字段、枚举、Webhook 结构和各接口匿名响应的速查版见 [open-platform-reference.md](./open-platform-reference.md)。
缺失字段与补充枚举统一见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 接入前提

- 先通过 `/api/platform/v1/auth/login` 获取平台 Token
- 再通过 `/api/platform/v1/auth/select-tenant` 获取租户空间客户端业务 `accessToken`
- 所有 `/api/open/v1/*` 接口都要求"租户空间"客户端业务 Token
- 平台 `platformToken` 不能直接访问 `/api/open/v1/*`
- 个人空间客户端业务 Token 也不能访问 `/api/open/v1/*`
- BOT / App 只能访问所属租户的数据
- 应用管理类接口(创建 / 轮转密钥 / 配置 webhook / 配置订阅 / 上传媒体 / 查询投递)还要求操作者在租户内具备 `bot_app.manage` 权限,否则返回 `403 AUTH_FORBIDDEN`;**`POST /messages/send` 不要求 `bot_app.manage`**(只校验 BOT 应用本身可用 + 会话已被授权)
- 限流:当前 `/api/open/v1/*` 在应用层**未启用**速率限制;公网部署请通过网关 / 反向代理自行限流

统一响应包：

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "01...",
  "data": {}
}
```

`code` 字段成功时为 `"OK"`,失败时为大写蛇形错误码(参见 §7 错误码速查)。

鉴权失败的响应形式:

- 缺 token、token 类型不对、空间类型不对 → **401 Unauthorized**(无响应体)
- token 校验通过但缺 `bot_app.manage` 等所需权限 → **403** 统一壳 `{ code: "AUTH_FORBIDDEN", ... }`

请求要求:

- 必须带 `Authorization: Bearer {accessToken}`
- Token 内必须具备有效 `tenant_id`
- Token 类型必须是客户端业务 token(`token_type=tenant`)
- 个人空间 token(`space_type=1`)会被直接拒绝,返回 `401`


## 2. 应用管理

### 2.1 `POST /apps`

创建 BOT 应用。

请求体：

```json
{
  "appCode": "qa-bot",
  "appName": "QA Bot",
  "environment": "sandbox"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `appCode` | string | 是 | 应用编码,**同租户、同 `environment` 下需唯一**(跨 environment 可以重名) |
| `appName` | string | 是 | 应用名称 |
| `environment` | string | 是 | `sandbox` 或其他任意非 `sandbox` 值;非 `sandbox` 值都归一为生产环境 |

响应 `data`：

```json
{
  "appId": "...",
  "appCode": "qa-bot",
  "appName": "QA Bot",
  "secret": "vtAJmG+5Dphi6OoK9FlzMe527pAMiD99"
}
```

说明：

- 当前服务返回的是新生成密钥的明文值,客户端应立即保存
- 只有租户空间下的客户端业务 Token + 具备 `bot_app.manage` 权限的操作者可以创建应用
- **关于 `secret` 字段的当前作用范围**:`secret` 是为 BOT 应用预留的对称密钥,**当前版本的 `/api/open/v1/*` 接口并未基于该 `secret` 校验请求**——BOT 调用所有开放平台接口仍然走 `Authorization: Bearer {租户级 accessToken}`,且 `appId` 来自 URL 路径而不是基于 `secret` 推导。`secret` 已经存在并可轮转,主要是为未来引入"BOT 自身凭据签名/换 token"的能力做准备。**请第三方集成方注意**:在当前实现下,即使 `secret` 泄漏,只要租户 access token 没泄漏,BOT 接口本身仍然安全;反过来,只持有 `secret` 而没有有效租户 access token,无法调用任何开放平台接口。Webhook 出站签名使用的是 `callbackSecret`(见 §2.3),与本字段是两套独立密钥。
- 响应 `data` 字段固定为:

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名称 |
| `secret` | string | 新生成的应用密钥明文,只返回一次(当前作用范围见上文) |

### 2.2 `POST /apps/{appId}/credentials/rotate`

轮转应用密钥。

响应 `data`：

```json
{
  "appId": "...",
  "secret": "LsMeaQuboUo+mzgck/8MAvh+SjUVukfS"
}
```

说明：

- 当前实现同样返回新密钥明文，应立即保存
- 响应 `data` 字段固定为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `secret` | string | 新生成的应用密钥明文，只返回一次 |

### 2.3 `PUT /apps/{appId}/webhook`

配置 webhook 回调地址。

请求体：

```json
{
  "callbackUrl": "https://your-server.com/webhook",
  "callbackSecret": "your-webhook-secret",
  "timeoutSeconds": 5,
  "maxAttempts": 3
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `callbackUrl` | string | 是 | 回调地址；必须是绝对 `http/https` 地址，且不能使用 `localhost`、回环、链路本地或私网 IP |
| `callbackSecret` | string | 是 | 用于 HMAC-SHA256 签名 |
| `timeoutSeconds` | int | 是 | 传输超时秒数 |
| `maxAttempts` | int | 是 | 最大投递尝试次数 |

说明：

- API 契约上 `timeoutSeconds` 与 `maxAttempts` 都是必传;`timeoutSeconds` 解析失败时落回默认值 10
- **强烈建议生产环境只用 https 回调地址**(服务端允许 http,但 TLS 是公网回调的最小防护;私网/回环回调在生产环境会被直接拒绝)
- `callbackUrl` 必须满足以下约束:
  - 必须是绝对 `http/https` URL
  - 不能包含用户名 / 密码
  - 主机名不能是 `localhost` 或 `.localhost`
  - 如果主机写成 IP,不能是 loopback、link-local、RFC1918 私网等非公网地址
  - 如果主机是域名,**保存配置时**服务端会同步解析其所有 A / AAAA DNS 记录并对每条逐一做公网地址校验,任一记录落入私有/回环/链路本地/唯一本地/Teredo/站点本地等非公网地址段,直接拒绝(防 SSRF)
- **真正投递前会再次实时解析并校验**(防 DNS rebinding + TOCTOU),解析带 5 秒硬超时,DNS 失败/超时视为传输层瞬时错误,按 §5 的重试规则退避重试,而不会直接进入死信
- Webhook 处理器会在实际投递时把 `timeoutSeconds` 限制到 `1..30`,把 `maxAttempts` 限制到 `1..20`
- **回调地址变更的语义**:如果在某条投递记录"准备生成"之后又调用本接口改写了 `callbackUrl`,旧 URL 的那条投递会被自动终止并标记为最终失败,原因记为"callback url has changed";后续事件按新 URL 重新派发
- 当前成功响应只回传 `{ appId }`
- 响应 `data` 字段固定为:

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 已更新配置的应用 ID |

### 2.4 `PUT /apps/{appId}/subscriptions`

配置订阅事件。

请求体：

```json
{
  "eventTypes": ["message.created", "message.read"]
}
```

当前主要事件:

| 事件 | 说明 |
|---|---|
| `message.created` | 会话中有新消息 |
| `message.read` | 成员标记已读 |
| `message.received` | `message.created` 的别名 |
| `message.recalled` | 消息被撤回 |
| `temp_session.*` | 访客客服子系统事件(前缀订阅,见 §10.2) |
| `im_customer_service.*` | IM 直聊客服线程事件(前缀订阅,见 §10.2) |

说明：

- 接口会按大小写不敏感去重后整体覆盖原订阅
- 上表外的字符串即使保存也不会触发任何投递
- 响应 `data` 字段固定为:

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 已更新订阅的应用 ID |


## 3. 媒体上传

### `POST /apps/{appId}/media/upload`

上传媒体资源。

- Content-Type：`multipart/form-data`
- 文件字段名：`file`

响应 `data`：

```json
{
  "mediaId": "019d5d53-77ec-7932-9345-7e43f67b2981",
  "mediaKind": "image",
  "url": "/media/019d5d53-77ec-7932-9345-7e43f67b2981",
  "relativePath": "11111111111111111111111111111111/2026/04/08/image/019d5d5377ec793293457e43f67b2981.png",
  "fileName": "bot-card.png",
  "mimeType": "image/png",
  "sizeBytes": 17,
  "thumbnailUrl": null
}
```

说明：

- 请求必须是 `multipart/form-data`,且必须包含名为 `file` 的文件字段——缺 form 返回 `400 MEDIA_FORM_REQUIRED`,缺文件返回 `400 MEDIA_FILE_REQUIRED`
- `mediaKind` 由服务端按文件类型判定,可能为 `image` / `video` / `voice` / `file`
- 但开放平台"主动发消息"当前只消费 `text` / `markdown` / `image` / `video`(传其它类型会返回 `400 MSG_TYPE_UNSUPPORTED`)
- BOT 上传的媒体会绑定到当前 `appId`,发消息时只能由同一 `appId` 引用
- 同一份 `mediaId` **只能用于一次消息发送**;重复引用同一 `mediaId` 会返回 `409 MEDIA_ALREADY_BOUND`
- 返回的 `/media/{mediaId}` 是受保护地址,最终由会话成员带登录态访问
- 响应 `data` 字段固定为:

| 字段 | 类型 | 说明 |
|---|---|---|
| `mediaId` | GUID | 媒体 ID |
| `mediaKind` | string | 媒体类型：`image`、`video`、`voice`、`file` |
| `url` | string | 媒体访问地址，通常为 `/media/{mediaId}` |
| `relativePath` | string | 相对存储路径 |
| `fileName` | string | 原始文件名 |
| `mimeType` | string | MIME 类型 |
| `sizeBytes` | long | 文件大小 |
| `thumbnailUrl` | string? | 缩略图地址；图片 / 视频通常可能有值 |


## 4. 主动发消息

### `POST /apps/{appId}/messages/send`

向指定会话发送消息。

请求体：

```json
{
  "idempotencyKey": "qa-bot-001",
  "conversationId": "019d5d53-7723-7fa2-98f1-8aaf71f8fb63",
  "messageType": "image",
  "body": {
    "text": null,
    "image": {
      "url": "/media/019d5d53-77ec-7932-9345-7e43f67b2981",
      "fileName": "bot-card.png",
      "mimeType": "image/png",
      "sizeBytes": 17,
      "width": null,
      "height": null,
      "durationSeconds": null,
      "thumbnailUrl": null
    },
    "video": null,
    "voice": null,
    "file": null
  },
  "replyToMessageId": null,
  "mentions": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `idempotencyKey` | string | 是 | 幂等键，放在请求体中 |
| `conversationId` | GUID | 是 | 目标会话 ID；必须已被管理员授权给当前 `appId` |
| `messageType` | string | 是 | `text`、`markdown`、`image`、`video` |
| `body` | object | 是 | 消息体 |
| `replyToMessageId` | GUID? | 否 | 回复目标消息 ID |
| `mentions` | array? | 否 | 群消息中的 @ 提及；仅目标会话是群时有意义 |

其中 `body` 字段当前可用结构为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | string? | 文本 / Markdown 正文 |
| `image` | object? | 图片资源对象 |
| `video` | object? | 视频资源对象 |
| `voice` | object? | 当前开放平台不支持发送 |
| `file` | object? | 当前开放平台不支持发送 |

其中 `image` / `video` / `voice` / `file` 资源对象字段为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 资源地址 |
| `fileName` | string? | 文件名 |
| `mimeType` | string? | MIME 类型 |
| `sizeBytes` | long? | 文件大小 |
| `width` | int? | 宽度 |
| `height` | int? | 高度 |
| `durationSeconds` | int? | 时长，音视频可用 |
| `thumbnailUrl` | string? | 缩略图地址 |

其中 `mentions` 数组每项字段为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 被 @ 的用户 ID |
| `offset` | int | 提及文本在正文中的起始偏移 |
| `length` | int | 提及片段长度 |

发送规则：

- `text` / `markdown`：要求 `body.text` 非空
- `image`：要求 `body.image.url` 非空，且媒体必须由当前 `appId` 上传
- `video`：要求 `body.video.url` 非空，且媒体必须由当前 `appId` 上传
- 当前不支持 `voice` / `file`
- 目标 `conversationId` 必须先由管理员通过 `/api/admin/v1/bot-apps/{appId}/conversation-grants` 显式授权给当前 BOT
- `replyToMessageId` 会原样入库，并在消息历史 / 实时投递 / webhook `message.created` 中回传
- `mentions` 仅在目标会话是群聊时会被保存与投递

幂等语义：

- 同一 `appId + idempotencyKey` 重复请求，会直接返回已存在消息的 `messageId`
- 不会重复落库

响应 `data`：

```json
{
  "messageId": "...",
  "conversationId": "...",
  "conversationSeq": 1,
  "serverTime": "2026-04-08T11:39:55.8112082+00:00"
}
```

响应 `data` 字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 新消息 ID |
| `conversationId` | GUID | 目标会话 ID |
| `conversationSeq` | long | 该消息在会话中的顺序号 |
| `serverTime` | DateTimeOffset | 服务端入库时间 |


## 5. Webhook 投递

开放平台接口当前包括：

- `POST /apps`
- `POST /apps/{appId}/credentials/rotate`
- `PUT /apps/{appId}/webhook`
- `PUT /apps/{appId}/subscriptions`
- `POST /apps/{appId}/media/upload`
- `POST /apps/{appId}/messages/send`
- `GET /apps/{appId}/deliveries`

## 5.1 请求头

| 请求头 | 说明 |
|---|---|
| `Content-Type` | 固定 `application/json; charset=utf-8` |
| `X-IM-AppId` | 应用 ID |
| `X-IM-Timestamp` | Unix 秒级时间戳;**服务端只负责生成**,不会自带反重放校验——如需防重放,消费端应组合 `X-IM-Delivery-Id` 自行做幂等(详 §5.5) |
| `X-IM-Nonce` | 随机串(GUID v7 hex,32 字符无连字符) |
| `X-IM-Signature` | HMAC-SHA256 签名,详 §5.2 |
| `X-IM-Delivery-Id` | 投递 ID;**跨重试稳定**(同一条投递的多次重试携带同一个 DeliveryId),消费端用它做幂等键 |

## 5.2 签名验证

签名原文：

```text
{timestamp}\n{nonce}\n{rawBody}
```

`rawBody` 必须用接收到的**原始字节序列**(包括空格、换行)做签名,**不要**先 JSON 反序列化再重新序列化后签名(JSON 重排序会导致签名失配)。

算法：

- `HMAC-SHA256`
- 使用配置 webhook 时提交的 `callbackSecret`
- 输出为小写十六进制字符串(64 字符)

## 5.5 重试规则与终止条件

| 项 | 行为 |
|---|---|
| 重试间隔 | `min(300, 2^retryCount)` 秒,即 1s、2s、4s、8s、16s、…,封顶 300 秒 |
| 重试次数 | `maxAttempts`(1..20,在 §2.3 配置;实际投递前会再次 clamp 到此范围) |
| 何时进入"最终失败" | 达到 `maxAttempts` 次失败,且未在某次重试中成功 |
| `callbackUrl` 中途被改 | 旧 URL 的待重试投递立即标记最终失败(原因 "callback url has changed"),不会再尝试 |
| DNS 解析失败(NXDOMAIN / SERVFAIL / 超时) | 视为传输层瞬时错误,按上述规则退避重试,而不是直接死信 |
| 投递成功的判定 | HTTP 状态 `2xx`(任意 2xx 均算成功) |

**重要**:同一条投递在多次重试中携带的 `X-IM-Delivery-Id` 是**稳定**的——消费端应当用它做"已处理过"判断,以避免重试导致的重复消费。

## 5.3 请求体结构

```json
{
  "topic": "message.created",
  "data": {}
}
```

### `message.created` 回调示例

```json
{
  "topic": "message.created",
  "data": {
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "messageId": "019d6ce4-5223-7eaa-91a7-759177c5edfc",
    "conversationId": "019d6ce4-5146-7320-9b06-876ad4991c5b",
    "conversationSeq": 1,
    "messageType": "image",
    "body": {
      "text": null,
      "image": {
        "url": "/media/019d6ce4-51f9-7583-bc77-52e879ca5834",
        "fileName": "bot-card.png",
        "mimeType": "image/png",
        "sizeBytes": 17,
        "width": null,
        "height": null,
        "durationSeconds": null,
        "thumbnailUrl": null
      },
      "video": null,
      "voice": null,
      "file": null
    },
    "senderUserId": "00000000-0000-0000-0000-000000000000",
    "deviceId": null,
    "appId": "019d6ce4-5163-7317-beee-d5614226521a",
    "replyToMessageId": null,
    "forwardFromMessageId": null,
    "mentions": null,
    "sentAt": "2026-04-08T11:39:55.8112082+00:00",
    "isRecalled": false
  }
}
```

说明：

- `replyToMessageId` 表示该消息在回复哪条消息
- `forwardFromMessageId` 表示该消息由哪条消息转发而来
- `mentions` 为群消息中的 @ 提及列表；每项包含 `userId`、`offset`、`length`

`message.created` 的 `data` 字段完整结构为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 会话内消息序号 |
| `messageType` | string | 消息类型;**订阅者可能收到的完整值域为** `text` / `markdown` / `image` / `video` / `voice` / `file` / `contact_card` / `call_log` / `location` / `event`(其中 `voice` / `file` / `contact_card` / `call_log` / `location` / `event` 来自普通用户或客服消息,BOT 自己不会发这些) |
| `body` | object | 消息正文对象;按 `messageType` 取相应子字段(详见下方说明) |
| `clientMsgId` | string? | 客户端消息 ID;BOT 自己产生的消息**为 null**,普通用户/客服消息通常有值——订阅者可据此做幂等 |
| `senderUserId` | GUID | 发送者用户 ID;BOT 发消息时**固定**为 `00000000-0000-0000-0000-000000000000` |
| `deviceId` | GUID? | 设备 ID;BOT 发消息时为 `null` |
| `appId` | GUID? | 触发该消息的 BOT App ID;非 BOT 触发的消息为 `null` |
| `replyToMessageId` | GUID? | 回复目标消息 ID |
| `forwardFromMessageId` | GUID? | 转发来源消息 ID |
| `mentions` | array? | 群消息中的 @ 提及列表;每项包含 `userId`、`offset`、`length` |
| `sentAt` | DateTimeOffset | 消息发送时间(服务端入库时间) |
| `isRecalled` | bool | 是否已被撤回;新消息投递时固定为 `false` |

**关于 `body` 的可见字段**:订阅消息时 `body` 是个**联合对象**,可能携带以下子字段(以 `messageType` 决定哪个有值):

| 子字段 | 类型 | 出现条件 |
|---|---|---|
| `text` | string? | `messageType = text / markdown`,或带 caption 的媒体消息 |
| `image` | `MediaResource?` | `messageType = image` |
| `video` | `MediaResource?` | `messageType = video` |
| `voice` | `MediaResource?` | `messageType = voice`(客户端发送,BOT 不发) |
| `file` | `MediaResource?` | `messageType = file`(客户端发送,BOT 不发) |
| `contactCard` | object? | `messageType = contact_card`(客户端发送) |
| `callLog` | object? | `messageType = call_log`(由音视频通话结束时写入) |
| `location` | object? | `messageType = location`(客户端发送) |
| `event` | object? | `messageType = event`(系统事件类) |
| `kind` | string? | 扩展类型的细分标记 |

**`MediaResource` 子字段**(出现在 `body.image` / `body.video` / `body.voice` / `body.file`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 受保护媒体地址,通常形如 `/media/{mediaId}` |
| `signedUrl` | string? | **服务端在 webhook 投递时会注入此字段**,带签名的可访问 URL,有效期短;消费端如需下载请优先用 `signedUrl` |
| `downloadUrl` | string? | 同上,签名后的强制下载 URL |
| `fileName` | string? | 原始文件名 |
| `mimeType` | string? | MIME 类型 |
| `sizeBytes` | long? | 文件大小 |
| `width` | int? | 图片/视频宽度 |
| `height` | int? | 图片/视频高度 |
| `durationSeconds` | int? | 音/视频时长 |
| `thumbnailUrl` | string? | 缩略图地址 |

> 注意:本接口在**发送消息**时不接受集成方手动填写 `signedUrl` / `downloadUrl` / `contactCard` / `callLog` / `location` / `event` / `kind` 等字段——这些字段**只出现在 webhook 入站 payload 中**,由服务端按 `messageType` 注入或转发自其它消息来源。

### `message.read` 回调示例

```json
{
  "topic": "message.read",
  "data": {
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "conversationId": "019d6ce4-5146-7320-9b06-876ad4991c5b",
    "userId": "019d6ce4-50dc-79f4-8ebe-0d329f231f64",
    "readSeq": 1
  }
}
```

`message.read` 的 `data` 字段完整结构为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `conversationId` | GUID | 会话 ID |
| `userId` | GUID | 标记已读的用户 ID |
| `readSeq` | long | 已读到的会话内序号 |

### `message.recalled` 回调示例

```json
{
  "topic": "message.recalled",
  "data": {
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "messageId": "019d6ce4-5223-7eaa-91a7-759177c5edfc",
    "conversationId": "019d6ce4-5146-7320-9b06-876ad4991c5b",
    "conversationSeq": 1,
    "operatorUserId": "019d6ce4-50dc-79f4-8ebe-0d329f231f64"
  }
}
```

`message.recalled` 的 `data` 字段完整结构为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `messageId` | GUID | 被撤回的消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 该消息在会话内的序号 |
| `operatorUserId` | GUID | 执行撤回操作的用户 ID |

## 5.4 投递状态

| 值 | 含义 |
|---|---|
| `0` | 待投递 |
| `1` | 投递成功 |
| `2` | 等待重试 |
| `3` | 最终失败 |
| `9` | 处理中(可能短暂出现);消费端如果在 §6 投递记录中看到 `9`,请当作 `2(等待重试)` 处理 |


## 6. 投递记录查询

### `GET /apps/{appId}/deliveries`

查询最近 100 条 webhook 投递记录。

响应 `data` 数组元素字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递 ID |
| `topic` | string | 主题 |
| `status` | short | 状态值 |
| `retryCount` | int | 已重试次数 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `deliveredAt` | DateTimeOffset? | 成功投递时间 |

注意：

- 当前公开接口返回中不包含 `lastError`、HTTP 状态码、响应体
- 如果需要更细粒度排障信息，需要走管理后台查询
- 响应 `data` 是数组，每项字段固定为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递 ID |
| `topic` | string | 事件主题，当前常见为 `message.created`、`message.read`、`message.recalled` |
| `status` | short | 投递状态：`0=待投递`、`1=投递成功`、`2=等待重试`、`3=最终失败` |
| `retryCount` | int | 已重试次数 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `deliveredAt` | DateTimeOffset? | 成功投递时间；未成功时为 `null` |


## 7. 错误码速查

所有 `/api/open/v1/*` 接口在失败时都返回统一壳 `{ code, message, requestId }`(`code` 为下表中的字符串)。

| `code` | HTTP | 触发条件 |
|---|---|---|
| **认证 / 权限** | | |
| (无 envelope) | 401 | 缺 token、token 类型不对、空间类型不对 |
| `AUTH_FORBIDDEN` | 403 | 缺 `bot_app.manage` 等所需权限 |
| **应用管理** | | |
| `BOT_APP_CODE_EXISTS` | 409 | 同租户、同 `environment` 下 `appCode` 已存在 |
| `BOT_APP_NOT_FOUND` | 404 / 409 | 应用不存在 / 已禁用 |
| `BOT_APP_CALLBACK_URL_INVALID` | 400 | 见 §2.3 callbackUrl 约束 |
| `BOT_APP_CONVERSATION_FORBIDDEN` | 403 | 目标 `conversationId` 没被授权给本 BOT |
| `BOT_DELIVERY_DUPLICATE` | 400 / 409 | 缺 `idempotencyKey`(400)或同键已存在(409) |
| **消息发送** | | |
| `MSG_BODY_INVALID` | 400 | `body` 字段格式不合法 |
| `MSG_TYPE_UNSUPPORTED` | 400 | `messageType` 不在 `text/markdown/image/video` 中 |
| `MSG_CONVERSATION_NOT_FOUND` | 404 | 会话不存在 |
| `MSG_CONVERSATION_FROZEN` | 403 | 会话已归档或被冻结 |
| `MSG_MEMBER_FORBIDDEN` | 403 | 群里没有活跃成员(全部退群/封禁) |
| `MSG_SEQ_CONFLICT` | 409 | 会话内 seq 冲突(并发争用,客户端可重试) |
| **媒体** | | |
| `MEDIA_FORM_REQUIRED` | 400 | 上传请求不是 multipart/form-data |
| `MEDIA_FILE_REQUIRED` | 400 | multipart 中缺 `file` 字段 |
| `MEDIA_URL_INVALID` | 400 | 发消息时 `body.{image|video}.url` 无法解析出 `mediaId` |
| `MEDIA_NOT_FOUND` | 404 | 引用的媒体不存在 |
| `MEDIA_FORBIDDEN` | 403 | 媒体不属于本 BOT |
| `MEDIA_TYPE_MISMATCH` | 400 | 媒体 kind 与 `messageType` 不匹配(例如把 `voice` 媒体当 `image` 发) |
| `MEDIA_ALREADY_BOUND` | 409 | 该 `mediaId` 已被绑定到其它会话,不能再次引用 |

幂等与订阅别名行为:

| 场景 | 行为 |
|---|---|
| BOT 重复提交同一 `idempotencyKey` | 返回已有消息,不重复创建,**不报错** |
| 订阅了 `message.received` | 等价于订阅 `message.created`,实际下发的 `topic` 为 `message.created` |
| BOT 已禁用 | `messages/send` 返回 `BOT_APP_NOT_FOUND`(409),webhook 也不再投递 |

## 8. 管理后台相关接口

这些接口不属于开放平台 host,自带独立权限体系,需要管理员 token,要求当前管理员具备 `bot_app.manage` 权限。常用路径如下:

| 端点 | 说明 |
|---|---|
| `GET /api/admin/v1/bot-apps` | 查看 BOT 应用列表 |
| `POST /api/admin/v1/bot-apps` | 创建 BOT 应用 |
| `POST /api/admin/v1/bot-apps/{appId}/disable` | 禁用 BOT |
| `POST /api/admin/v1/bot-apps/{appId}/enable` | 启用 BOT |
| `GET /api/admin/v1/bot-apps/{appId}/conversation-grants` | 查看 BOT 可发消息的会话授权列表 |
| `PUT /api/admin/v1/bot-apps/{appId}/conversation-grants` | 更新 BOT 可发消息的会话授权列表 |

详细参数见 [admin-api.md](./admin-api.md) 中 BOT 应用管理章节。

说明:

- 只有状态为**启用**的 BOT,且配置了回调地址,订阅事件才会真正投递
- 创建/启用/禁用 BOT 由管理员控制,集成方不能直接调 `/api/open/v1` 启用自己被禁用的 BOT

## 9. 字段字典 / 术语表

| 字段 / 术语 | 说明 |
|---|---|
| `appId` | BOT / 第三方应用 ID |
| `appCode` | 应用业务编码，同租户内唯一 |
| `idempotencyKey` | 应用侧发送幂等键，按 `appId + idempotencyKey` 去重 |
| `conversationId` | 目标会话 ID，可指向单聊或群聊 |
| `messageId` | 消息 ID |
| `conversationSeq` | 该消息在会话内的序号 |
| `replyToMessageId` | 回复目标消息 ID |
| `forwardFromMessageId` | 转发来源消息 ID |
| `mentions` | 群消息中的 @ 提及列表 |
| `deliveryId` | Webhook 投递 ID |
| `secret` | 新生成密钥的明文值，只在创建/轮转时返回一次 |
| Webhook 订阅 | 应用声明想接收的事件主题集合 |

## 10. 枚举表

### 10.1 发送消息类型

| 字段 | 可选值 |
|---|---|
| `messageType` | `text` `markdown` `image` `video` |
| `mentions` 适用范围 | 仅群聊 |

### 10.2 订阅主题

| 字段 | 可选值 |
|---|---|
| `eventTypes` | `message.created` `message.read` `message.received` `message.recalled` |
| `temp_session.*` 系列 | 以 `temp_session.` 开头的所有事件均可订阅。当前已知主题包括 `temp_session.created` `temp_session.assigned` `temp_session.closed` `temp_session.rated` `temp_session.transferred`(访客客服子系统);后续可能新增其它子主题——订阅匹配采用前缀匹配,新主题无需修改订阅集合即可收到 |
| `im_customer_service.*` 系列 | IM 直聊客服线程事件:`im_customer_service.created` `.assigned` `.transferred` `.closed` `.rated` `.ai_disabled`(同样支持前缀订阅) |
| **`tenant.join_request.*` 系列** | 租户入驻申请生命周期(详见 §12): `tenant.join_request.created` `tenant.join_request.approved` `tenant.join_request.rejected` `tenant.join_request.cancelled` |
| **`group.join_request.*` 系列** | 群组加入申请生命周期: `group.join_request.created` `group.join_request.approved` `group.join_request.rejected` |
| **`friend.request.*` 系列** | 好友申请生命周期: `friend.request.created` `friend.request.accepted` `friend.request.rejected`(Webhook 投递按接收方所在租户的订阅触发) |

### 10.3 投递状态

| 数值 | 说明 |
|---|---|
| `0` | 待投递 |
| `1` | 投递成功 |
| `2` | 等待重试 |
| `3` | 最终失败 |

### 10.4 BOT 应用状态(`botAppStatus`)

| 字符串 | 含义 |
|---|---|
| `active` | 已启用 |
| `disabled` | 已禁用,管理后台可重新启用 |

仅状态为 `active` 的 BOT 才会被订阅事件真正投递。

### 10.5 BOT 自动发消息的 `messageType` 与"webhook 入站" `messageType` 的区别

| 维度 | 可能值 |
|---|---|
| `POST /messages/send` 接受的 `messageType` | `text` `markdown` `image` `video` |
| Webhook 入站事件中的 `messageType` | 上面 4 个,**外加** `voice` `file` `contact_card` `call_log` `location` `event`(来源于普通用户或服务端事件) |

集成方做 webhook 处理时要按全集做 `switch / default`,不能假设只有上面 4 类。

## 12. 加入申请类实时事件

所有"加入申请类"事件(好友申请 / 租户入驻申请 / 群组加入申请)由服务端在单一时机发布，并行送达三条通道：

1. **移动端推送**——送达相关用户的 App
2. **管理后台实时通道**(`/ws/admin`)——管理后台红点实时刷新
3. **Webhook**(本节)——按订阅的事件类型触发，沿用既有签名 / 重试 / 幂等规则

三条通道相互**独立**：任一失败不影响其它两条；Webhook 为持久投递、保证最终一致。

### 12.1 通用请求体

所有新增事件的 webhook 请求体与既有 `message.*` 一致,顶层结构为:

```json
{
  "topic": "tenant.join_request.created",
  "data": {
    "entityId": "0192...",          // 业务实体 ID（requestId / friendRequestId 等）
    "title": "新的入驻申请",          // 与 SignalR / Push 一致的人类可读标题
    "body": "Bob 申请加入企业",       // 同上
    "tenantId": "0192...",          // 事件所属租户
    "type": "tenant.join_request.created",
    "...": "见下文每个事件的字段"
  }
}
```

请求头与签名规则同 §5.1 / §5.2 —— `X-IM-Signature`(HMAC-SHA256 of timestamp+nonce+body)、`X-IM-Delivery-Id`(幂等键,格式 `{eventType}:{entityId}:{appId}`)、`X-IM-Timestamp`、`X-IM-Nonce`。重试与终止条件同 §5.5。

### 12.2 `tenant.join_request.*`

| 事件 | 触发时机 | 关键字段 |
|---|---|---|
| `tenant.join_request.created` | 平台用户提交入驻申请 | `entityId` (requestId), `platformUserId`, `joinMethod`(可选: `tenant_code`) |
| `tenant.join_request.approved` | 管理员通过申请;或自动审批模式自动放行 | `entityId`, `platformUserId`, `reviewedBy`(GUID,自动审批为空), `auto`(自动审批为 `"true"`) |
| `tenant.join_request.rejected` | 管理员驳回申请 | `entityId`, `platformUserId`, `reviewedBy`, `rejectReason`(可能为空字符串) |
| `tenant.join_request.cancelled` | 申请人撤回申请 | `entityId`, `platformUserId` |

> **接收人语义**:Webhook 投递到事件所属租户内订阅了对应事件类型的所有启用应用;与管理后台红点的接收人一致(持有 `tenant.join_request.review` 权限的管理员、租户管理员 / 所有者，以及平台超管)。

### 12.3 `group.join_request.*`

| 事件 | 触发时机 | 关键字段 |
|---|---|---|
| `group.join_request.created` | 用户提交入群申请 | `entityId` (requestId), `applicantUserId`, `conversationId` |
| `group.join_request.approved` | 群主/管理员审批通过 | `entityId`, `applicantUserId`, `conversationId`, `reviewedBy`, `status="approved"` |
| `group.join_request.rejected` | 群主/管理员驳回 | `entityId`, `applicantUserId`, `conversationId`, `reviewedBy`, `rejectReason`, `status="rejected"` |

> **接收人语义**:投递给目标群的管理员 / 群主。

### 12.4 `friend.request.*`

| 事件 | 触发时机 | 关键字段 |
|---|---|---|
| `friend.request.created` | 用户提交好友申请 | `entityId` (requestId), `fromUserId`, `type="friend_request"` |
| `friend.request.accepted` | 接收方同意申请 | `entityId`, `status="accepted"`, `type="friend_request_result"` |
| `friend.request.rejected` | 接收方拒绝申请 | `entityId`, `status="rejected"`, `type="friend_request_result"` |

> **租户语义**:好友关系是平台级的，但推送 / 实时通道 / Webhook 的接收人按接收方当前所在租户解析；Webhook 在该租户内订阅了对应事件类型的应用集合中匹配触发。

### 12.5 与移动推送、管理后台实时通道的对应关系

- 同一事件会同时进入移动端推送和管理后台实时通道；管理后台实时通道下发时，事件名为 `realtime.event`，其 `eventType` 即本节列出的主题（如 `tenant.join_request.created`）。
- `tenant.join_request.*`、`group.join_request.*` 同时进入管理后台实时通道与相关用户推送。
- `friend.request.*` 属于端到端用户事件，**只进入移动端推送和客户端实时通道（`/ws/client`），不进入管理后台实时通道**；Webhook 侧仍按订阅触发。

### 12.6 幂等与有序性

- **幂等键** `{eventType}:{entityId}:{appId}`（即请求头 `X-IM-Delivery-Id`）保证重复发布的同一事件不会重复投递；集成方应据此去重
- **有序性不保证**:多条通道并行投递;集成方需基于 `entityId` 自行做"最新状态覆盖"
- **回退与重试**:同 §5.5,2 的指数退避,最多 10 次后进入死信,可通过管理后台 Webhook 投递面板手动重投
