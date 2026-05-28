# 后台登录与 Token 管理 — 第三方对接指南

> 适用范围：iOS / Android / Web / PC 客户端，希望让用户登录"管理后台"调用 `/api/admin/v1/*` 接口
> 服务端版本：`prod-20260517-054111-1de0195` 及之后
> 与本文件配套：完整三层 Token 架构和细节见 [`auth-v2-and-realtime-events.md`](./auth-v2-and-realtime-events.md)
> 本文聚焦"登录 → 拿管理 token → 调接口 → 续期 → 退出"的最短可用路径

---

## 1. 谁能进管理后台？

**不只所有者**。能进后台 (`/api/admin/v1/*`) 的角色一共 7 个，按权限从高到低：

| `role_code` | 中文名 | 典型职责 |
|-------------|--------|---------|
| `platform_admin` | 平台超管 | 跨租户最高权限 |
| `tenant_owner` | 租户主账号 | 本租户最高负责人（"所有者"） |
| `tenant_admin` | 租户管理员 | 日常管理者，不能改角色权限本身 |
| `operations_operator` | 运营运维 | 用户/群组/客服调度/告警 |
| `customer_service` | 客服坐席 | 客服工作台 |
| `audit_operator` | 审计合规 | 只读 |
| `config_operator` | 配置管理员 | 系统级配置 |

**判定规则**：用户的 platform 账号在目标租户的 `admin_user_roles` 表里，挂上了上述 7 个 `role_code` 之一。Owner 不是必要条件，普通管理员也能登。

> 在 `/auth/login` 返回的 `tenants[].membershipRole` 字段里你能看到一个数字：`4=Owner / 3=Admin / 2=CustomerService / 1=Technical / 0=Member`。但**这只是租户成员关系**，**进后台的判定走 `admin_user_roles` 而不是这个数字**——可能一个 `membershipRole=3` 的人也没有 console-access 角色，反之亦然。最稳的做法是调 `/my/admin-tenants`（见 Step 2），它直接告诉你"哪些租户能进 + 进去能拿哪些角色"。

---

## 2. 域名与端口

| 域名 | 用途 |
|------|------|
| `https://chat.hearteasechat.com` | IM API。所有平台登录 / 换 token / 用户态接口 |
| `https://admin.hearteasechat.com` | Admin API。**只**挂 `/api/admin/v1/*` |

`adminAccessToken` 既能用在 `chat.hearteasechat.com/api/client/v1/*`（普通用户接口），也能用在 `admin.hearteasechat.com/api/admin/v1/*`（管理接口）。两个域名共用同一份 JWT。

---

## 3. 完整流程

### Step 1 — 平台登录

```http
POST https://chat.hearteasechat.com/api/platform/v1/auth/login
Content-Type: application/json

{
  "identifier": "lpp_aej69f2o",
  "password": "***",
  "loginType": "lpp_id",
  "issueRefreshToken": true,
  "trustDevice": true,
  "deviceId": "54741a13-85b1-40d5-b756-0f2f0a8e74e1",
  "deviceName": "iPhone 15 Pro",
  "devicePlatform": "iOS",
  "deviceModel": "iPhone16,1",
  "appVersion": "1.0.0"
}
```

`loginType` 支持：`lpp_id` / `mobile` / `email`。
`issueRefreshToken` / `trustDevice` / 设备信息**全部可选**，但**强烈建议移动端 APP 全开**——这样能拿到 3 层 token，未来 30~90 天免重新输密码。Web 端如果不想信任设备，可以只开 `issueRefreshToken: true`，不传 device 字段。

成功响应（HTTP 200）：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "platformUserId": "019da4de-9ac6-7747-b924-222a264dd6b6",
    "lppId": "lpp_aej69f2o",
    "displayName": "mouse所有者",
    "platformToken": "eyJhbGciOiJI...",
    "expiresIn": 21600,
    "platformRefreshToken": "prt_a1b2c3...",
    "platformRefreshTokenExpiresAt": "2026-06-16T13:10:22.859Z",
    "deviceSession": {
      "deviceSessionToken": "ds_x1y2z3...",
      "issuedAt": "2026-05-17T13:10:22.885Z",
      "inactiveExpiresAt": "2026-08-15T13:10:22.885Z"
    },
    "tenants": [
      {
        "tenantId": "019da0ce-9cd2-7623-8808-a0ab11da318a",
        "tenantCode": "mouse-corp",
        "tenantName": "Mouse 测试企业",
        "logoUrl": null,
        "membershipRole": 4
      }
    ],
    "spaceContext": { "spaceType": 2, "tenantId": "019da0ce-..." }
  }
}
```

客户端要保存：

| 字段 | 存哪 | 用途 |
|------|------|------|
| `platformToken` | 内存 | 调 platform 端接口；6h 过期 |
| `platformRefreshToken` | 安全存储（Keychain / SecureStorage / HttpOnly Cookie） | platformToken 过期时静默换新；30 天滑动过期；**每次使用必须 rotation** |
| `deviceSession.deviceSessionToken` | 系统 Keychain / Keystore（仅 APP） | 冷启动免密换新；90 天无活动失效 |
| `deviceId` | 本地（生成后不变） | 后续所有请求带 `X-Device-Id` header；同一设备的 session 隔离锚点 |
| `platformUserId` / `lppId` | 本地 | UI 显示 |

> **未 opt-in 的兼容行为**：如果 `issueRefreshToken` / `trustDevice` 都 false（默认），返回里 `platformRefreshToken` 和 `deviceSession` 都为 `null`，等同于"传统 6h JWT"流程——过期就重新输密码。

---

### Step 2 — 查询本人能进哪些租户的后台（推荐）

```http
GET https://chat.hearteasechat.com/api/platform/v1/my/admin-tenants
Authorization: Bearer <platformToken>
```

响应：

```json
{
  "code": "OK",
  "data": [
    {
      "tenantId": "019da0ce-9cd2-7623-8808-a0ab11da318a",
      "tenantCode": "mouse-corp",
      "tenantName": "Mouse 测试企业",
      "roleCodes": ["platform_admin"]
    }
  ]
}
```

UI 让用户在这个列表里挑一个租户。空列表 `[]` 表示该用户没有任何租户的后台访问权限——这种情况要友好提示"无管理权限"，**不要去调 `/auth/admin-token`**（会 403 `AUTH_NO_TENANT_USER`）。

---

### Step 3 — 换取该租户的管理 token

```http
POST https://chat.hearteasechat.com/api/platform/v1/auth/admin-token
Authorization: Bearer <platformToken>
Content-Type: application/json

{ "tenantId": "019da0ce-9cd2-7623-8808-a0ab11da318a" }
```

响应：

```json
{
  "code": "OK",
  "data": {
    "tenantId": "019da0ce-...",
    "tenantCode": "mouse-corp",
    "tenantName": "Mouse 测试企业",
    "userId": "019da4df-d135-7bae-a2a4-d7db34cc43bd",
    "displayName": "mouse所有者",
    "accessToken": "eyJhbGciOiJI...",
    "refreshToken": "rt_a1b2c3...",
    "expiresIn": 21600,
    "roleCodes": ["platform_admin"],
    "permissionCodes": [
      "admin.user.view", "admin.user.disable", "..."
    ],
    "isPlatformAdministrator": false,
    "spaceContext": { "spaceType": 2, "tenantId": "019da0ce-..." }
  }
}
```

- `accessToken` = **adminAccess**，JWT，6h 过期。后续调 `/api/admin/v1/*` 用它
- `refreshToken` = **adminRefresh**，opaque，30 天滑动过期。**每次刷新必须 rotation**
- `roleCodes` / `permissionCodes` 用来在 UI 上做权限控制（隐藏没权限的菜单按钮）

**切换租户语义**：再次调 `/auth/admin-token` 传不同 `tenantId` 时，**服务端自动撤销旧租户的同设备 admin session**。同一 deviceId 同一时刻只持有一个有效 admin token。如果同一用户在多个租户都是管理员，UI 切换租户重新调本接口即可。

---

### Step 4 — 调管理接口

```http
GET https://admin.hearteasechat.com/api/admin/v1/users?page=1&pageSize=20
Authorization: Bearer <adminAccess>
X-Device-Id: 54741a13-85b1-40d5-b756-0f2f0a8e74e1
```

`X-Device-Id` 不强制但**强烈建议带**——服务端审计日志、风控、撤销都需要它对齐到具体设备。

---

## 4. Token 续期（3 条独立路径）

### 路径 A — adminAccess 快过期，用 adminRefresh 换新

最常用，每隔几小时跑一次。

```http
POST https://chat.hearteasechat.com/api/client/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "rt_a1b2c3..." }
```

> 不需要 `Authorization` header。`X-Tenant-Id` 可选——服务端会从 refreshToken 反查对应的租户；同时也接受调用端通过 header 显式指定。当 refreshToken 同时匹配多个活跃会话时会返 `AUTH_TOKEN_AMBIGUOUS`，这时必须带 `X-Tenant-Id` 消歧义。

响应：

```json
{
  "code": "OK",
  "data": {
    "userId": "019da4df-...",
    "userType": 2,
    "accessToken": "<新 adminAccess, 6h>",
    "refreshToken": "<新 adminRefresh, 旧 token 已失效>",
    "expiresIn": 21600
  }
}
```

**注意**：`refreshToken` 字段返回的是**新值**，旧值立刻失效（rotation）。客户端必须用新值覆盖存储，否则下次刷新会失败。

---

### 路径 B — platformToken 还没过期，想续期

```http
POST https://chat.hearteasechat.com/api/platform/v1/auth/refresh-platform-token
Authorization: Bearer <platformToken>
```

响应：返回新 `platformToken`（6h）。

适合"用户活跃但 platformToken 即将过期"的滑动续期。

---

### 路径 C — platformToken 已过期，用 platformRefreshToken 静默换新（推荐）

```http
POST https://chat.hearteasechat.com/api/platform/v1/auth/refresh-platform-token-by-refresh-token
Content-Type: application/json

{ "platformRefreshToken": "prt_a1b2c3..." }
```

**不需要 Authorization header**——refreshToken 本身就是凭证。

响应：

```json
{
  "code": "OK",
  "data": {
    "platformUserId": "019da4de-...",
    "lppId": "lpp_aej69f2o",
    "displayName": "mouse所有者",
    "platformToken": "<新 platformToken, 6h>",
    "expiresIn": 21600,
    "platformRefreshToken": "<新 platformRefreshToken, 旧已失效>",
    "platformRefreshTokenExpiresAt": "2026-06-16T13:10:34.502Z"
  }
}
```

同样是 **rotation**——必须用新值覆盖存储。

---

### 路径 D — 移动 APP 冷启动免密登录（仅 APP）

APP 关掉后过几天再开，本地 platformToken 早过期，但 Keychain/Keystore 里还有 `deviceSessionToken`：

```http
POST https://chat.hearteasechat.com/api/platform/v1/auth/device-session/exchange
Content-Type: application/json

{
  "deviceSessionToken": "ds_x1y2z3...",
  "issueRefreshToken": false
}
```

`issueRefreshToken: true` 时同时返回新 `platformRefreshToken`（保持 Web/PC 不需要）。

响应：

```json
{
  "code": "OK",
  "data": {
    "platformUserId": "019da4de-...",
    "lppId": "lpp_aej69f2o",
    "displayName": "mouse所有者",
    "platformToken": "<新 platformToken, 6h>",
    "expiresIn": 21600,
    "platformRefreshToken": null,
    "platformRefreshTokenExpiresAt": null
  }
}
```

`deviceSessionToken` **不 rotation**（90 天无活动一直可用）。但每次 exchange 都顺延 inactive 计时。

---

## 5. 客户端推荐时序

### 移动 APP 启动

```
本地有 deviceSessionToken？
├─ 是 → 调路径 D 拿新 platformToken → Step 2 → Step 3 → Step 4
└─ 否 → 走 Step 1 (密码或验证码登录，opt-in trustDevice=true)
```

### Web / PC 启动

```
HttpOnly Cookie 里有 platformRefreshToken？
├─ 是 → 调路径 C 拿新 platformToken → Step 2 → Step 3 → Step 4
└─ 否 → 走 Step 1 (密码登录，opt-in issueRefreshToken=true)
```

### 运行期 token 自动续期

```
401 响应 / 本地 token 还有 < 10 分钟有效期 时：
├─ 调路径 A 换 adminAccess（最常用）
├─ 如果 adminRefresh 也过期 → 回到 Step 3 用 platformToken 重签
└─ 如果 platformToken 也过期 → 调路径 C 或 D 重签 platformToken
```

---

## 6. 退出登录

### 当前设备退出

```http
POST https://chat.hearteasechat.com/api/platform/v1/account/sign-out
Authorization: Bearer <platformToken 或 adminAccess>
X-Device-Id: 54741a13-85b1-40d5-b756-0f2f0a8e74e1
```

服务端撤销该用户在**当前设备**的：platform session + 所有租户的 admin session + refresh token + device session。客户端要同步清掉本地所有 token。

### 全部设备退出

普通用户没有"一键全设备退出"端点。两种做法：

1. **看本人在哪些设备登录过 + 逐个踢**：
   ```http
   GET    /api/platform/v1/account/devices
   DELETE /api/platform/v1/account/devices/{deviceId}
   ```

2. **改密码**：改密码会自动触发服务端 `tgen` 递增，**所有未过期 JWT 在 30 秒内全部失效**（含其他设备）。

---

## 7. 错误码速查

| `code` | HTTP | 含义 | 客户端处理 |
|--------|------|------|-----------|
| `AUTH_CAPTCHA_REQUIRED` | 428 | 该 IP / 该账号 1 次失败后必须图形验证码 | 调 `/auth/captcha` 拿题目，带 `captchaToken+captchaAnswer` 重试 |
| `AUTH_CAPTCHA_INVALID` | 400 | 验证码答错 | 重新拉题 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 用户名密码错 | 提示用户 |
| `AUTH_NO_TENANT_USER` | 403 | 该 platform user 在目标租户没有可登记录 | 不要重试；让用户换租户或联系管理员 |
| `ADMIN_FORBIDDEN` | 403 | 在目标租户没有任何 console-access 角色 | 同上，不要重试 |
| `AUTH_PLATFORM_TOKEN_REQUIRED` | 401 | platformToken 缺失或已过期 | 走路径 C / D 续期，失败则回 Step 1 |
| `REFRESH_TOKEN_REQUIRED` | 400 | 路径 C 请求体缺 `platformRefreshToken` | 检查 body |
| `REFRESH_TOKEN_REUSED` | 401 | 旧 refresh token 被重复使用（rotation 后） | **立即清掉本地所有 token + 强制重新登录**——服务端已撤销整个 chain |
| `AUTH_TOKEN_AMBIGUOUS` | 401 | refreshToken 同时匹配多个租户的活跃会话 | 在 `X-Tenant-Id` header 里指定具体租户重试 |
| `AUTH_TOKEN_EXPIRED` | 401 | refreshToken 已过期或被撤销 | 走 Step 1 重新登录 |
| `TENANT_NOT_ACTIVE` | 403 | 租户被停用 | 提示 |
| `RATE_LIMITED` | 429 | 触发限流 | 退避重试 |

---

## 8. 实测验证（生产）

服务端 2026-05-17 实测全链路通过：

```
POST /auth/login                                    → 200, 返三层 token
GET  /my/admin-tenants                              → 200, 返 [{mouse-corp, roleCodes:[platform_admin]}]
POST /auth/admin-token                              → 200, adminAccess + adminRefresh
GET  admin.hearteasechat.com/api/admin/v1/users     → 200, 26 行
POST /auth/refresh-platform-token                   → 200, 新 platformToken
POST /auth/refresh-platform-token-by-refresh-token  → 200, 新 platformToken + 新 refreshToken (rotated)
POST /auth/device-session/exchange                  → 200, 新 platformToken
```

---

## 9. 常见问答

**Q1: `tenants[]` 里的 `membershipRole` 数字和后台权限有关系吗？**

A：**没有强关系**。它只是租户成员关系（4=Owner / 3=Admin / 2=CustomerService / 1=Technical / 0=Member）。后台权限由 `admin_user_roles` 表独立维护。一定以 `/my/admin-tenants` 为准。

**Q2: 同一个用户在两个企业都是管理员，能同时登两个吗？**

A：**同一 deviceId 不能**。再次调 `/auth/admin-token` 切换租户时，旧租户的 admin session 自动被撤销。多租户并发需要不同 deviceId（典型：Web 多 tab 用不同 deviceId）。

**Q3: `platformToken` 6h 是不是太长？**

A：JWT 6h 是平衡。被盗 JWT 服务端能通过两种机制紧急止血：
1. 改密码 / admin 强制登出 → `tgen` 递增 → 旧 JWT 30 秒内全失效
2. `jti` 黑名单 → 单个 JWT 精准失效

**Q4: 客户端要不要主动校验 `accessToken` 里的 `exp` claim？**

A：建议在 `exp - 10 分钟` 时主动续期（路径 A），减少 401 重试。但**不要**完全依赖客户端 exp 判定——服务端可能因撤销提前失效（401 `TOKEN_REVOKED`），客户端要兜底处理。

**Q5: 一个企业多管理员同时操作，会互相挤掉吗？**

A：**不会**。互相挤掉只发生在"同一个 platform user 同一个 deviceId 切换租户"时。不同用户、或同一用户不同设备，session 互相独立。

---

## 10. 相关文档

- 完整 3 层 token 架构 + rotation 细节 + 黑名单机制：[`auth-v2-and-realtime-events.md`](./auth-v2-and-realtime-events.md)
- Admin API 完整端点列表：[`admin-api-reference.md`](./admin-api-reference.md)
- Client API 完整端点列表：[`client-api-reference.md`](./client-api-reference.md)
- 字段枚举值：[`field-enum-reference.md`](./field-enum-reference.md)
