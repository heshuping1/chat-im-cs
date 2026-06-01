# ZTChat 开发跟随文档（Follow Me）

> 文档校对快照:2026-05-14
>
> 这份文档不是接口索引,也不是纯技术白皮书。
>
> 它的目标只有一个:让第三方开发团队顺着业务流程,把 ZTChat 接起来。
>
> 你不需要先理解全部接口,只需要先找到自己对应的产品场景,然后照着流程实现。

## 1. 一页式导航

如果你时间很少，直接按下面读：

| 你要做什么 | 先看哪里 |
|---|---|
| 做一个普通聊天 APP | [流程 1：新用户从注册到聊天（完整冷启动）](#流程-1新用户从注册到聊天完整冷启动) |
| 做一个企业专属 APP | [流程 1：新用户从注册到聊天（完整冷启动）](#流程-1新用户从注册到聊天完整冷启动) + [流程 12：完整的密码找回流程](#流程-12完整的密码找回流程) |
| 做一个客服端 APP | [第 5 章：客服端 APP 开发流程](#5-客服端-app-开发流程) |
| 做一个网页客服 Widget | [流程 2：访客咨询 → AI 应答 → 转人工 → 客服接待 → 评价](#流程-2访客咨询--ai-应答--转人工--客服接待--评价) |
| 做管理后台 / 客服系统配置 | [流程 3：管理员搭建客服系统（从零配置）](#流程-3管理员搭建客服系统从零配置) + [流程 13：管理员介入异常会话](#流程-13管理员介入异常会话) |
| 做多租户空间切换 | [流程 9：多租户切换（个人空间 ↔ 企业空间）](#流程-9多租户切换个人空间--企业空间) |

### 按角色阅读路径

- 产品经理 / 交互设计：先看“先判断场景” + “4 条主流程” + “14 个端到端流程”
- 客户端开发：先看“6 件事” + “客服端 APP 开发流程”或对应端到端流程
- 前端开发（Widget / H5）：先看 Widget 主链路 + 流程 2 + 流程 11
- 后端联调 / QA：先看“你真正会反复用到的几组接口” + 各流程里的调用顺序
- 实施 / 交付团队：优先看流程 3、流程 8、流程 13

## 2. 先判断你属于哪种接入场景

### 场景 A：你在做一个多租户通用 APP

用户先登录平台账号，再选择进入“个人空间”或“企业空间”。

从这里开始看：

- [流程 1：新用户从注册到聊天（完整冷启动）](#流程-1新用户从注册到聊天完整冷启动)
- [流程 9：多租户切换（个人空间--企业空间）](#流程-9多租户切换个人空间--企业空间)
- [流程 4：APP 启动时的初始化序列](#流程-4app-启动时的初始化序列)

### 场景 B：你在做一个企业专属 APP / H5

进入登录页之前就已经知道 `tenantId`，不需要先走平台选空间。

从这里开始看：

- [流程 1：新用户从注册到聊天（完整冷启动）](#流程-1新用户从注册到聊天完整冷启动)
- [流程 12：完整的密码找回流程](#流程-12完整的密码找回流程)
- [流程 14：用户个人设置全流程](#流程-14用户个人设置全流程)

### 场景 C：你在做一个网页客服 Widget

访客匿名进入，不注册，不登录平台账号，直接咨询客服。

从这里开始看：

- [流程 2：访客咨询 → AI 应答 → 转人工 → 客服接待 → 评价](#流程-2访客咨询--ai-应答--转人工--客服接待--评价)
- [流程 11：访客会话的 Token 刷新与重连](#流程-11访客会话的-token-刷新与重连)

### 场景 D：你在做客服工作台或管理后台

你关心的是客服排队、会话接待、AI 配置、知识库、异常会话介入。

从这里开始看：

- [流程 3：管理员搭建客服系统（从零配置）](#流程-3管理员搭建客服系统从零配置)
- [流程 13：管理员介入异常会话](#流程-13管理员介入异常会话)

## 3. 开发前只需要先记住这 6 件事

### 3.1 四个入口地址

- Chat API：`https://chat.hearteasechat.com`
- Admin API：`https://admin.hearteasechat.com`
- Client Gateway：`wss://chat.hearteasechat.com/ws/client`
- Widget Gateway：`wss://chat.hearteasechat.com/ws/widget`

### 3.2 三种 Token

| Token | 作用 | 从哪里拿 |
|---|---|---|
| `platformToken` | 平台账号态，用来搜索租户、加入租户、切换空间 | `/api/platform/v1/auth/login` |
| `accessToken` | 业务态，用来发消息、查会话、连 `/ws/client` | `/api/platform/v1/auth/select-tenant`、`/select-personal-space`、`/api/client/v1/auth/login` |
| `visitorToken` | 访客态，用来访问 Widget 会话、连 `/ws/widget` | `/api/widget/v1/{tenantCode}/sessions` |

### 3.3 一条最重要的规则

不要混用 Token。

- `platformToken` 只调 `/api/platform/v1/*`
- `accessToken` 只调 `/api/client/v1/*` 和 `/ws/client`
- `visitorToken` 只调 `/api/widget/v1/*` 和 `/ws/widget`

### 3.4 统一认证头

```http
Authorization: Bearer {token}
```

### 3.5 企业专属客户端未登录时要带 `X-Tenant-Id`

如果你的客户端在登录前就已经知道租户，那么这些接口要带：

```http
X-Tenant-Id: {tenantId}
```

常见是这几类：

- `/api/client/v1/auth/register`
- `/api/client/v1/auth/login`
- `/api/client/v1/auth/login-by-code`
- `/api/client/v1/auth/reset-password`
- `/api/client/v1/auth/verification/*`

### 3.6 所有 HTTP 接口都返回统一信封

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "0HNKSKT2GE10G:00000001",
  "data": {}
}
```

判断规则很简单：

1. 先看 HTTP 状态码
2. 再看 `code`
3. 真正业务结果在 `data`

## 4. 你真正会反复用到的几组接口

这一节不是让你背接口，而是让你知道每种流程会落到哪一组能力。

### 4.1 平台账号与空间切换

你会用到这些：

- `POST /api/platform/v1/auth/register`
- `POST /api/platform/v1/auth/login`
- `POST /api/platform/v1/auth/login-by-code`
- `GET /api/platform/v1/my/tenants`
- `GET /api/platform/v1/tenants/search`
- `GET /api/platform/v1/tenants/by-code/{code}`
- `POST /api/platform/v1/tenants/join-by-code`
- `POST /api/platform/v1/tenants/{tenantId}/join-request`
- `GET /api/platform/v1/invitations/{code}`
- `POST /api/platform/v1/invitations/{code}/accept`
- `POST /api/platform/v1/auth/select-tenant`
- `POST /api/platform/v1/auth/select-personal-space`
- `GET /api/platform/v1/my/spaces/unread-summary`

### 4.2 已知租户的登录、注册、找回密码

你会用到这些：

- `GET /api/client/v1/auth/captcha/check`
- `POST /api/client/v1/auth/captcha/generate`
- `GET /api/client/v1/auth/verification/settings`
- `POST /api/client/v1/auth/verification/send`
- `POST /api/client/v1/auth/register`
- `POST /api/client/v1/auth/login`
- `POST /api/client/v1/auth/login-by-code`
- `POST /api/client/v1/auth/refresh`
- `POST /api/client/v1/auth/reset-password`
- `POST /api/client/v1/auth/change-password`

### 4.3 聊天主链路

你会用到这些：

- `GET /api/client/v1/profile/me`
- `GET /api/client/v1/conversations`
- `GET /api/client/v1/sync`
- `POST /api/client/v1/direct-chats/`
- `POST /api/client/v1/direct-chats/{chatId}/messages`
- `POST /api/client/v1/groups/`
- `POST /api/client/v1/groups/{groupId}/messages`
- `POST /api/client/v1/messages/{messageId}/recall`
- `POST /api/client/v1/messages/{messageId}/delete`
- `POST /api/client/v1/messages/forward`
- `POST /api/client/v1/media/upload`
- `wss://chat.hearteasechat.com/ws/client`

### 4.4 Widget 访客主链路

你会用到这些：

- `GET /api/widget/v1/{tenantCode}/config`
- `POST /api/widget/v1/{tenantCode}/sessions`
- `GET /api/widget/v1/sessions/{sessionId}`
- `GET /api/widget/v1/sessions/{sessionId}/messages`
- `POST /api/widget/v1/sessions/{sessionId}/messages`
- `POST /api/widget/v1/sessions/{sessionId}/token/refresh`
- `POST /api/widget/v1/sessions/{sessionId}/handoff`
- `POST /api/widget/v1/sessions/{sessionId}/rate`
- `POST /api/widget/v1/sessions/{sessionId}/close`
- `POST /api/widget/v1/sessions/{sessionId}/reopen`
- `POST /api/widget/v1/media/upload`
- `wss://chat.hearteasechat.com/ws/widget`

### 4.5 客服工作台主链路（统一客服中心）

如果你现在要做的是一个真正可交付的客服端 APP，推荐优先接这一组统一接口。

这一组接口已经把两类客户收进同一个客服工作台里：

- 访客临时会话
- 已注册客户 / 已分配给当前客服的直聊客户

你会用到这些：

- `GET /api/client/v1/customer-service/workbench/dashboard`
- `GET /api/client/v1/customer-service/workbench/threads`
- `GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}`
- `POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`
- `POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/claim`
- `POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/takeover`
- `POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/close`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/claim`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/takeover`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/close`

这里要先记住 3 件事：

1. 响应里的 `threadType` 固定是 `temp_session`、`direct_customer`
2. 路由里的显式动作路径固定写成 `temp-session`、`direct-customer`
3. `threadId` 是统一客服线程 ID，`conversationId` 才是底层实际会话 ID

### 4.6 兼容保留：访客临时会话接口

下面这组接口仍然存在，适合老版本客服端或只做访客接待的项目。

你会用到这些：

- `GET /api/client/v1/customer-service/temp-sessions/dashboard`
- `GET /api/client/v1/customer-service/temp-sessions/mine`
- `GET /api/client/v1/customer-service/temp-sessions/queue`
- `GET /api/client/v1/customer-service/temp-sessions/{sessionId}`
- `POST /api/client/v1/customer-service/temp-sessions/{sessionId}/claim`
- `POST /api/client/v1/customer-service/temp-sessions/{sessionId}/takeover`
- `POST /api/client/v1/customer-service/temp-sessions/{sessionId}/messages`
- `POST /api/client/v1/customer-service/temp-sessions/{sessionId}/close`

### 4.7 普通注册用户 / 租户用户的客服链路（不是 temp-sessions）

很多第三方第一次看接口时都会困惑：

为什么客服回复客户的接口全是 `/customer-service/temp-sessions/*`，那普通注册用户怎么办？

答案是：

- `/customer-service/temp-sessions/*` 只处理访客 Widget 进来的临时会话
- 普通注册用户、租户里的普通成员，不走临时会话
- 但现在第三方做客服端时，也不应该再直接把“注册用户客服”理解成单独一套 `/direct-chats/*` 客服页面
- 对客服端来说，普通注册用户已经进入统一客服工作台，表现为 `threadType=direct_customer`

也就是说，系统里其实有两种客服模式：

| 场景 | 会话形态 | 客服侧主要接口 |
|---|---|---|
| 匿名访客 / Widget 访客 | 临时会话 | 统一工作台主入口：`/api/client/v1/customer-service/workbench/*`；兼容路径：`/api/client/v1/customer-service/temp-sessions/*` |
| 普通注册用户 / 租户普通成员 | 注册客户客服线程 | 统一工作台主入口：`/api/client/v1/customer-service/workbench/*` |

普通注册用户这条链路，底层仍然依赖这些能力：

- `POST /api/admin/v1/users/{userId}/customer-service/assign`
- `POST /api/admin/v1/customer-service/batch-transfer`
- 统一客服端主入口：`GET /api/client/v1/customer-service/workbench/threads`
- 统一客服端回复：`POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/messages`

如果对方本来就是租户内已登录用户，而且你只是要做普通 IM 单聊沟通，不需要纳入客服中心，那么才直接走 `/api/client/v1/direct-chats/*`。

### 4.8 管理后台主链路

你会用到这些：

- `POST /api/admin/v1/auth/login`
- `GET /api/admin/v1/customer-service/center/dashboard`
- `GET /api/admin/v1/customer-service/center/staff-statuses`
- `GET /api/admin/v1/customer-service/center/threads`
- `GET /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}`
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/assign`
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/force-close`
- `PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}`
- `GET /api/admin/v1/customer-service/temp-sessions/config`
- `PUT /api/admin/v1/customer-service/temp-sessions/config`
- `POST /api/admin/v1/customer-service/temp-sessions/config/ai/probe`
- `/api/admin/v1/customer-service/temp-sessions/knowledge-bases*`

## 5. 客服端 APP 开发流程

这一章只讲一件事：

如何开发一个客服端 APP，让客服登录、处于可接待状态、看到排队客户、认领会话、回复客户、关闭会话。

如果你现在最关心的是“客服怎么上线、怎么回复客户”，这一章看完就可以直接开始开发。

### 5.1 先说结论：现在推荐直接做成统一客服中心

如果你现在新做一个客服端 APP，不建议再只围着 `/customer-service/temp-sessions/*` 开发。

更推荐的方式是：

1. 客服登录成租户客服账号
2. 管理后台把客服设成可接待状态
3. 客服 APP 直接拉统一工作台 `threads`
4. 访客线程或注册客户线程按需要认领 / 接管
5. 统一通过 `threads/{threadType}/{threadId}/messages` 回复
6. 线程结束后按类型关闭

也就是说，你现在做的不是“两套客服端”，而是“一套客服中心，同时服务两类客户”。

### 5.2 先说结论：最小可行链路只有 5 步

要做一个客服端 APP，最小可行链路其实只有 5 步：

1. 让客服账号能登录成租户员工
2. 让这个客服账号处于“可接待”状态
3. 让客服 APP 拉到统一工作台线程列表
4. 对需要处理的线程执行认领 / 接管
5. 让客服回复消息并在结束时关闭线程

你可以先把这 5 步做通，再逐步加富媒体、快捷回复、实时刷新、筛选、质检等增强能力。

### 5.3 关键概念：客服“上线”分成两层

当前后端里，“客服上线”不是一个动作，而是两层状态。

第一层是“账号在线”：

- 客服 APP 已经登录
- 客服 APP 已连接 `wss://chat.hearteasechat.com/ws/client`
- 并且持续 `HeartbeatAsync(...)`

这表示“这个用户在线了”。

第二层是“客服可接单”：

- 当前客服是否允许接队列
- 当前客服是否是 `online` / `busy` / `offline`
- 当前客服最大并发是多少

当前代码里，这一层不是客服 APP 自己通过 `/api/client/v1/*` 设置的，而是由管理后台接口设置：

`PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}`

虽然这个更新接口还挂在 `temp-sessions` 下，但它现在维护的是统一客服中心共享的客服状态，已经同时影响：

- 访客临时会话
- 注册客户客服线程

所以你要这样理解职责边界：

- 客服 APP 负责：登录、在线、拉工作台线程、认领 / 接管、回复、关闭
- 管理后台负责：是否接待队列、最大并发、在线/忙碌/离线等服务状态配置

### 5.4 前置条件

这个客服账号必须满足：

1. 这个账号必须是租户员工，且满足 `userType=2`
2. 这个账号在租户里的 `membershipRole>=2(customer_service)`
3. 租户必须开启临时会话能力
4. 管理员先把这个客服设为可接待状态

**前置步骤 A**：管理员登录 — `POST /api/admin/v1/auth/login`

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供（管理员账号） |
| `password` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 前置步骤 B 请求头 `Authorization: Bearer {adminToken}` |

**前置步骤 B**：管理员设置客服可接待状态 — `PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}`

请求头：
- `Authorization: Bearer {adminToken}`（← 前置步骤 A 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{staffUserId}` | 外部配置——管理员从后台用户列表中获取的客服账号 userId |

请求体：
| 字段 | 来源 |
|---|---|
| `serviceStatus` | 用户提供（`online` / `busy` / `offline`） |
| `queueAcceptEnabled` | 用户提供（`true` / `false`） |
| `maxConcurrentSessions` | 用户提供（最大并发数） |

管理员设置客服可接待的请求示例：

```bash
curl -X PUT "$BASE_ADMIN/api/admin/v1/customer-service/temp-sessions/staff-statuses/$STAFF_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceStatus": "online",
    "queueAcceptEnabled": true,
    "maxConcurrentSessions": 5
  }'
```

如果这一步没做，即使客服已经登录并连接了 WebSocket，也不一定能从统一工作台里接到排队线程。

### 5.5 客服端 APP 的最小页面结构

你可以把客服端 APP 理解成这 5 个页面：

1. 登录页
2. 工作台首页：看板 + 我的状态
3. 统一线程列表页：`/threads`
4. 会话详情页：`/threads/{threadType}/{threadId}`
5. 回复输入框：`/threads/{threadType}/{threadId}/messages`

如果你先做一个最小版本，这 5 个页面已经够用。

### 5.6 最小实现顺序

建议严格按这个顺序开发：

1. 先把登录做通
2. 再把 `dashboard + threads` 做出来
3. 再做 `claim / takeover`
4. 再做统一 `messages`
5. 再做 `close`
6. 最后接上 `ws/client` 做实时更新

这个顺序的好处是：

- 每一步都能独立验收
- 不会一开始就陷进复杂的实时状态同步
- 更适合第三方团队分阶段交付

### 5.7 第一步：客服 APP 登录

如果你的客服 APP 是企业专属 APP，最简单就是直接走租户登录。

**步骤 1**：`POST /api/client/v1/auth/login`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供 |
| `password` | 用户提供 |
| `deviceId` | 用户提供（客户端本地生成或持久化的设备 ID） |
| `deviceName` | 用户提供 |
| `deviceType` | 用户提供（`ios` / `android` / `web` / `desktop`） |
| `loginType` | 用户提供（`login_name` / `email` / `mobile`） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 2–7 请求头 `Authorization: Bearer {accessToken}`；→ 步骤 4 Gateway 连接认证 |
| `data.refreshToken` | → 本地持久化，用于 Token 过期后刷新 |
| `data.userId` | → 客户端本地标识当前用户；与前置步骤 B 中管理员配置的 `staffUserId` 对齐 |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/auth/login" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "loginName": "staff001",
    "password": "MyPassword123!",
    "deviceId": "'"$DEVICE_ID"'",
    "deviceName": "iPhone 15",
    "deviceType": "ios",
    "loginType": "login_name"
  }'
```

这 3 个值里，最重要的是：

- `accessToken`：后续所有客服业务接口都要用
- `refreshToken`：客户端重启或 token 过期时要用
- `userId`：你后面会用它和后台配置的客服状态对齐

### 5.8 第二步：客服 APP 启动后立即做的事

登录成功后，客服 APP 启动后立即做的事是：

1. 拉当前用户资料
2. 拉客服看板
3. 拉统一线程列表
4. 建立 WebSocket 连接

**步骤 2a**：`GET /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.userId` | → 客户端本地标识当前用户 |
| `data.displayName` | → 客户端 UI 展示客服昵称 |
| `data.membershipRole` | → 客户端确认当前用户具备客服角色（`>=2`） |

请求示例：

```bash
curl "$BASE_CHAT/api/client/v1/profile/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 2b**：`GET /api/client/v1/customer-service/workbench/dashboard`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.queueCount` | → 客户端 UI 展示当前排队数 |
| `data.activeCount` | → 客户端 UI 展示当前活跃会话数 |
| `data.serviceStatus` | → 客户端 UI 展示当前客服状态 |

请求示例：

```bash
curl "$BASE_CHAT/api/client/v1/customer-service/workbench/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 2c**：`GET /api/client/v1/customer-service/workbench/threads`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.queueItems[].threadId` | → 步骤 3 路由参数 `{threadId}`（认领 / 接管） |
| `data.queueItems[].threadType` | → 步骤 3 路由段判断（`temp-session` 或 `direct-customer`） |
| `data.activeItems[].threadId` | → 步骤 5 路由参数 `{threadId}`（回复消息） |
| `data.activeItems[].threadType` | → 步骤 5 路由段判断 |

请求示例：

```bash
curl "$BASE_CHAT/api/client/v1/customer-service/workbench/threads" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 2d**：连接 `wss://chat.hearteasechat.com/ws/client`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 1 响应 `data.accessToken` |

建立 Gateway 长连接后调用：

```javascript
await connection.invoke("HeartbeatAsync", "ios");
```

说明：`HeartbeatAsync` 的参数为设备类型字符串（`ios` / `android` / `web`），与步骤 1 请求体 `deviceType` 保持一致。

这一组动作做完之后，你的客服端 APP 才算真正进入可工作状态。

### 5.9 第三步：客服接单

统一工作台线程列表里会同时出现两类线程：

- `temp_session`：访客临时会话
- `direct_customer`：已注册并且已分配给当前客服的客户直聊

统一工作台里的 `queueItems` 和 `activeItems` 都可能出现这两类线程。

**步骤 3a**（访客线程认领）：`POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/claim`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 2c 响应 `data.queueItems[].threadId`（`threadType=temp_session` 的项） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/temp-session/$THREAD_ID/claim" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 3b**（注册客户线程认领）：`POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/claim`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 2c 响应 `data.queueItems[].threadId`（`threadType=direct_customer` 的项） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/direct-customer/$THREAD_ID/claim" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 3c**（注册客户线程接管）：`POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/takeover`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 2c 响应 `data.queueItems[].threadId` 或 `data.activeItems[].threadId`（`threadType=direct_customer` 的项） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/direct-customer/$THREAD_ID/takeover" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 4**：`GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadType}` | ← 步骤 2c 响应 `data.queueItems[].threadType` 或 `data.activeItems[].threadType`（映射：`temp_session` → `temp-session`，`direct_customer` → `direct-customer`） |
| `{threadId}` | ← 步骤 2c 响应 `data.queueItems[].threadId` 或 `data.activeItems[].threadId` |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.threadId` | → 步骤 5、步骤 6 路由参数 `{threadId}` |
| `data.threadType` | → 步骤 5、步骤 6 路由段判断 |
| `data.conversationId` | → 客户端本地关联底层会话（注意：不要用它替代 `threadId`） |
| `data.messages` | → 客户端 UI 展示消息记录 |
| `data.visitorInfo` 或 `data.customerInfo` | → 客户端 UI 展示客户 / 访客资料 |

请求示例：

```bash
curl "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/$THREAD_TYPE/$THREAD_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

对于客服 APP 来说，这一步的页面逻辑通常是：

1. 统一线程列表页展示排队线程和活跃线程
2. 客服点击“接待”
3. 成功后跳转到会话详情页
4. 详情页展示消息记录、客户或访客资料、当前状态

### 5.10 第四步：客服回复客户

现在推荐直接走统一回复接口。

如果当前线程是访客线程：

- `threadType=temp_session`

如果当前线程是已注册客户线程：

- `threadType=direct_customer`

**步骤 5**：`POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadType}` | ← 步骤 4 响应 `data.threadType`（映射：`temp_session` → `temp-session`，`direct_customer` → `direct-customer`）；或 ← 步骤 2c 响应中对应项的 `threadType` |
| `{threadId}` | ← 步骤 4 响应 `data.threadId`；或 ← 步骤 2c 响应中对应项的 `threadId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客服端本地生成的唯一消息 ID） |
| `messageType` | 用户提供（`text` / `image` / `file` 等） |
| `body` | 用户提供（消息内容对象） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/$THREAD_TYPE/$THREAD_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientMsgId": "staff-msg-001",
    "messageType": "text",
    "body": {
      "text": "你好，这里是客服，我来帮你处理。"
    }
  }'
```

**步骤 6a**（关闭访客临时会话）：`POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/close`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 4 响应 `data.threadId`（`threadType=temp_session` 的线程） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/temp-session/$THREAD_ID/close" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**步骤 6b**（关闭注册客户线程）：`POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/close`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 4 响应 `data.threadId`（`threadType=direct_customer` 的线程） |

请求示例：

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/direct-customer/$THREAD_ID/close" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

如果后面你要做图片、文件等富媒体回复，流程是：

1. 先 `POST /api/client/v1/media/upload`（请求头：`Authorization: Bearer {accessToken}` ← 步骤 1 响应 `data.accessToken`）
2. 再把上传返回的资源信息带进 `body.image` 或 `body.file`
3. 再发 `POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`（同步骤 5）

### 5.11 一定要分清：`threadId` 和 `conversationId` 不是一个概念

这是现在第三方最容易理解错的点。

在统一客服中心里：

- `threadId` 是统一客服线程 ID
- `conversationId` 是底层实际会话 ID

对 `temp_session`：

- `threadId` 基本就是这条访客线程自己的稳定标识
- `conversationId` 是这条线程对应的底层会话 ID

对 `direct_customer`：

- `threadId` 是稳定的客服线程 ID
- `conversationId` 才是当前实际承载消息的直聊 `chatId`
- 线程转派、关闭、重新激活后，`threadId` 仍然稳定，但 `conversationId` 不应被你当成统一线程主键来用

所以客服端和后台都应优先用：

- `threadType + threadId`

来定位一条客服线程，而不是直接拿 `conversationId` 当线程标识。

### 5.12 一定要分清：访客客服和注册用户客服不是一条来源链路，但现在共用一套客服中心

这也是最容易把第三方带偏的地方。

如果你看到客服回复接口里有很多 `/temp-sessions`，不要误以为“所有客服消息都必须走临时会话”。

真实情况是：

#### A. 访客客服

适用对象：

- 网页 Widget 进来的匿名访客
- 没有注册租户账号的咨询用户

这条链路走：

- Widget 侧：`/api/widget/v1/*`
- 客服侧主入口：`/api/client/v1/customer-service/workbench/*`
- 兼容路径：`/api/client/v1/customer-service/temp-sessions/*`

在统一工作台里，它表现为：

- `threadType=temp_session`

#### B. 普通注册用户 / 租户用户客服

适用对象：

- 已经注册的普通用户
- 已经进入租户的普通成员
- 在租户里需要被客服跟进的客户用户

这条链路的来源不是 temp-session，而是“客户归属 + 直聊承载”。

如果对方只是租户里的一个普通已登录用户，你只是要让客服和他像普通 IM 一样沟通，也可以直接走普通单聊，不一定非要纳入客服中心。

系统会先做两件事：

1. 给这个客户用户分配客服
2. 在客户用户和客服之间建立普通直聊会话

管理端分配客服：

```bash
curl -X POST "$BASE_ADMIN/api/admin/v1/users/$USER_ID/customer-service/assign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staffUserId": "'"$STAFF_USER_ID"'",
    "transferConversation": true
  }'
```

客服端看到这类用户时，主入口应该仍然是统一工作台：

```bash
curl "$BASE_CHAT/api/client/v1/customer-service/workbench/threads" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

在统一工作台里，它表现为：

- `threadType=direct_customer`

真正发消息时，客服主入口也仍然是：

- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/messages`

也就是说：

- 对第三方客服端来说，两条来源链路现在共用的是一套客服中心
- `/api/client/v1/direct-chats/*` 仍然是底层 IM 能力，但不再是客服端 APP 的首选主入口

### 5.13 这条链路的完整顺序

你如果要开发一个客服端 APP，就按下面这条流程做就行：

一、前置条件

- 这个账号必须是租户员工，且满足 `userType=2`
- 这个账号在租户里的 `membershipRole>=2(customer_service)`
- 租户必须开启临时会话能力
- 管理员先把这个客服设为可接待状态

二、客服 APP 登录

- `POST /api/client/v1/auth/login`

三、客服 APP 启动后立即做的事

- `GET /api/client/v1/profile/me`
- `GET /api/client/v1/customer-service/workbench/dashboard`
- `GET /api/client/v1/customer-service/workbench/threads`
- 连接 `wss://chat.hearteasechat.com/ws/client`
- `HeartbeatAsync("ios" | "android" | "web")`

四、客服接单

- `GET /api/client/v1/customer-service/workbench/threads`
- `POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/claim`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/claim`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/takeover`
- `GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}`

五、客服回复客户

- `POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`
- `POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/close`
- `POST /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/close`

### 5.14 你可以把客服端 APP 理解成这 5 个页面

1. 登录页
2. 工作台首页：看板 + 我的状态
3. 工作台线程列表页：同时展示 `temp_session` 和 `direct_customer`
4. 会话详情页：`/threads/{threadType}/{threadId}`
5. 回复输入框：`/threads/{threadType}/{threadId}/messages`

这 5 个页面已经足够支撑一个可交付的最小客服端 APP。

### 5.15 最小实现顺序

最小实现顺序：

1. 先把登录做通
2. 再把统一 `threads` 列表做出来
3. 再做 `temp_session / direct_customer claim`
4. 再做 `takeover`
5. 再做统一 `messages`
6. 再做两类 `close`
7. 最后接上 `ws/client` 做实时更新

如果你是第三方团队，这个顺序很适合拆任务：

- 第一期：登录 + 统一线程列表
- 第二期：认领 / 接管 + 统一回复
- 第三期：关闭线程 + 实时更新 + 富媒体 + 体验优化

### 5.16 做客服端 APP 时最容易走偏的地方

1. 把客服“在线”理解成只登录就行  
说明：不够，还要连 `wss://chat.hearteasechat.com/ws/client` 并持续 `HeartbeatAsync(...)`

2. 以为客服 APP 可以自己设置 `serviceStatus`  
说明：当前代码里，这一步主要通过后台接口配置

3. 误用旧路径 `/api/client/v1/temp-sessions/*`  
说明：当前正确路径是 `/api/client/v1/customer-service/temp-sessions/*`

4. 访客消息想走 `/api/client/v1/*`  
说明：访客只能走 `/api/widget/v1/*`

5. 把注册用户客服也当成 temp-session 做  
说明：普通注册用户 / 租户用户在线程列表里表现为 `direct_customer`

6. 还把 `/api/client/v1/direct-chats/*` 当成客服端主入口  
说明：它是底层 IM 能力；客服端 APP 主入口应该是统一工作台

7. 把 `threadId` 和 `conversationId` 当成同一个值  
说明：尤其在 `direct_customer` 下，这两个值不是同一个主键

8. 一开始就做两套页面  
说明：推荐直接做统一工作台，只在动作层区分 `temp_session` 和 `direct_customer`

9. 一开始就做很全的工作台  
说明：最小版本先做“登录 → 统一线程列表 → 认领 / 接管 → 统一回复 → 关闭线程”就够了

## 6. 先看懂 4 条主流程

这 4 条主流程覆盖了大多数项目的第一阶段开发。

### 6.1 多租户通用 APP 的主流程

1. 用户注册 / 登录平台账号
2. 平台搜索或加入企业
3. 选择进入个人空间或企业空间
4. 拉取个人资料、会话列表、同步数据
5. 建立 Gateway 长连接
6. 开始聊天

### 6.2 企业专属 APP 的主流程

1. 页面启动时已经知道 `tenantId`
2. 用户直接注册 / 登录租户账号
3. 拉取个人资料和会话
4. 建立 Gateway 长连接
5. 开始聊天

### 6.3 Widget 客服的主流程

1. 先拉 Widget 配置
2. 创建访客临时会话
3. 获得 `visitorToken`
4. 访客发第一条消息
5. AI 自动接待或排队
6. 访客请求人工
7. 客服接入
8. 会话结束后评价

### 6.4 管理后台 / 客服工作台的主流程

1. 管理员登录后台
2. 在统一客服中心查看看板、线程池和客服状态
3. 在 temp 域配置 AI、知识库、Widget 和访客治理规则
4. 客服员工上线接待
5. 异常线程由管理员转派、恢复 AI 或强制关闭

## 7. 开发时常用的请求示例

这一节只保留最常用、最能帮助理解流程的示例。

### 7.1 平台密码登录

```bash
curl -X POST "$BASE_CHAT/api/platform/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "MyPassword123!",
    "loginType": "email"
  }'
```

### 7.2 进入企业空间

```bash
curl -X POST "$BASE_CHAT/api/platform/v1/auth/select-tenant" \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "'"$TENANT_ID"'"
  }'
```

### 7.3 企业专属客户端登录

```bash
curl -X POST "$BASE_CHAT/api/client/v1/auth/login" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "loginName": "staff001",
    "password": "MyPassword123!",
    "deviceId": "'"$DEVICE_ID"'",
    "deviceName": "iPhone 15",
    "deviceType": "ios",
    "loginType": "login_name"
  }'
```

### 7.4 创建单聊并发消息

```bash
curl -X POST "$BASE_CHAT/api/client/v1/direct-chats/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "peerUserId": "'"$PEER_USER_ID"'"
  }'
```

```bash
curl -X POST "$BASE_CHAT/api/client/v1/direct-chats/$CHAT_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientMsgId": "direct-msg-001",
    "messageType": "text",
    "body": {
      "text": "你好，欢迎使用 ZTChat"
    }
  }'
```

### 7.5 创建 Widget 访客会话

```bash
curl -X POST "$BASE_CHAT/api/widget/v1/$TENANT_CODE/sessions" \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-site.example.com" \
  -d '{
    "fingerprint": "browser-fp-001",
    "customerId": "cust_10001",
    "customerName": "ACME Corp",
    "locale": "zh-CN",
    "from": "website",
    "ref": "pricing_page",
    "category": "sales",
    "priority": "normal",
    "visitorName": "访客小王",
    "visitorMobile": "13800138000",
    "visitorEmail": "visitor@example.com",
    "sourceUrl": "https://your-site.example.com/pricing",
    "pageTitle": "产品报价",
    "initialMessage": "你好，我想了解企业版价格",
    "metadata": {
      "utmSource": "google"
    }
  }'
```

### 7.6 客服认领统一工作台里的访客线程

```bash
curl -X POST "$BASE_CHAT/api/client/v1/customer-service/workbench/threads/temp-session/$THREAD_ID/claim" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 7.7 管理员强制关闭异常会话

```bash
curl -X POST "$BASE_ADMIN/api/admin/v1/customer-service/center/threads/$THREAD_TYPE/$THREAD_ID/force-close" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 8. 14 个端到端流程

这一部分才是本文档的核心。

每个流程都只回答 4 个问题：

1. 这个流程适合什么场景
2. 需要什么 Token
3. 先后顺序是什么
4. 成功后系统应该进入什么状态

每个步骤还会标注精确的数据流向：

- 请求字段的值从哪里来（前置步骤响应 / 用户提供 / 外部配置）
- 响应字段会被后续哪个步骤使用

---

### 流程 1：新用户从注册到聊天（完整冷启动）

适用场景：

- 多租户通用 APP
- 企业专属 APP

Token 类型：

- 前半段：无 Token 或 `platformToken`
- 后半段：`accessToken`

目标结果：

- 用户进入某个空间
- 会话列表可用
- 可以发出第一条消息

调用顺序：

**步骤 1**（多租户通用 APP）：`POST /api/platform/v1/auth/register`

请求体：
| 字段 | 来源 |
|---|---|
| `displayName` | 用户提供 |
| `password` | 用户提供 |
| `mobile` | 用户提供（与 `email` 至少一个） |
| `email` | 用户提供（与 `mobile` 至少一个） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.platformToken` | → 步骤 3 请求头 `Authorization: Bearer {platformToken}`；→ 步骤 4 请求头 |

说明：注册成功后可跳过步骤 2 直接用 `platformToken` 进入步骤 3。

**步骤 2**（多租户通用 APP）：`POST /api/platform/v1/auth/login`

请求体：
| 字段 | 来源 |
|---|---|
| `identifier` | 用户提供（邮箱 / 手机号 / lpp_id） |
| `password` | 用户提供 |
| `loginType` | 用户提供（`email` / `mobile` / `lpp_id` / `auto`） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.platformToken` | → 步骤 3 请求头 `Authorization: Bearer {platformToken}`；→ 步骤 4 请求头 |
| `data.tenants[].tenantId` | → 步骤 4 请求体 `tenantId` |
| `data.spaceContext.spaceType` | → 客户端判断进入个人空间还是租户空间 |

**步骤 3**（多租户通用 APP）：`GET /api/platform/v1/my/tenants`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 或步骤 2 响应 `data.platformToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].tenantId` | → 步骤 4 请求体 `tenantId` |

**步骤 4**（多租户通用 APP）：`POST /api/platform/v1/auth/select-tenant`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 或步骤 2 响应 `data.platformToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `tenantId` | ← 步骤 2 响应 `data.tenants[].tenantId` 或步骤 3 响应 `data[].tenantId` |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 7–12 请求头 `Authorization: Bearer {accessToken}`；→ 步骤 10 Gateway 连接认证 |
| `data.refreshToken` | → 本地持久化，用于 Token 过期后刷新 |
| `data.userId` | → 客户端本地标识当前用户 |

**步骤 5**（企业专属 APP）：`POST /api/client/v1/auth/register`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供 |
| `password` | 用户提供 |
| `displayName` | 用户提供 |
| `mobile` | 用户提供 |
| `email` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.userId` | → 注册成功确认，随后进入步骤 6 登录 |

**步骤 6**（企业专属 APP）：`POST /api/client/v1/auth/login`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供 |
| `password` | 用户提供 |
| `deviceId` | 用户提供（客户端本地生成或持久化的设备 ID） |
| `deviceName` | 用户提供 |
| `deviceType` | 用户提供（`web` / `ios` / `android` / `desktop`） |
| `loginType` | 用户提供（`login_name` / `email` / `mobile`） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 7–12 请求头 `Authorization: Bearer {accessToken}`；→ 步骤 10 Gateway 连接认证 |
| `data.refreshToken` | → 本地持久化，用于 Token 过期后刷新 |
| `data.userId` | → 客户端本地标识当前用户 |

**步骤 7**：`GET /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 4 或步骤 6 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.userId` | → 客户端本地标识当前用户 |
| `data.displayName` | → 客户端 UI 展示 |

**步骤 8**：`GET /api/client/v1/conversations`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 4 或步骤 6 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].conversationId` | → 客户端渲染会话列表，点击后进入聊天 |

**步骤 9**：`GET /api/client/v1/sync`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 4 或步骤 6 响应 `data.accessToken`）

说明：同步离线期间的增量数据，无特定下游字段依赖。

**步骤 10**：连接 `wss://chat.hearteasechat.com/ws/client`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 4 或步骤 6 响应 `data.accessToken` |

说明：建立 Gateway 长连接后，调用 `HeartbeatAsync` 维持在线。

**步骤 11**：`POST /api/client/v1/direct-chats/`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 4 或步骤 6 响应 `data.accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `peerUserId` | 用户提供（从通讯录或搜索结果中选择的目标用户 ID） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.chatId` | → 步骤 12 路由参数 `{chatId}` |

**步骤 12**：`POST /api/client/v1/direct-chats/{chatId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 4 或步骤 6 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{chatId}` | ← 步骤 11 响应 `data.chatId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成的唯一消息 ID） |
| `messageType` | 用户提供（`text` / `image` / `file` 等） |
| `body` | 用户提供（消息内容对象） |

开发者要点：

- 多租户通用 APP 的关键不是直接登录业务接口，而是先选空间
- 企业专属 APP 的关键是登录前传 `X-Tenant-Id`

---

### 流程 2：访客咨询 → AI 应答 → 转人工 → 客服接待 → 评价

适用场景：

- 网站嵌入客服 Widget

Token 类型：

- 前 2 步：无 Token
- 访客阶段：`visitorToken`
- 客服阶段：`accessToken`

目标结果：

- 访客发起咨询
- AI 先接待
- 人工客服接入
- 会话结束后完成评价

调用顺序：

**步骤 1**：`GET /api/widget/v1/{tenantCode}/config`

路由参数：
| 字段 | 来源 |
|---|---|
| `{tenantCode}` | 外部配置——Widget 嵌入时预置的租户编码 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.tenantCode` | → 步骤 2 路由参数 `{tenantCode}`（确认一致） |
| `data.categories` | → 客户端 UI 展示可选会话分类 |

**步骤 2**：`POST /api/widget/v1/{tenantCode}/sessions`

路由参数：
| 字段 | 来源 |
|---|---|
| `{tenantCode}` | 外部配置——Widget 嵌入时预置的租户编码 |

请求体：
| 字段 | 来源 |
|---|---|
| `fingerprint` | 用户提供（浏览器指纹） |
| `visitorName` | 用户提供 |
| `visitorMobile` | 用户提供 |
| `visitorEmail` | 用户提供 |
| `sourceUrl` | 用户提供（当前页面 URL） |
| `pageTitle` | 用户提供（当前页面标题） |
| `initialMessage` | 用户提供 |
| `category` | 用户提供（可选，从步骤 1 响应 `data.categories` 中选择） |
| `locale` | 用户提供 |
| `from` | 用户提供 |
| `ref` | 用户提供 |
| `metadata` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.sessionId` | → 步骤 5、7、13 路由参数 `{sessionId}` |
| `data.visitorToken` | → 步骤 3 保存；→ 步骤 4 Gateway 连接认证；→ 步骤 5、7、13 请求头 |
| `data.conversationId` | → 客户端本地关联底层会话 |

**步骤 3**：保存返回的 `visitorToken`

来源：← 步骤 2 响应 `data.visitorToken`

说明：客户端本地持久化，后续所有 Widget 接口和 Gateway 连接都需要此 Token。

**步骤 4**：连接 `wss://chat.hearteasechat.com/ws/widget`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 2 响应 `data.visitorToken` |

**步骤 5**：`POST /api/widget/v1/sessions/{sessionId}/messages`

请求头：
- `Authorization: Bearer {visitorToken}`（← 步骤 2 响应 `data.visitorToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 步骤 2 响应 `data.sessionId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

**步骤 6**：等待 AI 应答

说明：AI 应答通过 Gateway 推送事件 `msg.new` 到达客户端，无需主动调用接口。

**步骤 7**：`POST /api/widget/v1/sessions/{sessionId}/handoff`

请求头：
- `Authorization: Bearer {visitorToken}`（← 步骤 2 响应 `data.visitorToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 步骤 2 响应 `data.sessionId` |

说明：访客请求转人工客服。

**步骤 8**：客服登录（独立流程）

说明：客服通过 `POST /api/client/v1/auth/login` 登录，获取 `accessToken`。详见流程 1 步骤 6 或第 5 章。

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 9–12 请求头 `Authorization: Bearer {accessToken}` |

**步骤 9**：`GET /api/client/v1/customer-service/workbench/threads`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 8 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.queueItems[].threadId` | → 步骤 10 路由参数 `{threadId}`（当 `threadType=temp_session`） |
| `data.queueItems[].threadType` | → 步骤 10 路由段判断（`temp-session`） |

**步骤 10**：`POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/claim`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 8 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 9 响应 `data.queueItems[].threadId`（`threadType=temp_session` 的项） |

**步骤 11**：`POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 8 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 9 响应 `data.queueItems[].threadId` 或步骤 10 认领的线程 |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客服端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

**步骤 12**：`POST /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/close`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 8 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadId}` | ← 步骤 9 响应中对应的 `threadId` |

**步骤 13**：`POST /api/widget/v1/sessions/{sessionId}/rate`

请求头：
- `Authorization: Bearer {visitorToken}`（← 步骤 2 响应 `data.visitorToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 步骤 2 响应 `data.sessionId` |

请求体：
| 字段 | 来源 |
|---|---|
| `rating` | 用户提供（访客评分） |
| `comment` | 用户提供（访客评价内容） |

开发者要点：

- Widget 侧不要调用 `/api/client/v1/*`
- 访客转人工后，客服端的主入口是统一工作台 `threads`

---

### 流程 3：管理员搭建客服系统（从零配置）

适用场景：

- 新企业第一次启用客服系统

Token 类型：

- `admin accessToken`

目标结果：

- 临时会话可用
- AI 可用
- 知识库可用
- 客服员工可上线

调用顺序：

**步骤 1**：`POST /api/admin/v1/auth/login`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——管理后台预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供（管理员登录名） |
| `password` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 2–11 请求头 `Authorization: Bearer {accessToken}` |
| `data.tenantId` | → 客户端本地标识当前租户 |
| `data.userId` | → 客户端本地标识当前管理员 |

**步骤 2**：`GET /api/admin/v1/customer-service/center/dashboard`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

说明：查看统一客服中心看板，了解当前客服系统状态。无特定下游字段依赖。

**步骤 3**：`GET /api/admin/v1/customer-service/center/staff-statuses`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].staffUserId` | → 步骤 4 路由参数 `{staffUserId}` |

**步骤 4**：`PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{staffUserId}` | ← 步骤 3 响应 `data[].staffUserId` |

请求体：
| 字段 | 来源 |
|---|---|
| `serviceStatus` | 用户提供（`online` / `busy` / `offline`） |
| `queueAcceptEnabled` | 用户提供（`true` / `false`） |
| `maxConcurrentSessions` | 用户提供（数字） |

**步骤 5**：`GET /api/admin/v1/customer-service/temp-sessions/config`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

说明：查看当前临时会话配置。响应内容用于步骤 6 的更新参考。

**步骤 6**：`PUT /api/admin/v1/customer-service/temp-sessions/config`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| 各配置字段 | 用户提供（AI 开关、欢迎语、排队策略等） |

**步骤 7**：`POST /api/admin/v1/customer-service/temp-sessions/config/ai/probe`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

说明：测试 AI 配置是否可用。无特定下游字段依赖。

**步骤 8**：`GET /api/admin/v1/customer-service/temp-sessions/widget/test-url`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.testUrl` | → 管理员在浏览器中打开测试 Widget |

**步骤 9**：`POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `name` | 用户提供（知识库名称） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.knowledgeBaseId` | → 步骤 10、11 路由参数 `{knowledgeBaseId}` |

**步骤 10**：`POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{knowledgeBaseId}` | ← 步骤 9 响应 `data.knowledgeBaseId` |

请求体：
| 字段 | 来源 |
|---|---|
| 文档内容 | 用户提供（知识库文档） |

**步骤 11**：`POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/rebuild`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{knowledgeBaseId}` | ← 步骤 9 响应 `data.knowledgeBaseId` |

开发者要点：

- 统一客服中心负责线程池和客服状态视角，temp 域负责 AI、知识库、Widget 等专属配置
- 这条流程完成后，Widget 和客服工作台才算真正能接客

---

### 流程 4：APP 启动时的初始化序列

适用场景：

- APP 冷启动
- 页面刷新
- Token 刚恢复到本地内存

Token 类型：

- `accessToken`

目标结果：

- 用户信息、会话列表、实时通道全部就绪

调用顺序：

**步骤 1**（如有需要）：`POST /api/client/v1/auth/refresh`

请求体：
| 字段 | 来源 |
|---|---|
| `refreshToken` | ← 本地持久化的 `refreshToken`（来自登录或上次刷新） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 2–7 请求头 `Authorization: Bearer {accessToken}`；→ 步骤 6 Gateway 连接认证 |
| `data.refreshToken` | → 本地持久化，替换旧 `refreshToken` |

**步骤 2**：`GET /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken` 或本地已有的有效 `accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.userId` | → 客户端本地标识当前用户 |
| `data.displayName` | → 客户端 UI 展示 |

**步骤 3**：`GET /api/client/v1/notification-settings`

请求头：
- `Authorization: Bearer {accessToken}`（← 同步骤 2）

说明：获取通知偏好设置，用于客户端本地通知策略。无特定下游字段依赖。

**步骤 4**：`GET /api/client/v1/conversations`

请求头：
- `Authorization: Bearer {accessToken}`（← 同步骤 2）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].conversationId` | → 客户端渲染会话列表 |

**步骤 5**：`GET /api/client/v1/sync`

请求头：
- `Authorization: Bearer {accessToken}`（← 同步骤 2）

说明：同步离线期间的增量数据。无特定下游字段依赖。

**步骤 6**：连接 `wss://chat.hearteasechat.com/ws/client`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 1 响应 `data.accessToken` 或本地已有的有效 `accessToken` |

**步骤 7**：`HeartbeatAsync("ios" | "android" | "web" | "desktop")`

参数：
| 字段 | 来源 |
|---|---|
| `deviceType` | 用户提供（客户端平台类型） |

说明：通过步骤 6 建立的 Gateway 连接调用，维持在线状态。

开发者要点：

- 不要一上来就盲连 Gateway，先保证 `accessToken` 是当前有效的
- `conversations + sync + gateway` 这三步加在一起才是完整初始化

---

### 流程 5：发送富媒体消息（图片/文件/语音）

适用场景：

- 发送图片
- 发送附件
- 发送语音

Token 类型：

- `accessToken`

目标结果：

- 富媒体消息成功进入会话

调用顺序：

**步骤 1**：`POST /api/client/v1/media/upload`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）
- `Content-Type: multipart/form-data`

请求体：
| 字段 | 来源 |
|---|---|
| `file` | 用户提供（本地文件） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.mediaId` | → 步骤 3 请求体 `body.image.mediaId` / `body.file.mediaId` / `body.voice.mediaId` |
| `data.url` | → 步骤 3 请求体 `body.image.url` / `body.file.url` / `body.voice.url` |
| `data.fileName` | → 步骤 3 请求体 `body.file.fileName` |
| `data.mimeType` | → 步骤 3 请求体 `body.*.mimeType` |
| `data.sizeBytes` | → 步骤 3 请求体 `body.*.sizeBytes` |
| `data.thumbnailUrl` | → 步骤 3 请求体 `body.image.thumbnailUrl`（图片/视频时） |

**步骤 2**：取返回的媒体信息拼进消息 `body`

说明：将步骤 1 返回的媒体字段组装到对应的消息体结构中。无接口调用。

**步骤 3**：`POST /api/client/v1/direct-chats/{chatId}/messages` 或 `POST /api/client/v1/groups/{groupId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{chatId}` 或 `{groupId}` | ← 已有会话的 ID（来自会话列表或创建会话的响应） |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成） |
| `messageType` | 用户提供（`image` / `file` / `voice`） |
| `body.image` / `body.file` / `body.voice` | ← 步骤 1 响应 `data.*` 字段组装 |

**步骤 4**（可选，语音场景）：`POST /api/client/v1/messages/voice-to-text`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `messageId` | ← 步骤 3 响应 `data.messageId` |

开发者要点：

- 先上传，再发消息
- 消息里传的是上传成功后的媒体资源信息，不是本地文件本身

---

### 流程 6：创建群聊并完成一次群讨论

适用场景：

- 项目群
- 工作群
- 临时协作群

Token 类型：

- `accessToken`

目标结果：

- 群创建成功
- 群消息收发成功
- 成员读回执正常

调用顺序：

**步骤 1**：`POST /api/client/v1/groups/`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `groupName` | 用户提供 |
| `memberUserIds` | 用户提供（从通讯录选择的成员 ID 列表） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.groupId` | → 步骤 2 路由参数 `{groupId}`；→ 步骤 3、5、6 路由参数 |

**步骤 2**：`GET /api/client/v1/groups/{groupId}`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{groupId}` | ← 步骤 1 响应 `data.groupId` |

说明：获取群详情，用于客户端 UI 展示。无特定下游字段依赖。

**步骤 3**：`POST /api/client/v1/groups/{groupId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{groupId}` | ← 步骤 1 响应 `data.groupId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.messageId` | → 客户端本地标识已发送消息 |

**步骤 4**：其他成员通过 Gateway 收到 `msg.new`

说明：服务端推送事件，无需主动调用接口。

**步骤 5**：`POST /api/client/v1/groups/{groupId}/read`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{groupId}` | ← 步骤 1 响应 `data.groupId` |

说明：标记群消息已读。

**步骤 6**：`GET /api/client/v1/groups/{groupId}/read-receipts`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{groupId}` | ← 步骤 1 响应 `data.groupId` |

说明：查询群消息已读回执。

开发者要点：

- 建群不是普通用户都能做，接入前要确认账号角色
- 群讨论的闭环是：发消息、收消息、标已读、查已读回执

---

### 流程 7：好友关系建立到私聊

适用场景：

- 社交型产品
- 企业内同事之间先加好友再聊天

Token 类型：

- `accessToken`

目标结果：

- 好友关系建立
- 单聊会话建立
- 第一条私聊消息发出

调用顺序：

**步骤 1**：`POST /api/client/v1/friends/request`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `toUserId` | 用户提供（从搜索结果或通讯录中选择的目标用户 ID） |
| `message` | 用户提供（好友申请附言） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.requestId` | → 步骤 3 路由参数 `{requestId}`（对方操作） |

**步骤 2**（对方操作）：`GET /api/client/v1/friends/requests`

请求头：
- `Authorization: Bearer {accessToken}`（← 对方的 `accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].requestId` | → 步骤 3 路由参数 `{requestId}` |

**步骤 3**（对方操作）：`POST /api/client/v1/friends/requests/{requestId}/handle`

请求头：
- `Authorization: Bearer {accessToken}`（← 对方的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{requestId}` | ← 步骤 2 响应 `data[].requestId` |

请求体：
| 字段 | 来源 |
|---|---|
| `action` | 用户提供（`accept` 或 `reject`） |

**步骤 4**（双方）：`GET /api/client/v1/friends`

请求头：
- `Authorization: Bearer {accessToken}`（← 各自的 `accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].friendUserId` | → 步骤 5 请求体 `peerUserId` |

**步骤 5**：`POST /api/client/v1/direct-chats/`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `peerUserId` | ← 步骤 4 响应 `data[].friendUserId` |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.chatId` | → 步骤 6 路由参数 `{chatId}` |

**步骤 6**：`POST /api/client/v1/direct-chats/{chatId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{chatId}` | ← 步骤 5 响应 `data.chatId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

开发者要点：

- 好友建立和私聊建立是两步，不是一步
- 如果你的产品不需要好友前置，可以直接走单聊

---

### 流程 8：通过邀请链接加入企业

适用场景：

- 企业拉新人入驻
- 运营人员发送邀请链接

Token 类型：

- 无 Token 或 `platformToken`
- 接受邀请后获得 `accessToken`

目标结果：

- 用户成功加入企业
- 可以直接进入该企业空间

调用顺序：

**步骤 1**：`GET /api/platform/v1/invitations/{code}`

路由参数：
| 字段 | 来源 |
|---|---|
| `{code}` | 用户提供（从邀请链接中提取的邀请码） |

说明：预览邀请对应的租户信息。平台 Token 可选。

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.tenantName` | → 客户端 UI 展示邀请落地页 |
| `data.tenantId` | → 客户端本地关联目标租户 |

**步骤 2**：`POST /api/platform/v1/auth/login`

请求体：
| 字段 | 来源 |
|---|---|
| `identifier` | 用户提供 |
| `password` | 用户提供 |
| `loginType` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.platformToken` | → 步骤 3 请求头 `Authorization: Bearer {platformToken}` |

**步骤 3**：`POST /api/platform/v1/invitations/{code}/accept`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 2 响应 `data.platformToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{code}` | 用户提供（同步骤 1 的邀请码） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 4、5 请求头 `Authorization: Bearer {accessToken}` |
| `data.refreshToken` | → 本地持久化 |
| `data.tenantId` | → 客户端本地标识当前租户 |
| `data.userId` | → 客户端本地标识当前用户 |

**步骤 4**：`GET /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 3 响应 `data.accessToken`）

说明：获取当前用户资料。

**步骤 5**：`GET /api/client/v1/tenant/info`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 3 响应 `data.accessToken`）

说明：获取当前租户信息，用于客户端 UI 展示。

开发者要点：

- 邀请链接流程的重点不是"先搜企业"，而是"先预览，再登录，再接受邀请"

---

### 流程 9：多租户切换（个人空间 ↔ 企业空间）

适用场景：

- 一个平台账号同时属于多个企业
- 还需要保留个人空间

Token 类型：

- `platformToken`
- 切换后得到新的 `accessToken`

目标结果：

- 能在多个空间之间切换
- 每次切换后业务数据和实时连接都正确刷新

调用顺序：

**步骤 1**：`POST /api/platform/v1/auth/login`

请求体：
| 字段 | 来源 |
|---|---|
| `identifier` | 用户提供 |
| `password` | 用户提供 |
| `loginType` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.platformToken` | → 步骤 2、3、5、7 请求头 `Authorization: Bearer {platformToken}` |
| `data.tenants[].tenantId` | → 步骤 5 请求体 `tenantId` |
| `data.spaceContext.spaceType` | → 客户端判断默认进入哪个空间 |

**步骤 2**：`GET /api/platform/v1/my/tenants`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 响应 `data.platformToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].tenantId` | → 步骤 5 请求体 `tenantId` |
| `data[].tenantName` | → 客户端 UI 展示空间选择列表 |

**步骤 3**：`POST /api/platform/v1/auth/select-personal-space`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 响应 `data.platformToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 4 使用 `/api/client/v1/*` 的请求头 |
| `data.refreshToken` | → 本地持久化 |

**步骤 4**：在个人空间使用 `/api/client/v1/*`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 3 响应 `data.accessToken`）

说明：使用个人空间的 `accessToken` 访问客户端业务接口。

**步骤 5**：需要切企业时，`POST /api/platform/v1/auth/select-tenant`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 响应 `data.platformToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `tenantId` | ← 步骤 1 响应 `data.tenants[].tenantId` 或步骤 2 响应 `data[].tenantId` |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 6 Gateway 连接认证；→ 后续 `/api/client/v1/*` 请求头 |
| `data.refreshToken` | → 本地持久化 |

**步骤 6**：切换后重新建立 `wss://chat.hearteasechat.com/ws/client`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 5 响应 `data.accessToken` |

说明：切换空间后必须断开旧连接，用新 `accessToken` 重建 Gateway。

**步骤 7**：`GET /api/platform/v1/my/spaces/unread-summary`

请求头：
- `Authorization: Bearer {platformToken}`（← 步骤 1 响应 `data.platformToken`）

说明：获取所有空间的未读红点汇总，用于空间切换入口的未读提示。

开发者要点：

- 空间切换不是只换 UI 标签，而是要换整套 `accessToken`
- 切换空间后，Gateway 连接也要重建

---

### 流程 10：消息的完整生命周期

适用场景：

- 你要把消息从"发出"到"结束"整个链路做完整

Token 类型：

- `accessToken`

目标结果：

- 一条消息经过发送、接收、已读、收藏、转发、撤回、删除等完整阶段

调用顺序：

**步骤 1**：`POST /api/client/v1/direct-chats/{chatId}/messages` 或 `POST /api/client/v1/groups/{groupId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{chatId}` 或 `{groupId}` | ← 已有会话的 ID（来自会话列表或创建会话的响应） |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（客户端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.messageId` | → 步骤 5 请求体 `messageId`；→ 步骤 6 请求体 `messageIds`；→ 步骤 7 路由参数 `{messageId}`；→ 步骤 9 路由参数 `{messageId}` |

**步骤 2**：接收方通过 Gateway 收到 `msg.new`

说明：服务端推送事件，无需主动调用接口。推送 payload 中包含 `messageId`、`conversationId` 等字段。

**步骤 3**：接收方 `POST /api/client/v1/direct-chats/{chatId}/read` 或 `/groups/{groupId}/read`

请求头：
- `Authorization: Bearer {accessToken}`（← 接收方的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{chatId}` 或 `{groupId}` | ← 步骤 2 推送事件中的 `conversationId` |

说明：标记消息已读。

**步骤 4**：发送方收到 `msg.read`

说明：服务端推送事件，无需主动调用接口。

**步骤 5**：`POST /api/client/v1/favorites`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `messageId` | ← 步骤 1 响应 `data.messageId` |

**步骤 6**：`POST /api/client/v1/messages/forward`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `messageIds` | ← 步骤 1 响应 `data.messageId`（可多条） |
| `targetConversationIds` | 用户提供（从会话列表中选择的目标会话 ID） |

**步骤 7**：`POST /api/client/v1/messages/{messageId}/recall`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{messageId}` | ← 步骤 1 响应 `data.messageId` |

**步骤 8**：双方收到 `msg.recalled`

说明：服务端推送事件，无需主动调用接口。

**步骤 9**：单端需要隐藏时，`POST /api/client/v1/messages/{messageId}/delete`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{messageId}` | ← 步骤 1 响应 `data.messageId` |

开发者要点：

- 撤回和删除不是一回事
- 删除是"仅自己不看见"，撤回是"会话中的消息状态发生变化"

---

### 流程 11：访客会话的 Token 刷新与重连

适用场景：

- Widget 页面长时间停留
- 浏览器刷新
- 网络抖动

Token 类型：

- `visitorToken`

目标结果：

- 访客会话不断线
- 重连后仍能继续当前会话

调用顺序：

**步骤 1**：`POST /api/widget/v1/sessions/{sessionId}/token/refresh`

请求头：
- `Authorization: Bearer {visitorToken}`（← 本地持久化的旧 `visitorToken`，来自创建会话时的响应）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 本地持久化的 `sessionId`（来自创建会话时的响应 `data.sessionId`） |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.visitorToken` | → 步骤 2 替换本地 token；→ 步骤 3 Gateway 连接认证；→ 步骤 5、6 请求头 |

**步骤 2**：用新 `visitorToken` 覆盖旧 token

来源：← 步骤 1 响应 `data.visitorToken`

说明：客户端本地立即替换，旧 token 失效。

**步骤 3**：重新连接 `wss://chat.hearteasechat.com/ws/widget`

连接参数：
| 字段 | 来源 |
|---|---|
| `access_token` | ← 步骤 1 响应 `data.visitorToken` |

**步骤 4**：`HeartbeatAsync("web-widget")`

参数：
| 字段 | 来源 |
|---|---|
| `deviceType` | 外部配置（固定 `"web-widget"`） |

说明：通过步骤 3 建立的 Gateway 连接调用，维持在线状态。

**步骤 5**：`GET /api/widget/v1/sessions/{sessionId}`

请求头：
- `Authorization: Bearer {visitorToken}`（← 步骤 1 响应 `data.visitorToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 本地持久化的 `sessionId` |

说明：获取会话当前状态，确认会话仍然有效。

**步骤 6**：`GET /api/widget/v1/sessions/{sessionId}/messages`

请求头：
- `Authorization: Bearer {visitorToken}`（← 步骤 1 响应 `data.visitorToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 本地持久化的 `sessionId` |

说明：拉取离线期间的消息历史。

开发者要点：

- 刷新后一定要替换本地 token
- 关闭、重开、刷新这些动作之后，旧 token 不能继续用

---

### 流程 12：完整的密码找回流程

适用场景：

- 企业专属 APP 忘记密码
- 已知租户上下文下的验证码重置

Token 类型：

- 无登录 Token

目标结果：

- 用户通过验证码重置密码并重新登录

调用顺序：

**步骤 1**：`GET /api/client/v1/auth/verification/settings`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

说明：获取当前租户的验证码开关配置，判断支持哪些验证方式。

**步骤 2**：`POST /api/client/v1/auth/verification/send`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `identifier` | 用户提供（邮箱或手机号） |
| `channel` | 用户提供（`email` 或 `sms`，根据步骤 1 返回的配置选择） |
| `purpose` | 外部配置（固定 `"reset_password"`） |

**步骤 3**：`POST /api/client/v1/auth/reset-password`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `identifier` | 用户提供（同步骤 2 的邮箱或手机号） |
| `verificationCode` | 用户提供（从邮件或短信中获取的验证码） |
| `newPassword` | 用户提供 |
| `loginType` | 用户提供（`email` 或 `mobile`） |

**步骤 4**：`POST /api/client/v1/auth/login`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——企业专属 APP 预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供（同步骤 2 的邮箱或手机号） |
| `password` | ← 步骤 3 请求体中用户设置的 `newPassword` |
| `deviceId` | 用户提供（客户端本地生成或持久化的设备 ID） |
| `deviceName` | 用户提供 |
| `deviceType` | 用户提供 |
| `loginType` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 流程 4 步骤 2 起的请求头 |
| `data.refreshToken` | → 本地持久化 |

**步骤 5**：进入 [流程 4：APP 启动时的初始化序列](#流程-4app-启动时的初始化序列)

说明：使用步骤 4 返回的 `accessToken` 进入标准初始化流程。

开发者要点：

- 这条流程是企业专属客户端最常用的找回密码方式
- 不要把它误接到平台账号侧

---

### 流程 13：管理员介入异常会话

适用场景：

- 客服长时间未回复
- 会话状态异常
- AI 需要恢复或人工接管

Token 类型：

- `admin accessToken`

目标结果：

- 管理员定位异常会话并采取处置动作

调用顺序：

**步骤 1**：`POST /api/admin/v1/auth/login`

请求头：
- `X-Tenant-Id: {tenantId}`（外部配置——管理后台预置的租户 ID）

请求体：
| 字段 | 来源 |
|---|---|
| `loginName` | 用户提供（管理员登录名） |
| `password` | 用户提供 |

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.accessToken` | → 步骤 2–7 请求头 `Authorization: Bearer {accessToken}` |

**步骤 2**：`GET /api/admin/v1/customer-service/center/threads`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data[].threadType` | → 步骤 3–7 路由段 `{threadType}` |
| `data[].threadId` | → 步骤 3–5 路由参数 `{threadId}` |
| `data[].sessionId`（仅 `temp_session`） | → 步骤 6、7 路由参数 `{sessionId}` |

**步骤 3**：`GET /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadType}` | ← 步骤 2 响应 `data[].threadType`（路由段使用 `temp-session` 或 `direct-customer`） |
| `{threadId}` | ← 步骤 2 响应 `data[].threadId` |

说明：查看异常线程详情，判断需要采取的处置动作。

**步骤 4**（如需转派）：`POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/assign`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadType}` | ← 步骤 2 响应中对应线程的 `threadType`（路由段格式） |
| `{threadId}` | ← 步骤 2 响应中对应线程的 `threadId` |

请求体：
| 字段 | 来源 |
|---|---|
| `targetStaffUserId` | 用户提供（管理员选择的目标客服 ID） |

**步骤 5**（如需强制结束）：`POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/force-close`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{threadType}` | ← 步骤 2 响应中对应线程的 `threadType`（路由段格式） |
| `{threadId}` | ← 步骤 2 响应中对应线程的 `threadId` |

**步骤 6**（如果这是访客临时会话且需要恢复 AI）：`POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/resume-ai`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 步骤 2 或步骤 3 响应中 `temp_session` 线程的 `sessionId` |

**步骤 7**（如果这是访客临时会话且需要代发消息）：`POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/messages`

请求头：
- `Authorization: Bearer {accessToken}`（← 步骤 1 响应 `data.accessToken`）

路由参数：
| 字段 | 来源 |
|---|---|
| `{sessionId}` | ← 步骤 2 或步骤 3 响应中 `temp_session` 线程的 `sessionId` |

请求体：
| 字段 | 来源 |
|---|---|
| `clientMsgId` | 用户提供（管理端本地生成） |
| `messageType` | 用户提供 |
| `body` | 用户提供 |

开发者要点：

- 管理员介入流程的主入口已经变成统一客服中心 `center`
- temp 域动作只在访客会话专属处置时才用

---

### 流程 14：用户个人设置全流程

适用场景：

- 个人信息维护
- 隐私、通知、地址、密码、设备、换绑

Token 类型：

- Client 设置：`accessToken`
- 平台账号安全：`platformToken`

目标结果：

- 用户把个人设置全部维护完整

调用顺序：

**步骤 1**：`GET /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

响应 `data` 关键字段（后续步骤需要）：
| 字段 | 下游用途 |
|---|---|
| `data.displayName` | → 步骤 2 请求体预填（当前值） |
| `data.avatarUrl` | → 步骤 2 请求体预填（当前值） |
| `data.signature` | → 步骤 2 请求体预填（当前值） |

**步骤 2**：`PUT /api/client/v1/profile/me`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `displayName` | 用户提供（可基于步骤 1 响应预填） |
| `avatarUrl` | 用户提供（通常先上传头像获取 URL） |
| `signature` | 用户提供 |
| `gender` | 用户提供 |
| `birthday` | 用户提供 |
| `location` | 用户提供 |
| `bio` | 用户提供 |
| `tapTapText` | 用户提供 |

**步骤 3**：`PUT /api/client/v1/profile/me/privacy`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `profileVisibility` | 用户提供（`everyone` / `friends` / `nobody`） |

**步骤 4**：`PUT /api/client/v1/notification-settings`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| 各通知偏好字段 | 用户提供 |

**步骤 5**：`GET /api/client/v1/profile/me/addresses`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

说明：获取当前用户的收货地址列表。

**步骤 6**：`POST /api/client/v1/profile/me/addresses`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| 地址字段 | 用户提供 |

**步骤 7**：`POST /api/client/v1/auth/change-password`

请求头：
- `Authorization: Bearer {accessToken}`（← 登录流程获取的 `accessToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `oldPassword` | 用户提供 |
| `newPassword` | 用户提供 |

说明：成功后会吊销所有活跃会话，需重新登录。

**步骤 8**（如需换绑手机号）：`PUT /api/platform/v1/account/mobile`

请求头：
- `Authorization: Bearer {platformToken}`（← 平台登录流程获取的 `platformToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `mobile` | 用户提供（新手机号） |
| `verificationCode` | 用户提供（新手机号收到的验证码） |

**步骤 9**（如需换绑邮箱）：`PUT /api/platform/v1/account/email`

请求头：
- `Authorization: Bearer {platformToken}`（← 平台登录流程获取的 `platformToken`）

请求体：
| 字段 | 来源 |
|---|---|
| `email` | 用户提供（新邮箱） |
| `verificationCode` | 用户提供（新邮箱收到的验证码） |

**步骤 10**（如需管理设备）：`GET /api/platform/v1/account/devices`

请求头：
- `Authorization: Bearer {platformToken}`（← 平台登录流程获取的 `platformToken`）

说明：获取当前平台账号的设备列表。

**步骤 11**（如需注销）：`POST /api/platform/v1/account/deactivate`

请求头：
- `Authorization: Bearer {platformToken}`（← 平台登录流程获取的 `platformToken`）

说明：注销平台账号。此操作不可逆。

开发者要点：

- 用户资料类设置在 Client 侧
- 手机号、邮箱、设备、注销在 Platform 侧

### 流程 15:扫码加好友(邀请二维码)

适用场景:用户 A 想把 B 加为好友,但只知道对方有 ZTChat APP,不知道对方的 `userId`。

最简链路(三步):

1. **A 在 APP 内打开"我的"→"加好友" → 调 `POST /api/client/v1/friends/invite-qr`**(返回 `{ tokenId, token, qrPayload, ... }`)。客户端把 `qrPayload` 渲染成二维码(具体绘制逻辑见 `friend-invite-qr.html` 示例页)。
2. **B 用 APP 扫码,解出 `token` 后调 `GET /api/client/v1/friends/invite-qr/{token}/preview`**(免登也能调,返回 A 的脱敏资料),用于让 B 在确认弹窗里看清"是谁向你发起好友请求"。
3. **B 决定接受 → 调 `POST /api/client/v1/friends/invite-qr/{token}/accept`**(必须已登录)。服务端会:
   - 把 B 的好友请求落地为正常的"加好友"流程
   - 触发 A 的"对方接受了你的好友请求"事件
   - 直接返回会话信息,B 可立即跳入私聊

附属能力:
- A 可以 `GET /api/client/v1/friends/invite-qr` 查询自己当前未失效的邀请码
- A 可以 `DELETE /api/client/v1/friends/invite-qr/{tokenId}` 主动撤销邀请

注意事项:

- 邀请码会落地到 `FriendInviteQr` 实体,`status` 取 `active / revoked / exhausted`(已用完);消费端只读字符串,不要按数值映射
- 邀请二维码的渲染逻辑由客户端 SDK 自行实现,服务端**只下发 token**,不生成图片
- 如果 B 和 A 已经是好友,`accept` 会返回已有的会话,**不报错**(幂等)
- 如果 B 是访客 token 或未登录,`accept` 返回 401;只有 `preview` 是匿名可用

### 流程 16:发起一对一音视频通话

适用场景:已登录用户 A 想给已登录用户 B 发起语音或视频通话。

完整顺序:

```text
A 端                                                       B 端
─────                                                      ─────
1. POST /api/client/v1/voicecall/sessions
   { targetUserId, mediaMode, videoProfile? }
   → { callId, relayUrl, nodeId, expiresAt }
                                                           收到 /ws/client 上的 voicecall.incoming
                                                           { callId, callerUserId, callerDisplayName, relayUrl, mediaMode, callerVideoProfile }
                                                           ↓
                                                           弹"来电"界面(根据 mediaMode 选语音/视频图标)

2. 连接 relayUrl 的 /hubs/voicecall
3. createOffer → StartCall(callId, sdpOffer, videoProfile?)
   → CallStartResult { success, sdpAnswer, ... }
                                                           4. 用户点接听:连同一个 relayUrl 的 /hubs/voicecall
                                                           5. createOffer → AnswerCall(callId, sdpOffer, videoProfile?)
                                                              → CallAnswerResult { success, sdpAnswer, ... }

6. 收到 CallRinging(callId)(对方振铃)
7. 收到 CallAnswered(callId)(对方接听)
通话进行中
8. 主动挂断 → Hangup(callId)
                                                           9. 收到 CallEnded(callId, "hangup")
```

硬约束:

- `callId` 必须从 `POST /voicecall/sessions` 获取,**不要**客户端自己生成
- 拿到 `callId` 后 **60 秒**内必须成功 `StartCall`,否则会话被自动清理
- 被叫端响铃 **45 秒**内必须 `AnswerCall`,否则会话被自动清理并下发超时 `reason`
- 通话期间**不要**主动断开 relay 连接,任何重连都必须使用同一个 `relayUrl`
- 如果 `StartCall` / `AnswerCall` 返回 `errorMessage="CALL_WRONG_RELAY_NODE"` + 新的 `relayUrl`,客户端应切换 relay 重试一次
- 如果返回 `errorMessage="CALL_RELAY_NODE_OFFLINE"`(无 `relayUrl`),客户端应直接结束 UI,提示用户重新发起
- 被叫离线场景下,服务端会发 APNs / FCM 推送,`data` 携带 `type=call` + `callId` / `callerUserId` / `nodeId`,客户端拉起 UI 后走上面流程

通话结束后可调用 `POST /api/client/v1/messages/send`,以 `messageType=call_log` 在会话里插入一条通话记录消息(`body.callLog` 字段见 [voice-video-call-reference.md](./voice-video-call-reference.md) §9)。

详细流程与 SDP 协商规范见 [voice-video-call.md](./voice-video-call.md)。

### 流程 17:客户主动联系品牌客服(IM 直聊客服线程)

适用场景:已注册客户(非匿名访客)想联系某个品牌账号的客服。与 Widget 访客客服(`temp_session`)不同,这是注册用户 ↔ 客服的 IM 直聊线程,持久化在客户自己的会话列表里。

**客户侧链路**:

```text
1. POST /api/client/v1/customer-service/im-direct/contact-brand
   { brandUserId, ... }
   → { threadId, conversationId }
2. 客户在自己的会话列表里看到这个新会话 conversationId,与普通 IM 一样发消息
3. 服务端按品牌当前的客服策略(自动分派 / 队列 / 指定客服)把 threadId 分配给某位客服
4. 客户后续可以:
   - 评分:POST /api/client/v1/customer-service/threads/{threadId}/rating
   - 等待客服关闭线程,或客服转派给其他客服
```

**客服侧链路**:

```text
1. 客服 APP 在工作台收到新 thread 通知(im_customer_service.created / .assigned 事件 via /ws/client)
2. 进入工作台 → /api/client/v1/customer-service/workbench/* 接管 thread
3. 客服可以:
   - 直接回复:POST /api/client/v1/messages/send(往 conversationId 发消息)
   - 转派给其他客服:POST /api/client/v1/customer-service/im-direct/{threadId}/transfer
   - 关闭线程:POST /api/client/v1/customer-service/im-direct/{threadId}/close → { closed: true }
4. 客服也可以主动外呼联系客户:POST /api/client/v1/customer-service/im-direct/outbound
```

服务端会下发以下 webhook / 实时事件供集成方:

| 主题 | 触发 |
|---|---|
| `im_customer_service.created` | 新线程创建 |
| `im_customer_service.assigned` | 线程分配给某客服 |
| `im_customer_service.transferred` | 线程被转派 |
| `im_customer_service.closed` | 线程关闭 |
| `im_customer_service.rated` | 客户提交评分 |
| `im_customer_service.ai_disabled` | AI 自动应答被关闭 |

**与访客客服(temp_session)的关系**:

| 维度 | Widget 访客线程(`temp_session`) | IM 直聊客服线程(`direct_customer`) |
|---|---|---|
| 客户身份 | 匿名访客,使用 `visitorToken` | 已注册用户,使用客户端业务 `accessToken` |
| 持久会话 | 否,会话关闭后从客户端消失 | 是,持久化在客户会话列表 |
| 入口 | `/api/widget/v1/*` | `/api/client/v1/customer-service/im-direct/*` |
| Webhook 主题 | `temp_session.*` | `im_customer_service.*` |
| 客服侧入口 | 同一个工作台 `/customer-service/workbench/*`(统一处理两类) | 同左 |

## 9. 常用消息体模板

### 9.1 文本消息

```json
{
  "clientMsgId": "msg-001",
  "messageType": "text",
  "body": {
    "text": "你好"
  }
}
```

### 9.2 图片消息

```json
{
  "clientMsgId": "msg-002",
  "messageType": "image",
  "body": {
    "image": {
      "url": "/media/xxxx",
      "fileName": "image.png",
      "mimeType": "image/png",
      "sizeBytes": 12345,
      "width": 1080,
      "height": 720,
      "thumbnailUrl": "/media/xxxx-thumb"
    }
  }
}
```

### 9.3 文件消息

```json
{
  "clientMsgId": "msg-003",
  "messageType": "file",
  "body": {
    "file": {
      "url": "/media/xxxx",
      "fileName": "spec.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 889901
    }
  }
}
```

### 9.4 语音消息

```json
{
  "clientMsgId": "msg-004",
  "messageType": "voice",
  "body": {
    "voice": {
      "url": "/media/xxxx",
      "fileName": "voice.aac",
      "mimeType": "audio/aac",
      "sizeBytes": 34211,
      "durationSeconds": 18
    }
  }
}
```

### 9.5 群聊 @ 提醒

```json
{
  "clientMsgId": "msg-005",
  "messageType": "text",
  "body": {
    "text": "@小李 请跟进这个客户"
  },
  "mentions": [
    {
      "userId": "11111111-1111-1111-1111-111111111111",
      "offset": 0,
      "length": 3
    }
  ]
}
```

### 9.6 联系人卡片消息(`contact_card`)

```json
{
  "clientMsgId": "msg-006",
  "messageType": "contact_card",
  "body": {
    "contactCard": {
      "userId": "22222222-2222-2222-2222-222222222222",
      "displayName": "张三",
      "avatarUrl": "/media/avatar-zhang.png",
      "title": "技术总监"
    }
  }
}
```

### 9.7 通话记录消息(`call_log`)

通话结束后由客户端插入到会话中,用于在聊天记录里展示通话摘要:

```json
{
  "clientMsgId": "calllog-001",
  "messageType": "call_log",
  "body": {
    "callLog": {
      "callId": "019d7a00-1234-7890-abcd-ef0123456789",
      "mediaMode": "audioVideo",
      "durationSeconds": 300,
      "endReason": "hangup",
      "isCaller": false
    }
  }
}
```

详细字段见 [voice-video-call-reference.md](./voice-video-call-reference.md) §9。

### 9.8 位置消息(`location`)

```json
{
  "clientMsgId": "msg-007",
  "messageType": "location",
  "body": {
    "location": {
      "latitude": 31.2304,
      "longitude": 121.4737,
      "name": "上海中心",
      "address": "上海市浦东新区银城中路 501 号"
    }
  }
}
```

## 10. 环境变量模板

```bash
export BASE_CHAT="https://chat.hearteasechat.com"
export BASE_ADMIN="https://admin.hearteasechat.com"

export TENANT_ID="11111111-1111-1111-1111-111111111111"
export TENANT_CODE="acme"
export DEVICE_ID="44444444-4444-4444-4444-444444444444"

export PLATFORM_TOKEN=""
export ACCESS_TOKEN=""
export REFRESH_TOKEN=""
export VISITOR_TOKEN=""
export ADMIN_TOKEN=""
```
