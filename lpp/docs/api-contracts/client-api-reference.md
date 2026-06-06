# 客户端 API 字段与枚举速查

> 文档校对快照：2026-05-22

版本基于当前 `/api/platform/v1`、`/api/client/v1`、`/api/widget/v1` 对外契约整理，目标是让第三方客户端不用翻源码也能确认字段和值域。

主说明文档见 [client-api.md](./client-api.md)。
缺失字段与补充枚举统一见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 平台接口速查

Base URL：`/api/platform/v1`

补充：

- `select-personal-space`、`select-tenant`、`refresh-platform-token` 只接受当前有效的 `platformToken`
- 已换取出来的客户端 `accessToken`，以及 Widget 的 `visitorToken`，都不能调用这些平台换票接口

| 端点 | 方法 | 请求字段 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/auth/register` | POST | `displayName` `password` `mobile?` `email?` `captchaToken?` `captchaAnswer?` `verificationCode?` `tenantId?` | 变体 1（platform-result）：`platformUserId` `lppId` `displayName` `platformToken` `expiresIn` `spaceContext` `pendingApproval`；变体 2（tenant-result）：`tenantId` `userId` `platformUserId` `lppId` `displayName` `accessToken` `refreshToken` `expiresIn` `spaceContext` | `mobile` / `email` 至少提供一个；企业绑定模式下 `tenantId` 必填；响应变体取决于企业绑定模式和 `joinApprovalMode` |
| `/auth/login` | POST | `identifier` `password` `loginType?` `captchaToken?` `captchaAnswer?` `issueRefreshToken?` `trustDevice?` `deviceId?` `deviceName?` `devicePlatform?` `deviceModel?` `appVersion?` | `platformUserId` `lppId` `displayName` `userType` `platformToken` `expiresIn` `tenants[]` `spaceContext` `platformRefreshToken?` `platformRefreshTokenExpiresAt?` `deviceSession?` | `loginType=auto/email/mobile/lpp_id`；`userType` 同上一段；`issueRefreshToken=true` 额外返回 `platformRefreshToken`（前缀 `prt_`）、`trustDevice=true` 额外返回 `deviceSession.deviceSessionToken`（前缀 `ds_`，需带 `deviceId`），见 §1 顶部三层 Token 说明 |
| `/auth/login-by-code` | POST | `identifier` `verificationCode` `loginType?` `captchaToken?` `captchaAnswer?` | `platformUserId` `lppId` `displayName` `userType` `platformToken` `expiresIn` `tenants[]` `spaceContext` | 验证码登录仅支持邮箱/手机号；`userType` 同 `/auth/login` |
| `/auth/verification/settings` | GET | 无 | `smsRequired` `emailRequired` `smsEnabled` `emailEnabled` | 平台侧读取默认平台租户的验证码开关；只暴露 4 个 bool，**不包含**任何 Provider 凭据 |
| `/auth/verification/send` | POST | `identifier` `channel` `purpose?` `captchaToken?` `captchaAnswer?` | `sent` `channel` `error?` | `channel=sms/email`；平台侧 `purpose` 支持 `register`/`login`/`reset_password`/`deactivate`/`change_mobile`/`change_email`；未知登录目标静默成功但不实际发码 |
| `/auth/select-personal-space` | POST | 无 | `tenantId` `userId` `platformUserId` `lppId` `displayName` `accessToken` `refreshToken` `expiresIn` `spaceContext` | 需要平台 Token；进入个人空间 |
| `/auth/select-tenant` | POST | `tenantId` | `tenantId` `userId` `platformUserId` `lppId` `displayName` `accessToken` `refreshToken` `expiresIn` `spaceContext` | 需要平台 Token |
| `/auth/refresh-platform-token-by-refresh-token` | POST | `platformRefreshToken` | `platformUserId` `lppId` `displayName` `platformToken` `expiresIn` `platformRefreshToken` `platformRefreshTokenExpiresAt` | 用刷新凭证（前缀 `prt_`）换新平台 Token，无需 Authorization；凭证每次轮换、必须用新值覆盖、必须串行调用（Web/PC 推荐）；复用触发 `REFRESH_TOKEN_REUSE_DETECTED` 全撤销 |
| `/auth/refresh-platform-token` | POST | 无 | `platformUserId` `lppId` `displayName` `platformToken` `expiresIn` | 兼容路径：用当前有效平台 Token（Authorization 头）换新平台 Token |
| `/auth/device-session/exchange` | POST | `deviceSessionToken` `issueRefreshToken?` | `platformUserId` `lppId` `displayName` `platformToken` `expiresIn` `platformRefreshToken?` `platformRefreshTokenExpiresAt?` | 移动端冷启动用设备会话凭证（前缀 `ds_`）免密换平台 Token，无需 Authorization；90 天无活动失效；错误码 `DEVICE_SESSION_NOT_FOUND/REVOKED/EXPIRED` |
| `/my/tenants` | GET | 无 | `TenantSummaryDto[]` | 仅返回已激活租户 |
| `/my/spaces/unread-summary` | GET | 无 | `spaces[]` `unreadSpaceCount` `totalUnreadConversationCount` `totalUnreadMessageCount` | 按平台账号聚合个人空间和租户空间未读红点 |
| `/tenants/search` | GET | 查询参数：`keyword?` | `TenantSearchResultDto[]` | 最多返回 50 条；只返回 `isListed=true` 的激活租户 |
| `/tenants` | POST | `CreateTenantRequest` | 错误响应 | 已禁用；当前返回 `403`，租户创建改由管理后台 `/api/admin/v1/platform/tenants` 承载 |
| `/invitations/{code}` | GET | 路径参数：`code` | `InvitationPreviewDto` | 平台 Token 可选；带 Token 时可返回是否已加入/是否匹配 |
| `/invitations/{code}/accept` | POST | 路径参数：`code` | `tenantId` `userId` `platformUserId` `lppId` `displayName` `accessToken` `refreshToken` `expiresIn` `spaceContext` | 当前直接完成加入并换取租户级 Token |
| `/tenants/{tenantId}/join-request` | POST | `message?` | `tenantId` | 路径上的 `tenantId` 即目标租户；提交后默认待审批；若租户配置了 `joinApprovalMode=auto` 则自动通过 |
| `/tenants/by-code/{code}` | GET | 路径参数：`code` | `TenantCodePreviewDto`：`tenantId` `tenantCode` `tenantName` `logoUrl?` `tenantDescription?` `industry?` `memberCount` `joinApprovalMode(auto\|manual)` `alreadyMember` | 凭企业码**预览**企业信息(只读,不写库),用于"输码→展示确认→再申请"。企业码**精确匹配、大小写不敏感、不受 `isListed` 限制**;需平台 Token;不存在/非 Active 返回 `404 TENANT_NOT_FOUND` |
| `/tenants/join-by-code` | POST | `tenantCode` `message?` | 自动通过时返回 `tenantId` `userId` `platformUserId` `lppId` `displayName` `accessToken` `refreshToken` `expiresIn` `spaceContext`；人工审核时返回 `status` `message` | 通过企业码**加入**租户(注意是加入动作不是查询);`joinApprovalMode=auto` 直接加入并返回租户 Token,`=manual` 仅创建待审申请并返回 `{status:"pending",...}`;`spaceContext.spaceType=2`。预览请用上面的 `/tenants/by-code/{code}` |
| `/my/join-requests` | GET | 无 | `JoinRequestDto[]`，每项包含 `requestId` `tenantId` `platformUserId` `displayName?` `message?` `status` `createdAt` `reviewedAt?` `rejectReason?` | `displayName` 当前通常为 `null` |
| `/my/join-requests/{requestId}` | DELETE | 路径参数：`requestId` | `requestId` | 仅能撤销当前账号自己仍处于 `pending` 的申请 |
| `/account/deactivate` | POST | `verificationCode` `reason?` | `deactivatedAt` | 需要平台 Token；7 天冷静期 |
| `/account/deactivate/cancel` | POST | 无 | `cancelledAt` | 需要平台 Token；仅冷静期内可调用 |
| `/account/mobile` | PUT | `newMobile` `verificationCode` `oldVerificationCode?` | `mobile` | 需要平台 Token；返回脱敏手机号 |
| `/account/email` | PUT | `newEmail` `verificationCode` | `email` | 需要平台 Token；返回脱敏邮箱 |
| `/account/devices` | GET | 无 | `DeviceInfoDto[]` | 需要平台 Token；返回所有登录设备 |
| `/account/devices/{deviceId}` | DELETE | 路径参数：`deviceId` | `deviceId` `revokedSessionCount` `revokedAt` | 需要平台 Token；踢出指定设备 |
| `/tenants/search-for-register` | GET | 查询参数：`keyword?` | `TenantRegisterSearchResultDto[]` | 无需鉴权；仅企业绑定模式下可用；未启用时返回 `403`；最多 20 条 |
| `/client-config` | GET | 无 | `enterpriseBindingMode` `tenantSearchEnabled` | 无需鉴权；客户端全局配置 |

### 1.1 `PlatformSpaceContextDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaceType` | short | 空间类型：`0=selection_required`、`1=personal`、`2=tenant` |
| `tenantId` | GUID? | 当 `spaceType=2` 时为建议进入的租户 ID，其余情况为 `null` |

### 1.1a 注册响应变体说明

`POST /auth/register` 根据企业绑定模式和目标租户审批策略返回两种不同结构：

| 条件 | 返回变体 | 说明 |
|---|---|---|
| 企业绑定模式**未启用** | platform-result | 标准注册，返回 `platformToken` |
| 企业绑定模式**已启用** + `joinApprovalMode=auto` | tenant-result | 自动通过，直接返回 `accessToken` + `refreshToken` |
| 企业绑定模式**已启用** + `joinApprovalMode=manual` | platform-result（`pendingApproval=true`） | 需人工审批，返回 `platformToken` |

客户端判断逻辑：响应 `data` 中存在 `accessToken` → tenant-result；存在 `platformToken` → platform-result。

### 1.2 `tenants[]` / `TenantSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | 租户 Logo |
| `membershipRole` | short | 当前平台用户在该租户内的角色：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner` |

### 1.3 `TenantSearchResultDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | 租户 Logo |
| `industry` | string? | 行业 |
| `memberCount` | int | 当前成员数 |

补充：

- 当前只会出现在 `/tenants/search` 中
- 只有后台显式设置 `isListed=true` 的激活租户会被搜索到

### 1.4 `InvitationPreviewDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | 租户 Logo |
| `tenantDescription` | string? | 组织说明 / 企业简介 |
| `industry` | string? | 行业 |
| `inviteType` | short | 邀请类型：`0=public`、`1=targeted` |
| `targetIdentifierHint` | string? | 定向邀请目标的脱敏提示 |
| `expiresAt` | DateTimeOffset | 过期时间 |
| `alreadyMember` | bool | 当前平台账号是否已是该租户成员；未传平台 Token 时固定为 `false` |
| `identityMatched` | bool? | 当前平台账号是否匹配定向邀请；通用邀请或未传平台 Token 时为 `null` |
| `targetMembershipRole` | short? | **2026-06-04 新增**。接受本邀请后将落地的角色：`1=技术支持`、`2=客服`、`3=管理员`；`null`=普通成员（旧邀请或未指定角色的邀请）。用于在用户接受前展示"你将以 客服 身份加入" |

### 1.5 `PlatformSpaceUnreadSummaryResponse` / `SpaceUnreadSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaces` | `SpaceUnreadSummaryDto[]` | 各空间未读概览 |
| `unreadSpaceCount` | int | 当前有未读的空间数 |
| `totalUnreadConversationCount` | int | 所有空间合计有未读的会话数 |
| `totalUnreadMessageCount` | int | 所有空间合计未读消息数 |

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaceType` | short | `1=personal`，`2=tenant` |
| `tenantId` | GUID? | 个人空间为 `null`，企业空间为目标租户 ID |
| `spaceName` | string | 空间显示名 |
| `tenantCode` | string? | 企业空间租户编码；个人空间为 `null` |
| `logoUrl` | string? | 空间 Logo / 头像 |
| `unreadConversationCount` | int | 该空间中有未读的会话数 |
| `unreadMessageCount` | int | 该空间未读消息总数 |
| `hasUnread` | bool | 是否存在未读 |

### 1.6 `TenantRegisterSearchResultDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码（企业码） |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | 租户 Logo 地址 |
| `industry` | string? | 行业 |
| `memberCount` | int | 当前成员数 |

补充：

- 仅返回状态为 Active 且 `isListed=true` 的租户
- 结果数量上限为 20 条
- 仅在企业绑定模式启用时可用

### 1.7 `ClientConfigResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `enterpriseBindingMode` | bool | 是否启用企业绑定模式 |
| `tenantSearchEnabled` | bool | 是否允许注册前搜索租户（当前与 `enterpriseBindingMode` 同步） |

## 2. 客户端接口速查

Base URL：`/api/client/v1`

默认接入请优先使用 `/api/platform/v1/auth/login`，再根据 `spaceContext` 调用 `/api/platform/v1/auth/select-personal-space` 或 `/api/platform/v1/auth/select-tenant`。

除 `/api/client/v1/auth/*` 这类未登录认证接口外，本节默认要求标准客户端业务 Token（`token_type=tenant`）；Widget 的 `visitorToken` 不能访问 `/api/client/v1/*`。

本节中的 `/auth/register`、`/auth/login`、`/auth/login-by-code`、`/auth/refresh` 属于“已知租户上下文”的兼容模式，适用于进入页面前就已经锁定租户的场景，不建议把它作为多租户通用客户端的默认首登流程。

### 2.1 认证与验证码

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/auth/register` | POST | `RegisterRequest` | `userId` | `loginName` 缺省且 `email` 非空时会回退为 email |
| `/auth/login` | POST | `LoginRequest` | `userId` `accessToken` `refreshToken` `expiresIn` | `loginType=login_name/email/mobile/lpp_id` |
| `/auth/login-by-code` | POST | `loginName` `verificationCode` `deviceId?` `deviceName?` `deviceType?` `captchaToken?` `captchaAnswer?` `loginType?` | `userId` `accessToken` `refreshToken` `expiresIn` | 验证码登录仅支持邮箱/手机号 |
| `/auth/refresh` | POST | `refreshToken` | `userId` `accessToken` `refreshToken` `expiresIn` | 返回新的租户态 token 对 |
| `/auth/reset-password` | POST | `identifier` `verificationCode` `newPassword` `loginType` | `reset=true` | 成功后会撤销所有未吊销会话 |
| `/auth/change-password` | POST | `oldPassword` `newPassword` | `changed=true` | 需要租户级 Token |
| `/auth/verification/settings` | GET | 无 | `smsRequired` `emailRequired` `smsEnabled` `emailEnabled` | 仅暴露 4 个 bool，不包含 Provider 凭据 |
| `/auth/verification/send` | POST | `identifier` `channel` `purpose?` `captchaToken?` `captchaAnswer?` | `sent` `channel` `error?` | `channel=sms/email`；租户侧 `purpose` 仅支持 `register`/`login`/`reset_password`（账号自服务相关 `deactivate`/`change_mobile`/`change_email` 必须走平台侧） |
| `/auth/captcha/check` | GET | 无 | `captchaRequired` | 仅返回当前是否需要图形验证码 |
| `/auth/captcha/generate` | POST | 无 | `token` `question` | 后续登录 / 注册把 `token + answer` 回传 |

### 2.2 租户与组织

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/tenant/info` | GET | 无 | `TenantDetailDto` | `status=0(pending_approval)`、`1(active)`、`2(suspended)`、`9(deleted)` |
| `/tenant/info` | PUT | `UpdateTenantInfoRequest` | `updated=true` | 仅更新传入字段；支持维护 `tenantDescription` |
| `/tenant/leave` | POST | 无 | `left=true` `tenantId` | 最后一个所有者不能直接退出 |
| `/tenant/members` | GET | 无 | `TenantMemberDto[]` | 仅员工/客服可访问；不返回官方服务号等系统投影用户。**2026-06-04 起**每个成员附带 `lppId`（绿泡泡号），供通讯录展示 |
| `/tenant/members/{userId}` | DELETE | 路径参数：`userId` | `userId` | 当前实现返回被移除用户 ID |
| `/tenant/members/{userId}/role` | PUT | `membershipRole` | `userId` | 仅所有者可修改角色 |
| `/tenant/invitations` | POST | `maxUses` `expireHours` `targetIdentifier?` `targetMembershipRole?` | `InvitationDto` | **客服/管理员/所有者**可调用(2026-05-31 起放宽,原为仅管理员/所有者);`inviteType=0(public)`、`1(targeted)`；`status=0(revoked)`、`1(active)`、`3(exhausted)`；权限不足返回 `403 TENANT_PERMISSION_DENIED`。**2026-06-03 起** `targetMembershipRole?`(1=技术/2=客服/3=管理员,省略=普通成员)→接受后直接落地为员工角色;只能签发<自己的角色,否则 `403 INVITATION_ROLE_TOO_HIGH`;请求 `4(Owner)` 返回 `400 INVITATION_ROLE_INVALID` |
| `/tenant/invitations` | GET | 无 | `InvitationDto[]` | **客服/管理员/所有者**可调用(2026-05-31 起放宽);最多返回最近 100 条 |
| `/tenant/invitations/{invitationId}` | DELETE | 路径参数：`invitationId` | `invitationId` | **客服/管理员/所有者**可调用(2026-05-31 起放宽);删除动作本质是把状态改为 `0=revoked` |
| `/tenant/join-requests` | GET | 无 | `JoinRequestDto[]` | 仅管理员/所有者可调用；最多返回最近 100 条 |
| `/tenant/join-requests/{requestId}/approve` | POST | 无 | `requestId` | 仅管理员/所有者可调用；把申请状态改为 `1=approved` |
| `/tenant/join-requests/{requestId}/reject` | POST | `rejectReason?` | `requestId` | 仅管理员/所有者可调用；把申请状态改为 `2=rejected` |
| `/departments/` | GET | 无 | `DepartmentDto[]` | 当前返回平铺节点列表，客户端自行按 `parentId` 组树 |
| `/departments/` | POST | `CreateDepartmentRequest` | `departmentId` `parentId` `departmentName` `departmentCode?` `sortOrder` `leaderUserId?` `memberCount` | 仅管理员/所有者可调用；对应 `DepartmentDto` |
| `/departments/{departmentId}` | PUT | `UpdateDepartmentRequest` | `departmentId` | 仅管理员/所有者可调用；只更新传入字段 |
| `/departments/{departmentId}` | DELETE | 路径参数：`departmentId` | `departmentId` | 仅管理员/所有者可调用；删除前不能仍有子部门或成员 |
| `/departments/{departmentId}/members` | GET | 无 | `DepartmentMemberDto[]` | 成员条目包含 `isPrimary` 和 `position?` |
| `/departments/{departmentId}/members` | POST | `userId` `isPrimary` `position?` | `departmentId` | 仅管理员/所有者可调用；当前成功响应不回传成员详情 |
| `/departments/{departmentId}/members/{userId}` | PUT | `isPrimary?` `position?` | `departmentId` `userId` | 仅管理员/所有者可调用；可切换主部门和更新岗位 |
| `/departments/{departmentId}/members/{userId}` | DELETE | 路径参数：`userId` | `departmentId` `userId` | 仅管理员/所有者可调用；当前成功响应只回传标识符 |

### 2.3 个人资料、好友、黑名单

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/profile/me` | GET | 无 | `UserProfileDto` | 返回完整手机号 / 邮箱 |
| `/profile/me/assigned-staff` | GET | 无 | `AssignedStaffSummaryDto \| null` | 当前客户未分配客服时返回 `null` |
| `/profile/me` | PUT | `UpdateProfileRequest` | `updated=true` | `gender` 支持 `unset`、`male`、`female`、`other`，也兼容 `0/1/2/3` |
| `/profile/me/lpp-id` | PUT | `ChangeLppIdRequest` | `changed=true` | lpp_id 只能修改一次；平台全局唯一；格式：字母开头，6-20 位字母/数字/下划线 |
| `/users/{userId}/profile` | GET | 路径参数：`userId` | `UserProfileDto` | 对他人资料会遮罩 `mobile` / `email` |
| `/friends` | GET | 无 | `FriendDto[]` | 按建立关系时间倒序；平台用户统一使用个人空间主图谱 |
| `/friends/request` | POST | `toUserId` `message?` | `requestId` | 反向存在待处理申请时会自动互为好友；企业空间也会写入个人空间主图谱 |
| `/friends/requests` | GET | 无 | `FriendRequestDto[]` | 当前仅返回 `status=pending` 的记录；列表里的用户 ID 优先解析为当前空间投影 |
| `/friends/requests/{requestId}/handle` | POST | `action` | `requestId` | `action=accept/reject` |
| `/friends/{friendUserId}` | PUT | `remarkName?` `groupName?` `tags?` `note?` `source?` | `friendUserId` | 仅更新当前用户视角的备注/分组/标签/私人备注/来源；`null`/缺失=不动，`""`/`[]`=清空 |
| `/friends/{friendUserId}` | DELETE | 路径参数：`friendUserId` | `friendUserId` | 删除双向好友关系 |
| `/friends/{friendUserId}/profile-extra` | GET | 路径参数：`friendUserId` | `FriendDetailDto`（`remarkName` `groupName` `note` `tags` `source` `addedAt` + 受隐私控制的 `mobile`/`email`/`signature`/`bio`/`location`/`genderValue`/`birthday` + `lppId`） | 好友资料详情；隐私敏感字段不可见时为 `null` |
| `/friends/{friendUserId}/common-groups` | GET | 路径参数：`friendUserId` | `{ items[] }`，每项 `conversationId` `title` `avatarUrl` `memberCount` `lastMessageAt` | 与该好友的共同群聊，按 `lastMessageAt` 倒序 |
| `/friends/invite-qr` | POST | `ttlHours?` `maxUses?` `message?` | `FriendInviteQrDto` | 发放「加我为好友」二维码 token；`ttlHours` 取值 `[1,720]`（默认 168=7 天），`maxUses` 取值 `[0,1000]`（`0`=不限），`message` 为扫码后默认附言；限流策略 `FriendInviteQr`（按用户 20 次/5 分钟） |
| `/friends/invite-qr` | GET | 无 | `FriendInviteQrDto[]` | 当前用户名下仍有效（未撤销/未用尽/未过期）的二维码，按创建时间倒序 |
| `/friends/invite-qr/{tokenId}` | DELETE | 路径参数：`tokenId` | `tokenId` | 撤销自己发放的二维码；幂等；撤销他人的返回 403 `FRIEND_QR_FORBIDDEN` |
| `/friends/invite-qr/{token}/preview` | GET | 路径参数：`token` | `FriendInviteQrPreviewDto` | 扫码后先预览发码人公开资料；`expired=true` 表示已过期/撤销/用尽（不报错，前端提示「二维码已失效」）；`alreadyFriends=true` 时前端可跳过申请步骤；未知 token 返回 404 |
| `/friends/invite-qr/{token}/accept` | POST | `message?` | `requestId` | 扫码加好友：以扫码人身份向发码人发起好友申请（完整走隐私/黑名单/隔离模式/反向自动接受逻辑），发码人仍需同意。返回新建（或反向命中后自动接受）的好友申请 ID。`message` 缺省时使用发码人设置的默认附言。错误码：`FRIEND_QR_SELF`(400)、`FRIEND_QR_REVOKED`/`FRIEND_QR_EXPIRED`(410)、`FRIEND_QR_EXHAUSTED`(409)、`FRIEND_QR_NOT_FOUND`(404)；其余沿用 `/friends/request` 的错误码。限流策略 `FriendInviteQr` |
| `/blocklist` | GET | 无 | `BlockedUserDto[]` | 拉黑列表；平台用户统一使用个人空间主图谱 |
| `/blocklist` | POST | `blockedUserId` | `blockedUserId` | 拉黑成功后返回被拉黑用户 ID；跨空间同步生效 |
| `/blocklist/{blockedUserId}` | DELETE | 路径参数：`blockedUserId` | `blockedUserId` | 取消拉黑 |

### 2.4 会话、群、消息

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/conversations` | GET | `cursor?` `limit?` `type?` `pinnedOnly?` | `items[]` `nextCursor?` | `items[]` 元素为 `ConversationListItemDto`；`limit` 实际范围 `1..100` |
| `/media/upload` | POST | `multipart/form-data`，文件字段名 `file` | `MediaUploadResponse` | 标准客户端上传入口；Widget 访客请改用 `/api/widget/v1/media/upload` |
| `/direct-chats/` | POST | `peerUserId` | `DirectChatCreatedDto` | `isNew=false` 表示已存在旧会话；传自己的 `userId` 可创建自聊备忘会话 |
| `/direct-chats/{chatId}` | GET | 路径参数：`chatId` | `DirectChatDetailDto` | 单聊详情 |
| `/direct-chats/{chatId}/messages` | POST | `SendDirectMessageRequest` | `messageId` `conversationId` `conversationSeq` `serverTime` | `messageType=text/markdown/image/video/voice/file/contact_card/call_log/location/event` |
| `/direct-chats/{chatId}/messages` | GET | `beforeSeq?` `limit?` | `MessageItemDto[]` | `limit` 实际范围 `1..200` |
| `/direct-chats/{chatId}/read` | POST | `readSeq` | `chatId` `readSeq` | 标记到某个会话内序号 |
| `/direct-chats/{chatId}/read-status` | GET | 无 | `PeerReadStatusDto` | 查询对端已读位置 |
| `/direct-chats/{chatId}/pin` | PUT | `pinned` | `chatId` | 会话个人设置 |
| `/direct-chats/{chatId}/mute` | PUT | `muted` | `chatId` | 会话个人设置 |
| `/direct-chats/{chatId}/typing` | POST | 无 | `chatId` `userId` | 当前是占位接口，不做实时转发 |
| `/direct-chats/{chatId}/files` | GET | `mediaKind?` `limit?` | `ChatFileDto[]` | `mediaKind=image/video/voice/file` |
| `/direct-chats/{chatId}/draft` | PUT | `draftText` | `chatId` | 保存草稿 |
| `/direct-chats/{chatId}/draft` | DELETE | 无 | `chatId` | 删除草稿 |
| `/groups/` | POST | `title` `avatarUrl?` `memberUserIds[]` | `GroupCreatedDto` | 仅 `userType=2` 且 `membershipRole>=3(admin)` 可创建；群主自动设为租户所有者，创建者自动成为群管理员 |
| `/groups/{groupId}` | GET | 路径参数：`groupId` | `GroupDetailV2Dto` | `muteMode=normal/all_muted`；`myRole=owner/admin/member` |
| `/groups/{groupId}` | PUT | `title?` `avatarUrl?` | `groupId` | 修改群信息 |
| `/groups/{groupId}` | DELETE | 无 | `groupId` | 只有群主可解散 |
| `/groups/{groupId}/messages` | POST | `SendGroupMessageRequest` | `messageId` `conversationId` `conversationSeq` `serverTime` | 群消息支持 `mentions[]` |
| `/groups/{groupId}/messages` | GET | `beforeSeq?` `limit?` | `MessageItemDto[]` | `limit` 实际范围 `1..200` |
| `/groups/{groupId}/read` | POST | `readSeq` | `groupId` `readSeq` | 标记群已读 |
| `/groups/{groupId}/read-receipts` | GET | 无 | `GroupReadReceiptsDto` | 包含已读成员列表和统计 |
| `/groups/{groupId}/typing` | POST | 无 | `groupId` `userId` | 当前是占位接口 |
| `/groups/{groupId}/members` | GET | 无 | `GroupMemberDto[]` | `role=owner/admin/member` |
| `/groups/{groupId}/members` | POST | `userIds[]` | `groupId` `addedCount` | 返回新增成员数 |
| `/groups/{groupId}/members/{userId}` | DELETE | 路径参数：`userId` | `groupId` `removedUserId` | 移除群成员 |
| `/groups/{groupId}/leave` | POST | 无 | `groupId` | 群主不能直接退群 |
| `/groups/{groupId}/transfer-owner` | POST | `newOwnerUserId` | `groupId` `newOwnerUserId` | 专门用于群主转让 |
| `/groups/{groupId}/members/{targetUserId}/role` | PUT | `role` | `groupId` `targetUserId` | `role=admin/member` |
| `/groups/{groupId}/members/{targetUserId}/mute` | PUT | `muteMode` `muteUntil?` | `groupId` `targetUserId` | `muteMode=0/1` |
| `/groups/{groupId}/members/{targetUserId}/alias` | PUT | `alias?` | `groupId` `targetUserId` `alias` | **群内昵称(群备注名)**。`targetUserId` 传自己=改自己的;群主/管理员可代改成员的(管理员不能改另一个管理员/群主的,仅群主能)。`alias` 为空/空白=清除(回退到全局 `displayName`);上限 64 字符,超长 400 `GROUP_ALIAS_TOO_LONG`。**2026-06-06 起** |
| `/groups/{groupId}/settings` | GET | 无 | `GroupSettingsDto` | 返回 `allowMemberInvite` `allowMemberModifyTitle` `allowMemberAtAll` `allowMemberViewMemberList` `allowQrCodeJoin` `requireApproval` `allowMemberAddFriend` |
| `/groups/{groupId}/settings` | PUT | `allowMemberInvite?` `allowMemberModifyTitle?` `allowMemberAtAll?` `allowMemberViewMemberList?` `allowQrCodeJoin?` `requireApproval?` `allowMemberAddFriend?` | `groupId` | 只更新传入字段 |
| `/groups/{groupId}/mute-mode` | PUT | `muteMode` | `groupId` | `muteMode=0/1` |
| `/groups/{groupId}/announcements` | GET | 无 | `GroupAnnouncementDto[]` | 公告列表 |
| `/groups/{groupId}/announcements` | POST | `title?` `content` `isPinned?` | `GroupAnnouncementDto` | 创建公告 |
| `/groups/{groupId}/announcements/{announcementId}` | PUT | `title?` `content?` `isPinned?` | `announcementId` | 修改公告 |
| `/groups/{groupId}/announcements/{announcementId}` | DELETE | 无 | `announcementId` | 删除公告 |
| `/groups/{groupId}/join-requests` | GET | 无 | `GroupJoinRequestDto[]` | 仅群主/管理员可查看；返回 `status=pending` 的申请 |
| `/groups/{groupId}/join-requests` | POST | `message?` | `groupId` | 提交入群申请；仅 `requireApproval=true` 时可用 |
| `/groups/{groupId}/join-requests/{requestId}/approve` | POST | 无 | `requestId` | 仅群主/管理员可审批 |
| `/groups/{groupId}/join-requests/{requestId}/reject` | POST | `rejectReason?` | `requestId` | 仅群主/管理员可拒绝 |
| `/groups/{groupId}/pin` | PUT | `pinned` | `groupId` | 群个人设置 |
| `/groups/{groupId}/mute` | PUT | `muted` | `groupId` | 群个人设置 |
| `/groups/{groupId}/draft` | PUT | `draftText` | `groupId` | 保存草稿 |
| `/groups/{groupId}/draft` | DELETE | 无 | `groupId` | 删除草稿 |
| `/groups/{groupId}/files` | GET | `mediaKind?` `limit?` | `ChatFileDto[]` | `mediaKind=image/video/voice/file` |
| `/messages/{messageId}/recall` | POST | 无 | `messageId` | 撤回消息 |
| `/messages/{messageId}/delete` | POST | 无 | `messageId` | 仅自己删除 |
| `/messages/forward` | POST | `sourceMessageId` `targetConversationId` `clientMsgId` | `messageId` `conversationId` `conversationSeq` `serverTime` | 分别表示新消息 ID、目标会话 ID、目标会话内顺序号、服务端时间 |

### 2.5 收藏、草稿、搜索、通知、翻译、Presence

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/favorites` | GET | 无 | `FavoriteDto[]` | 兼容模式收藏列表，仅返回基础收藏记录 |
| `/favorites/list` | GET | `keyword?` `category?` `conversationId?` `cursor?` `limit?` | `items[]` `nextCursor?` | 推荐收藏页主列表接口；`category=text/image/video/voice/file/other` |
| `/favorites/summary` | GET | `keyword?` `conversationId?` | `FavoriteSummaryDto` | 收藏分类汇总，可用于标签页统计 |
| `/favorites` | POST | `messageId` `conversationId` `note?` | `FavoriteDto` | 新增收藏 |
| `/favorites/{favoriteId}` | DELETE | 路径参数：`favoriteId` | `favoriteId` | 删除收藏 |
| `/drafts` | GET | 无 | `DraftDto[]` | 返回当前用户全部会话草稿 |
| `/search/messages` | GET | `keyword?` `conversationId?` | `MessageItemDto[]` | 当前公开查询参数不含时间范围 |
| `/search/users` | GET | `keyword` | `SearchUserDto[]` | 仅支持 `lppId` / 手机号 / 邮箱精准搜索；个人空间走平台全局搜索，租户空间受 `friendMode` 约束 |
| `/notification-settings` | GET | 无 | `NotificationSettingsDto` | 默认返回 `globalMute=false`、`soundEnabled=true`、`vibrationEnabled=true`、`previewEnabled=true` |
| `/notification-settings` | PUT | `UpdateNotificationSettingsRequest` | `updated=true` | 只更新传入字段；时间建议传 `HH:mm`，解析失败时当前实现会落为 `null` |
| `/translate/message` | POST | `messageId` `targetLanguage` `model?` | `TranslationResultDto` | `model=fast/quality`，非法值会回退为 `fast` |
| `/translate/text` | POST | `content` `targetLanguage` `model?` | `TranslationResultDto` | 与上同 |
| `/presence/{userId}` | GET | 路径参数：`userId` | `PresenceDto` | `devices[]` 每项包含 `deviceId?` `nodeId` `platform` `lastSeenAt` |
| `/presence/batch` | POST | `userIds[]` | `PresenceDto[]` | 批量查询 Presence |
| `/presence/status` | PUT | `customStatus?` | `updated=true` | 设置自定义在线状态（仅 IM 显示，**不影响客服派单**）。严格字段校验：传入 `onlineQueueAcceptEnabled` 等未知字段会返回 `400 PRESENCE_STATUS_UNKNOWN_FIELDS`，请改调 §2.9B `PUT /customer-service/reception/status` |
| `/presence/offline` | POST | 无 | `offline=true` | 主动把当前设备/会话下线 |
| `/sync` | GET | `sinceSeq?` `limit?` | `SyncResponse` | `limit` 实际范围 `1..200` |
| `/messages/voice-to-text` | POST | `messageId` | `messageId` `text` `language` | 消息必须是语音消息；限制 ≤ 20MB |
| `/profile/me/privacy` | GET | 无 | `PrivacySettingsDto` | 隐私设置 |
| `/profile/me/privacy` | PUT | `searchableByMobile?` `searchableByLppId?` `allowFriendRequest?` `profileVisibility?` | `updated=true` | 部分更新 |
| `/profile/me/addresses` | GET | 无 | `AddressDto[]` | 地址列表 |
| `/profile/me/addresses` | POST | `CreateAddressRequest` | `AddressDto` | 每用户最多 20 个 |
| `/profile/me/addresses/{addressId}` | PUT | `UpdateAddressRequest` | `addressId` | 部分更新 |
| `/profile/me/addresses/{addressId}` | DELETE | 路径参数：`addressId` | `addressId` | 删除地址 |
| `/feedback` | POST | `type` `content` `contactInfo?` `attachmentUrls?` | `feedbackId` `submittedAt` | `type=complaint/suggestion/bug` |

### 2.5a 音视频通话 — 跨节点会话分配

| 端点 | 方法 | 请求字段 | 响应 `data` | 说明 |
|---|---|---|---|---|
| `/voicecall/sessions` | POST | `targetUserId` `mediaMode?`(`Audio`\|`AudioVideo`) `videoProfile?`(`360p`\|`720p`\|`1080p`) | `callId` `nodeId` `relayUrl` `expiresAt` | 发起通话前调用：API host 选一台在线 relay、预创建会话并绑定到该节点、返回该 relay 的 SignalR hub 地址。主叫拿 `relayUrl` 连 `/hubs/voicecall` 调 `StartCall(callId, sdpOffer)`。被叫收到的来电事件 `voicecall.incoming`（在常驻 `/ws/client` 连接上）带同一个 `relayUrl`。错误码：`CALL_TARGET_INVALID` / `CALL_TARGET_SELF` / `CALL_VIDEO_PROFILE_INVALID` / `CALL_NO_RELAY_AVAILABLE`(503)。详见 [voice-video-call.md](./voice-video-call.md)。 |

> 通话信令（`StartCall`/`AnswerCall`/`Hangup`/`SendDtmf` 及 `CallRinging`/`CallAnswered`/`CallEnded`）都在 `relayUrl` 指向的 `/hubs/voicecall` SignalR 连接上，不是 REST。`StartCall(callId, sdpOffer, videoProfile?)` 的 `callId` 由本接口下发。如果客户端连到的 relay 不是会话绑定的节点，`StartCall`/`AnswerCall` 返回 `errorMessage="CALL_WRONG_RELAY_NODE"` + 正确的 `relayUrl`，重连重试即可。

### 2.6 租户功能特性

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/tenant/features` | GET | 无 | `friendMode` `joinApprovalMode` `customerServiceMode` `designatedServiceStaffId` `tempSessionEnabled` | 仅租户空间可用；`friendMode=social/isolation`；`joinApprovalMode=manual/auto`；`customerServiceMode=auto/designated`；`tempSessionEnabled=true/false` |
| `/tenant/features` | PUT | `joinApprovalMode?` `customerServiceMode?` `designatedServiceStaffId?` `friendMode?` `tempSessionEnabled?` | `updated=true` | 仅所有者（`membershipRole=4`）可调用；部分更新 |

### 2.7 企业公告

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/announcements` | GET | 无 | 公告数组 | 仅返回已发布且未过期的公告，最多 50 条；仅租户空间可用；`targetScope=role` 的公告会按当前用户 `userType + membershipRole` 过滤 |
| `/enterprise/announcements/{announcementId}/read` | POST | 路径参数 | `{announcementId, read:true}` | 上报当前用户已读(幂等)。2026-05-23 新增,供管理端统计已读率 |

### 2.7+ 2026-05-23 新增客户端接口(定时消息、错误上报、反馈进度、自助帮助、客服综合卡片与 AI 建议)

> 自 2026-05-23 起新增。详见 `client-api.md` §26。Base：`/api/client/v1`(标 widget 者为 `/api/widget/v1`)。

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 说明 |
|---|---|---|---|---|
| `/scheduled-messages` | POST | `conversationId`、`isGroup`、`messageType`、`body`、`replyToMessageId?`、`scheduledAt` | `ScheduledMessageDto` | 定时消息;`scheduledAt` 须未来且 ≤14 天 |
| `/conversations/{conversationId}/scheduled-messages` | GET | 路径参数 | `{items:ScheduledMessageDto[]}` | 本人在该会话待发任务 |
| `/scheduled-messages/{id}` | PUT | `body?`、`scheduledAt?` | `ScheduledMessageDto` | 仅 `pending` 可改 |
| `/scheduled-messages/{id}` | DELETE | 路径参数 | `{scheduledMessageId,canceled:true}` | 仅 `pending` 可取消 |
| `/client-errors` | POST | `platform`、`appVersion?`、`errorLevel?`、`errorType`、`message`、`stackTrace?`、`context?`、`clientTimestamp?` | `{errorId}` | 已登录上报 |
| `/{tenantCode}/client-errors`(widget) | POST | 同上 | `{errorId}` | 匿名上报,无需登录 |
| `/feedback/me` | GET | 无 | `{items:FeedbackItem[]}` | 查看本人反馈处理进度 |
| `/help/articles` | GET | `q?`、`page?`、`pageSize?` | 帮助文章列表 | 仅 `customerVisible` 文档 |
| `/help/articles/{documentId}` | GET | 路径参数 | 文章详情(含 `content`) | 同上;不可见 404 `HELP_ARTICLE_NOT_FOUND` |
| `/{tenantCode}/help/articles`(widget) | GET | `q?`、`page?`、`pageSize?` | 同上 | 匿名自助查阅 |
| `/customer-service/knowledge/search`(员工) | GET | `q`、`topK?`、`knowledgeBaseId?` | `{items:[{chunkId,documentTitle,headingPath?,snippet,score,...}]}` | 需客服身份;与 AI 同源检索 |
| `/customer-service/knowledge/bases`(员工) | GET | 无 | 启用知识库列表 | 需客服身份 |
| `/customer-service/workbench/threads/{threadType}/{threadId}/profile-card`(员工) | GET | 路径参数 | 客户综合卡片 | 需客服身份 |
| `/customer-service/workbench/threads/{threadType}/{threadId}/ai-suggestion`(员工) | POST | `customerMessageId?` | `{suggestionId,text,confidence,source,sources[],...}` | AI 建议草稿(不直发客户) |
| `/customer-service/workbench/threads/{threadType}/{threadId}/ai-suggestions`(员工) | GET | `limit?` | 历史建议 | 需客服身份 |
| `/customer-service/workbench/ai-suggestions/{suggestionId}/adopt`(员工) | POST | 路径参数 | 建议项 | 标记采纳 |

- 定时消息 `status`:`0`待发/`1`已发/`2`已取消/`3`失败/`4`投递中;失败推送 `scheduled_message.failed` 事件。
- 工作台 `workbench/threads` 线程项新增 `isVip`/`customerLevel`/`priority`/`tags`,响应增 `summary{allCount,queuedCount,activeCount,vipCount}`。
- `/sync` 会话项新增 `conversationType`(direct/group/temp_session)。

### 2.8 访客 Widget 接口

Base URL：`/api/widget/v1`

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/{tenantCode}/config` | GET | 路径参数：`tenantCode` | Widget 配置 | 无需鉴权 |
| `/{tenantCode}/sessions` | POST | `WidgetCreateSessionInput` | `sessionId` `conversationId` `visitorId` `visitorUserId` `visitorToken` `status` `queuePosition?` `estimatedWaitSeconds?` `locale` `ai?` `welcomeMessages[]` | 无需鉴权；创建访客临时会话；`welcomeMessages[]` 每项形如 `{ type: string, content: string }` |
| `/sessions/{sessionId}` | GET | 路径参数：`sessionId` | 会话状态 | 需要 `visitorToken` |
| `/sessions/{sessionId}/messages` | GET | 路径参数：`sessionId` | 消息列表 | 需要 `visitorToken` |
| `/media/upload` | POST | `multipart/form-data`，文件字段名 `file` | `MediaUploadResponse` | 需要 `visitorToken`；Widget 富媒体上传专用入口 |
| `/sessions/{sessionId}/messages` | POST | `clientMsgId` `messageType` `body` | 发送结果 | 需要 `visitorToken` |
| `/sessions/{sessionId}/token/refresh` | POST | 无 | `visitorToken` | 刷新访客 Token |
| `/sessions/{sessionId}/close` | POST | 无 | `sessionId` `visitorToken` | 访客关闭会话，并返回新的访客 Token |
| `/sessions/{sessionId}/handoff` | POST | `reason?` | `sessionId` `requested=true` | 请求转人工 |
| `/sessions/{sessionId}/rate` | POST | `rating` `tags?` `comment?` | `sessionId` `rating` | 会话评价 |
| `/sessions/{sessionId}/reopen` | POST | 无 | `sessionId` `visitorToken` | 重新打开已关闭的会话，并返回新的访客 Token |

补充：

- `visitorToken` 只能访问 `/api/widget/v1/*`
- `token/refresh`、`close`、`reopen` 返回的新 `visitorToken` 应立即替换旧 token
- 关闭 / 重开后旧 token 会失效，继续使用会返回 `401`
- `visitorUserId` 为服务端生成的访客投影用户 ID，对应统一用户模型中的 `userType=3`
- **sessionId 归属校验**：除 `POST /{tenantCode}/sessions`（创建）外，所有 `/sessions/{sessionId}/*` 端点均校验路由参数 `sessionId` 是否与 `visitorToken` 内嵌的 `visitor_session_id` 一致。**不匹配时服务端直接返回 ASP.NET 默认的 `403 Forbidden`**（无统一响应壳、无 `code` 字段、body 为空或 `text/plain`），客户端**不应**按 `code` 解析；通常意味着跨会话 token 复用或路由参数被篡改

### 2.8B IM 客服线程动作端点（L4-2）

Base URL：`/api/client/v1/customer-service`

适用范围：客户主动联系品牌账号 / 客服主动外呼 / 转接 / 关闭 / 评分。详细字段表见 [client-api.md §12.11B](./client-api.md#12-11b-im-客服线程动作端点)。

| 端点 | 方法 | 请求字段 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/quick-replies` | GET | `scope?=all/temp_session/direct_customer` | `CustomerServiceQuickReplyDto[]` | 任意已登录用户可访问；仅返回 `enabled=true` 的话术 |
| `/im-direct/contact-brand` | POST | `serviceAccountId` `locale?` `category?` `sourceUrl?` `priority` | `ImCustomerServiceThreadDto` | 任意已登录用户可访问；返回（或复用）客服线程 |
| `/im-direct/outbound` | POST | `customerUserId` `reason?` `skillGroupId?` `priority` | `ImCustomerServiceThreadDto` | 仅客服（`userType=2` 且 `membershipRole≥2`）可访问 |
| `/im-direct/{threadId}/transfer` | POST | `toStaffUserId` `reason?` | `ImCustomerServiceThreadDto` | 转接活跃 IM 客服线程到另一个坐席；仅客服可访问 |
| `/im-direct/{threadId}/close` | POST | 无 | `{ closed: true }` | 关闭线程；仅客服可访问 |
| `/threads/{threadId}/rating` | POST | `rating`(short) `comment?` `tags?` | `ThreadRatingDto`（含 `threadId`/`rating`/`comment`/`tags`/`ratedAt`） | 客户对线程评分；触发 `im_customer_service.rated` webhook 主题 |

`ImCustomerServiceThreadDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `threadId` | GUID | 统一客服线程 ID |
| `customerUserId` | GUID | 客户用户 ID |
| `staffUserId` | GUID? | 当前归属客服用户 ID |
| `conversationId` | GUID? | 底层直聊会话 ID |
| `serviceAccountId` | GUID? | 品牌服务号 ID |
| `threadStatus` | short | 线程状态枚举值 |
| `priority` | short | 优先级 |
| `sourceChannel` | string? | 来源渠道 |
| `locale` | string? | 客户语言 |
| `skillGroupId` | GUID? | 技能组 ID |
| `queueEnteredAt` | DateTimeOffset? | 进队时间 |
| `acceptedAt` | DateTimeOffset? | 接起时间 |
| `firstResponseAt` | DateTimeOffset? | 首次响应时间 |
| `closedAt` | DateTimeOffset? | 关闭时间 |

### 2.9 统一客服工作台接口（员工侧）

Base URL：`/api/client/v1/customer-service/workbench`

这组接口是客服端 APP 的主入口，统一承载：

- `temp_session`：Widget 访客临时会话
- `direct_customer`：已注册且已纳入客服服务的客户线程

补充：

- 只有 `userType=2` 且 `membershipRole>=2(customer_service)` 的租户员工可访问
- 响应里的 `threadType` 固定使用下划线值：`temp_session`、`direct_customer`
- 路由里的 `threadType` 同时兼容下划线和中划线；文档示例优先使用中划线路径 `temp-session`、`direct-customer`
- `threadId` 是统一客服线程 ID；`conversationId` 是底层实际会话 ID。对 `direct_customer` 来说，两者不是同一个 ID

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/dashboard` | GET | 无 | `CustomerServiceWorkbenchDashboardDto` | 统一客服看板，统计 temp + direct 两类线程 |
| `/threads` | GET | 无 | `CustomerServiceWorkbenchDto` | 返回 `queueItems[]` + `activeItems[]` |
| `/threads/{threadType}/{threadId}` | GET | 路径参数：`threadType` `threadId` | `CustomerServiceThreadDetailDto` | 统一线程详情 |
| `/threads/{threadType}/{threadId}/messages` | POST | `CustomerServiceWorkbenchSendMessageRequest` | `CustomerServiceWorkbenchMessageResultDto` | 统一回复入口 |
| `/threads/temp-session/{threadId}/claim` | POST | 无 | `CustomerServiceThreadDetailDto` | 访客线程认领 |
| `/threads/temp-session/{threadId}/takeover` | POST | 无 | `CustomerServiceThreadDetailDto` | 访客线程接管 |
| `/threads/temp-session/{threadId}/close` | POST | 无 | `threadId` | 关闭访客临时会话 |
| `/threads/direct-customer/{threadId}/claim` | POST | 无 | `CustomerServiceThreadDetailDto` | 认领排队中的注册客户线程 |
| `/threads/direct-customer/{threadId}/takeover` | POST | 无 | `CustomerServiceThreadDetailDto` | 接管其他客服名下的注册客户线程 |
| `/threads/direct-customer/{threadId}/close` | POST | 无 | `threadId` | 关闭当前客服线程；不删除底层直聊会话 |

### 2.9A 客服快捷回复（员工侧消费）

Base URL：`/api/client/v1/customer-service`

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/quick-replies` | GET | `scope?=all/temp_session/direct_customer` | `CustomerServiceQuickReplyDto[]` | 仅返回启用话术；`scope=all` 话术会在所有场景返回 |
| `/quick-replies/sync` | GET | `updatedSince?` | `{ items[], updatedSince, serverTime }`，`items` 额外带 `deletedAt`（墓碑） | 增量同步；首次留空取全量，之后传上次 `serverTime`；`deletedAt!=null` 删除本地缓存 |
| `/customers/service-history` | GET | `customerUserId?` `visitorUserId?` `customerId?` `limit?` `cursor?`（前三者择一） | `{ items[], nextCursor }`，`items` 含 `threadType`(`temp_session`/`direct`) `threadId` `staffUserId?` `status` `startedAt?` `firstResponseAt?` `closedAt?` `riskLevel` 等 | 按客户身份聚合跨频道服务历史；管理端同名见 [admin-api.md](./admin-api.md) |
| `/staff/service-history` | GET | `threadType?`(`temp_session`/`im_direct`) `status?` `limit?` `cursor?` | `{ items[], nextCursor }`，`items` 字段同上并额外带 `participation`(`current_owner`/`transferred`) | 按**接待人**聚合"我接待过的历史会话"——`staffUserId` 恒为当前登录客服(不可查他人)；曾参与即算(当前归属或转接历史 from/to)；按 `lastMessageAt` 倒序；管理端按任意客服查见 [admin-api.md](./admin-api.md) |

### 2.9B 客服自助接待状态（Reception）

Base URL：`/api/client/v1/customer-service`

权限：仅 `userType=2` 且 `membershipRole≥2(customer_service)` 的客服员工。

让客服本人在 App / 工作台里查询和切换自己的接待状态。客服本人的自助切换与管理后台 `PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}` 的代操作作用于同一份状态、相互可见；切到 `busy`/`break`/`offline` 后不再被分配新会话，长时间无心跳会被自动视为离线。

详细字段表见 [client-api.md §12.11A2](./client-api.md#12-11a2-客服自助接待状态-reception)。

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/reception/status` | GET | 无 | `StaffReceptionStatusDto` | 查自己当前接待状态（含心跳新鲜度修正） |
| `/reception/status` | PUT | `serviceStatus` `queueAcceptEnabled?` `maxConcurrentSessions?` | `StaffReceptionStatusDto` | 切 `online` / `busy` / `break` / `offline` |
| `/reception/enter` | POST | 无 | `StaffReceptionStatusDto` | 语法糖 = PUT 传 `online` + `queueAcceptEnabled=true` |
| `/reception/exit` | POST | 无 | `StaffReceptionStatusDto` | 语法糖 = PUT 传 `offline` |
| `/reception/status-logs` | GET | `limit?` 默认 50、上限 200 | `StaffReceptionStatusLogEntryDto[]` | 状态变更日志（自助 + 管理员代操作合并），按时间倒序，`selfInitiated` 区分 |

`StaffReceptionStatusDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 当前客服 ID |
| `displayName` | string | 当前客服显示名 |
| `serviceStatus` | string | 经心跳新鲜度修正后的有效状态 |
| `queueAcceptEnabled` | bool | 是否接受派单（非 `online` 状态强制为 `false`） |
| `maxConcurrentSessions` | int | 最大并发会话数 |
| `reservedSessionCount` | int | 已分配但未接起的会话数 |
| `activeSessionCount` | int | 当前正在服务的会话数 |
| `lastOnlineAt` | DateTimeOffset? | 上一次进入在线状态时间 |
| `lastAssignedAt` | DateTimeOffset? | 上一次被派单时间 |
| `lastHeartbeatAt` | DateTimeOffset? | 上一次心跳时间 |
| `statusChangedAt` | DateTimeOffset | 上一次状态变更时间 |

`StaffReceptionStatusLogEntryDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `auditId` | GUID | 审计记录 ID |
| `actionCode` | string | 动作码（当前固定为 `temp_session.staff_status_changed`） |
| `serviceStatus` | string? | 变更后状态 |
| `queueAcceptEnabled` | bool? | 变更后派单开关 |
| `maxConcurrentSessions` | int? | 变更后并发上限 |
| `selfInitiated` | bool | `true`=客服本人自助；`false`=管理员代操作 |
| `operatorUserId` | GUID? | 实际操作者用户 ID |
| `operatorDisplayName` | string? | 实际操作者显示名 |
| `createdAt` | DateTimeOffset | 变更时间 |

`CustomerServiceWorkbenchDashboardDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `queuedTempCount` | int | 排队中的访客临时会话数 |
| `queuedDirectCount` | int | 排队中的注册客户线程数 |
| `queuedTotalCount` | int | 排队线程总数 |
| `activeTempCount` | int | 当前客服名下活跃访客会话数 |
| `assignedDirectCount` | int | 当前客服名下活跃注册客户线程数 |
| `totalActiveCount` | int | 当前客服总活跃线程数 |
| `onlineStaffCount` | int | 可服务客服数 |
| `busyStaffCount` | int | 忙碌客服数 |
| `directUnreadCount` | int | 当前客服名下注册客户线程总未读数 |

`CustomerServiceWorkbenchDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `queueItems` | `CustomerServiceThreadListItemDto[]` | 排队中的线程列表 |
| `activeItems` | `CustomerServiceThreadListItemDto[]` | 当前客服正在处理的线程列表 |

`CustomerServiceThreadListItemDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer` |
| `threadId` | GUID | 统一客服线程 ID |
| `conversationId` | GUID | 底层会话 ID；`direct_customer` 下不是线程 ID |
| `status` | string | 当前线程状态；统一工作台当前主要暴露 `queued` / `active` |
| `title` | string | 访客名或客户显示名 |
| `avatarUrl` | string? | 头像 |
| `customerUserId` | GUID? | 注册客户用户 ID；仅 `direct_customer` 有值 |
| `visitorId` | GUID? | 访客 ID；仅 `temp_session` 有值 |
| `peerUserId` | GUID? | 当前线程对应的对端用户 ID |
| `assignedStaffUserId` | GUID? | 当前负责客服用户 ID |
| `assignedStaffDisplayName` | string? | 当前负责客服显示名 |
| `lastMessageType` | string? | 最后一条消息类型 |
| `lastMessagePreview` | string? | 最后一条消息预览 |
| `lastMessageAt` | DateTimeOffset? | 最后一条消息时间 |
| `unreadCount` | int | 当前客服视角未读数 |
| `updatedAt` | DateTimeOffset | 线程更新时间 |
| `assignedAt` | DateTimeOffset? | 当前归属建立时间 |
| `queuePosition` | int? | 排队位置 |
| `estimatedWaitSeconds` | int? | 预计等待秒数 |

`CustomerServiceThreadDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer` |
| `threadId` | GUID | 统一客服线程 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 线程状态 |
| `title` | string | 访客名或客户显示名 |
| `avatarUrl` | string? | 头像 |
| `customerUserId` | GUID? | 注册客户用户 ID |
| `visitorId` | GUID? | 访客 ID |
| `peerUserId` | GUID? | 对端用户 ID |
| `assignedStaffUserId` | GUID? | 当前负责客服 |
| `assignedStaffDisplayName` | string? | 当前负责客服显示名 |
| `assignedAt` | DateTimeOffset? | 当前归属建立时间 |
| `tempSession` | `TempSessionDetailDto?` | `temp_session` 详情对象 |
| `directChat` | `CustomerServiceDirectThreadDetailDto?` | `direct_customer` 详情对象 |

`CustomerServiceDirectThreadDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `chatId` | GUID | 当前承载此线程的直聊会话 ID |
| `customerUserId` | GUID | 客户用户 ID |
| `customerDisplayName` | string | 客户显示名 |
| `customerAvatarUrl` | string? | 客户头像 |
| `isPinned` | bool | 当前客服是否已置顶该直聊 |
| `isMuted` | bool | 当前客服是否已免打扰 |
| `lastReadSeq` | long | 当前客服已读到的序号 |
| `lastMessageSeq` | long | 当前会话最新消息序号 |
| `unreadCount` | int | 当前客服未读数 |
| `assignedAt` | DateTimeOffset | 当前客服接手时间 |
| `messages` | `MessageItemDto[]` | 最近消息列表 |

`CustomerServiceWorkbenchSendMessageRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `clientMsgId` | string | 是 | 客户端幂等消息 ID |
| `messageType` | string | 是 | 消息类型 |
| `body` | object | 是 | 消息体 |
| `replyToMessageId` | GUID? | 否 | 回复某条历史消息 |

`CustomerServiceWorkbenchMessageResultDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer` |
| `threadId` | GUID | 统一客服线程 ID |
| `conversationId` | GUID | 实际写入消息的底层会话 ID |
| `messageId` | GUID | 新消息 ID |
| `conversationSeq` | long? | 会话内顺序号 |
| `sentAt` | DateTimeOffset | 服务端发送时间 |

### 2.10 兼容保留：访客临时会话接口（员工侧）

Base URL：`/api/client/v1/customer-service/temp-sessions`

这组接口仍然可用，但更适合：

- 老版本客服端继续兼容
- 只处理 Widget 访客临时会话的项目
- 需要直接使用临时会话专属语义的场景

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 关键枚举 / 说明 |
|---|---|---|---|---|
| `/dashboard` | GET | 无 | 客服仪表盘 | 当前服务层已复用统一客服中心能力 |
| `/mine` | GET | 无 | 当前客服名下的访客会话列表 | 仅返回 `temp_session` |
| `/queue` | GET | 无 | 访客会话队列 | 仅返回 `temp_session` |
| `/quick-replies` | GET | 无 | 快捷回复列表 | 兼容旧入口，仅返回适用于 `temp_session` 的启用话术 |
| `/{sessionId}` | GET | 路径参数：`sessionId` | `TempSessionDetailDto` | 临时会话详情 |
| `/{sessionId}/claim` | POST | 无 | `TempSessionDetailDto` | 认领访客会话 |
| `/{sessionId}/takeover` | POST | 无 | `TempSessionDetailDto` | 接管访客会话 |
| `/{sessionId}/messages` | POST | `clientMsgId` `messageType` `body` | `TempSessionMessageDto` | 发送访客会话消息 |
| `/{sessionId}/close` | POST | 无 | `sessionId` | 关闭访客会话 |

## 3. 匿名响应与简单布尔响应

| 场景 | `data` 结构 |
|---|---|
| 刷新密码成功 | `{ "reset": true }` |
| 修改密码成功 | `{ "changed": true }` |
| 修改 lpp_id 成功 | `{ "changed": true }` |
| 更新资料 / 通知设置 / 租户信息成功 | `{ "updated": true }` |
| 标记单聊 / 群聊已读 | `{ "chatId" / "groupId": "...", "readSeq": 123 }` |
| 处理好友申请成功 | `{ "requestId": "..." }` |
| 拉黑 / 取消拉黑 | `{ "blockedUserId": "..." }` |
| 置顶 / 免打扰 / 草稿保存 / 草稿删除 | `{ "chatId": "..." }` 或 `{ "groupId": "..." }` |
| typing 占位接口 | `{ "chatId" / "groupId": "...", "userId": "..." }` |
| 删除收藏 | `{ "favoriteId": "..." }` |
| 主动下线 | `{ "offline": true }` |
| 退出租户 | `{ "left": true, "tenantId": "..." }` |
| 注销账号 | `{ "deactivatedAt": "..." }` |
| 撤销注销 | `{ "cancelledAt": "..." }` |
| 修改手机号 | `{ "mobile": "138****8001" }` |
| 修改邮箱 | `{ "email": "n***@example.com" }` |
| 踢出设备 | `{ "deviceId": "...", "revokedSessionCount": 2, "revokedAt": "..." }` |
| 语音转文字 | `{ "messageId": "...", "text": "...", "language": "zh-CN" }` |
| 提交反馈 | `{ "feedbackId": "...", "submittedAt": "..." }` |

## 4. 常用 DTO 字段速查

### 4.1 `TenantDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 组织说明 / 企业简介 |
| `domain` | string? | 域名 |
| `industry` | string? | 行业 |
| `scale` | string? | 规模 |
| `isListed` | bool | 是否允许出现在 `/api/platform/v1/tenants/search` 结果中 |
| `status` | short | 租户状态：`0=pending_approval`、`1=active`、`2=suspended`、`9=deleted` |
| `memberCount` | int | 成员数 |
| `createdAt` | DateTimeOffset | 创建时间 |

### 4.2 `TenantMemberDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 租户内用户 ID |
| `platformUserId` | GUID | 对应平台账号 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `membershipRole` | short | 角色：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner` |
| `joinMethod` | short | 加入方式：`0=self`、`1=invite`、`2=approval` |
| `joinedAt` | DateTimeOffset? | 入租时间 |
| `lppId` | string? | **2026-06-04 新增**。成员对应平台账号的全局唯一 `lpp_id`（绿泡泡号）；未设置时为 `null`。用于在通讯录展示成员的绿泡泡号 |

### 4.3 `InvitationDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `invitationId` | GUID | 邀请记录 ID |
| `inviteCode` | string | 实际的邀请码 |
| `inviteType` | short | 邀请类型：`0=public`、`1=targeted` |
| `maxUses` | int | 最大可用次数 |
| `usedCount` | int | 已使用次数 |
| `expiresAt` | DateTimeOffset | 过期时间 |
| `status` | short | 当前状态：`0=revoked`、`1=active`、`3=exhausted` |
| `createdAt` | DateTimeOffset | 创建时间 |
| `targetMembershipRole` | short? | **2026-06-03 新增**。员工入职邀请的目标角色：`1=技术支持`、`2=客服`、`3=管理员`；`null`=普通成员邀请（旧行为）。接受邀请后直接落地为该角色 |

### 4.4 `JoinRequestDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `requestId` | GUID | 申请 ID |
| `tenantId` | GUID | 目标租户 |
| `platformUserId` | GUID | 申请人平台账号 ID |
| `displayName` | string? | 申请人显示名；`/my/join-requests` 当前为 `null` |
| `message` | string? | 申请备注 |
| `status` | short | 申请状态：`0=pending`、`1=approved`、`2=rejected`、`3=cancelled` |
| `createdAt` | DateTimeOffset | 申请时间 |
| `reviewedAt` | DateTimeOffset? | 审核时间 |
| `rejectReason` | string? | 拒绝原因 |

### 4.5 `DepartmentDto` / `DepartmentMemberDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `departmentId` | GUID | 部门 ID |
| `parentId` | GUID? | 上级部门，为 `null` 表示根节点 |
| `departmentName` | string | 部门名称 |
| `departmentCode` | string? | 部门编码 |
| `sortOrder` | int | 排序值 |
| `leaderUserId` | GUID? | 负责人用户 ID |
| `memberCount` | int | 当前成员数 |

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `isPrimary` | bool | 是否主部门 |
| `position` | string? | 岗位名称 |

### 4.6 `UserProfileDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `userNo` | long | 租户内用户编号 |
| `loginName` | string | 登录名 |
| `lppId` | string? | 用户自定义 ID（类似微信号），注册时自动生成 `lpp_xxxxxxxx`，可修改一次；平台全局唯一 |
| `displayName` | string | 显示名 |
| `userType` | short | 用户类型：`1=客户`、`2=员工/客服`、`3=访客` |
| `avatarUrl` | string? | 头像 |
| `signature` | string? | 签名 |
| `gender` | string | `unset/male/female/other` |
| `birthday` | string? | `yyyy-MM-dd` |
| `location` | string? | 地理位置 |
| `bio` | string? | 个人简介 |
| `mobile` | string? | 当前用户查自己时为原值；查别人时为遮罩值 |
| `email` | string? | 当前用户查自己时为原值；查别人时为遮罩值 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `tapTapText` | string? | 拍一拍自定义文案，最多 20 字符 |

### 4.6A `AssignedStaffSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 当前负责客服用户 ID |
| `displayName` | string | 当前负责客服显示名 |
| `avatarUrl` | string? | 当前负责客服头像 |
| `membershipRole` | short | 当前负责客服在租户内的成员角色 |

### 4.7 `FriendDto` / `FriendRequestDto` / `BlockedUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `friendUserId` | GUID | 好友用户 ID |
| `displayName` | string | 对方显示名 |
| `avatarUrl` | string? | 头像 |
| `remarkName` | string? | 当前用户给对方设置的备注 |
| `groupName` | string? | 当前用户给对方设置的分组 |
| `createdAt` | DateTimeOffset | 成为好友时间 |
| `userType` | short | 好友的用户类型：`1=客户`、`2=员工/客服`、`3=访客` |

| 字段 | 类型 | 说明 |
|---|---|---|
| `requestId` | GUID | 好友申请 ID |
| `fromUserId` | GUID | 发起方用户 ID |
| `fromDisplayName` | string | 发起方显示名 |
| `fromAvatarUrl` | string? | 发起方头像 |
| `toUserId` | GUID | 接收方用户 ID |
| `toDisplayName` | string | 接收方显示名 |
| `toAvatarUrl` | string? | 接收方头像 |
| `message` | string? | 申请附言 |
| `status` | string | 当前公开接口只返回 `pending` |
| `createdAt` | DateTimeOffset | 创建时间 |

| 字段 | 类型 | 说明 |
|---|---|---|
| `blockedUserId` | GUID | 被拉黑用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `createdAt` | DateTimeOffset | 拉黑时间 |

### 4.7.1 `FriendInviteQrDto` / `FriendInviteQrPreviewDto`

`FriendInviteQrDto`（`POST /friends/invite-qr` 与 `GET /friends/invite-qr` 返回）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tokenId` | GUID | 二维码记录 ID（撤销时使用） |
| `token` | string | 16 位十六进制 token（全局唯一） |
| `qrPayload` | string | 建议前端直接编码进二维码图片的字符串：`ztchat://friend-invite?token={token}`（服务端不生成二维码图片） |
| `maxUses` | int | 最大可被接受的扫码次数；`0`=不限 |
| `usedCount` | int | 已被接受的次数 |
| `message` | string? | 扫码后默认附言 |
| `status` | string | `active` / `revoked` / `exhausted` |
| `expiresAt` | DateTimeOffset | 过期时间 |
| `createdAt` | DateTimeOffset | 创建时间 |

`FriendInviteQrPreviewDto`（`GET /friends/invite-qr/{token}/preview` 返回）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `inviterUserId` | GUID | 发码人在当前空间下的可见用户 ID |
| `inviterDisplayName` | string | 发码人显示名 |
| `inviterAvatarUrl` | string? | 发码人头像 |
| `message` | string? | 扫码后默认附言 |
| `expiresAt` | DateTimeOffset | 过期时间 |
| `expired` | bool | `true`=已过期/已撤销/已用尽，前端应提示「二维码已失效」 |
| `alreadyFriends` | bool | `true`=扫码人已与发码人是好友，前端可跳过申请步骤 |

### 4.8 `ConversationListItemDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 会话 ID |
| `conversationType` | string | `direct` 或 `group`（`GET /conversations` 纯 IM 列表不再返回 `temp_session`，2026-06-03 起） |
| `title` | string | 单聊为对端昵称，群聊为群名 |
| `avatarUrl` | string? | 会话头像 |
| `lastMessage` | `LastMessageDto?` | 最后一条消息摘要 |
| `draft` | `ConversationDraftPreviewDto?` | 草稿预览；为空表示无草稿 |
| `unreadCount` | int | 未读数 |
| `lastReadSeq` | long | 当前用户已读到的会话序号 |
| `lastMessageSeq` | long | 当前会话最后一条消息序号 |
| `isPinned` | bool | 是否置顶 |
| `isMuted` | bool | 是否免打扰 |
| `peerUserId` | GUID? | 单聊场景下的对端用户 ID |
| `peerUserType` | short? | 单聊对端用户类型：`1=客户`、`2=员工/客服`、`3=访客`；群聊为 `null` |
| `memberCount` | int? | 群成员数，仅群聊有值 |
| `ownerUserId` | GUID? | 群主 ID，仅群聊有值 |
| `tempSession` | `TempSessionSummaryDto?` | 历史保留字段；`GET /conversations` 已不返回临时会话，恒为 `null` |

会话列表分页壳：

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | `ConversationListItemDto[]` | 当前页会话列表 |
| `nextCursor` | string? | 下一页游标；为空表示没有下一页 |

### 4.9 单聊、群聊和公告 DTO

| DTO | 关键字段 |
|---|---|
| `DirectChatCreatedDto` | `chatId` `peerUserId` `peerDisplayName` `peerAvatarUrl?` `isNew`；自聊时 `peerUserId` 为当前用户自己 |
| `DirectChatDetailDto` | `chatId` `peerUserId` `peerDisplayName` `peerAvatarUrl?` `peerUserType`(short, 1/2/3) `isPinned` `isMuted` `lastReadSeq` `lastMessageSeq` `unreadCount`；自聊时 `peer*` 字段表示当前用户自己 |
| `PeerReadStatusDto` | `peerLastReadSeq` `peerLastReadAt?` |
| `GroupCreatedDto` | `groupId` `title` `memberCount` |
| `GroupDetailV2Dto` | `groupId` `title` `avatarUrl?` `ownerUserId?` `memberCount` `muteMode` `settings` `isPinned` `isMuted` `myRole` `unreadCount` `lastMessageSeq` `lastReadSeq` `createdAt` |
| `GroupMemberDto` | `userId` `displayName` `avatarUrl?` `role` `joinedAt` `groupAlias?` | `groupAlias`=群内昵称(群备注名),**2026-06-06 起**;为 `null` 表示未设置,展示时回退到 `displayName` |
| `GroupAnnouncementDto` | `announcementId` `conversationId` `publisherUserId` `publisherDisplayName?` `title?` `content` `isPinned` `createdAt` `updatedAt` |
| `GroupJoinRequestDto` | `requestId` `conversationId` `userId` `userDisplayName?` `userAvatarUrl?` `message?` `status` `createdAt` |
| `GroupSettingsDto` | `allowMemberInvite` `allowMemberModifyTitle` `allowMemberAtAll` `allowMemberViewMemberList` `allowQrCodeJoin` `requireApproval` `allowMemberAddFriend` |

### 4.10 消息与同步 DTO

| DTO | 关键字段 |
|---|---|
| `MediaUploadResponse` | `mediaId` `mediaKind` `url` `relativePath` `fileName` `mimeType` `sizeBytes` `thumbnailUrl?` |
| `MediaResourceDto` | `url` `fileName?` `mimeType?` `sizeBytes?` `width?` `height?` `durationSeconds?` `thumbnailUrl?` |
| `MessageBodyDto` | `text?` `image?` `video?` `voice?` `file?` `contactCard?` `callLog?` `location?` `event?`，按 `messageType` 只填一类有效正文；`event` 仅历史/同步中的系统消息会返回 |
| `ContactCardDto` | `userId` `displayName` `avatarUrl?` `mobile?` `email?` |
| `CallLogDto` | `callId` `mediaMode` `durationSeconds` `endReason` `isCaller` |
| `LocationDto` | `latitude` `longitude` `title?` `address?` `zoomLevel?` |
| `MentionDto` | `userId` `offset` `length` |
| `MessageItemDto` | `messageId` `conversationId` `conversationSeq` `senderUserId` `messageType` `body` `isRecalled` `sentAt` `replyToMessageId?` `forwardFromMessageId?` `mentions?` `clientMsgId?` `appId?` |
| `GroupReadReceiptsDto` | `members[]` `totalMembers` `readCount` `unreadCount` |
| `ReadReceiptUserDto` | `userId` `displayName` `avatarUrl?` `lastReadSeq` |
| `SyncResponse` | `conversations[]` `nextSinceSeq?` |
| `SyncConversationItem` | `conversationId` `messages[]` `lastReadSeq` |

### 4.11 `TempSessionSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID? | 临时会话 ID |
| `visitorId` | GUID? | 访客 ID |
| `locale` | string? | 访客语言 |
| `category` | string? | 会话分类 |
| `sourceChannel` | string? | 来源渠道 |
| `visitorName` | string? | 访客名称 |

### 4.12 `ConversationDraftPreviewDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `draftText` | string | 草稿文本 |
| `updatedAt` | DateTimeOffset | 草稿更新时间 |

### 4.13 `TempSessionAiInfoDto`（精选字段）

完整字段较多；本表只列出客户端通常会用到的前 4 个：

| 字段 | 类型 | 说明 |
|---|---|---|
| `botUserId` | GUID? | AI 机器人用户 ID（未启用时为 `null`） |
| `botDisplayName` | string? | AI 机器人显示名 |
| `serviceStatus` | string | AI 服务状态，见 §5.5 / [client-api.md §12.13](./client-api.md#12-13-ai-服务状态枚举) |
| `enabled` | bool | 当前会话是否启用了 AI 回复 |

其它字段（`isActive`/`humanRequested`/`firstResponseAt`/`messageCount`/`handoff*`/`last*` 等）属于扩展元数据，按需读取即可。

### 4.14 `TempSessionMessageDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 底层会话 ID |
| `conversationSeq` | long | 会话内序号 |
| `senderUserId` | GUID | 发送者用户 ID |
| `senderDisplayName` | string | 发送者显示名 |
| `senderType` | string | 发送者类型：`visitor` / `staff` / `ai` / `system` |
| `messageType` | string | 消息类型 |
| `body` | object | 消息正文（与 `MessageBodyDto` 同形，但以 JSON 元素直接传输） |
| `sentAt` | DateTimeOffset | 发送时间 |
| `replyToMessageId` | GUID? | 回复目标消息 ID |
| `senderRole` | string? | 发送者角色：`staff_reply` / `visitor` / `ai_bot` / `system` / `manager_intervention`；客户端可据此渲染"管理员介入"标签 |

### 4.15 `TempSessionDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `session` | `TempSessionAdminListItemDto` | 会话基本信息 |
| `visitor` | `TempSessionAdminVisitorDto` | 访客信息 |
| `participants` | `TempSessionParticipantDto[]` | 参与者列表，元素 `{ userId, displayName, role }` |
| `messages` | `TempSessionMessageDto[]` | 消息列表 |
| `events` | `TempSessionTimelineItemDto[]` | 事件时间线 |
| `notes` | `TempSessionNoteDto[]` | 客服备注 |
| `rating` | `TempSessionRatingDto?` | 访客评价 |
| `quality` | `TempSessionQualityDto` | 质检信息（非可空） |
| `ai` | `TempSessionAiInfoDto?` | AI 客服信息（未启用时为 `null`） |

### 4.16 收藏、草稿、搜索、翻译、Presence DTO

| DTO | 关键字段 |
|---|---|
| `FavoriteDto` | `favoriteId` `messageId` `conversationId` `note?` `createdAt` |
| `FavoriteListItemDto` | `favoriteId` `messageId` `conversationId` `conversationSeq` `conversationType` `conversationTitle` `senderDisplayName` `messageType` `favoriteCategory` `preview` `body` `note?` `isRecalled` `sentAt` `favoritedAt` |
| `FavoriteSummaryDto` | `totalCount` `textCount` `imageCount` `videoCount` `voiceCount` `fileCount` `otherCount` |
| `DraftDto` | `conversationId` `draftText` `updatedAt` |
| `SearchUserDto` | `userId` `displayName` `avatarUrl?` `signature?` `lppId?` `userType` `matchType` |
| `UpdateNotificationSettingsRequest` | `globalMute?` `dndStartTime?` `dndEndTime?` `soundEnabled?` `vibrationEnabled?` `previewEnabled?` |
| `ChatFileDto` | `mediaId` `mediaKind` `fileName` `mimeType` `sizeBytes` `url` `createdAt` |
| `NotificationSettingsDto` | `globalMute` `dndStartTime?` `dndEndTime?` `soundEnabled` `vibrationEnabled` `previewEnabled` |
| `TranslationResultDto` | `originalText` `translatedText` `targetLanguage` `model` |
| `PresenceDto` | `userId` `isOnline` `customStatus?` `devices[]` |
| `PresenceDeviceDto` | `deviceId?` `nodeId` `platform` `lastSeenAt` |

## 5. 枚举和值域补充

### 5.1 登录、验证码与资料

| 字段 | 可选值 | 说明 |
|---|---|---|
| 平台登录 `loginType` | `auto` `email` `mobile` `lpp_id` | `auto` 时会按 `identifier` 是否含 `@` 自动判定邮箱；若以 `lpp_` 开头则按 `lpp_id` 处理，否则按手机号逻辑走 |
| 租户内登录 / 重置密码 `loginType` | `login_name` `email` `mobile` `lpp_id` | 租户内登录默认 `login_name` |
| 验证码登录 `loginType` | 平台：`auto` `email` `mobile`；租户：`email` `mobile` | 租户验证码登录不支持 `login_name`，不传时按是否包含 `@` 自动推断 |
| 验证码 `channel` | `sms` `email` | 非法值会返回 `VERIFY_INVALID_CHANNEL` |
| 验证码 `purpose` | `register` `login` `reset_password` | 服务端缺省回落为 `register`；`login/reset_password` 对未知账号静默成功 |
| 资料 `gender` | `unset` `male` `female` `other` | 写入时也接受 `0/1/2/3` |

### 5.2 租户相关

| 字段 | 值 | 说明 |
|---|---|---|
| `spaceType` | `0` `1` `2` | `selection_required` `personal` `tenant` |
| `membershipRole` | `0` `1` `2` `3` `4` | `member` `technical` `customer_service` `admin` `owner` |
| `joinMethod` | `0` `1` `2` | `self` `invite` `approval` |
| 租户 `status` | `0` `1` `2` `9` | `pending_approval` `active` `suspended` `deleted` |
| 邀请 `inviteType` | `0` `1` | `0=public` 通用邀请，`1=targeted` 定向邀请 |
| 邀请 `status` | `0` `1` `3` | `revoked` `active` `exhausted` |
| 加入申请 `status` | `0` `1` `2` `3` | `pending` `approved` `rejected` `cancelled` |

### 5.3 社交、会话、消息

| 字段 | 值 | 说明 |
|---|---|---|
| 好友申请 `action` | `accept` `reject` | `/friends/requests/{requestId}/handle` 只接受这两个字符串 |
| 好友申请公开 `status` | `pending` | 当前 `/friends/requests` 仅返回待处理记录 |
| 好友申请内部状态 | `0` `1` `2` `3` | `pending` `accepted` `rejected` `cancelled`，当前未完整对外暴露 |
| 加好友二维码 `status` | `active` `revoked` `exhausted` | 字符串枚举值，客户端只消费字符串；用尽（`usedCount>=maxUses` 且 `maxUses<>0`）后自动转 `exhausted` |
| 会话类型 | `direct` `group` `temp_session` | 对应内部 `1`、`2` 和 `3` |
| `messageType` | `text` `markdown` `image` `video` `voice` `file` `contact_card` `call_log` `location` `event` | 客户端主动发送不支持 `event` |
| 收藏查询 `category` / `favoriteCategory` | `all` `text` `image` `video` `voice` `file` `other` | `text` 同时包含 `messageType=text` 与 `markdown`；`contact_card`、`call_log`、`location` 归入 `other` |
| `mediaKind` | `image` `video` `voice` `file` | 上传、聊天文件列表、消息媒体都共用这四个值 |
| 群成员 `role` | `owner` `admin` `member` | `myRole` / 成员列表可返回三种值 |
| 设置成员角色请求 | `admin` `member` | 设置群主使用单独的转让接口 |
| 群全员禁言 `muteMode` | `0` `1` | `normal` / `all_muted` |
| 群详情 `muteMode` 字符串 | `normal` `all_muted` | 只出现在群详情 DTO |
| 成员禁言 `muteMode` | `0` `1` | `0=解除禁言`，`1=禁言` |

### 5.4 通知、翻译与 Presence

| 字段 | 值 | 说明 |
|---|---|---|
| 翻译 `model` | `fast` `quality` | 非法值当前会静默回退为 `fast` |
| Presence 事件字段 | `isOnline` | REST 和 Gateway 都已统一成 `isOnline` |
| `/direct-chats/*/files` 与 `/groups/*/files` 查询参数 `mediaKind` | `image` `video` `voice` `file` | 为空表示不过滤 |
| Gateway `space.notice.noticeType` | `message` | 跨空间新消息全局提醒；不携带正文，需切换空间后再拉详情 |
| Gateway `space.notice.*Unread*` | int | 目标空间与全局未读计数，用于跨空间红点 |

### 5.5 新增字段（v3 补齐）

| 字段 | 值 | 说明 |
|---|---|---|
| `UserProfileDto.tapTapText` | `string?` | 拍一拍自定义文案，最多 20 字符 |
| `PrivacySettingsDto.searchableByMobile` | `bool` | 是否允许通过手机号搜索 |
| `PrivacySettingsDto.searchableByLppId` | `bool` | 是否允许通过 ZT 号搜索 |
| `PrivacySettingsDto.allowFriendRequest` | `everyone` `friends_of_friends` `nobody` | 好友申请策略 |
| `PrivacySettingsDto.profileVisibility` | `everyone` `friends` `nobody` | 资料可见性 |
| `AddressDto.label` | `string?` | 地址标签（家、公司等） |
| `AddressDto.isDefault` | `bool` | 是否默认地址 |
| `DeviceInfoDto.deviceType` | `ios` `android` `web` `desktop` `unknown` | 设备类型 |
| `DeviceInfoDto.isCurrent` | `bool` | 是否当前设备 |
| `DeactivateAccountResponse.deactivatedAt` | `DateTimeOffset` | 注销申请时间 |
| `CancelDeactivateAccountResponse.cancelledAt` | `DateTimeOffset` | 撤销注销时间 |
| `ChangeMobileRequest.oldVerificationCode` | `string?` | 旧手机号验证码；双重验证时必填 |
| `VoiceToTextResponse.language` | `zh-CN` `en` `und` | 检测到的语言 |
| `SubmitFeedbackRequest.type` | `complaint` `suggestion` `bug` | 反馈类型 |
| `ClientConfigResponse.enterpriseBindingMode` | `bool` | 是否启用企业绑定模式 |
| `ClientConfigResponse.tenantSearchEnabled` | `bool` | 是否允许注册前搜索租户 |
| 注册 platform-result `pendingApproval` | `bool` | 企业绑定模式 + 人工审批时为 `true` |
| `auth.force_logout` `reason` | `device_revoked` `account_deactivated` | 强制登出原因 |

## 6. Gateway 事件速查

Hub 路径：`/ws/client`（标准客户端）、`/ws/widget`（访客 Widget）

认证方式：`Authorization: Bearer {accessToken}` 或 `?access_token={accessToken}`（SignalR WebSocket 场景）

### 6.1 上行方法

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `SendAsync` | `SendMessageRequest`（`clientMsgId`/`conversationId`/`messageType`/`body`/`replyToMessageId?`/`mentions?`） | 标准响应壳 + `{ messageId, conversationId, conversationSeq, serverTime }` | 统一发消息入口；按 `conversationId` 解析的会话类型路由到单聊或群聊 |
| `ReadAsync` | `conversationId` (GUID), `readSeq` (long) | 标准响应壳 | 标记某会话已读到 `readSeq`；与 REST `POST /direct-chats/{chatId}/read` / `/groups/{groupId}/read` 等价 |
| `HeartbeatAsync` | `platform` (string) | `{ code, data: { connectionId } }` | 心跳与在线刷新 |

### 6.2 下行事件速查

| 事件名 | 推送目标 | `data` 关键字段 | 说明 |
|---|---|---|---|
| `msg.new` | 会话成员 | `tenantId` `conversationId` `messageId` `conversationSeq` `senderUserId` `messageType` `body` `sentAt` `conversationType` `sourceType` | 新消息推送；`sourceType`(widget/im)+`conversationType`(direct/group/temp_session) 2026-06-03 新增，便于直接分流在线客服与 IM：`sourceType==="widget"` 即在线客服（详见 client-api.md §10.1 与 [字段枚举 §7.16.1](field-enum-reference.md)） |
| `space.notice` | 平台级连接 | `noticeType` `spaceType` `tenantId` `requiresSwitch` `targetUnreadConversationCount` `targetUnreadMessageCount` `unreadSpaceCount` `totalUnreadConversationCount` `totalUnreadMessageCount` | 跨空间新消息全局提醒；`noticeType` 当前固定 `"message"`；`spaceType=1` 为个人空间、`2` 为企业空间；`tenantId` 在企业空间下为目标租户 ID，个人空间为 `null` |
| `presence.changed` | 好友/同租户成员 | `userId` `isOnline` `customStatus?` | 在线状态变更；只包含这 3 个字段 |
| `msg.read` | 会话其他成员 | `tenantId` `conversationId` `userId` `readSeq` | 已读回执推送 |
| `msg.recalled` | 会话所有成员 | `tenantId` `messageId` `conversationId` `conversationSeq` `operatorUserId` | 消息撤回推送 |
| `group.settings.updated` | 群在群成员 | `conversationId` `operatorUserId` `title` `avatarUrl?` `muteMode` `settings` `updatedAt` | 群设置/全员禁言/群名群头像变更推送（2026-06-06 新增）；完整快照，收到后可直接覆盖或重拉群详情；纯 `/ws/client` 多端同步信号，不进 push/webhook（详见 client-api.md §10.10.3） |
| `auth.force_logout` | 目标连接 | `platformUserId?` `deviceId?` `reason` `revokedAt` `deactivateRequestedAt?` `cooldownEndsAt?` | 强制登出；`reason=device_revoked/account_deactivated/device_claimed_by_other_user` |
| `temp_session.assigned` | 租户客服 + 访客 Widget | `tenantId` `sessionId` `staffUserId` | 临时会话分配客服 |
| `temp_session.closed` | 租户客服 + 访客 Widget | `tenantId` `sessionId` `status` `reasonCode?` `reasonText?` `closedAt?` | 临时会话关闭 |
| `temp_session.rated` | 租户客服 | `tenantId` `sessionId` `rating` `tags?` `comment?` `ratedAt` | 访客评价推送 |
| `tenant.join_request.reviewed` | 申请人平台连接 | `tenantId` `requestId` `platformUserId` `status` `rejectReason?` `reviewedAt` | 加入申请审核结果；当前仅拒绝时推送 |
| `customer_service.assigned` | 客户平台连接 | `tenantId` `customerUserId` `platformUserId` `staffUserId` `staffDisplayName?` `transferConversation` `changedAt` | 客服归属变更推送 |

### 6.3 Widget Gateway（`/ws/widget`）

认证方式：`Authorization: Bearer {visitorToken}` 或 `?access_token={visitorToken}`

上行方法与 `/ws/client` 相同（`HeartbeatAsync`）。

可接收的下行事件：`msg.new`、`msg.read`、`msg.recalled`、`temp_session.assigned`、`temp_session.closed`、`temp_session.rated`。

## 7. 核心概念边界速查

详细说明见 [client-api.md §16](./client-api.md#16-核心概念边界)。

| 概念 | 要点 |
|---|---|
| Token 体系 | `platformToken`（平台级，`/api/platform/v1/*`）、`accessToken`（租户级，`/api/client/v1/*` + `/ws/client`）、`visitorToken`（访客，`/api/widget/v1/*` + `/ws/widget`）；三者不可互换 |
| 空间模型 | `spaceType`：`0=selection_required`（需选择）、`1=personal`（个人空间）、`2=tenant`（租户空间）；切换空间需重新走 `select-personal-space` 或 `select-tenant` |
| 线程标识 | `threadId`（统一客服线程 ID）vs `conversationId`（底层会话 ID）；`direct_customer` 场景下两者不同，不可互换 |
| 客服架构 | 统一工作台 `/workbench/*`（主入口）、兼容路径 `/temp-sessions/*`（仅访客临时会话）、管理中心 `/center/*`（AdminApi 管理端） |
| 客服线程类型 | 路由段用中划线 `temp-session`/`direct-customer`，响应字段用下划线 `temp_session`/`direct_customer`；语义相同 |
| 多租户模型 | 平台账号（全局身份）→ 租户（隔离工作区）→ 租户成员投影（租户内身份）→ 个人空间（兜底工作区） |
| 用户类型 | `userType`：`1=customer`（客户）、`2=staff`（员工）、`3=visitor`（访客）；由系统根据 `membershipRole` 自动计算 |
| 成员角色 | `membershipRole`：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner`；权限递增 |

## 8. 移动推送 设备注册 接口速查

Base URL：`/api/v1/notifications`

适用客户端：iOS / Android 原生应用。Web 端统一走 SignalR / WebSocket，无需调用这些端点。

| 端点 | 方法 | 请求字段 | 响应 `data` | 说明 |
|---|---|---|---|---|
| `/devices` | POST | `RegisterDeviceRequest` | `204 No Content` | 设备登录后或推送 Token 变更时上报；按 `(tenantId,userId,deviceId,channel)` upsert，同一设备重复调用即更新 Token/Region/AppVersion |
| `/devices/{deviceId}` | DELETE | 路径参数：`deviceId` | `204 No Content` | 注销当前用户在该设备上所有通道的 Token（软删：`IsActive=false`） |
| `/devices` | GET | 无 | `DeviceRegistrationDto[]` | 返回当前登录用户在当前租户下处于 `IsActive=true` 的设备 Token 列表 |

### 8.1 `RegisterDeviceRequest`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `deviceId` | string | 是 | 应用侧稳定的设备标识；同设备多次注册会 upsert |
| `platform` | short | 是 | 设备平台，见 §8.3 `DevicePlatform` |
| `channel` | short | 是 | 推送通道，见 §8.3 `PushChannel` |
| `token` | string | 是 | FCM registration token 或 JPush registration id |
| `region` | string? | 否 | 地域标识（ISO 国家码或自定义），供管理后台按地域路由使用，大小写不敏感 |
| `appVersion` | string? | 否 | 客户端版本号，用于后续按版本定向推送/问题定位 |

### 8.2 `DeviceRegistrationDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | GUID | 注册记录 ID |
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |
| `deviceId` | string | 设备 ID |
| `platform` | short | 见 §8.3 `DevicePlatform` |
| `channel` | short | 见 §8.3 `PushChannel` |
| `token` | string | 当前有效 Token |
| `region` | string? | 地域 |
| `appVersion` | string? | 客户端版本 |
| `lastActiveAt` | DateTimeOffset | 最近一次注册/心跳时间 |
| `isActive` | bool | 是否仍有效；被服务端标记 Token 失效或用户注销后为 `false` |

### 8.3 推送相关枚举

| 枚举 | 值 | 说明 |
|---|---|---|
| `DevicePlatform` | `1=Android`、`2=iOS` | 设备平台；Web 不走该接口 |
| `PushChannel` | `1=Fcm`、`2=JPush` | 推送通道；FCM 对应 Firebase Cloud Messaging，JPush 对应极光推送 |
| `PushScenario` | `1=Message`、`2=Call`、`3=FriendRequest` | 推送场景（客户端无需关心，下行 `data.scenario` 字段会携带） |

### 8.4 推送下发 payload 约定

服务端按用户/租户/地域路由规则选定通道后，会向设备下发统一 payload：

- FCM：`notification.title` / `notification.body` + `data.scenario` + `data.messageId` + 业务自定义 `data`
- JPush：`notification.alert.title` / `alert` + `extras.scenario` + `extras.messageId` + 业务自定义 `extras`

高优先级场景（`Call`、`FriendRequest`、`HighPriority=true`）：

- FCM Android 设置 `priority=high`；APNS 设置 `apns-priority=10`
- JPush 设置 `options.apns-production=true` 且 `notification.ios` 走立即送达

### 8.5 Token 失效回调

服务端收到 Provider 返回 `Unregistered` / `InvalidArgument` / JPush 1011/1012/1020 错误码时，会将对应 `DeviceRegistration.IsActive` 置为 `false`，客户端无需主动处理；下次推送 Token 变更时重新调用 `POST /devices` 即可。
