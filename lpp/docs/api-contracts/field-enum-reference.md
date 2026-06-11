# 字段与枚举补遗总表

> 文档校对快照:2026-05-22(2026-06-10 增量校对:客服域 —— 输入预览/已读时间/静默撤回/转接/复访续聊/自动话术配置/会话备注/报表导出)

本文档用于补齐 `3rddocs` 里此前分散、遗漏或没有统一索引的字段与枚举说明。

适用范围：

- `/api/platform/v1/*`
- `/api/client/v1/*`
- `/api/open/v1/*`
- `/hubs/voicecall`

本补遗基于当前仓库的 `Contracts`、`Domain` 和实际 host 路由整理，优先描述“对接侧真正会看到的公开字段和值域”。

## 1. 内容范围

本文档集中收录的字段与枚举重点包括：

- 平台空间与多租户相关枚举：`spaceType`、`membershipRole`、`joinMethod`、`membershipStatus`
- 租户邀请与加入申请状态：`inviteType`、邀请 `status`、加入申请 `status`
- 用户相关枚举：`userType`、用户 `status`、`gender`、`deviceType`、`muteMode`
- 开放平台投递状态：`DeliveryLogDto.status`
- 音视频状态：`CallState`、`HangupCause`
- 隐私设置枚举：`allowFriendRequest`、`profileVisibility`
- 平台用户扩展状态、反馈类型与状态、验证码用途扩展
- **后台运维相关补遗**（§11）：
  - 强制登出原因 `auth.force_logout` reason（`device_revoked`、`account_deactivated`）
  - 黑名单封禁维度 `targetType`（IP、指纹、客户 ID、访客 ID）
  - 敏感词处理模式 `actionMode`（标记、替换、拦截）
  - 公告状态 `status`（draft、published、archived）
  - 公告优先级 `priority`（normal、important、urgent）
  - 公告目标范围 `targetScope`（all、tenant、role）及角色定向 `targetCode` 值域
  - 导出任务状态 `status`（pending、processing、completed、failed）
  - 告警严重级别 `severity`（info、warning、critical）
  - 告警历史状态 `status`（firing、acknowledged、silenced、resolved）
  - 通知渠道类型 `channelType`（email、webhook、sms）
  - 平台租户永久删除检查项 `key` 值域
  - 告警规则条件 `condition`（gt、gte、lt、lte、eq）
  - 临时会话优先级 `priority`（urgent、high、normal）
- 此前没有集中字段表的 DTO：
  - `InvitationPreviewDto`
  - `SpaceUnreadSummaryDto`
  - `PlatformSpaceUnreadSummaryResponse`
  - `JoinRequestDto`
  - `TenantMemberDto`
  - `DepartmentDto` / `DepartmentMemberDto`
  - `MediaResourceDto`
  - `MessageBodyDto`
  - `DeliveryLogDto`
  - `CallSessionDto`
  - `MediaRelayNodeDto`
  - `CallRecordingDto`

## 2. 通用响应包

所有 HTTP 接口统一返回：

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "01...",
  "data": {}
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | string | 业务结果码；成功通常为 `OK` |
| `message` | string | 简短说明 |
| `requestId` | string | 请求跟踪 ID |
| `data` | any | 真实业务载荷 |

## 3. 平台认证与租户相关 DTO 字段

### 3.1 `PlatformSpaceContextDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaceType` | short | 空间类型：`0=selection_required`、`1=personal`、`2=tenant` |
| `tenantId` | GUID? | `spaceType=2` 时为目标租户 ID，否则为 `null` |

### 3.2 `PlatformAuthResponse`

用于平台注册、平台密码登录、平台验证码登录返回。

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | 全局唯一 LPP 标识 |
| `displayName` | string | 平台显示名 |
| `platformToken` | string | 平台态 token，不可直接调用租户业务接口 |
| `expiresIn` | int | token 有效秒数 |
| `spaceContext` | `PlatformSpaceContextDto` | 建议进入的空间 |

### 3.2A 验证码相关响应

#### `VerificationCodeStatusResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sent` | bool | 是否成功受理发送 |
| `channel` | string | `sms` 或 `email` |
| `error` | string? | 失败时的简短原因 |

#### `auth/verification/settings` 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `smsRequired` | bool | 是否强制短信验证码 |
| `emailRequired` | bool | 是否强制邮件验证码 |
| `smsEnabled` | bool | 是否启用短信能力 |
| `emailEnabled` | bool | 是否启用邮件能力 |
| `smsProvider` | string? | 短信服务商标识 |
| `emailProvider` | string? | 邮件服务商标识 |
| `smsSname` | string? | 短信服务商账号字段 |
| `smsSpwd` | string? | 短信服务商密码字段（**GET 读取恒为 null**；仅 PUT 写入） |
| `smsSpwdPreview` | string? | 短信密码末 4 位脱敏预览（仅 GET 返回） |
| `hasSmsSpwd` | bool | 是否已配置短信密码（仅 GET 返回） |
| `smsSprdid` | string? | 短信服务商产品字段 |
| `smsSign` | string? | 短信签名 |
| `emailApiKey` | string? | 邮件 API Key（**GET 读取恒为 null**；仅 PUT 写入） |
| `emailApiKeyPreview` | string? | 邮件 API Key 末 4 位脱敏预览（仅 GET 返回） |
| `hasEmailApiKey` | bool | 是否已配置邮件 API Key（仅 GET 返回） |
| `emailSender` | string? | 发件地址 |
| `emailSenderName` | string? | 发件人名称 |

敏感字段脱敏读出：敏感凭据（短信密码、邮件 API Key）通过 `GET /api/admin/v1/verification-settings` 读取时不再回传明文，改用 `*Preview`（末 4 位）+ `has*`（bool）组合表达"是否已配置 + 末 4 位提示"。写入仍走 `PUT` 明文通道。

### 3.3 `PlatformLoginResult`

平台登录额外返回租户列表。

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | 全局唯一 LPP 标识 |
| `displayName` | string | 平台显示名 |
| `userType` | short? | 推荐进入空间对应的用户类型；`selection_required` 时为 `null` |
| `platformToken` | string | 平台态 token |
| `expiresIn` | int | token 有效秒数 |
| `tenants` | `TenantSummaryDto[]` | 当前账号已加入且可见的激活租户 |
| `spaceContext` | `PlatformSpaceContextDto` | 建议进入的空间 |

### 3.3A `PlatformTokenRefreshResponse`

用于 `POST /auth/refresh-platform-token` 返回。

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | 全局唯一 LPP 标识 |
| `displayName` | string | 平台显示名 |
| `platformToken` | string | 新的平台态 token |
| `expiresIn` | int | 新 token 有效秒数 |

### 3.4 `TenantAuthResponse`

用于 `select-personal-space`、`select-tenant`、接受邀请或自动通过加入租户后返回。

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 当前空间所属租户 ID；个人空间也会带当前默认租户上下文 |
| `userId` | GUID | 当前空间内用户投影 ID |
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 当前用户显示名 |
| `accessToken` | string | 客户端业务 token |
| `refreshToken` | string | 刷新 token |
| `expiresIn` | int | access token 有效秒数 |
| `spaceContext` | `PlatformSpaceContextDto` | 当前已进入空间 |

### 3.5 `TenantSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo 地址 |
| `membershipRole` | short | 当前平台用户在该租户内的角色：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner` |

### 3.6 `InvitationPreviewDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 租户简介 |
| `industry` | string? | 行业 |
| `inviteType` | short | 邀请类型：`0=public`、`1=targeted` |
| `targetIdentifierHint` | string? | 定向邀请时对目标标识的脱敏提示 |
| `expiresAt` | datetime | 过期时间 |
| `alreadyMember` | bool | 当前账号是否已经是该租户成员 |
| `identityMatched` | bool? | 当前登录账号是否匹配定向邀请目标；未登录时可能为 `null` |

### 3.7 `SpaceUnreadSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaceType` | short | 空间类型 |
| `tenantId` | GUID? | 个人空间为 `null`，租户空间为目标租户 ID |
| `spaceName` | string | 空间展示名 |
| `tenantCode` | string? | 租户编码；个人空间为 `null` |
| `logoUrl` | string? | 租户 Logo；个人空间通常为 `null` |
| `unreadConversationCount` | int | 有未读的会话数 |
| `unreadMessageCount` | int | 未读消息总数 |
| `hasUnread` | bool | 是否存在未读 |

### 3.8 `PlatformSpaceUnreadSummaryResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaces` | `SpaceUnreadSummaryDto[]` | 各空间未读汇总 |
| `unreadSpaceCount` | int | 有未读的空间数量 |
| `totalUnreadConversationCount` | int | 全部空间未读会话总数 |
| `totalUnreadMessageCount` | int | 全部空间未读消息总数 |

### 3.9 `TenantDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 组织说明 |
| `domain` | string? | 自定义域名或业务域标识 |
| `industry` | string? | 行业 |
| `scale` | string? | 规模描述 |
| `isListed` | bool | 是否允许出现在租户搜索结果 |
| `status` | short | 租户状态：`0=pending_approval`、`1=active`、`2=suspended`、`9=deleted` |
| `memberCount` | int | 成员数 |
| `createdAt` | datetime | 创建时间 |

### 3.10 `TenantSearchResultDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo |
| `industry` | string? | 行业 |
| `memberCount` | int | 成员数 |

### 3.10B `TenantCodePreviewDto`

凭企业码预览(`GET /api/platform/v1/tenants/by-code/{code}`)的返回。不受 `isListed` 限制,用于"输企业码→展示确认→再 `join-by-code`"。

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 企业码(规范化小写) |
| `tenantName` | string | 企业名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 企业简介 |
| `industry` | string? | 行业 |
| `memberCount` | int | 活跃成员数 |
| `joinApprovalMode` | string | `auto`=加入即生效;`manual`=加入后需审批 |
| `alreadyMember` | bool | 当前登录账号是否已是该企业成员 |

### 3.11 `InvitationDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `invitationId` | GUID | 邀请 ID |
| `inviteCode` | string | 邀请码 |
| `inviteType` | short | 邀请类型：`0=public`、`1=targeted` |
| `maxUses` | int | 最大使用次数 |
| `usedCount` | int | 已使用次数 |
| `expiresAt` | datetime | 过期时间 |
| `status` | short | 邀请状态：`0=revoked`、`1=active`、`3=exhausted` |
| `createdAt` | datetime | 创建时间 |

### 3.12 `JoinRequestDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `requestId` | GUID | 申请 ID |
| `tenantId` | GUID | 目标租户 ID |
| `platformUserId` | GUID | 申请平台用户 ID |
| `displayName` | string? | 管理端查询时通常有值；`/my/join-requests` 当前可能为 `null` |
| `message` | string? | 申请留言 |
| `status` | short | 申请状态：`0=pending`、`1=approved`、`2=rejected`、`3=cancelled` |
| `createdAt` | datetime | 申请时间 |
| `reviewedAt` | datetime? | 审批时间 |
| `rejectReason` | string? | 拒绝原因 |

### 3.13 `TenantMemberDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 租户内用户 ID |
| `platformUserId` | GUID | 对应平台用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `membershipRole` | short | 租户角色：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner` |
| `joinMethod` | short | 入租方式：`0=self`、`1=invite`、`2=approval` |
| `joinedAt` | datetime? | 入租时间 |
| `lppId` | string? | **2026-06-04 新增**。对应平台账号的全局唯一 `lpp_id`（绿泡泡号）；未设置时为 `null` |

### 3.14 `DepartmentDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `departmentId` | GUID | 部门 ID |
| `parentId` | GUID? | 父部门 ID |
| `departmentName` | string | 部门名称 |
| `departmentCode` | string? | 部门编码 |
| `sortOrder` | int | 排序值 |
| `leaderUserId` | GUID? | 部门负责人用户 ID |
| `memberCount` | int | 部门成员数 |

### 3.15 `DepartmentMemberDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `isPrimary` | bool | 是否主部门 |
| `position` | string? | 岗位 |

## 4. 客户端 IM / 资料 / 社交 DTO 字段

### 4.1 `UserProfileDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 当前空间内用户 ID |
| `userNo` | long | 用户编号 |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `signature` | string? | 个性签名 |
| `gender` | string | `unset/male/female/other` |
| `birthday` | string? | `yyyy-MM-dd` |
| `location` | string? | 所在地 |
| `bio` | string? | 简介 |
| `mobile` | string? | 手机号；部分场景会脱敏 |
| `email` | string? | 邮箱；部分场景会脱敏 |
| `createdAt` | datetime | 创建时间 |
| `tapTapText` | string? | 拍一拍自定义文案，最多 20 字符 |

### 4.1A `AssignedStaffSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 当前负责客服用户 ID |
| `displayName` | string | 当前负责客服显示名 |
| `avatarUrl` | string? | 当前负责客服头像 |
| `membershipRole` | short | 当前负责客服在租户内的成员角色 |

### 4.2 `MediaResourceDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 资源访问地址 |
| `fileName` | string? | 文件名 |
| `mimeType` | string? | MIME 类型 |
| `sizeBytes` | long? | 文件大小 |
| `width` | int? | 宽度，图像/视频可用 |
| `height` | int? | 高度，图像/视频可用 |
| `durationSeconds` | int? | 时长，音视频可用 |
| `thumbnailUrl` | string? | 缩略图 |

### 4.2A `MediaUploadResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `mediaId` | GUID | 媒体 ID |
| `mediaKind` | string | 媒体类型，通常为 `image/video/voice/file` |
| `url` | string | 访问地址 |
| `relativePath` | string | 相对存储路径 |
| `fileName` | string | 原始文件名 |
| `mimeType` | string | MIME 类型 |
| `sizeBytes` | long | 文件大小 |
| `thumbnailUrl` | string? | 缩略图地址 |

### 4.3 `MessageBodyDto`

按 `messageType` 只会填充对应正文。

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | string? | 文本 / markdown 预览 / event 预览文本 |
| `image` | `MediaResourceDto`? | 图片正文 |
| `video` | `MediaResourceDto`? | 视频正文 |
| `voice` | `MediaResourceDto`? | 语音正文 |
| `file` | `MediaResourceDto`? | 文件正文 |
| `contactCard` | `ContactCardDto`? | 名片正文 |
| `callLog` | `CallLogDto`? | 通话记录正文 |
| `location` | `LocationDto`? | 位置正文 |
| `event` | `SystemEventDto`? | 系统事件正文 |

### 4.4 `ContactCardDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 名片对应用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `mobile` | string? | 手机 |
| `email` | string? | 邮箱 |

### 4.5 `CallLogDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 通话 ID |
| `mediaMode` | string | 通话模式，当前通常为 `audio` 或 `video` |
| `durationSeconds` | int | 通话时长 |
| `endReason` | string | 结束原因；通常与挂断原因语义一致 |
| `isCaller` | bool | 当前消息发送方是否主叫 |

### 4.6 `LocationDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `latitude` | double | 纬度 |
| `longitude` | double | 经度 |
| `title` | string? | 标题 |
| `address` | string? | 地址 |
| `zoomLevel` | int? | 地图缩放级别 |

### 4.7 `SystemEventDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `eventType` | string | 事件类型字符串 |
| `operatorUserId` | GUID? | 操作者 |
| `addedUserIds` | GUID[]? | 被新增成员 |
| `removedUserId` | GUID? | 被移除成员 |
| `userId` | GUID? | 与事件相关的单个用户 |
| `fromUserId` | GUID? | 变更前用户 |
| `toUserId` | GUID? | 变更后用户 |

### 4.8 `MentionDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 被提及用户 |
| `offset` | int | 在文本中的起始偏移 |
| `length` | int | 提及片段长度 |

### 4.9 `MessageItemDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 会话内顺序号 |
| `senderUserId` | GUID | 发送者用户 ID |
| `messageType` | string | 消息类型：`text`、`markdown`、`image`、`video`、`voice`、`file`、`contact_card`、`call_log`、`location`、`event` |
| `body` | `MessageBodyDto` | 消息正文 |
| `isRecalled` | bool | 是否已撤回。🆕 2026-06-10:服务端撤回状态实为三态(0=未撤回/1=普通撤回/2=客服静默撤回);**静默撤回(2)的消息整行不出现在历史/同步结果里**(任何端都看不到、无占位),本字段只会以"普通撤回"形态出现;实时移除靠 `msg.recalled` 帧的 `silent=true` |
| `sentAt` | datetime | 服务端发送时间 |
| `replyToMessageId` | GUID? | 回复目标消息 ID |
| `forwardFromMessageId` | GUID? | 转发来源消息 ID |
| `mentions` | `MentionDto[]`? | @ 列表 |
| `clientMsgId` | string? | 客户端幂等消息 ID |
| `appId` | GUID? | BOT / 应用发送时的应用 ID |

### 4.10 `SyncConversationItem`

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 会话 ID |
| `messages` | `MessageItemDto[]` | 该会话本批次消息 |
| `lastReadSeq` | long | 当前用户在该会话的最后已读序号 |

### 4.11 `SyncResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversations` | `SyncConversationItem[]` | 分会话增量数据 |
| `nextSinceSeq` | long? | 下一次同步建议起点 |

### 4.11A `TempSessionSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID? | 临时会话 ID |
| `visitorId` | GUID? | 访客 ID |
| `locale` | string? | 访客语言 |
| `category` | string? | 会话分类 |
| `sourceChannel` | string? | 来源渠道 |
| `visitorName` | string? | 访客名称 |

### 4.11B `ConversationDraftPreviewDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `draftText` | string | 草稿文本 |
| `updatedAt` | datetime | 草稿更新时间 |

### 4.12 `FavoriteListItemDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `favoriteId` | GUID | 收藏 ID |
| `messageId` | GUID | 原消息 ID |
| `conversationId` | GUID | 原会话 ID |
| `conversationSeq` | long | 原消息会话序号 |
| `conversationType` | string | `direct` 或 `group` |
| `conversationTitle` | string | 会话标题 |
| `conversationAvatarUrl` | string? | 会话头像 |
| `senderUserId` | GUID | 发送者用户 ID |
| `senderDisplayName` | string | 发送者显示名 |
| `senderAvatarUrl` | string? | 发送者头像 |
| `messageType` | string | 消息类型 |
| `favoriteCategory` | string | 收藏分类，见客户端文档 |
| `preview` | string | 预览文本 |
| `body` | `MessageBodyDto` | 完整正文 |
| `note` | string? | 收藏备注 |
| `isRecalled` | bool | 原消息是否已撤回 |
| `sentAt` | datetime | 原消息时间 |
| `favoritedAt` | datetime | 收藏时间 |

### 4.13 `SearchUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `signature` | string? | 个性签名 |
| `lppId` | string? | LPP 标识 |
| `userType` | short | 用户类型：`1=customer`、`2=staff`、`3=visitor` |
| `matchType` | string | 匹配来源类型，例如按名称或 LPP ID 命中 |

### 4.14 `DirectChatCreatedDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `chatId` | GUID | 单聊会话 ID |
| `peerUserId` | GUID | 对端用户 ID |
| `peerDisplayName` | string | 对端显示名 |
| `peerAvatarUrl` | string? | 对端头像 |
| `isNew` | bool | 是否本次新建 |

### 4.15 `DirectChatDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `chatId` | GUID | 单聊会话 ID |
| `peerUserId` | GUID | 对端用户 ID |
| `peerDisplayName` | string | 对端显示名 |
| `peerAvatarUrl` | string? | 对端头像 |
| `isPinned` | bool | 是否置顶 |
| `isMuted` | bool | 是否免打扰 |
| `lastReadSeq` | long | 当前用户最后已读序号 |
| `lastMessageSeq` | long | 当前会话最新消息序号 |
| `unreadCount` | int | 未读数 |

### 4.16 `PeerReadStatusDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `peerLastReadSeq` | long | 对端最后已读序号 |
| `peerLastReadAt` | datetime? | 对端最后已读时间 |

### 4.17 `GroupCreatedDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `groupId` | GUID | 群 ID |
| `title` | string | 群名称 |
| `memberCount` | int | 成员数 |

### 4.18 `GroupSettingsDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `allowMemberInvite` | bool | 是否允许普通成员邀请人 |
| `allowMemberModifyTitle` | bool | 是否允许普通成员改群名 |
| `allowMemberAtAll` | bool | 是否允许普通成员 @所有人 |
| `allowMemberViewMemberList` | bool | 是否允许普通成员查看成员列表 |
| `allowQrCodeJoin` | bool | 是否允许二维码进群 |
| `requireApproval` | bool | 进群是否需要审批 |
| `allowMemberAddFriend` | bool | 是否允许群成员互加好友 |

### 4.19 `GroupDetailV2Dto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `groupId` | GUID | 群 ID |
| `title` | string | 群名称 |
| `avatarUrl` | string? | 群头像 |
| `ownerUserId` | GUID? | 群主用户 ID |
| `memberCount` | int | 成员数 |
| `muteMode` | string | `normal` 或 `all_muted` |
| `settings` | `GroupSettingsDto` | 群配置 |
| `isPinned` | bool | 当前用户是否置顶 |
| `isMuted` | bool | 当前用户是否免打扰 |
| `myRole` | string | 当前用户在群内角色 |
| `unreadCount` | int | 未读数 |
| `lastMessageSeq` | long | 最新消息序号 |
| `lastReadSeq` | long | 当前用户最后已读序号 |
| `createdAt` | datetime | 创建时间 |

### 4.20 `GroupMemberDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `role` | string | `owner/admin/member` |
| `joinedAt` | datetime | 入群时间 |

### 4.20A `GroupAnnouncementDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 公告 ID |
| `conversationId` | GUID | 所属群会话 ID |
| `publisherUserId` | GUID | 发布者用户 ID |
| `publisherDisplayName` | string? | 发布者显示名 |
| `title` | string? | 公告标题 |
| `content` | string | 公告内容 |
| `isPinned` | bool | 是否置顶 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

### 4.20B `GroupJoinRequestDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `requestId` | GUID | 申请 ID |
| `conversationId` | GUID | 目标群会话 ID |
| `userId` | GUID | 申请人用户 ID |
| `userDisplayName` | string? | 申请人显示名 |
| `userAvatarUrl` | string? | 申请人头像 |
| `message` | string? | 申请留言 |
| `status` | string | 申请状态：`pending`、`approved`、`rejected` |
| `createdAt` | datetime | 申请时间 |

### 4.21 `FriendRequestDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `requestId` | GUID | 申请 ID |
| `fromUserId` | GUID | 发起方用户 ID |
| `fromDisplayName` | string | 发起方显示名 |
| `fromAvatarUrl` | string? | 发起方头像 |
| `toUserId` | GUID | 目标用户 ID |
| `toDisplayName` | string | 目标显示名 |
| `toAvatarUrl` | string? | 目标头像 |
| `message` | string? | 验证消息 |
| `status` | string | 当前公开接口通常为 `pending` |
| `createdAt` | datetime | 创建时间 |

### 4.22 `FriendDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `friendUserId` | GUID | 好友用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `remarkName` | string? | 备注名 |
| `groupName` | string? | 好友分组 |
| `createdAt` | datetime | 成为好友时间 |

### 4.23 `BlockedUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `blockedUserId` | GUID | 被拉黑用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `createdAt` | datetime | 拉黑时间 |

### 4.24 `NotificationSettingsDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `globalMute` | bool | 是否全局静音 |
| `dndStartTime` | string? | 免打扰起始时间 |
| `dndEndTime` | string? | 免打扰结束时间 |
| `soundEnabled` | bool | 是否启用声音 |
| `vibrationEnabled` | bool | 是否启用震动 |
| `previewEnabled` | bool | 是否显示预览 |

### 4.25 `ReadReceiptUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `lastReadSeq` | long | 最后已读序号 |

### 4.26 `FavoriteSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalCount` | int | 收藏总数 |
| `textCount` | int | 文本类数量 |
| `imageCount` | int | 图片类数量 |
| `videoCount` | int | 视频类数量 |
| `voiceCount` | int | 语音类数量 |
| `fileCount` | int | 文件类数量 |
| `otherCount` | int | 其他类数量 |

### 4.27 `PrivacySettingsDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `searchableByMobile` | bool | 是否允许通过手机号搜索到自己 |
| `searchableByLppId` | bool | 是否允许通过 LPP ID 搜索到自己 |
| `allowFriendRequest` | string | 好友申请策略：`everyone` / `friends_of_friends` / `nobody` |
| `profileVisibility` | string | 资料可见性：`everyone` / `friends` / `nobody` |

### 4.28 `AddressDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `addressId` | GUID | 地址 ID |
| `label` | string? | 标签，如"家""公司" |
| `contactName` | string | 联系人姓名 |
| `contactMobile` | string | 联系人手机号（返回时脱敏） |
| `province` | string? | 省 |
| `city` | string? | 市 |
| `district` | string? | 区 |
| `detail` | string | 详细地址 |
| `isDefault` | bool | 是否默认地址 |
| `createdAt` | datetime | 创建时间 |

### 4.29 `DeviceInfoDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `deviceId` | GUID | 设备 ID |
| `tenantId` | GUID | 所属空间租户 ID |
| `tenantName` | string? | 空间名称 |
| `deviceName` | string? | 设备名称 |
| `deviceType` | string | 设备类型：`ios` / `android` / `web` / `desktop` |
| `lastActiveAt` | datetime | 最后活跃时间 |
| `isCurrent` | bool | 是否当前设备 |
| `activeSessionCount` | int | 活跃会话数 |

### 4.30 `VoiceToTextResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `text` | string | 转写后的文字内容 |
| `language` | string | 识别到的语言 |

## 5. 开放平台 DTO 字段

### 5.1 `CreateBotAppResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名称 |
| `secret` | string | 应用密钥明文，仅创建时返回 |

### 5.2 `RotateCredentialResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `secret` | string | 新密钥明文，仅本次返回 |

### 5.3 `OpenSendMessageRequest`

| 字段 | 类型 | 说明 |
|---|---|---|
| `idempotencyKey` | string | 幂等键 |
| `conversationId` | GUID | 目标会话 ID |
| `messageType` | string | 当前仅支持 `text/markdown/image/video` |
| `body` | `MessageBodyDto` | 消息正文 |
| `replyToMessageId` | GUID? | 回复消息 ID |
| `mentions` | `MentionDto[]`? | @ 列表 |

### 5.4 `DeliveryLogDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递 ID |
| `topic` | string | 事件主题；当前公开主题包括 `message.created`、`message.read`，订阅时也兼容 `message.received` 作为 `message.created` 的别名 |
| `status` | short | 投递状态：`0=pending`、`1=delivered`、`2=retrying`、`3=dead_letter`、`9=processing` |
| `retryCount` | int | 已重试次数 |
| `createdAt` | datetime | 创建时间 |
| `deliveredAt` | datetime? | 实际送达时间 |

## 6. 音视频 DTO 字段

### 6.1 `MediaRelayNodeDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `nodeId` | string | 节点 ID |
| `address` | string | 节点地址 |
| `port` | int | 节点端口 |
| `region` | string | 区域 |
| `capabilities` | string | 能力说明文本 |
| `audioCodec` | string | 节点音频编码能力，当前固定为 `OPUS/48000` |
| `videoCodec` | string | 节点视频编码能力，当前固定为 `VP8/90000` |
| `maxCalls` | int | 最大通话数 |
| `activeCalls` | int | 当前活跃通话数 |
| `cpuUsage` | double | CPU 使用率 |
| `status` | string | 节点状态，通常为 `online/maintenance/offline` |
| `lastHeartbeat` | datetime | 最近心跳时间 |

### 6.2 `CallSessionDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `callId` | GUID | 通话 ID |
| `callerUserId` | GUID | 主叫用户 ID |
| `calleeUserId` | GUID? | 被叫用户 ID |
| `serviceAccountId` | GUID? | 服务账号 ID |
| `agentUserId` | GUID? | 客服/代理用户 ID |
| `nodeId` | string | 承载节点 ID |
| `state` | short | 通话状态：`0=initiating`、`1=ringing`、`2=active`、`3=ended`、`4=failed`、`5=rejected`、`6=timeout`、`7=cancelled` |
| `hangupCause` | short? | 挂断原因：`0=normal`、`1=caller_hangup`、`2=callee_hangup`、`3=rejected`、`4=timeout`、`5=cancelled`、`6=failed`、`7=admin_force_end`、`8=node_offline`、`9=connection_lost` |
| `hangupReason` | string? | 自定义挂断原因文本 |
| `callerSdpOffer` | string? | 主叫 SDP Offer |
| `calleeSdpOffer` | string? | 被叫 SDP Offer |
| `mediaMode` | string | 媒体模式，当前通常为 `audio` 或 `audio-video` |
| `callerHasVideo` | bool | 主叫是否带视频轨 |
| `calleeHasVideo` | bool | 被叫是否带视频轨 |
| `audioCodec` | string? | 音频编解码；音视频通话固定为 `OPUS/48000`，按聊天语音使用单声道、16-24kbps、FEC + DTX |
| `videoCodec` | string? | 视频编解码 |
| `callerVideoProfile` | string? | 主叫视频档位 |
| `calleeVideoProfile` | string? | 被叫视频档位 |
| `negotiatedVideoProfile` | string? | 最终协商档位 |
| `startedAt` | datetime | 创建/开始时间 |
| `ringingAt` | datetime? | 振铃时间 |
| `answeredAt` | datetime? | 接通时间 |
| `endedAt` | datetime? | 结束时间 |
| `durationSeconds` | int? | 通话时长 |
| `recordingId` | GUID? | 录音 ID |
| `recordingPath` | string? | 录音路径 |
| `metadata` | string? | 扩展元数据 |
| `createdAt` | datetime | 创建时间 |

### 6.3 `CallRecordingDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 所属租户 |
| `recordingId` | GUID | 录音 ID |
| `callId` | GUID | 通话 ID |
| `nodeId` | string | 录制节点 ID |
| `filePath` | string | 文件路径 |
| `fileSize` | long? | 文件大小 |
| `durationSeconds` | int? | 时长 |
| `format` | string | 文件格式 |
| `startedAt` | datetime | 开始时间 |
| `endedAt` | datetime? | 结束时间 |
| `createdAt` | datetime | 创建时间 |

## 7. 完整枚举补充

### 7.1 平台空间 `spaceType`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `selection_required` | 需要客户端展示空间选择页 |
| `1` | `personal` | 进入个人空间 |
| `2` | `tenant` | 进入租户空间 |

### 7.2 租户角色 `membershipRole`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `member` | 普通成员 |
| `1` | `technical` | 技术支持 |
| `2` | `customer_service` | 客服 |
| `3` | `admin` | 管理员 |
| `4` | `owner` | 所有者 |

### 7.3 入租方式 `joinMethod`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `self` | 自助创建或默认加入 |
| `1` | `invite` | 通过邀请加入 |
| `2` | `approval` | 通过申请审批加入 |

### 7.4 成员关系状态 `membershipStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending` | 待生效 |
| `1` | `active` | 有效成员 |
| `2` | `left` | 用户主动退出 |
| `3` | `removed` | 被移除 |

### 7.5 租户状态 `status`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending_approval` | 待审核 |
| `1` | `active` | 已激活 |
| `2` | `suspended` | 已暂停 |
| `9` | `deleted` | 已删除 |

### 7.6 邀请类型 `inviteType`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `public` | 通用邀请，不限制目标账号 |
| `1` | `targeted` | 定向邀请，要求当前账号匹配目标手机号或邮箱 |

### 7.7 邀请状态 `InvitationDto.status`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `revoked` | 已撤销 |
| `1` | `active` | 可用 |
| `3` | `exhausted` | 使用次数耗尽 |

### 7.8 加入申请状态 `JoinRequestDto.status`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending` | 待审批 |
| `1` | `approved` | 已通过 |
| `2` | `rejected` | 已拒绝 |
| `3` | `cancelled` | 申请人已撤销 |

### 7.9 用户类型 `userType`

| 值 | 名称 | 说明 |
|---|---|---|
| `1` | `customer` | 客户 / 普通用户 |
| `2` | `staff` | 员工 / 客服 / 管理角色用户 |
| `3` | `visitor` | Widget / 临时会话访客投影用户 |

补充：

- 当租户角色 `membershipRole >= technical(1)` 时，系统会强制归一化为 `userType=2`
- 默认官方账号在租户内也会投影成 `userType=2` 的系统用户；这类用户应额外结合 `isOfficialServiceUser=true` 识别
- `userType=3` 仅用于访客客服临时会话链路，后台通用用户管理默认会排除此类访客投影

### 7.9.1 客户服务归属字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOfficialServiceUser` | bool | 当前用户是否是租户默认官方账号投影 |
| `assignedStaffDisplayName` | string? | 当前负责该客户的员工显示名；客户列表/详情常用 |
| `assignedCustomerCount` | int | 当前员工负责的客户数；员工列表/详情常用 |
| `assignedAt` | datetime? | 当前客服归属建立时间 |

`CustomerServicePeer` 风格对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `conversationId` | GUID? | 与当前客户的服务单聊 ID |
| `isFriend` | bool | 当前是否已建立好友关系 |

`CustomerServiceContext` 风格对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOfficialServiceUser` | bool | 当前目标用户是否就是默认官方账号 |
| `officialAccount` | object? | 当前租户默认官方账号 |
| `assignedStaff` | object? | 当前负责该客户的员工 |
| `assignedAt` | datetime? | 当前归属建立时间 |
| `assignedCustomerCount` | int | 当前员工负责客户数 |
| `assignableStaff` | object[] | 可分配客服列表 |

### 7.9.2 统一客服中心线程字段

`CustomerServiceThread*` 风格对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | 统一客服线程类型；当前公开值为 `temp_session`、`direct_customer` |
| `threadId` | GUID | 统一客服线程 ID；客服端和后台都应优先用它定位线程 |
| `conversationId` | GUID | 底层实际会话 ID；对 `direct_customer` 不等于 `threadId` |
| `assignedStaffUserId` | GUID? | 当前负责客服用户 ID |
| `assignedStaffDisplayName` | string? | 当前负责客服显示名 |
| `queuePosition` | int? | 排队位置 |
| `estimatedWaitSeconds` | int? | 预计等待秒数 |

补充：

- 路由里的 `threadType` 同时兼容下划线和中划线；公开响应值固定使用 `temp_session`、`direct_customer`
- `direct_customer` 的 `threadId` 是稳定客服线程标识，`conversationId` 才是实际直聊 `chatId`
- `temp_session` 的 `threadId` 与会话线程主键一致，但也仍建议统一按 `threadType + threadId` 使用

### 7.9.3 自动话术规则类型 `TempSessionAutoReply.ruleType` 🆕 2026-06-10

管理端 `/customer-service/temp-sessions/auto-replies` CRUD 使用:

| 值 | 含义 | 触发时机 |
|---|---|---|
| `0` | 开场白 | 访客进线创建会话时自动发送 |
| `1` | 关键词自动回复 | 访客消息包含 `keywordPattern`(大小写不敏感)时以系统消息自动发话;`keywordPattern` 必填 |
| `2` | 排队提示 | 会话进入排队时发送 |

匹配优先级:同 `ruleType` 下 locale 精确命中 > `*`,再按 `sortOrder` 取第一条;`category`/`skillGroupId` 为空表示不限定。

### 7.9.4 已读时间字段 `lastReadAt` / `readAt` / `peerLastReadAt` 🆕 2026-06-10

出现在单聊 `read-status`、群 `read-receipts`、temp 会话 `read-status` 与 `msg.read` 实时帧:只在对应用户**标记已读**时推进(不被置顶/免打扰等无关写入刷新);`null` = 该用户从未上报过已读(历史老数据),客户端应按"未知"渲染而非 1970。

### 7.10 用户状态 `status`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `disabled` | 已禁用 |
| `1` | `active` | 正常可用 |

### 7.11 性别 `gender`

| 写入值 | 归一化值 | 说明 |
|---|---|---|
| `0` / `unset` / 空字符串 | `unset` | 未设置 |
| `1` / `male` | `male` | 男 |
| `2` / `female` | `female` | 女 |
| `3` / `other` | `other` | 其他 |

### 7.12 设备类型 `deviceType`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `unknown` | 未知 |
| `1` | `ios` | iOS |
| `2` | `android` | Android |
| `3` | `web` | Web |
| `4` | `desktop` | 桌面端 |

### 7.13 平台登录 `loginType`

| 值 | 说明 |
|---|---|
| `auto` | 自动识别账号类型 |
| `email` | 按邮箱登录 |
| `mobile` | 按手机号登录 |
| `lpp_id` | 按 LPP ID 登录 |

### 7.14 验证码通道 `channel`

| 值 | 说明 |
|---|---|
| `sms` | 短信 |
| `email` | 邮件 |

### 7.15 消息类型 `messageType`

公开 API 中以字符串形式出现;数据库存储为 short(列出供需要原始值的集成方参考)。

| 公开值 | 存储 short | 说明 |
|---|---|---|
| `text` | `1` | 文本 |
| `markdown` | `2` | Markdown |
| `image` | `3` | 图片 |
| `video` | `4` | 视频 |
| `voice` | `5` | 语音 |
| `file` | `6` | 文件 |
| `contact_card` | `7` | 名片 |
| `call_log` | `8` | 通话记录 |
| `event` | `9` | 系统事件;客户端主动发送通常不使用 |
| `location` | `10` | 位置 |

**注意发送方与订阅方的差别**:

- 客户端 `POST /api/client/v1/messages/send` 接受全部 10 种类型
- 开放平台 `POST /api/open/v1/apps/{appId}/messages/send` 当前只接受 `text` / `markdown` / `image` / `video` 4 种;其它返回 `400 MSG_TYPE_UNSUPPORTED`
- Webhook 入站 payload 中的 `messageType` 可能包含全部 10 种,订阅方处理时务必覆盖完整集合

### 7.16 会话类型 `conversationType`

| 公开值 | 存储枚举 | 说明 |
|---|---|---|
| `direct` | `1` | 单聊 |
| `group` | `2` | 群聊 |
| `temp_session` | `3` | 临时会话（访客客服） |

> 注意：客户端 `GET /conversations`（纯 IM 列表）只返回 `direct`/`group`；`temp_session` 仅出现在客服接口与 Gateway 实时事件中。

### 7.16.1 消息来源类型 `sourceType`（Gateway `msg.new`）

`msg.new` 推送帧携带的**消息级**来源判别符（2026-06-03 新增），二值，用于客户端分流"在线客服(widget)"与"IM"：

| 值 | 说明 |
|---|---|
| `widget` | 在线客服：来自 Web Widget 的访客会话（对应 `conversationType=temp_session`） |
| `im` | 普通 IM：单聊或群聊（对应 `conversationType=direct`/`group`） |

判别建议：`sourceType === "widget"` 即在线客服，否则为 IM。与 `conversationType` 的对应关系是 `temp_session → widget`、`direct/group → im`（`temp_session` 与 widget 严格等价：`temp_session` 的唯一来源就是 widget 访客建会话）。

> **边界**：`sourceType` 只回答"这条消息来自 widget 还是 IM"。**会话级属性**（能否拉黑、能否转接、归属坐席、接待是否进行中等）不在消息帧里，请从会话/客服接口获取。
>
> 服务端内部另有一个 `Conversation.ServiceMode`（0 普通 / 1 IM 客服 direct / 2 widget）用于客服工作台与统计，**不对外出现在 `msg.new` 帧**；第三方按 `sourceType` 判别即可，无需关心 `ServiceMode`。

### 7.17 群成员角色 `role`

| 值 | 说明 |
|---|---|
| `owner` | 群主 |
| `admin` | 群管理员 |
| `member` | 普通成员 |

### 7.18 群全员禁言 `muteMode`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `normal` | 正常发言 |
| `1` | `all_muted` | 全员禁言，普通成员不可发言 |

### 7.19 成员禁言 `muteMode`

| 值 | 说明 |
|---|---|
| `0` | 未禁言 |
| `1` | 已禁言 |

### 7.20 用户级禁言 `muteMode`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `normal` | 正常 |
| `1` | `muted` | 明确禁言 |
| `2` | `shadow_muted` | 影子禁言，前端可按后台语义展示 |

### 7.21 好友申请处理动作 `action`

| 值 | 说明 |
|---|---|
| `accept` | 接受 |
| `reject` | 拒绝 |

### 7.22 Webhook 主题 `topic`

精确订阅:

| 值 | 说明 |
|---|---|
| `message.created` | 新消息创建 |
| `message.read` | 消息已读回执 |
| `message.received` | `message.created` 的别名(订阅时可填,实际下发的 `topic` 为 `message.created`) |
| `message.recalled` | 消息被撤回 |

前缀订阅(订阅集合中只要填该前缀,所有以它开头的事件都会下发):

| 前缀 | 已知子主题 |
|---|---|
| `temp_session.` | `temp_session.created` / `.assigned` / `.transferred` / `.closed` / `.rated` |
| `im_customer_service.` | `im_customer_service.created` / `.assigned` / `.transferred` / `.closed` / `.rated` / `.ai_disabled` |

> 子主题列表会随业务演进新增,**新增主题无需修改订阅集合**就会自动开始投递。如果你的处理逻辑只接受白名单主题,请按需在客户端额外做一次类型筛选。

### 7.23 Webhook 投递状态 `DeliveryLogDto.status`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending` | 待投递 |
| `1` | `delivered` | 已送达 |
| `2` | `retrying` | 重试中 |
| `3` | `dead_letter` | 达到最大重试次数后失败 |
| `9` | `processing` | 内部处理中状态，通常不作为外部筛选值使用 |

### 7.24 音视频通话状态 `CallState`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `initiating` | 发起中 |
| `1` | `ringing` | 振铃中 |
| `2` | `active` | 通话中 |
| `3` | `ended` | 正常结束 |
| `4` | `failed` | 失败(接通后中途出错) |
| `5` | `rejected` | 被拒绝 |
| `6` | `timeout` | 超时 |
| `7` | `cancelled` | 发起方取消 |
| `8` | `initiation_failed` | 通话建立阶段失败(接通前;与中途 `failed` 区分) |

### 7.25 挂断原因 `HangupCause`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `normal` | 正常结束 |
| `1` | `caller_hangup` | 主叫挂断 |
| `2` | `callee_hangup` | 被叫挂断 |
| `3` | `rejected` | 被拒绝 |
| `4` | `timeout` | 超时 |
| `5` | `cancelled` | 已取消 |
| `6` | `failed` | 失败 |
| `7` | `admin_force_end` | 管理员强制结束 |
| `8` | `node_offline` | 中继节点离线 |
| `9` | `connection_lost` | 连接丢失 |

### 7.26 租户功能特性 `features_json` 字段

| 字段 | 类型 | 可选值 | 说明 |
|---|---|---|---|
| `friendMode` | string | `social` `isolation` | 好友模式；`social`=客户可互加好友，`isolation`=客户间隔离 |
| `joinApprovalMode` | string | `manual` `auto` | 加入审批模式；`manual`=人工审核（默认），`auto`=自动通过 |
| `customerServiceMode` | string | `auto` `designated` | 客服分配模式；`auto`=自动轮询（默认），`designated`=指定客服 |
| `designatedServiceStaffId` | GUID? | — | 指定客服 ID；仅 `customerServiceMode=designated` 时有效 |
| `tempSessionEnabled` | bool | `true` `false` | 是否启用临时会话（访客客服）功能 |
| `tempSessionVersion` | int | — | 临时会话配置版本号 |

### 7.27 媒体节点状态 `MediaRelayNodeDto.status`

| 值 | 说明 |
|---|---|
| `online` | 在线 |
| `maintenance` | 维护中 |
| `offline` | 离线 |

## 8. 使用建议

- 遇到 `short` 型状态字段时，优先按本文件的枚举表做映射，不要自行猜测
- 对接时如需展示文案，建议同时保留“原始值 + 显示文案”两层
- `platformToken` 与租户空间 `accessToken` 不能混用
- 公开接口优先依赖字符串枚举；只有接口明确返回 `short` 时再按数值表处理

## 9. 临时会话（访客客服）枚举

### 9.1 临时会话状态 `TempSessionStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `created` | 已创建 |
| `1` | `queued` | 排队中 |
| `2` | `active` | 活跃（客服服务中） |
| `3` | `assisting` | 协助中 |
| `4` | `transfer_pending` | 转接中 |
| `5` | `closed_by_visitor` | 访客关闭 |
| `6` | `closed_by_staff` | 客服关闭 |
| `7` | `closed_timeout` | 超时关闭 |
| `8` | `closed_system` | 系统关闭 |
| `9` | `archived` | 已归档 |

> **service-history 的 `status` 过滤**（`/api/client/v1/customer-service/staff/service-history` 与管理端 `center/staff/{staffUserId}/service-history`，2026-06-10 起）：推荐用语义值——`open`(temp=0..4 / im_direct=1,2)、`queued`(temp=1 / im_direct=1)、`active`(temp=2,3,4 / im_direct=2)、`closed`(temp=5,6,7,8,9 / im_direct=3)。也兼容直接传单个数字（原样套两渠道；注意两渠道数字含义不同——`3` 在 temp_session 是协助中、在 im_direct 是已关闭，所以跨渠道过滤请优先用语义值）。非法值返回 400 `CUSTOMER_SERVICE_HISTORY_STATUS_INVALID`。

### 9.2 AI 服务状态 `TempSessionAiServiceStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `inactive` | 未启用 |
| `1` | `bot_active` | AI 接管中 |
| `2` | `handoff_pending` | 转人工待处理 |
| `3` | `human_serving` | 人工服务中 |

### 9.3 客服在线状态 `TempSessionStaffStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `offline` | 离线 |
| `1` | `online` | 在线 |
| `2` | `busy` | 忙碌 |
| `3` | `break` | 休息中 |

### 9.4 参与者角色 `TempSessionParticipantRole`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `visitor` | 访客 |
| `1` | `primary_staff` | 主客服 |
| `2` | `assist_staff` | 协助客服 |
| `3` | `ai_bot` | AI 机器人 |

### 9.5 AI 任务状态 `TempSessionAiJobStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending` | 待处理 |
| `1` | `processing` | 处理中 |
| `2` | `completed` | 已完成 |
| `3` | `failed` | 失败 |

### 9.6 知识库构建状态 `TempSessionKnowledgeBuildStatus`

| 值 | 说明 |
|---|---|
| `queued` | 排队中 |
| `processing` | 构建中 |
| `ready` | 就绪 |
| `failed` | 失败 |

---

## 10. 新增枚举（v3 补齐）

### 10.1 隐私设置 `allowFriendRequest`

| 值 | 说明 |
|---|---|
| `everyone` | 所有人可发送好友申请 |
| `friends_of_friends` | 仅有共同好友的用户可发送 |
| `nobody` | 不接受任何好友申请 |

### 10.2 隐私设置 `profileVisibility`

| 值 | 说明 |
|---|---|
| `everyone` | 所有人可查看资料 |
| `friends` | 仅好友可查看 |
| `nobody` | 除本人外不可查看 |

### 10.3 平台用户状态 `platform_users.status`（扩展）

| 值 | 说明 |
|---|---|
| `1` | 活跃 |
| `2` | 禁用 |
| `3` | 已注销（冷静期 7 天） |

### 10.4 反馈类型 `feedback_type`

| 值 | 说明 |
|---|---|
| `complaint` | 投诉 |
| `suggestion` | 建议 |
| `bug` | Bug 报告 |

### 10.5 反馈状态 `user_feedbacks.status`

| 值 | 说明 |
|---|---|
| `0` | 待处理 |
| `1` | 处理中 |
| `2` | 已处理 |

### 10.6 验证码用途 `purpose`（扩展）

| 值 | 说明 |
|---|---|
| `register` | 注册 |
| `login` | 登录 |
| `reset_password` | 重置密码 |
| `deactivate` | 注销账号 |
| `change_mobile` | 修改手机号 |
| `change_email` | 修改邮箱 |

---

## 11. 新增枚举（v4 审计补齐）

本章节补齐在跨文档审计中发现的、此前未在本文件中集中定义的枚举和值域。

### 11.1 强制登出原因 `auth.force_logout` reason

Gateway 服务端推送事件 `auth.force_logout` 中的 `reason` 字段值域。

| 值 | 说明 |
|---|---|
| `device_revoked` | 设备被移除（用户在其他设备上撤销了当前设备） |
| `account_deactivated` | 账号注销申请已提交，进入冷静期 |

补充：

- 事件推送后服务端会立即断开该连接
- `account_deactivated` 场景下，payload 还会携带 `deactivateRequestedAt` 和 `cooldownEndsAt` 字段，客户端可据此展示冷静期倒计时
- 管理后台的"强制下线用户"操作（`POST /api/admin/v1/users/{userId}/force-logout`）走的是会话撤销链路，不通过此事件推送

`auth.force_logout` 事件完整 payload 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `event` | string | 固定为 `auth.force_logout` |
| `platformUserId` | GUID? | 平台用户 ID |
| `deviceId` | GUID? | 被撤销的设备 ID；`account_deactivated` 时为 `null` |
| `reason` | string | 强制登出原因：`device_revoked` 或 `account_deactivated` |
| `revokedAt` | datetime | 会话撤销时间 |
| `deactivateRequestedAt` | datetime? | 注销申请时间；仅 `account_deactivated` 时有值 |
| `cooldownEndsAt` | datetime? | 冷静期结束时间；仅 `account_deactivated` 时有值 |

### 11.2 黑名单封禁维度 `TempSessionBlacklistEntry.targetType`

临时会话（访客客服）黑名单的封禁维度类型。

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `ip` | 按 IP 地址封禁 |
| `1` | `fingerprint` | 按浏览器指纹封禁 |
| `2` | `customer_id` | 按外部客户 ID 封禁 |
| `3` | `visitor_id` | 按访客 ID 封禁 |

补充：

- 黑名单匹配逻辑按 `targetType` 逐一比对 `targetValue`，命中任一条即拒绝访客创建会话
- 当前源码中 `targetType=0/1/2` 三种维度参与实际匹配；`targetType=3`（visitor_id）为预留扩展维度
- `expiresAt` 为空时表示永久封禁

### 11.3 敏感词处理模式 `TempSessionSensitiveWord.actionMode`

临时会话（访客客服）敏感词的处理模式。

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `mark` | 标记：不阻止发送，但在后台标记该消息含敏感词 |
| `1` | `replace` | 替换：将敏感词替换为 `***` 后发送 |
| `2` | `block` | 拦截：直接阻止该消息发送 |

### 11.4 公告状态 `Announcement.status`

企业公告的生命周期状态。

| 值 | 说明 |
|---|---|
| `draft` | 草稿；仅管理后台可见，客户端不会返回 |
| `published` | 已发布；客户端 `GET /announcements` 可见 |
| `archived` | 已归档；客户端不再返回 |

补充：

- 状态流转为单向：`draft` → `published` → `archived`
- 仅 `draft` 状态的公告可编辑
- 客户端接口仅返回 `published` 且未过期的公告

### 11.5 公告优先级 `Announcement.priority`

| 值 | 说明 |
|---|---|
| `normal` | 普通优先级（默认） |
| `important` | 重要；客户端列表中排序靠前 |
| `urgent` | 紧急；最高优先级 |

补充：

- 客户端公告列表按 `priority` 降序 + `publishedAt` 降序排列
- 当前源码排序逻辑中 `important` 优先于 `normal`；`urgent` 为预留最高优先级

### 11.6 公告目标范围 `Announcement.targetScope`

| 值 | 说明 |
|---|---|
| `all` | 全员可见（默认） |
| `tenant` | 指定租户可见；需配合 `targetId` 指定租户 ID |
| `role` | 指定角色可见；需配合 `targetCode` 指定角色编码 |

`targetScope=role` 时 `targetCode` 的有效值：

| targetCode | 匹配的用户范围 |
|---|---|
| `customer` | `userType=1`（客户） |
| `staff` | `userType=2`（员工），不区分具体 `membershipRole` |
| `member` | `userType=2` 且 `membershipRole=0`（普通成员）或 `membershipRole=4`（所有者） |
| `technical` | `userType=2` 且 `membershipRole>=1`（技术支持及以上） |
| `customer_service` | `userType=2` 且 `membershipRole>=2`（客服及以上） |
| `admin` | `userType=2` 且 `membershipRole>=3`（管理员及以上） |
| `owner` | `userType=2` 且 `membershipRole=4`（所有者） |

补充：

- `targetCode` 支持多种别名写入（如 `cs`、`customerservice`、`administrator` 等），服务端会归一化为上表中的标准值
- 角色匹配采用向上包含逻辑：`owner` 能看到 `admin`、`customer_service`、`technical`、`member`、`staff` 定向的公告

### 11.7 导出任务状态 `ExportTask.status`

| 值 | 说明 |
|---|---|
| `pending` | 待处理（域模型默认值） |
| `processing` | 处理中；任务已开始执行 |
| `completed` | 已完成；可通过 `GET /export-tasks/{taskId}/download` 下载 |
| `failed` | 失败；执行过程中发生错误 |

补充：

- 创建导出任务时，状态直接设为 `processing` 并同步执行
- 成功后状态变为 `completed`，同时填充 `fileName`、`downloadUrl`、`recordCount`
- 失败后状态变为 `failed`，`fileName` 和 `downloadUrl` 置空

### 11.8 告警严重级别 `AlertRule.severity` / `AlertHistory.severity`

| 值 | 说明 |
|---|---|
| `info` | 信息级别 |
| `warning` | 警告级别（域模型默认值） |
| `critical` | 严重级别 |

### 11.9 告警历史状态 `AlertHistory.status`

| 值 | 说明 |
|---|---|
| `firing` | 触发中（默认初始状态） |
| `acknowledged` | 已确认；管理员已知悉 |
| `silenced` | 已静默；暂时忽略 |
| `resolved` | 已解决 |

### 11.10 通知渠道类型 `NotifyChannel.channelType`

| 值 | 说明 |
|---|---|
| `email` | 邮件通知（域模型默认值） |
| `webhook` | Webhook 回调通知 |
| `sms` | 短信通知 |

补充：

- `config` 字段为 JSON 字符串，具体结构取决于 `channelType`
- 可通过 `POST /notify-channels/{channelId}/test` 测试渠道连通性

### 11.11 平台租户永久删除检查项 `PlatformTenantPermanentDeleteCheckDto.key`

平台管理员在执行租户物理删除前，系统会检查以下关联数据维度：

| key | 标签 | 说明 |
|---|---|---|
| `memberships` | 租户成员关系 | 成员关系清空后，才适合做物理删除 |
| `users` | 租户用户 | 需要先迁移或确认不再保留租户用户 |
| `joinRequests` | 加入申请 | 未清理的申请记录会保留租户痕迹 |
| `conversations` | 会话 | 建议先导出或归档会话数据 |
| `messages` | 消息 | 消息是高风险数据，物理删除前必须确认合规与备份 |
| `tempSessions` | 临时会话 | 临时会话记录仍在时，不建议做彻底删除 |
| `systemConfigs` | 租户配置 | 系统配置需要先确认不再用于恢复或审计 |
| `userSessions` | 活跃/历史会话令牌 | 需要先清理租户用户的登录态 |

补充：

- 每个检查项返回 `count`（关联数据条数）和 `recommendation`（建议操作）
- 只有当租户状态为 `deleted`（已归档）且所有检查项 `count` 均为 0 时，`canPermanentlyDelete` 才为 `true`
- 执行物理删除时需在请求体中传入 `tenantCodeConfirm` 进行二次确认

### 11.12 告警规则条件 `AlertRule.condition`

| 值 | 说明 |
|---|---|
| `gt` | 大于阈值（域模型默认值） |
| `gte` | 大于等于阈值 |
| `lt` | 小于阈值 |
| `lte` | 小于等于阈值 |
| `eq` | 等于阈值 |

### 11.13 临时会话优先级 `TempSession.priority`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `urgent` | 紧急 |
| `1` | `high` | 高 |
| `2` | `normal` | 普通（默认） |

## 12. 移动推送相关枚举

涉及 `/api/v1/notifications/*`（客户端）与 `/api/admin/v1/notifications/*`（管理端），源于 `ZTChat.Modules.Notifications.Contracts` 与 `.Domain`。

### 12.1 `DevicePlatform`

| 值 | 名称 | 说明 |
|---|---|---|
| `1` | `Android` | Android 原生端 |
| `2` | `iOS` | iOS 原生端 |

Web 端不走该模块（统一走 SignalR / WebSocket）。

### 12.2 `PushChannel`

| 值 | 名称 | 说明 |
|---|---|---|
| `1` | `Fcm` | Firebase Cloud Messaging；基于 `FirebaseAdmin` SDK |
| `2` | `JPush` | 极光推送；基于 REST `/v3/push` + Basic Auth |

同一设备可同时注册两个通道，服务端按路由规则择一发送。

### 12.3 `PushScenario`

| 值 | 名称 | 业务触发点 |
|---|---|---|
| `1` | `Message` | 直聊 / 群聊新消息；群公告不推送 |
| `2` | `Call` | 语音/视频来电邀请；高优先级 |
| `3` | `FriendRequest` | 好友申请（首次提交）；高优先级 |
| `4` | `FriendRequestResult` | 好友申请被接受/拒绝；高优先级 |
| `5` | `TenantJoinRequest` | 租户入驻申请（管理员接收）；高优先级 |
| `6` | `TenantJoinRequestResult` | 租户入驻申请结果（申请人接收）；高优先级 |
| `7` | `GroupJoinRequest` | 入群申请（群主/管理员接收）；高优先级 |
| `8` | `GroupJoinRequestResult` | 入群申请结果（申请人接收）；高优先级 |

下行 payload 中通过 `data.scenario`（FCM）或 `extras.scenario`（JPush）字段携带，客户端据此做点击路由。

> **关于场景 5–8**：这些"加入申请类"事件在服务端单一时机发布后，会**同时**进入移动端推送、管理后台实时通道（`/ws/admin`）、以及订阅了对应事件类型的 Webhook 应用（详见 [open-platform.md §12](open-platform.md)）。三条通道独立投递、互不阻塞、互不依赖。

### 12.4 `PushStatus`（`PushLog.status`）

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `Pending` | 入库瞬时初始状态 |
| `1` | `Success` | 发送成功 |
| `2` | `Failed` | 发送失败；`errorCode`/`errorMessage` 带详情 |
| `3` | `TokenInvalid` | Token 已失效；服务端已将对应 `DeviceRegistration.IsActive` 置 `false` |

### 12.5 `RoutingRuleType`（`PushRoutingRule.ruleType`）

| 值 | 名称 | `matchValue` 约定 | 比较方式 |
|---|---|---|---|
| `1` | `PlatformDefault` | `Android` / `iOS` | 精确匹配 |
| `2` | `Region` | 地域标识（如 `CN`、`SG`） | 大小写不敏感 |
| `3` | `Tenant` | `tenantId`（GUID） | 精确匹配 |
| `4` | `User` | `userId`（GUID） | 精确匹配 |

Dispatcher 选通道优先级：`User` → `Tenant` → `Region` → `PlatformDefault` → 设备自身 `channel`。同类型内部按 `Priority` 升序先匹配。

### 12.6 Provider 失效错误码映射

以下 Provider 错误码会被服务端映射为 `PushStatus.TokenInvalid` 并软删设备：

| 通道 | 错误码 | 含义 |
|---|---|---|
| FCM | `MessagingErrorCode.Unregistered` | Token 未注册 / 已卸载 |
| FCM | `MessagingErrorCode.InvalidArgument` | Token 无效 |
| JPush | `1011` | 设备不存在 |
| JPush | `1012` | registration_id 不合法 |
| JPush | `1020` | 目标设备未注册 |

### 12.7 系统错误码

Dispatcher 自身产生的系统错误码：

| `errorCode` | 含义 |
|---|---|
| `PROVIDER_NOT_REGISTERED` | 选定通道对应的推送 Provider 未注册(凭证未配置 / 未启用) |

## 13. AI 服务配置相关枚举

适用于管理后台 `/api/admin/v1/ai-service/*` 接口。详细字段见 [admin-api.md](./admin-api.md) AI 服务配置中心章节。

### 13.1 RAG 融合策略 `ragFusionStrategy`

| 值 | 名称 | 说明 |
|---|---|---|
| `rrf` | RRF(默认) | 数学方法合并向量检索 + 词法检索的两路 rank;零额外成本,延迟极低 |
| `reranker` | 纯 Reranker | 双源各取候选 → 合并 → 调外部 reranker 重排;质量高,有 API 成本 |
| `hybrid` | Hybrid(推荐) | RRF 先做 topK*3 粗筛 → reranker 精排;精度与成本的折中 |

### 13.2 Provider 预设 `replyProvider` / `embeddingProvider` / `rerankerProvider`

| 值 | 说明 |
|---|---|
| `builtin` | 平台内置(若已配置) |
| `openrouter` | OpenRouter 聚合 API |
| `openai` | OpenAI 官方 API |
| `anthropic` | Anthropic 官方 API |
| `xai` | xAI |
| `opencode-go` | OpenCode Go 兼容服务 |
| `moonshot` | Moonshot |
| `openai-compatible` | 任何 OpenAI 兼容的私有部署 |
| `anthropic-compatible` | 任何 Anthropic 兼容的私有部署 |

### 13.3 Provider API 协议 `providerApiFormat`

| 值 | 说明 |
|---|---|
| `openai` | OpenAI Chat Completions 协议 |
| `anthropic` | Anthropic Messages 协议 |

### 13.4 AI 配置 API key 字段约定

`/api/admin/v1/ai-service/config` 在 GET 时**始终脱敏**返回 API key 相关字段:

| 字段后缀 | GET 行为 | PUT 行为 |
|---|---|---|
| `*ApiKeyPlaintext` | 始终 `null` | 写入时填明文;服务端加密存储 |
| `*ApiKeyCiphertext` | 始终 `null`(不暴露密文) | 不要客户端填写 |
| `*ApiKeyPreview` | 返回末 4 位(例如 `****abcd`),用于前端展示 | 不要客户端填写 |
| `has*ApiKey`(若存在) | 用于前端判断"是否已配置" | — |

集成方做"已配置"判断时,**永远不要**依赖 `*ApiKeyCiphertext` 是否非空——它在公开接口里始终为 null。

## 14. 客服直聊线程相关枚举

适用于 `/api/client/v1/customer-service/im-direct/*`(客户侧)与统一客服中心 `/api/admin/v1/customer-service/*`(管理 / 客服侧)。

### 14.1 线程类型 `threadType`

| 值 | 说明 |
|---|---|
| `temp_session` | 访客临时会话(Widget 入口) |
| `direct_customer` | 注册客户的 IM 直聊客服线程 |

### 14.2 IM 直聊线程状态 `imCustomerServiceThread.status`

| 值 | 说明 |
|---|---|
| `pending` | 待分配客服 |
| `active` | 已分配,进行中 |
| `transferred` | 已转派 |
| `closed` | 已关闭 |

### 14.3 客服评分 `rating`

`rating` 为 1..5 的整数,1=极差,5=非常满意。可选附 `comment` 文本与 `tags[]` 标签(标签内容由租户管理员预设)。

## 15. 好友相关枚举与 DTO

### 15.1 邀请二维码 `FriendInviteQr.status`

| 值 | 说明 |
|---|---|
| `active` | 未撤销且未用完,可被扫码接受 |
| `revoked` | 已被发起方主动撤销 |
| `exhausted` | 已用完(达到使用次数上限,或一次性邀请已被使用) |

> 此处为字符串字段,消费端按字符串处理;不需要按数值映射。

### 15.2 `FriendInviteQrDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tokenId` | GUID | 邀请记录 ID(用于 `DELETE /friends/invite-qr/{tokenId}` 撤销) |
| `token` | string | 邀请 token,二维码内容承载 |
| `qrPayload` | string | 二维码渲染所需的完整 payload(包含 token 与展示元信息) |
| `inviterUserId` | GUID | 发起方用户 ID |
| `status` | string | 见 §15.1 |
| `maxUses` | int? | 最大使用次数;`null` 表示不限 |
| `usedCount` | int | 已被接受的次数 |
| `expireAt` | DateTimeOffset? | 过期时间;`null` 表示永久有效 |
| `createdAt` | DateTimeOffset | 创建时间 |

### 15.3 `FriendInviteQrPreviewDto`(`GET /friends/invite-qr/{token}/preview`)

匿名可访问。返回发起方的最小展示信息,**不暴露发起方完整资料**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `displayName` | string | 发起方昵称 |
| `avatarUrl` | string? | 发起方头像 |
| `signature` | string? | 个性签名(可选) |
| `tenantName` | string? | 当邀请来自企业空间时附带的组织名 |
| `status` | string | 邀请状态,见 §15.1 |

## 16. 设备登录抢占相关枚举

适用于设备绑定 / 抢占场景,详见 [client-api.md](./client-api.md) 设备登录抢占章节。

### 16.1 强制下线 `auth.force_logout` `reason` 新增值

在原有 §11.1 列出的 reason 基础上,2026-05 起新增:

| 值 | 说明 |
|---|---|
| `device_claimed_by_other_user` | 同一 deviceId 被另一个账号在 60 秒静默窗外接管;旧账号在该设备上的会话被全部撤销 |

### 16.2 设备抢占错误码

| `code` | HTTP | 含义 |
|---|---|---|
| `AUTH_DEVICE_BOUND_RECENTLY_ACTIVE` | 409 | 同 deviceId 在最近 60 秒被其它账号使用,响应携带 `maskedLoginName`(脱敏)与 `lastSeenAt`;客户端可提示用户稍后重试或换设备 |
| `AUTH_DEVICE_LIMIT_EXCEEDED` | 409 | 单用户绑定设备数已达上限 |
| `AUTH_DEVICE_MISMATCH` | 401 | refresh token 携带的 deviceId 与会话不符 |
