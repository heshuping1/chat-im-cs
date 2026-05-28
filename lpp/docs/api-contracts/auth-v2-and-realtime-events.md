# 第三方客户端对接指南 — Auth v2 + 实时事件 + Phase D 新端点

> 适用范围:**iOS / Android / Web / PC 客户端**
> 服务端版本:`prod-20260517-054111-1de0195` 及之后
> 维护文档:本文为客户端接入唯一权威。如有歧义,服务端代码为准

---

## 0. 一图概览(三层 Token 架构)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 3 — deviceSessionToken (移动 App)                              │
│   - 256-bit opaque,前缀 ds_,系统 Keychain/Keystore 持久化          │
│   - 90 天无活动失效;每次 exchange 顺延                              │
│   - 不轮换 (no rotation)                                             │
│   - 用途:冷启动免密换 platformToken                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │ POST /auth/device-session/exchange
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2 — platformRefreshToken (Web / PC / 不愿信任设备的场景)      │
│   - 128-bit opaque,前缀 prt_,HttpOnly Cookie 或安全存储             │
│   - 滑动 30 天 / 绝对 60 天                                          │
│   - **每次 exchange 必须 rotation**(否则触发复用检测,全用户撤销)  │
│   - 用途:platformToken 过期时静默换新                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │ POST /auth/refresh-platform-token-by-refresh-token
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1 — platformToken (JWT, 6h)                                    │
│   - 自包含,无状态验证                                               │
│   - claim 含: platformUserId, deviceId?, tgen (token_generation), jti│
└─────────────────────────────────────────────────────────────────────┘
```

**为什么三层?**
- Layer 1 (JWT) 提供"快路径"(每个 API 请求免 DB 查询)
- Layer 2/3 (opaque) 提供"可撤销"(改密码/踢设备立即生效)
- 改密码后,所有 Layer 1 JWT 在 30 秒内自动失效(tgen 不匹配),但 Layer 2/3 也同时被撤销 → 客户端必须重登

---

## 1. 登录流程

### 1.1 移动 App(推荐三层全开)

```
请求:POST /api/platform/v1/auth/login
{
  "identifier": "user@example.com",      // 或手机号/lpp_id
  "password": "...",
  "loginType": "email",                  // "email" | "mobile" | "lpp_id" | "auto"

  "issueRefreshToken": true,             // Phase A3:要 Layer 2
  "trustDevice": true,                   // Phase A4:要 Layer 3
  "deviceId": "<uuid-from-keychain>",    // trustDevice=true 时必填
  "deviceName": "iPhone 15 Pro",         // 可选,设备列表显示用
  "devicePlatform": "ios",               // "ios" | "android" | "web" | "pc"
  "deviceModel": "iPhone15,2",           // 可选
  "appVersion": "1.2.3"                  // 可选
}

响应:200
{
  "code": "OK",
  "data": {
    "platformUserId": "...",
    "lppId": "lpp_xxxxxxxxx",
    "displayName": "...",
    "platformToken": "eyJ...",            // JWT (Layer 1)
    "expiresIn": 21600,                   // platformToken 寿命秒数
    "tenants": [...],                     // 该账号可访问的租户列表
    "spaceContext": {...},

    "platformRefreshToken": "prt_xxx",    // Layer 2(若 issueRefreshToken=true)
    "platformRefreshTokenExpiresAt": "2026-06-16T...",

    "deviceSession": {                    // Layer 3(若 trustDevice=true)
      "deviceSessionToken": "ds_xxx",
      "issuedAt": "...",
      "inactiveExpiresAt": "..."          // = issuedAt + 90 天,每次 exchange 顺延
    }
  }
}
```

### 1.2 Web 客户端(推荐只开 Layer 2)

```json
{
  "identifier": "...", "password": "...", "loginType": "email",
  "issueRefreshToken": true,
  "trustDevice": false               // Web 不需要设备绑定
}
```

把 `platformRefreshToken` 存到 **HttpOnly Cookie**(防 XSS),`platformToken` 存到 sessionStorage 或内存。

### 1.3 网吧/临时设备(只要 Layer 1)

```json
{
  "identifier": "...", "password": "...",
  "issueRefreshToken": false, "trustDevice": false
}
```

6 小时后强制重登。

---

## 2. 启动流程(App 冷启动)

```
1. 读 Keychain (deviceId, deviceSessionToken)
   ├─ 都有  → silent path (3)
   └─ 缺失  → 密码登录 (8)

2. (已废弃,与 (3) 合并)

3. POST /api/platform/v1/auth/device-session/exchange
   { "deviceSessionToken": "ds_xxx", "issueRefreshToken": true }

   ├─ 200 → 拿到新 platformToken (+ 可选新 refresh) → (4)
   ├─ 401 DEVICE_SESSION_NOT_FOUND → 清凭证 → 登录页
   ├─ 401 DEVICE_SESSION_REVOKED   → 弹"已在其他设备退出" → 登录页
   ├─ 401 DEVICE_SESSION_EXPIRED   → 90 天未活动,清凭证 → 登录页
   ├─ 401 SECURITY_REQUIRED        → 弹安全告警 → 登录页
   └─ 5xx → 本地缓存只读进 App + 后台重试

4. 用 platformToken 调 /select-tenant 或 /select-personal-space → 拿 tenant accessToken
5. 用 tenant accessToken 调业务 API
6. 用 tenant accessToken 连 Gateway WebSocket
7. 订阅实时事件 (见第 4 节)

8. 密码登录页 → 用户输账号 + 密码 → 走 §1.1 流程
```

**自动续 platformToken**:client 应在距 `expiresIn` 还有 **10 分钟**时主动 exchange,避免 401 才发现。

---

## 3. 错误码契约

所有 401 错误响应体格式:

```json
{
  "code": "<STABLE_CODE>",
  "message": "human readable",
  "requestId": "..."
}
```

### 鉴权类(Auth v2 Phase A1-A4)

| Code | 含义 | 客户端动作 |
|---|---|---|
| `DEVICE_SESSION_NOT_FOUND` | 凭证不存在(被服务端删了/手动伪造) | 清本地凭证,跳登录 |
| `DEVICE_SESSION_REVOKED` | 被踢/改密码/管理员强制下线 | 按 `revoke_reason` 弹明确原因,跳登录 |
| `DEVICE_SESSION_EXPIRED` | 90 天未活动 | 清凭证,跳登录(无需特殊提示) |
| `SECURITY_REQUIRED` | 风控触发(本期预留) | 弹"为安全请重新登录",跳登录 |
| `TOKEN_GENERATION_OUTDATED` | JWT 的 tgen claim 与 DB 不匹配(用户改密码后) | 静默 exchange 换新 JWT;若失败跳登录 |
| `TOKEN_REVOKED` | jti 在黑名单(用户退出本设备) | 同上 |
| `REFRESH_TOKEN_EXPIRED` | platformRefreshToken 30 天 sliding 或 60 天 absolute 到期 | 跳登录 |
| `REFRESH_TOKEN_REUSE_DETECTED` | 同一 refresh token 被并发用 / 重复用(典型攻击信号) | 弹严重安全告警,清所有本地凭证,跳登录 |
| `REFRESH_TOKEN_REQUIRED` | refresh 端点未传 token | 客户端 bug — 修请求体 |
| `DEVICE_SESSION_TOKEN_REQUIRED` | exchange 端点未传 token | 同上 |
| `AUTH_PLATFORM_TOKEN_REQUIRED` | 旧路径 refresh 缺 Authorization header | 客户端 bug |
| `AUTH_ACCOUNT_DISABLED` | 账号被禁用 | 弹禁用提示,跳登录 |

### 内容风控(Phase D2)

| Code | 含义 |
|---|---|
| `DIRECT_MESSAGE_BLOCKED_BY_MODERATION` | 私聊消息被内容风控拦截 |
| `GROUP_MESSAGE_BLOCKED_BY_MODERATION` | 群消息被内容风控拦截 |
| `TEMP_SESSION_SENSITIVE_BLOCKED` | Widget 消息被拦截(旧路径,行为同) |

错误响应额外含 `hitWord` 字段(命中的敏感词);客户端可选地展示给用户。

---

## 4. WebSocket 实时事件清单

连接到 `/ws/client`(用户)或 `/ws/admin`(管理后台)后,会收到以下事件。

### 4.1 鉴权事件(Phase A2/A4 + B2)

所有事件 payload 至少含 `eventType`, `tenantId`, `data` 字段。

#### `auth.session.revoked` / `auth.force_logout`

两个事件名**等价**(后者是 legacy,过渡期同时发送)。客户端可订阅其中之一。

```json
{
  "eventType": "auth.session.revoked",
  "entityId": "<platformUserId>",
  "data": {
    "platformUserId": "...",
    "reason": "password_changed",        // 或 password_reset / account_disabled / refresh_reuse_detected / admin_force_logout / ...
    "actorUserId": null,                 // 若 admin 操作,这是 actor 的 UserId
    "revokedAt": "...",
    "newTokenGeneration": 5
  }
}
```

**客户端动作**:**立即**断开 WebSocket,清本地凭证,跳登录页。**不要重连**。

#### `auth.device.kicked`

某台设备被踢出(管理员或用户在另一台设备主动操作)。当前设备**可能**就是被踢的设备;`revokedByDeviceId` 是踢者的 deviceId。

```json
{ "eventType": "auth.device.kicked", "data": { "revokedByDeviceId": "...", "revokedAt": "..." } }
```

**客户端动作**:同 `auth.session.revoked`。

#### `auth.device.added`

用户在新设备登录,**当前**(旧)设备会收到通知 — 不强制退出,但应该提示用户。

```json
{ "eventType": "auth.device.added", "data": { "deviceName": "...", "platform": "ios", "ip": "...", "addedAt": "..." } }
```

**客户端动作**:静默提示(banner / 系统通知)"您的账号在新设备 XX 登录"。

#### `auth.password.changed`

用户改密码后,所有其他设备收到。**注意**:发起改密码的设备会收到 `auth.session.revoked`,这个事件是给"在线的其他设备"看的。

```json
{ "eventType": "auth.password.changed", "data": { "changedAt": "..." } }
```

#### `auth.security.required`

风控触发(本期预留,本期没有规则会触发)。

```json
{ "eventType": "auth.security.required", "data": { "reason": "...", "severity": "high" } }
```

**客户端动作**:弹"需重新验证身份",跳登录。

#### `auth.reuse.detected`

refresh token 复用检测命中。一般等于全用户撤销 — 客户端会收到 `auth.session.revoked` 紧随其后。

### 4.2 客服事件(Phase B2 + C1/C2)

**Audience**:订阅这些事件需要 `customer_service.center.view` 权限。

#### `customer_service.staff.status_changed`

客服主动变更状态(online → busy 等)。

```json
{ "eventType": "customer_service.staff.status_changed", "data": {
  "staffUserId": "...", "fromStatus": "online", "toStatus": "busy",
  "queueAcceptEnabled": "false", "changedAt": "...", "operator": "...", "source": "admin_or_self_action"
}}
```

#### `customer_service.staff.auto_offline`

客服超过 90 秒无心跳,服务端自动改为 offline。

```json
{ "eventType": "customer_service.staff.auto_offline", "data": {
  "staffUserId": "...", "lastHeartbeatAt": "...", "changedAt": "...",
  "reason": "heartbeat_idle_timeout", "thresholdSeconds": "90"
}}
```

#### `customer_service.sla.warning` / `customer_service.sla.breached`

某线程进入风险 / 已违约。

```json
{ "eventType": "customer_service.sla.breached", "entityId": "<threadId>", "data": {
  "threadType": "temp_session",
  "threadId": "...",
  "fromRisk": "0",
  "toRisk": "2",
  "reasons": "[\"first_response_breached\"]"
}}
```

### 4.3 好友事件(Phase D3)

#### `friend.profile.updated`

用户在某一设备编辑好友的备注 / 标签 / 备注 / 来源后,**用户自己的其他设备**会收到(让其他端刷新本地好友列表缓存)。被备注的好友本人**不会**收到。

```json
{ "eventType": "friend.profile.updated", "data": {
  "tenantId": "...", "userId": "<self>", "friendUserId": "..."
}}
```

### 4.4 既有的好友 / 租户 / 群事件(未变)

`friend.request.created` / `friend.request.accepted` / `tenant.join_request.*` / `group.join_request.*` 与之前一致。

---

## 5. Phase D 新 endpoint 速查

### 5.1 加入申请审批(Phase D1)

**变更 DTO**:`JoinRequestDto` 增 4 字段(可空,旧客户端忽略未知字段即可):

```json
{
  "requestId": "...",
  "tenantId": "...",
  "platformUserId": "...",
  "displayName": "...",
  "message": "...",
  "status": 0,
  "createdAt": "...",
  "reviewedAt": null,
  "rejectReason": null,

  // ⬇ 新增
  "userId": "...",         // 该 platformUser 在该租户内的 User.UserId(可能 null)
  "avatarUrl": "...",      // User.AvatarUrl ?? PlatformUser.AvatarUrl
  "lppId": "lpp_xxxxxxxxx",
  "userType": 1            // 该用户在该租户的 UserType
}
```

**之前的 bug**:`GET /api/admin/v1/platform/tenants/{tenantId}/join-requests` 偶尔返回 500 INVALID_OPERATION。Phase D1 已修复;客户端可重新启用相关 UI 路径。

### 5.2 客户服务历史聚合(Phase C4)

按客户身份查跨频道(临时会话 + 直聊客服)历史。

```
GET /api/client/v1/customer-service/customers/service-history
    ?customerUserId={guid}      # 必选其一
    &visitorUserId={guid}
    &customerId={string}
    &limit=50
    &cursor=<opaque>

GET /api/admin/v1/customer-service/center/customers/service-history
    (同样参数)
```

响应:

```json
{
  "items": [
    {
      "threadType": "temp_session",
      "threadId": "...",
      "tenantId": "...",
      "staffUserId": "...",
      "status": 2,
      "startedAt": "...",
      "acceptedAt": "...",
      "firstResponseAt": "...",
      "closedAt": "...",
      "lastMessageAt": "...",
      "riskLevel": 0,
      "riskReasonsJson": null
    }
  ],
  "nextCursor": "..."
}
```

### 5.3 Quick Reply 增量同步(Phase C3)

移动客户端的"客服快捷回复"缓存增量同步。

```
GET /api/client/v1/customer-service/quick-replies/sync
    ?updatedSince=2026-05-17T00:00:00Z   # 可选,首次留空
```

响应:

```json
{
  "items": [
    { "quickReplyId": "...", "scope": "all", "title": "...", "content": "...",
      "updatedAt": "...", "deletedAt": null /* 或 "..." 表示墓碑 */ }
  ],
  "updatedSince": "...",
  "serverTime": "2026-05-17T12:45:06.5Z"
}
```

**客户端策略**:
- 首次启动:不传 `updatedSince`,全量同步
- 之后每次:传上一次响应的 `serverTime`,只拿增量
- 看到 `deletedAt != null` 的项:本地缓存删除

### 5.4 好友资料详情(Phase D3)

```
GET /api/client/v1/friends/{friendUserId}/profile-extra
```

响应:

```json
{
  "friendUserId": "...",
  "displayName": "...",
  "avatarUrl": "...",
  "remarkName": "李四(同事)",   // 用户给好友起的备注名(显示用)
  "groupName": "默认分组",
  "note": "线下见过 2 次",        // 私人备注(与 remark 区分)
  "tags": ["同事", "技术"],
  "source": "scan_qr",            // 添加来源
  "addedAt": "2026-05-01T...",   // 首次加好友时间
  "createdAt": "2026-05-01T...",
  "userType": 1,

  // 隐私敏感字段 — 受好友的 UserPrivacySettings 控制,可能为 null
  "mobile": "138...",
  "email": null,
  "signature": "一切都会好起来的",
  "bio": null,
  "location": "上海",
  "genderValue": 1,
  "birthday": "1990-01-01",

  // 平台级,无隐私门
  "lppId": "lpp_xxxxxxxxx"
}
```

### 5.5 共同群聊(Phase D3)

```
GET /api/client/v1/friends/{friendUserId}/common-groups
```

响应:

```json
{
  "items": [
    { "conversationId": "...", "title": "技术讨论组", "avatarUrl": "...",
      "memberCount": 28, "lastMessageAt": "..." }
  ]
}
```

按 `lastMessageAt` desc 排序,上限 200。

### 5.6 好友资料编辑扩展(Phase D3)

`PUT /friends/{friendUserId}` 请求体扩展(原有 remarkName/groupName 不变):

```json
{
  "remarkName": "...",       // 既有
  "groupName": "...",        // 既有
  "tags": ["新标签", "另一个"],  // Phase D3:数组覆盖式;[] 清空
  "note": "新备注",            // Phase D3;空字符串清空
  "source": "scan_qr"          // Phase D3
}
```

**字段约定**:
- `null` 或字段缺失 = **保持原值不动**
- `""` (空字符串)或 `[]` (空数组) = **清空**

---

## 6. 客户端实现 checklist

### 6.1 移动 App 必做

- [ ] iOS 用 Keychain / Android 用 EncryptedSharedPreferences 存 `deviceId` + `deviceSessionToken`
- [ ] 启动时按 §2 流程
- [ ] 全局 401 拦截器,识别上述错误码并执行对应 UX
- [ ] WebSocket 订阅 `auth.session.revoked` + `auth.device.kicked` → 立即清凭证 + 跳登录
- [ ] WebSocket 订阅 `auth.device.added` → 系统通知"新设备登录"
- [ ] platformToken 到期前 10 分钟主动 exchange
- [ ] Quick Reply 用 §5.3 增量同步,本地缓存按 deletedAt 清理

### 6.2 Web 客户端必做

- [ ] `platformRefreshToken` 存 HttpOnly Cookie(后端会在响应里设置 Set-Cookie;客户端不直接读)
- [ ] 启动时,若有 Cookie → 调 `/auth/refresh-platform-token-by-refresh-token`
- [ ] **必须串行化 refresh** — 多个并发 refresh 调用会触发复用检测,全用户撤销

### 6.3 服务端会做但客户端要注意的事

- 客户端**不要**主动登录失败重试 — 服务端有限流
- 客户端**不要**保存密码到本地(让 Layer 2/3 凭证替代)
- 客户端**必须**正确处理 `REFRESH_TOKEN_REUSE_DETECTED` — 这是高危信号,要清干净所有凭证(包括 Layer 3,因为复用通常意味着 Layer 2 被偷)

---

## 7. 向后兼容性承诺

- **旧客户端**(不发 `issueRefreshToken` / `trustDevice` / `deviceId`)继续工作 — 服务端默认 false,只发 platformToken,行为与 pre-Phase-A1 完全一致
- **旧 endpoint** `/api/platform/v1/auth/refresh-platform-token`(需要 Authorization platformToken)**保留**;新 endpoint `/refresh-platform-token-by-refresh-token` 是另一条路径
- **`auth.force_logout` 事件名**保留同时发送(过渡期),客户端可订阅其中之一
- `JoinRequestDto` 新增的 4 个字段**全部可空**,旧客户端忽略即可

---

## 8. 联系方式

服务端 commit:`1de0195` 之后
设计文档:`docs/auth-and-customer-service-overhaul-plan.md`
Phase A/B/C/D/F 报告:`docs/phase-{a,b,c,d,e,f}-completion.md`

如发现服务端实际行为与本文不一致,以**服务端代码**为准并提 issue 同步本文。
