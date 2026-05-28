# 变更通知 — 客服「接待历史」接口（按接待人查）

**发布日期**：2026-05-24
**影响**：新增能力，向后兼容，无破坏性变更。
**面向**：第三方集成方 / 客服工作台开发。

---

## 1. 背景

此前查询客服历史会话只有两条路，都不满足"**看某个客服接待过哪些会话**"：

| 已有接口 | 维度 | 局限 |
|---|---|---|
| `GET /customer-service/customers/service-history` | 按**客户** | 回答"这个客户的历史"，不是"这个客服的历史" |
| 客服工作台 `GET /customer-service/workbench/threads` | 实时 | 只有 `queued` / `active`，**不含已结束历史**，且无分页 |

本次新增**按接待人**聚合的历史接口，补齐这条链路。

---

## 2. 新增接口

### 2.1 客服本人自查（客户端 / im-api）

```
GET https://chat.hearteasechat.com/api/client/v1/customer-service/staff/service-history
Authorization: Bearer {accessToken}     # 租户级 accessToken，调用方须为客服坐席
```

- `staffUserId` **恒为当前登录客服本人**，不接受外部传参 —— 无法越权查他人。
- 主管 / 质检要按任意客服查，用下面的管理端接口。

### 2.2 管理端按指定客服查（im-admin-api）

```
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/center/staff/{staffUserId}/service-history
Authorization: Bearer {adminAccessToken}
```

- 权限：`customer_service.center.view` 或 `customer_service.temp_session.view`。

### 2.3 查询参数（两端一致）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `threadType` | string? | 否 | `temp_session`（访客临时会话）/ `im_direct`（IM 直聊客服）；亦接受别名 `direct`。缺省返回两者 |
| `status` | short? | 否 | 线程状态过滤（见枚举）。缺省返回全部状态（含进行中与已结束） |
| `limit` | int? | 否 | 单页条数，缺省 **50**，上限 **200** |
| `cursor` | string? | 否 | 翻页游标，回传上一页的 `nextCursor`；为 `null` 即到底 |

### 2.4 响应

`data`：`{ items, nextCursor }`。`items` 每项：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` / `direct` |
| `threadId` | GUID | 线程 ID |
| `tenantId` | GUID | 租户 ID |
| `staffUserId` | GUID? | 该线程**当前**归属客服（不一定是被查询的客服，见 §3） |
| `status` | short | 线程状态 |
| `startedAt` / `acceptedAt` / `firstResponseAt` / `closedAt` / `lastMessageAt` | string? | 时间戳（ISO 8601） |
| `riskLevel` | short | 风险等级 |
| `riskReasonsJson` | string? | 风险原因（JSON 字符串，可能为 `null`） |
| `participation` | string | **本次新增**：被查询客服与该线程的关系（见 §3） |

- **排序**：按 `lastMessageAt` 倒序（为空时回退 `createdAt`），最近活跃的会话排最前。
- **分页是稳定的**：过滤、排序、游标三者用同一键，连续翻页**不漏不重**。

---

## 3. 关键语义：「曾参与即算」与 `participation`

"接待过"的判定不是只看当前归属，而是**曾参与即算**：

- `participation = "current_owner"`：被查询客服是该线程的**当前归属 / 初始主接待**。
- `participation = "transferred"`：被查询客服**只出现在转接历史里**（曾是转出方或转入方）。会话后来转交给了别人，但仍计入原客服的接待历史。

> 这样设计的意义：一个会话经过转接后，**原接待客服依然能在自己的历史里看到它**，不会因为转走就"消失"。
> 注意 `staffUserId` 字段反映的是该线程**当前**归属人，可能 ≠ 被查询客服（当 `participation=transferred` 时通常不等）。

---

## 4. E2E 实测 payload（生产，租户 `mcx953141`）

以下为 2026-05-24 在生产环境用测试租户跑通的真实请求/响应，供对接参考。

### 4.1 取 accessToken（客服本人路径）

```bash
# (1) 平台登录
curl -X POST https://chat.hearteasechat.com/api/platform/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"mcx953141csr","password":"<password>","loginType":"lpp_id"}'
# → data.platformToken

# (2) 选租户换 accessToken
curl -X POST https://chat.hearteasechat.com/api/platform/v1/auth/select-tenant \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <platformToken>' \
  -d '{"tenantId":"019da959-fdfc-7b4f-a24c-a7ce485a4132"}'
# → data.accessToken
```

### 4.2 客服本人查接待历史（成功，第一页）

```bash
curl 'https://chat.hearteasechat.com/api/client/v1/customer-service/staff/service-history' \
  -H 'Authorization: Bearer <accessToken>'
```

```jsonc
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "threadType": "temp_session",
        "threadId": "019e5a50-aa99-77f7-af03-2a86c4807da7",
        "tenantId": "019da959-fdfc-7b4f-a24c-a7ce485a4132",
        "staffUserId": "019da95a-086b-79eb-9949-c49d44e840d7",
        "status": 7,
        "startedAt": "2026-05-24T14:08:16.535982+00:00",
        "acceptedAt": "2026-05-24T14:08:16.535982+00:00",
        "firstResponseAt": null,
        "closedAt": "2026-05-24T14:13:22.438331+00:00",
        "lastMessageAt": "2026-05-24T14:08:20.597591+00:00",
        "riskLevel": 0,
        "riskReasonsJson": null,
        "participation": "current_owner"
      }
      // … 共 50 条/页
    ],
    "nextCursor": "2026-05-05T10:49:43.5324200+00:00|019df7c1a820746180d9c3bdf2e8bcf6"
  }
}
```

### 4.3 游标翻页（第一页 → 第二页，无重叠）

```bash
# 第一页
curl '.../staff/service-history?limit=2' -H 'Authorization: Bearer <accessToken>'
# → items[].threadId 前两条: 019e5a50…, 019e5a4a… ; nextCursor 非空

# 第二页：把上一页 nextCursor 做 URL-encode 回传
curl '.../staff/service-history?limit=2&cursor=<URL-encoded nextCursor>' -H 'Authorization: Bearer <accessToken>'
# → items[].threadId: 019e3145…, 019e313e…  (与第一页无重叠)
```

> ⚠️ `nextCursor` 内含 `|` 等字符，作为查询参数回传时**务必 URL-encode**。

### 4.4 频道 / 状态过滤

```bash
curl '.../staff/service-history?threadType=im_direct' …   # → 只返回 im_direct（本客服为 0 条）
curl '.../staff/service-history?threadType=temp_session' … # → 只返回 temp_session
curl '.../staff/service-history?status=7' …               # → 只返回 status=7（超时关闭）
```

### 4.5 管理端按指定客服查（成功）

```bash
curl 'https://admin.hearteasechat.com/api/admin/v1/customer-service/center/staff/019da95a-086b-79eb-9949-c49d44e840d7/service-history?limit=3' \
  -H 'Authorization: Bearer <adminAccessToken>'
# → code=OK, items=3, 与客户端同数据
```

### 4.6 转接语义验证（`participation=transferred`）

一条会话当前归属 A（`019da95a-086b…`），转接历史记录由 B（`019da95a-0a53…`）转出。查 **B** 的接待历史：

```jsonc
{
  "code": "OK",
  "data": {
    "items": [
      {
        "threadType": "temp_session",
        "threadId": "019e5a50-aa99-77f7-af03-2a86c4807da7",
        "staffUserId": "019da95a-086b-79eb-9949-c49d44e840d7",  // 当前归属仍是 A
        "participation": "transferred"                            // B 通过转接历史关联
      }
    ],
    "nextCursor": null
  }
}
```

> B 自己一条会话都不拥有，但因转接历史涉及他，该会话正确出现在 B 的接待历史中，标记 `transferred`。

### 4.7 边界与错误（已验证）

| 场景 | 结果 |
|---|---|
| 客户端 accessToken 调管理端接口 | `HTTP 403`（token 类型 / 权限不符） |
| `staffUserId` 为全零 GUID | `HTTP 400` `CUSTOMER_SERVICE_HISTORY_STAFF_REQUIRED` |
| `threadType` 传非法值 | `HTTP 400` `CUSTOMER_SERVICE_HISTORY_THREAD_TYPE_INVALID` |
| 合法但不存在的 `staffUserId` | `HTTP 200` `{ items: [], nextCursor: null }` |

---

## 5. 线程状态枚举（`status`）

| 值 | temp_session | im_direct |
|---|---|---|
| 1 | queued 排队中 | queued |
| 2 | active 进行中 | active |
| 3 | assisting 协助中 | closed |
| 5 | closed_by_visitor 访客关闭 | — |
| 6 | closed_by_staff 客服关闭 | — |
| 7 | closed_timeout 超时关闭 | — |
| 8 | closed_system 系统关闭 | — |
| 9 | archived 归档 | — |

（完整枚举见 `field-enum-reference.md`。）

---

## 6. 文档位置

- 客户端详述：`client-api.md` §12.11A1b
- 管理端：`admin-api.md` 客服中心段
- 速查表：`client-api-reference.md` / `admin-api-reference.md`
