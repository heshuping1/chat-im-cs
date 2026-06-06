# 群二维码进群 + @所有人 服务端校验 —— 接口与行为说明

> 版本:2026-06-06 · 适用环境:生产已上线
> 面向:第三方集成开发者
> 一句话:**新增「扫码进群二维码」完整能力(生成/列表/撤销/预览/扫码加入);同时把「允许普通成员 @所有人」从前端摆设变成服务端强制,并让客户发起的 @所有人 不再通知 TA 看不见的其他客户。**

所有路径前缀:`/api/client/v1`(走 `chat.hearteasechat.com`,需登录态 client token)。返回统一信封 `{ code, message, data }`。

---

## 0. 背景:为什么有这次改动

群管理页的三个开关此前在服务端的处理状态:

| 开关 | 改动前 | 改动后 |
|---|---|---|
| `allowQrCodeJoin`(二维码进群) | **只有开关,无任何生成/扫码接口** | ✅ 补齐完整的群二维码 5 个接口(本文 §1–§2) |
| `allowMemberAtAll`(普通成员 @所有人) | **前端摆设**:服务端不校验,绕过 UI 直接打接口照样 @所有人 | ✅ 服务端强制(本文 §3) |
| 客户 @所有人 的可见性 | 客户 @所有人 会通知到 TA 看不见的其他客户 | ✅ 客户发起的 @所有人 自动剔除不可见客户(本文 §3) |

---

## 1. 群二维码 —— 发起方(群成员)

### 1.1 生成群二维码 `POST /groups/{groupId}/invite-qr`

- **谁能调**:群主/管理员**始终**可生成;普通成员**仅当**群设置 `allowQrCodeJoin=true` 时可生成(关掉则普通成员调用返回 `403 GROUP_PERMISSION_DENIED`)。
- **限流**:与好友二维码同一限流策略。

请求体(可选,可空):

```json
{ "ttlHours": 168, "maxUses": 0 }
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ttlHours` | int? | 否 | 有效期(小时),范围 [1, 720],默认 168(7 天) |
| `maxUses` | int? | 否 | 最大被扫加入次数,范围 [0, 1000],**0=不限次**,默认 0 |

返回 `GroupInviteQrDto`:

```json
{
  "tokenId": "019d...",
  "token": "9F3A1C7B2E8D0A45",
  "qrPayload": "ztchat://group-invite?token=9F3A1C7B2E8D0A45",
  "conversationId": "019d...",
  "maxUses": 0,
  "usedCount": 0,
  "status": "active",
  "expiresAt": "2026-06-13T12:00:00+00:00",
  "createdAt": "2026-06-06T12:00:00+00:00"
}
```

> **服务端只发不透明 `token` + `qrPayload` 字符串,不生成二维码图片**。客户端把 `qrPayload` 自行渲染成二维码(与好友二维码一致)。`status` ∈ `active` / `revoked` / `exhausted`。

### 1.2 我在本群生成的二维码列表 `GET /groups/{groupId}/invite-qr`

返回当前调用者在该群**仍有效(active 且未过期)**的二维码数组(`GroupInviteQrDto[]`),按创建时间倒序。

### 1.3 撤销群二维码 `DELETE /groups/{groupId}/invite-qr/{tokenId}`

- 幂等(已撤销/已耗尽再调也返回成功)。
- 发起人可撤销自己的;群主/管理员可撤销本群任意二维码。撤销他人且非群主/管理员 → `403 GROUP_PERMISSION_DENIED`;token 不存在 → `404 GROUP_QR_NOT_FOUND`。

---

## 2. 群二维码 —— 扫码方(尚未入群)

> 扫码方还**不是群成员**,所以这两个接口**不挂在** `/groups/{groupId}` 下,用 token 寻址。

### 2.1 扫码预览 `GET /groups/join-by-qr/{token}/preview`

先拉群信息让用户确认"是不是要加入这个群",再决定是否加入。返回 `GroupInviteQrPreviewDto`:

```json
{
  "conversationId": "019d...",
  "groupTitle": "项目联调群",
  "groupAvatarUrl": "https://.../g.png",
  "memberCount": 12,
  "inviterUserId": "019d...",
  "inviterDisplayName": "张三",
  "expiresAt": "2026-06-13T12:00:00+00:00",
  "requireApproval": false,
  "expired": false,
  "alreadyMember": false
}
```

| 字段 | 说明 |
|---|---|
| `requireApproval` | **true=该群需审批**:`accept` 会落入群申请而非直接进群 |
| `expired` | true=已过期/已撤销/已达上限,客户端应提示"二维码已失效" |
| `alreadyMember` | true=你已是该群成员,客户端可跳过加入步骤 |

token 不存在 → `404 GROUP_QR_NOT_FOUND`。

### 2.2 扫码加入 `POST /groups/join-by-qr/{token}/accept`

请求体(可选):

```json
{ "message": "我是来对接的小李" }
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message` | string? | 否 | **仅当群需审批时**作为入群申请附言;直接进群时忽略 |

返回 `AcceptGroupInviteQrResult`:

```json
{ "conversationId": "019d...", "status": "joined" }
```

| `status` | 含义 |
|---|---|
| `joined` | 群**无需审批** → 已直接进群(同时群内播一条"成员已加入"系统消息) |
| `pending` | 群**需审批**(`requireApproval=true`)→ 已提交入群申请,等群主/管理员在「入群申请」队列审批 |

**错误码**:

| HTTP | code | 场景 |
|---|---|---|
| 410 | `GROUP_QR_REVOKED` | 二维码已被撤销 |
| 409 | `GROUP_QR_EXHAUSTED` | 已达最大使用次数 |
| 410 | `GROUP_QR_EXPIRED` | 已过期 |
| 404 | `GROUP_QR_NOT_FOUND` | token 不存在 |
| 400 | `GROUP_QR_SCANNER_INVALID` | 扫码人不是本租户有效用户 |

> 已是群成员再次扫码 → 直接返回 `{ status: "joined" }`(幂等,不重复计次)。
> 计次是原子的:并发扫码不会超过 `maxUses`;达上限后 token 自动转 `exhausted`。

---

## 3. @所有人(@all)行为变更 —— ⚠️ 重要

### 3.1 wire 约定

`@所有人` 用一个**哨兵 mention** 表达:在 `mentions[]` 里放一条 `userId` 为全零 GUID 的项:

```json
{
  "clientMsgId": "g-001",
  "messageType": "text",
  "body": { "text": "@所有人 集合", "image": null, "video": null, "voice": null, "file": null },
  "mentions": [
    { "userId": "00000000-0000-0000-0000-000000000000", "offset": 0, "length": 4 }
  ]
}
```

### 3.2 服务端强制 `allowMemberAtAll`(新)

发群消息(`POST /groups/{groupId}/messages`)时,若 `mentions[]` 含 @all 哨兵:

- **普通成员**(群角色 member)且群设置 `allowMemberAtAll=false` → **拒绝**,返回 `403 MSG_AT_ALL_NOT_ALLOWED`。
- 群主/管理员 → 始终允许。

> 这是**服务端强制**,不再只靠客户端 UI 拦。即使绕过客户端直接打接口,关掉开关后普通成员也无法 @所有人。请客户端对该 code 给出友好提示。

### 3.3 客户 @所有人 的可见性过滤(新)

群里的可见性规则:**客户(C 端用户)看不到群里的其他客户**,只能看到客服/员工与自己。据此:

- 当**客户**发起 @所有人:服务端把 **TA 看不见的其他客户**从这条消息的实时下发与推送目标中**剔除**——这些客户既不会收到这条 @所有人 的实时帧,也不会收到推送/未读提醒。
- 当**客服/员工/群主/管理员**发起 @所有人:正常通知全员(他们本就能看到完整成员列表),行为不变。

> 注意:这是**通知/下发层面**的剔除(谁会被这条 @all 提醒到),消息本身仍正常落库、正常进群。对绝大多数普通群(无客户身份成员)而言,行为与改动前**完全一致**。

---

## 4. 与既有能力的关系

- **群二维码 vs 入群申请**:二维码是"主动扫码进群"的新入口;群设置 `requireApproval` 决定扫码后是直接进群还是落申请,复用既有「入群申请」审批队列(`GET/POST /groups/{groupId}/join-requests…`),无新增审批接口。
- **群二维码 vs 邀请入群**:邀请(`POST /groups/{groupId}/members`,受 `allowMemberInvite` 约束)是"已有成员把别人拉进来";二维码是"别人自己扫码进来",两条路并存。
- **群二维码 vs 好友二维码**:同一设计范式(服务端只发 token,客户端渲染图片)。差别:群二维码是**租户内**能力(群只属于一个租户、只有同租户用户能加入),好友二维码是跨租户社交图。
