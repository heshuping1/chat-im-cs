# 企业的查找 / 加入 / 邀请 —— 边界与权限说明

> 版本:2026-05-31(rev.2) · 适用环境:生产已上线
> 面向:第三方集成开发者
> 一句话:**"搜索""企业码加入""邀请码加入"是三条独立的路,匹配方式和限制各不相同;邀请码的"生成/查看/撤销"是按租户内角色授权的。**

本文回答最近反复被问到的几个问题:

- 为什么有的企业(如 `mouse-corp`)在"查找并加入企业"里搜不到?
- 搜不到是不是只能"盲加"?填错企业码 / 邀请码会不会提示失败?
- `join-by-code` 到底用企业码、企业名称还是邀请码?它是"查询"还是"加入"?
- 怎么实现"输企业码 → 先显示企业信息让用户确认 → 再申请加入"?
- 谁能生成邀请码?客服能不能?

> **rev.2 更新(2026-05-31)**:
> 1. 新增 **`GET /tenants/by-code/{code}`** 企业码预览接口(见第 2.2 节),支持"先查后加",不受 `isListed` 限制。
> 2. 澄清 **`join-by-code` 是"加入动作"不是"查询"**,manual/auto 审批模式返回结构不同(见第 2.3 节)。
> 3. 客服已可生成/管理邀请码(见第 4 节)。

---

## 1. 三条路一张表(最重要,先看这个)

| 你手里的东西 | 形态举例 | 用的接口 | 匹配方式 | 受 `isListed` 限制? |
|---|---|---|---|---|
| **企业名称** | `Mouse 测试企业` | `GET /api/platform/v1/tenants/search?keyword=` | 名称/企业码 **模糊 LIKE** | **是** ✅ |
| **企业码 `tenantCode`** | `mouse-corp` | `POST /api/platform/v1/tenants/join-by-code` | `tenantCode` **精确等值** | **否** ❌ |
| **邀请码 `inviteCode`** | `DFC230E4DBD015E9` | `POST /api/platform/v1/invitations/{code}/accept` | 按邀请码反查所属租户 | **否** ❌ |

**关键结论:**

- **公开搜索框**(`/tenants/search`)是唯一带 `isListed` 过滤的入口。企业若 `isListed=false`(默认值),**无论搜企业名还是企业码都搜不到**,接口返回 `200 []`,前端显示"未找到企业"。
- **企业码加入**和**邀请码加入**是另外两条精确匹配的路,**完全不看 `isListed`**。只要企业处于 `Active` 状态,即使 `isListed=false` 也能加入。
- `join-by-code` 用的是 **`tenantCode`(企业码,如 `mouse-corp`)**,不是企业名称、也不是邀请码。传企业名称进去会 `404 TENANT_NOT_FOUND`。

> `isListed` 在哪改:平台管理后台 → 租户详情 → 编辑基础信息 → "是否展示到无租户页" 改为 "展示,可直接选择申请"。改为展示后,该企业才会出现在公开搜索框里。

---

## 2. 是"盲加"吗? —— 不是,两条路都能先看后加

### 2.1 邀请码:`GET /api/platform/v1/invitations/{code}`

返回 `InvitationPreviewDto`,包含:

| 字段 | 含义 |
|---|---|
| `tenantName` / `logoUrl` / `tenantDescription` / `industry` | 你要加入的企业信息(用于展示确认) |
| `expiresAt` | 邀请码到期时间 |
| `alreadyMember` | 你是否已是该企业成员 |
| `identityMatched` | 该码是否定向到你这个手机号/邮箱(`inviteType=1` 时) |

→ 前端先调预览、展示企业信息让用户确认,再调 `.../accept` 加入。

### 2.2 企业码:`GET /api/platform/v1/tenants/by-code/{code}`(rev.2 新增)

**用途**:输入企业码后,先拉该企业信息让用户确认"这是不是我要加入的企业",确认后再调 `join-by-code` 申请。

- **鉴权**:需 platform token(已登录);
- **匹配**:`tenantCode` **精确等值,大小写不敏感**;
- **不受 `isListed` 限制**(与 `join-by-code` 对齐:能用企业码加入的,就能用企业码预览);
- **只读**,不写库、不创建申请。

返回 `TenantCodePreviewDto`:

| 字段 | 类型 | 含义 |
|---|---|---|
| `tenantId` | guid | 租户 ID |
| `tenantCode` | string | 企业码(规范化后的小写) |
| `tenantName` | string | 企业名(展示用) |
| `logoUrl` | string? | logo |
| `tenantDescription` | string? | 企业简介 |
| `industry` | string? | 行业 |
| `memberCount` | int | 当前活跃成员数 |
| `joinApprovalMode` | string | **`auto`** = 加入即生效;**`manual`** = 加入后需管理员/客服审批 |
| `alreadyMember` | bool | 当前用户是否已是该企业成员(为 true 时前端应把按钮从"申请加入"改成"进入") |

**生产实测样例**(预览 `mouse-corp`,该企业 `isListed=false` 但能正常预览):

```json
GET /api/platform/v1/tenants/by-code/mouse-corp   (Authorization: Bearer <platformToken>)
→ 200
{
  "code": "OK",
  "data": {
    "tenantId": "019da0ce-9cd2-7623-8808-a0ab11da318a",
    "tenantCode": "mouse-corp",
    "tenantName": "Mouse 测试企业",
    "logoUrl": "https://.../media/019e545b-...",
    "tenantDescription": "用于测试各角色场景的企业",
    "industry": null,
    "memberCount": 48,
    "joinApprovalMode": "manual",
    "alreadyMember": false
  }
}
```

错误:企业码不存在/非 Active → `404 TENANT_NOT_FOUND`;企业码留空 → `400 TENANT_CODE_REQUIRED`;无 token → `401`。

### 2.3 ⚠️ 重点:`join-by-code` 是"加入动作",不是"查询"

之前有同学把 `POST /tenants/join-by-code` 当成"查企业"用,看到返回里没有企业名/logo 就以为"企业码查询为空"。**实际上它根本不是查询接口,而且那次调用是成功的。** `join-by-code` 的返回**取决于目标企业的审批模式**:

| 审批模式 | `join-by-code` 的 `data` | 实际发生 |
|---|---|---|
| **`auto` 自动审批** | 一个完整的 `TenantAuthResponse`(含 tenantId/tenantName/accessToken…) | 直接加入,立刻拿到租户 token |
| **`manual` 人工审批** | `{"status":"pending","message":"join request submitted, awaiting approval"}`,**不含企业名/logo** | 只创建一条待审申请,等管理员/客服审批 |

`mouse-corp`、`mcx953141` 等都是 `manual`,所以打 `join-by-code` 会返回 `pending`,`data` 里没有企业信息——**这是正常的,不是"查询为空"**。

**正确用法(推荐流程)**:

```
用户输入企业码
  → GET /tenants/by-code/{code}        ← 拿企业名/logo/审批模式,展示给用户确认(第 2.2 节)
  → 用户点"确认加入"
  → POST /tenants/join-by-code         ← 真正提交(auto=直接进;manual=转待审,返回 pending)
```

这样既不盲加,也不会再误判"查询为空"。

---

## 3. 填错会提示失败吗? —— 会,且都是明确的结构化错误

(以下为生产实测响应)

| 场景 | 接口 | `code` | HTTP |
|---|---|---|---|
| 企业码不存在 / 非 Active | `join-by-code` | `TENANT_NOT_FOUND` | 404 |
| 企业码留空 | `join-by-code` | `TENANT_CODE_REQUIRED` | 400 |
| 已是该企业成员 | `join-by-code` | `TENANT_ALREADY_MEMBER` | 409 |
| 已有待审申请 | `join-by-code` | `TENANT_JOIN_REQUEST_PENDING` | 409 |
| 邀请码不存在 / 被撤销 / 状态异常 | `invitations/{code}` 预览或 accept | `INVITATION_INVALID` | 400 |
| 邀请码已过期 | accept | `INVITATION_EXPIRED` | 400 |
| 邀请码定向到别的手机号/邮箱 | accept | `INVITATION_TARGET_MISMATCH` | 403 |

> **安全设计提示**:邀请码"不存在"和"被撤销"故意都返回同一个 `INVITATION_INVALID`(不区分),用于防止用错误信息探测哪些邀请码真实存在。这是有意为之,不是 bug。

---

## 4. 邀请码谁能生成/管理? —— 租户内角色 ≥ 客服

邀请码的**生成 / 查看 / 撤销**三个操作,都需要操作者在该企业内的**成员角色(membershipRole)**达到门槛。

### 4.1 角色枚举

| 角色 | 值 | 说明 |
|---|---|---|
| Member 普通成员 | 0 | |
| Technical 技术 | 1 | |
| **CustomerService 客服** | **2** | |
| Admin 管理员 | 3 | |
| Owner 所有者 | 4 | |

### 4.2 邀请码管理权限(2026-05-31 更新:已下放给客服)

| 操作 | 接口 | 所需角色 |
|---|---|---|
| 生成邀请码 | `POST /api/client/v1/tenant/invitations` | **≥ 客服(2)** |
| 查看本企业邀请码列表 | `GET /api/client/v1/tenant/invitations` | **≥ 客服(2)** |
| 撤销邀请码 | `DELETE /api/client/v1/tenant/invitations/{id}` | **≥ 客服(2)** |

- ✅ **客服(2)、管理员(3)、所有者(4)** 可以管理邀请码;
- ❌ **技术(1)、普通成员(0)** 不行,会返回 `403 TENANT_PERMISSION_DENIED`("only customer service, admin or owner can manage invitations")。

> **变更说明**:此前邀请码管理要求 ≥ 管理员(3)。自 2026-05-31 起已下放到 ≥ 客服(2),因为客服日常承担拉新/接待职责。技术与普通成员不变,仍无权限。

### 4.3 生成邀请码时可设的参数(`CreateInvitationRequest`)

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `maxUses` | int | 1 | 最大使用次数 |
| `expireHours` | int | 168(7 天) | 有效期(小时) |
| `targetIdentifier` | string? | null | 填手机号/邮箱 → 定向邀请(`inviteType=1`),仅该账号可用;不填 → 通用邀请码(`inviteType=0`) |

> 注意:邀请码在**企业成员客户端 / IM 端**生成(client API,需租户 token),**不是**在平台管理后台(admin-web)。平台管理后台没有"生成邀请码"入口。

---

## 5. 加入企业相关接口的完整权限矩阵

> 角色 = 操作者在**该企业内的成员角色**;✅=允许,❌=拒绝(403),—=不涉及

| 操作 | 接口 | Member(0) | Technical(1) | 客服(2) | Admin(3) | Owner(4) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| 公开搜索企业 | `GET /tenants/search` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **企业码预览**(rev.2) | `GET /tenants/by-code/{code}` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 企业码加入 | `POST /tenants/join-by-code` | ✅¹ | ✅¹ | ✅¹ | ✅¹ | ✅¹ |
| 邀请码预览 | `GET /invitations/{code}` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 邀请码加入 | `POST /invitations/{code}/accept` | ✅¹ | ✅¹ | ✅¹ | ✅¹ | ✅¹ |
| **生成邀请码** | `POST /tenant/invitations` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **查看邀请码列表** | `GET /tenant/invitations` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **撤销邀请码** | `DELETE /tenant/invitations/{id}` | ❌ | ❌ | ✅ | ✅ | ✅ |
| 查看本企业成员 | `GET /tenant/members` | ❌ | ❌ | ❌ | ✅ | ✅ |
| 移除成员 | `DELETE /tenant/members/{userId}` | ❌ | ❌ | ❌ | ✅² | ✅² |
| 修改成员角色 | `PUT /tenant/members/{userId}/role` | ❌ | ❌ | ❌ | ❌ | ✅ |
| 编辑企业基础信息 | `PUT /tenant/info` | ❌ | ❌ | ❌ | ✅ | ✅ |
| 审批入驻申请 | `POST /tenant/join-requests/{id}/approve|reject` | ❌ | ❌ | ❌ | ✅ | ✅ |
| 部门管理 | `.../departments...` | ❌ | ❌ | ❌ | ✅ | ✅ |

¹ 加入类接口对"调用者的角色"无要求(本来就是未加入者在加入);但有前置门槛:企业必须 `Active`、未重复加入、企业绑定模式必须为**关闭**(否则全部 `403 JOIN_DISABLED_IN_BINDING_MODE`)。生产当前绑定模式 = **关**,这三条加入路均可用。
² 仅能移除**角色低于自己**的成员;不能移除同级或更高级成员(`TENANT_CANNOT_REMOVE_HIGHER`)。

> 说明:上表是 **client API(`/api/client/v1`,租户 token)** 的成员角色授权。另有一套**管理后台 / admin-token** 的"权限码(permission code)"体系(如企业群发 `EnterpriseBroadcastSend`),属于不同的授权平面,不在本表范围内,见管理端文档。

---

## 6. 常见排错速查

| 现象 | 多半原因 | 处理 |
|---|---|---|
| 搜索框搜企业名/企业码都"未找到企业" | 企业 `isListed=false`(默认) | 后台改为"展示",或改用企业码/邀请码加入 |
| `join-by-code` 传了企业名称 → 404 | 该接口只认 `tenantCode` 精确值 | 改传企业码(如 `mouse-corp`) |
| 加入接口全部 403 `JOIN_DISABLED_IN_BINDING_MODE` | 企业绑定模式开启了 | 关闭绑定模式,或改用绑定模式下的注册搜索流程 |
| 客服调生成邀请码 403 | 该客服 membershipRole < 2,或部署未到位 | 确认其角色为客服(2)及以上 |
| 邀请码预览/接受总是 `INVITATION_INVALID` | 码错/被撤销/状态异常(故意不区分) | 让管理员/客服重新生成一个 |
