# 致第三方开发者 — 2026-05 服务端大版本变更通知

> 致:**iOS / Android / Web / PC 客户端开发者 + 开放平台对接方**
> 发布范围:从 **2026-04** 到 **2026-05-17** 期间所有服务端变更
> 服务端版本:**`prod-20260517-phase-f-sla-dashboard-b45fcdd`**(本次新版)
> 文档目的:**这一阶段大改的所有面向你们的变化点都在这里**。这一份是变更通知,完整接入参考见 [`auth-v2-and-realtime-events.md`](./auth-v2-and-realtime-events.md) 和 [`client-api-reference.md`](./client-api-reference.md)
>
> 如有疑问,请把你们的 `client_version` + 报错 `errorCode` 发给服务端团队

---

## 📢 TL;DR — 一句话

> **老客户端在 90 天内继续工作,不需要紧急改;但我们做了一次鉴权大改造,强烈建议 30 天内升级 4 个最重要的事(下面 §1 列出)。新增了一批可选端点(SLA / 内容审核 / 好友扩展 / 客服 / 实时事件),按需接入。**

我们用了 6 个阶段(Phase A–F)做了一次"端到端"的重构,本通知按**主题**而不是按 Phase 组织,因为你们关心的是"我要改什么",不是"它属于哪个 Phase"。

---

## 0. 本次重构覆盖范围(总览)

| 主题 | 状态 | 你的客户端需要改吗? |
|---|---|---|
| **鉴权 / Token 体系**(三层 Token + token_generation + jti 黑名单 + 6h JWT) | ✅ 已上线 | **强烈建议**(§1) |
| **统一实时事件总线**(移动 Push + Admin SignalR + Webhook 三通道扇出) | ✅ 已上线 | 仅 Admin 端有新事件可订阅(§2) |
| **客服 SLA 体系**(策略 + 风险扫描 + 看板) | ✅ 已上线 | 仅 Admin 端可见(§3) |
| **客服扩展能力**(快捷回复增量同步 / Direct 历史游标 / 接待 API) | ✅ 已上线 | **可选**(§3) |
| **内容审核**(注册 + 发消息双向门控) | ✅ 已上线 | **建议处理 422**(§4) |
| **好友扩展信息**(profile-extra / common-groups / 完整详情面板) | ✅ 已上线 | **可选**(§5) |
| **租户加入申请字段补全**(loginName / submittedNote / processed*) | ✅ 已上线 | 老字段兼容,扩字段直接用(§6) |
| **管理员引导向导**(/onboarding 6 步) | ✅ 已上线 | **仅 Admin 端**,不影响 C 端 |
| **WS `/ws/admin` 反向代理 + Admin SignalR** | ✅ 已上线 | Admin Web 已自动接入,无需手动改 |
| **服务端 DI 校验 ValidateOnBuild**(启动期硬性检查) | ✅ 已上线 | 不影响客户端,只是服务端内部硬化 |
| **im.users 跨租户 self-visibility RLS** | ✅ 已上线 | 不影响客户端 |

---

## 1. 鉴权大改造 — 三层 Token 架构(向后兼容)

### 1.1 这是本次重构最重要的一块。简单画一下:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 3 — deviceSessionToken (仅移动 App,可选)                          │
│   - 256-bit opaque,前缀 ds_                                              │
│   - 90 天无活动失效,每次 exchange 顺延                                  │
│   - 不轮换 — 系统 Keychain/Keystore 持久化即可                           │
│   - 用途:冷启动免密拿 platformToken                                     │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ POST /auth/device-session/exchange
                             ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 2 — platformRefreshToken (Web/PC/不愿信任设备的场景,可选)         │
│   - 128-bit opaque,前缀 prt_                                             │
│   - 滑动 30 天 / 绝对 60 天                                              │
│   - **每次 exchange 必须 rotation**(用旧 prt 会触发"重放检测"全用户撤销)│
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ POST /auth/refresh-platform-token-by-refresh-token
                             ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 1 — platformToken (JWT, 6 小时)                                    │
│   - 自包含,无状态验证                                                   │
│   - claim 含: platformUserId, deviceId?, tgen (token_generation), jti    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 关键不变量(新增的安全机制)

| 机制 | 含义 | 触发条件 | 客户端表现 |
|---|---|---|---|
| **token_generation 全局踢** | 每个 JWT 带 `tgen` claim,改密码/管理员强踢时服务端 bump 这个数 | 改密码 / `auth/sign-out-all-devices` / 管理员强制下线 | **该用户的所有旧 JWT 在 30 秒内自动失效**,返回 401 |
| **jti 单 token 黑名单** | 每个 JWT 带 `jti`,登出某一台设备时把那个 jti 加黑名单 | `auth/sign-out`(当前设备登出) | **该 JWT 立即失效**(无 30 秒延迟) |
| **prt 重放检测** | 用过的 prt 立即作废,再次用同一 prt 触发"reuse detected" | 客户端 bug / 中间人窃取 | **该用户全部会话被撤销**,必须重登 |

### 1.3 你需要做的事

#### ✅ 最低改动(强烈建议 30 天内完成)

1. **能正确处理新增的 5 个 auth 错误码** — 全部按"401 → 走 refresh → 还失败就跳登录"处理:
   ```
   AUTH_SESSION_REVOKED       — 该 token 被管理员显式撤销
   AUTH_DEVICE_KICKED         — 同账号在其他设备登录,本设备被挤下线
   AUTH_TGEN_MISMATCH         — JWT 的 tgen 太旧(用户全局凭据已 bump)
   AUTH_REUSE_DETECTED        — prt 被重放,该用户所有会话已撤销
   AUTH_PASSWORD_CHANGED      — 用户改了密码,需要重新登录
   ```
   **不要无脑重试**这些错误码,否则会造成请求风暴。

2. **能识别并响应 4 个 auth 类实时事件**(详见 §2):
   ```
   auth.session.revoked   → 立即清 token 退出登录
   auth.device.kicked     → 提示"账号在其他设备登录",清 token
   auth.password.changed  → 提示"密码已修改",清 token
   auth.reuse.detected    → 提示"安全异常",清 token
   ```

#### 🔸 进一步可选(推荐 60 天内完成,但非必须)

3. **iOS / Android** 接入 deviceSessionToken(90 天免密体验):
   ```
   登录时:POST /auth/login + body 加 "request_device_session": true
            → 返回 platformToken + platformRefreshToken + deviceSessionToken
   冷启动:POST /auth/device-session/exchange
            → 静默拿新 platformToken(无需用户输入密码)
   ```

4. **Web / PC** 切到 prt rotation 流程(更安全):
   ```
   POST /auth/refresh-platform-token-by-refresh-token
   → 返回新 platformToken + 新 platformRefreshToken
   → 客户端**必须**保存新 prt,丢弃旧 prt
   ```

#### ❌ 旧路径仍然可用(无需紧急改)

- `POST /auth/login` 仍然返回旧的 `accessToken` + `refreshToken` 字段
- `POST /auth/refresh` 仍然可用(内部走兼容路径)
- 老错误码全部保留语义,**新增的不会取代旧的**

### 1.4 用户改密码后,App 上未刷新的页面会发生什么?

- 30 秒内下一次 API 请求返回 **401 `AUTH_TGEN_MISMATCH`**
- 走 refresh:**也会失败**(refresh token 同时被撤销)
- 跳登录页

**为什么是 30 秒?** 服务端把 `token_generation` 缓存到 Redis 30 秒以减少 DB 查询。jti 黑名单是即时的(无 30 秒延迟),所以"登出当前设备"那个 JWT 会**立即**失效。

---

## 2. 统一实时事件总线 — WebSocket 增量

### 2.1 后端做了什么?

我们把原来散在各模块的"推送/SignalR/Webhook"统一成一个 `IRealtimeEventBus`,它会把每一个业务事件**同时扇出**到三个通道:

```
业务事件 ──→ IRealtimeEventBus ──┬─→ 移动推送 (Mobile Push)
                                  ├─→ Admin SignalR (浏览器实时推送)
                                  └─→ Webhook (你订阅的 HTTPS 端点)
```

**这对你们意味着什么?**
- 移动 Push、WebSocket 事件、Webhook payload **三者结构相同**,客户端解析逻辑可以共享
- 老的事件**完全保持原样**,**结构不变**
- 新增事件**用同一套 payload schema**

### 2.2 客户端实时事件清单(老事件 + 本次新增)

所有事件 payload 都是:
```json
{
  "type": "<EventType>",
  "entityId": "<UUID 或字符串>",
  "data": { /* string-valued kv */ }
}
```

**本次新增的 11 个事件**:

| EventType | 触发场景 | 客户端建议动作 | 角色 |
|---|---|---|---|
| `auth.session.revoked` | 管理员强制撤销该用户 | 立即清 token 退出登录 | C 端 |
| `auth.device.kicked` | 同账号挤下本设备 | 提示"账号在其他设备登录",清 token | C 端 |
| `auth.device.added` | 该用户在新设备登录(本设备没被挤) | 提示"新设备登录通知",**不要**清 token | C 端 |
| `auth.password.changed` | 用户改了密码 | 提示"密码已修改",清 token | C 端 |
| `auth.security.required` | 风控触发,要求二次校验 | 弹出验证码/短信验证 | C 端 |
| `auth.reuse.detected` | refresh token 被重放 | 提示"安全异常",清 token | C 端 |
| `customer_service.staff.status_changed` | 客服上下线/忙碌切换 | 客服工作台:刷新名单 | 客服端 |
| `customer_service.staff.auto_offline` | 客服 5 分钟无心跳被自动 offline | 客服工作台:UI 标记 Offline | 客服端 |
| `customer_service.sla.warning` | 工单进入 SLA 风险区(剩余 < 20% 预算) | Admin/工作台:风险提示 | Admin/客服 |
| `customer_service.sla.breached` | 工单已违约 | Admin/工作台:红色告警 | Admin/客服 |
| `friend.profile.updated` | 好友的 remark/group/tags/note 等扩展信息被修改 | 刷新本地好友详情缓存 | C 端 |

老事件全部保留语义,不再列。

### 2.3 Admin Web 已自动接入(对接方无需手动改)

我们新增了 nginx 反代 `/ws/admin` → Admin SignalR Hub。Admin Web 客户端会自动通过浏览器的 WebSocket 拿到上面所有的 Admin 类事件。**第三方 Admin 工具如要订阅**,见 `auth-v2-and-realtime-events.md` §4。

---

## 3. 客服模块 — SLA + 多项扩展能力

### 3.1 新增 / 变更端点

| 端点 | 用途 | 谁需要? |
|---|---|---|
| `GET /api/v1/customer-service/threads/{threadId}/history?limit=50&beforeMessageId=...` | 按 messageId 游标拉取历史消息(更精确,替代旧的时间分页) | **客服 / 工作台** |
| `GET /api/v1/customer-service/quick-replies?since=...` | 增量同步快捷回复(适合本地缓存) | **客服 / 工作台** |
| `POST /api/admin/v1/customer-service/center/reception/*` | 接待 API(转接 / 接管 / 关闭 Direct 线程) | **Admin / 工作台** |
| `GET /api/admin/v1/customer-service/center/sla/dashboard` | SLA 看板汇总(atRisk / breached / open + 前 50 个风险工单) | **Admin** |
| `GET /api/admin/v1/customer-service/center/threads` | 统一管理客服列表(temp_session + direct_thread 合并视图) | **Admin** |

### 3.2 SLA 风险机制(后台自动跑,客户端可见的部分)

后端每 30 秒扫一次活跃工单,如果发现:
- **首响超时** / **下一响应超时** → 标记 `risk_level=2 (breached)`,推送 `customer_service.sla.breached` 事件
- 离截止时间剩余 < 策略阈值(默认 20% 预算) → 标记 `risk_level=1 (at_risk)`,推送 `customer_service.sla.warning` 事件

工单的 `riskLevel / riskReasonsJson / firstResponseDeadline / nextResponseDeadline` 字段现在会出现在客服列表 DTO 上,**老调用方忽略不会出错**。

### 3.3 客服心跳 → 自动 offline 机制

- 客服每 ~15 秒心跳一次(任何 admin/客服 API 调用都自动算心跳)
- **5 分钟无心跳** → 后端 sweep 把状态从 Online 强制翻到 Offline + 推送 `customer_service.staff.auto_offline` 事件
- 客服重新发送任何 API 请求即恢复 Online

### 3.4 客服主动群发(2026-05-22 新增)

客服现在可以主动发起群发,把同一条消息一次发给一批成员。三种目标:

- **全租户成员** — 给每个活跃成员各开一个单聊,逐人私聊。
- **某群成员(逐人私聊)** — 把群成员展开,逐人单聊(不在群里出现)。
- **某群(群内群发)** — 在该群会话里直接发一条。

| 端点 | 用途 | 谁需要? |
|---|---|---|
| `POST /api/admin/v1/customer-service/broadcasts/preview` | 干跑预览,返回将影响多少人 | **Admin / 客服** |
| `POST /api/admin/v1/customer-service/broadcasts/` | 提交群发任务(异步投递,立即返回任务 ID) | **Admin / 客服** |
| `GET /api/admin/v1/customer-service/broadcasts/` | 任务列表 | **Admin / 客服** |
| `GET /api/admin/v1/customer-service/broadcasts/{taskId}` | 任务详情 + 进度 + 失败明细 | **Admin / 客服** |
| `POST /api/admin/v1/customer-service/broadcasts/{taskId}/retry-failed` | 重试失败收件人 | **Admin / 客服** |

要点(对接方需要知道):

- 全部需要 `customer_service.broadcast.send` 权限(客服坐席、客服主管、租户管理员默认已具备)。
- 群发以**发起人本人身份**发出,成员收到的是真实单聊/群消息,可以回复。
- 群目标只能选**发起人本人是成员的群**。
- 异步投递:提交后立即返回 `taskId`,投递在后台进行,轮询任务详情看进度(`status`:0 待投递 / 1 投递中 / 2 已完成 / 3 失败)。
- **发出不可撤回**;文本过敏感词审核;群发提交有频率上限,超限返回 `429`。
- 详见 `admin-api.md` §3.2A+。

---

## 4. 内容审核 — 客户端可能看到的 422

注册和发消息现在都过敏感词检测。命中时服务端返回 **HTTP 422 Unprocessable Entity**:

```json
{
  "errorCode": "MODERATION_BLOCKED",
  "moderationReason": "命中敏感词:xxx",
  "fields": ["content"]    // 或 ["loginName","displayName"] 等
}
```

**客户端处理建议**:
- 在输入框边上展示 `moderationReason`
- **不要**当成网络错误重试 — 重试结果一样
- 不要把命中词回显给用户(已经过滤)
- 老客户端会把 422 当作普通错误展示,**虽然提示不友好但不会崩**

---

## 5. 好友扩展能力(可选)

### 5.1 新增端点

| 端点 | 用途 |
|---|---|
| `GET /api/v1/friends/{friendUserId}/profile-extra` | 返回"好友详情大面板":remark/group/note/tags/source/addedAt + 平台 lppId + 已脱敏的好友档案 |
| `GET /api/v1/friends/{friendUserId}/common-groups` | 返回与该好友的共同群聊列表 |
| `PATCH /api/v1/friends/{friendUserId}` | 同时更新 remarkName / groupName / note / tags / source(显式 null 表示清空) |

### 5.2 与现有 `GET /friends` 列表的关系

- 原列表接口**不变**,继续返回基础字段
- 想拿"完整详情面板"的客户端去调 `/profile-extra`,**按需取**
- `friend.profile.updated` 事件触发时,客户端可以选择刷新本地缓存

---

## 6. 租户加入申请 — 字段补全(已修复 500)

`GET /api/admin/v1/tenants/{tenantId}/join-requests` 列表中**每一项现在包含**:

| 字段 | 类型 | 含义 |
|---|---|---|
| `loginName` | string | 申请人登录名(原来只有 displayName) |
| `submittedNote` | string? | 申请提交时填写的备注 |
| `processedAt` | datetime? | 审核完成时间(未审完为 null) |
| `processedByUserId` | guid? | 审核人 |

**老客户端忽略新字段不会出错**;新客户端如果想做"按登录名搜索 / 去重",现在可以了。

> ⚠️ 旧版本里这个列表有个 500 错误的 LINQ bug,本次一并修了。

---

## 7. 管理员引导向导(仅 Admin)

新增 `/onboarding` 6 步引导页面 + 后端 `tenant_onboarding_progress` 表。**不影响 C 端客户端**。

---

## 8. 服务端内部硬化(对接方应该知道但不需要改)

我们做了一些服务端内部硬化,**第三方不需要改任何东西**,但有些表现可能让你们关注:

| 内部改动 | 对你们的影响 |
|---|---|
| **DI ValidateOnBuild** — 所有 host 启动时强制校验依赖图 | 部署期如果有 DI 错误,容器直接 fail-fast 不会半启动 → 部署期更稳 |
| **数据库迁移 fail-fast** — 生产 `ApplySchemaScriptOnStartup=false`,有未 apply 的 SQL 容器会 restart-loop | 我们部署期会先 apply migration,所以你们感知不到 |
| **EF 事务必须用 ExecuteInRetriableScopeAsync** — 11 处手动 BeginTransaction 全部包上 | 数据库瞬断时自动重试,你们少见到 500 |
| **im.users 第二条 SELECT-only RLS** — 按 platform_user_id 自查 | 跨租户场景下你们能拿到自己的 platform 信息,不会再 403 |

---

## 9. 不变 / 不破坏(明确承诺)

下面这些**保持不变**,可以放心:

- ✅ 所有 v1 端点 URL、HTTP 方法、请求字段名
- ✅ `POST /auth/login` 仍返回旧的 `accessToken` + `refreshToken` 字段;新增字段(`platformRefreshToken`, `deviceSessionToken`)只在请求时**显式 opt-in** 才会出现
- ✅ 老 `POST /auth/refresh` 仍可用
- ✅ WebSocket 连接地址、握手协议、心跳间隔
- ✅ 推送 payload 的 `data` 字段都是字符串(不会突然变 object)
- ✅ 老错误码字符串语义(新增的不挪老的)
- ✅ 老的 GET /friends 列表字段结构

---

## 10. 推荐升级时间表

| 阶段 | 状态 | 客户端动作 |
|---|---|---|
| **已上线** (2026-05-17) | ✅ | 老客户端**继续工作**,**无需任何改动** |
| **30 天内** (推荐) | - | §1.3 的"最低改动":识别 5 个新 auth 错误码 + 处理 4 个 auth 类实时事件 |
| **60 天内** (推荐) | - | iOS/Android 接入 deviceSessionToken,Web 切到 prt rotation;接入感兴趣的客服 / 好友扩展端点 |
| **90 天后** | - | 我们会开始统计未升级的客户端版本,但**不会强制下线**,会主动联系 |

---

## 11. FAQ

**Q1:如果完全不升级会怎么样?**
- 短期(30 天)无影响,功能完全可用
- 中期(60 天)新功能(SLA 看板、好友扩展、客服增量同步、内容审核提示)拿不到
- 长期不影响登录和消息收发

**Q2:用户改密码后,App 已经登录的页面会瞬间退出吗?**
- 不是瞬间,**30 秒内**下次 API 请求返回 401,然后跳登录
- 改密码当时正在用的"那一台"设备**不会**被踢(改密码的人是 owner)

**Q3:为什么 token_generation 是 30 秒延迟而不是 0?**
- 服务端把 `token_generation` 缓存到 Redis 30 秒,以避免每个 API 请求都查 DB
- jti 黑名单是即时的(无延迟):登出当前设备会**立即**让那个 JWT 失效
- 30 秒是性能 vs 即时性的折衷,我们认为足够安全

**Q4:Web 现在也要存 platformRefreshToken (prt) 吗?**
- **不强制**。老的 `POST /auth/refresh` 路径继续可用
- 建议把 prt 存在 **HttpOnly Cookie** 或安全存储,不要存 localStorage

**Q5:我们是 SaaS 客户,自己部署的版本怎么办?**
- 服务端代码向后兼容,直接拉最新镜像 + 跑数据库迁移即可
- 生产 `Database__ApplySchemaScriptOnStartup=false`,需要 op 手动 apply SQL + 写 `im.schema_migrations` ledger
- 完整迁移说明见服务端 release 文档,不在本通知范围

**Q6:9 个新增 SQL 迁移到底是什么?**
本次重构在 `database/postgresql/migrations/` 加了 9 个文件,这些和你们**直接无关**,但有些会影响 API 响应字段:
```
20260518_01_add_token_generation.sql            — platform_users.token_generation 列
20260518_02_platform_refresh_token.sql          — platform_refresh_tokens 表
20260518_03_platform_device_session.sql         — platform_device_sessions 表
20260518_04_auth_audit_log.sql                  — auth_audit_log 表(审计)
20260518_05_users_platform_self_visibility.sql  — im.users RLS 第二条 SELECT-only policy
20260518_06_customer_service_sla.sql            — sla 策略表 + temp_session/direct_thread 加 risk 列
20260518_07_quick_reply_tombstone.sql           — 快捷回复软删除(增量同步用)
20260518_08_content_moderation_event.sql        — 内容审核记录表
20260518_09_friendships_profile_extra.sql       — friendships 加 note/tags/source/added_at 列
```

---

## 12. 联系方式

- 文档:本通知(`/3rddocs/CHANGES-2026-05.md`)
- 完整接入参考:[`auth-v2-and-realtime-events.md`](./auth-v2-and-realtime-events.md)
- 老接入文档(全部仍然有效):
  - [`client-api-reference.md`](./client-api-reference.md)
  - [`admin-api-reference.md`](./admin-api-reference.md)
  - [`open-platform-reference.md`](./open-platform-reference.md)
- 有问题请联系服务端团队,附上:
  - `client_version` + `os_version`
  - 报错时的 `errorCode`
  - 请求时间(用于查日志)

---

**本通知服务端版本:`prod-20260517-phase-f-sla-dashboard-b45fcdd`**
**生成时间:2026-05-17**
