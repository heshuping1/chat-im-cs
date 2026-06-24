# 坐席工作台:客户身份字段 + 访客客户级备注 —— 对接说明

> 版本:2026-06-23 · 适用环境:生产已上线
> 面向:第三方坐席工作台 / 客服客户端开发者
> Base(坐席 client token):`https://chat.hearteasechat.com/api/client/v1`

本文覆盖坐席工作台拿「客户身份」相关字段的三件事:
1. 会话池列表行新增 `customerId` / `customerSignValid` / `visitorRemark`;
2. 新增「访客客户级备注」写入端点;
3. `customerId` / 签名校验的语义说明。

## 1. 会话池列表新增字段

```http
GET /api/client/v1/customer-service/workbench/threads
Authorization: Bearer <坐席 token>
X-Tenant-Id: <tenantId>
```

返回 `data.queueItems[]` / `data.activeItems[]`,每个会话行(`CustomerServiceThreadListItemDto`)新增:

| 字段 | 类型 | 说明 |
|---|---|---|
| `customerId` | string \| null | **业务客户 ID**:Widget 进线时由你方带入的「你方业务系统客户标识」(temp_session.CustomerId)。仅 `temp_session` 渠道有值;`im_direct` 直聊无此概念(用 `customerUserId`)→ `null`。**排队中(未接待)的 temp 卡片此处也为 `null`**(接待中的会话才投影) |
| `customerSignValid` | bool \| null | **customerId 签名核验结果**:`true`=该访客带了 `customerSign` 且验签通过(可信实名客户);`null`=未带签名 / 租户未启用签名 / 无法判定(`im_direct` 恒 `null`) |
| `visitorRemark` | string \| null | **访客客户级备注**(见 §2)。仅 `temp_session` 渠道有;`im_direct` 的客户备注走 IM 客户资料(另一字段)→ `null` |

> 注:这些只是**新增**字段,既有字段(`threadType`/`threadId`/`status`/`customerUserId`/`visitorId`/`assignedStaffUserId`/`sourceChannel`…)不变。

## 2. 访客客户级备注

「客户级备注」= 给**访客这个客户实体**打的、**跨会话持久**的一条备注(不同于"会话备注" `temp_session_notes` —— 那是挂在单次会话上的)。同一访客的多次会话共享同一条客户级备注。

### 2.1 设置 / 清空

```http
PUT /api/client/v1/customer-service/temp-sessions/{sessionId}/visitor-remark
Authorization: Bearer <坐席 token>
X-Tenant-Id: <tenantId>
Content-Type: application/json

{ "remark": "VIP 老客户·谨慎报价" }
```

- 由 `sessionId` 定位到该会话的访客,把备注写到访客资料(跨会话持久)。
- `remark` 传空 / 空白 = **清空**备注。上限 1000 字符。
- 返回:`{ "code":"OK", "data": { "sessionId":"…", "remark":"<归一后的备注>" } }`。

### 2.2 读取

- 会话池列表:`visitorRemark`(§1)。
- 会话详情 `GET …/workbench/threads/temp_session/{threadId}` → `data.tempSession.visitor.remark`。
- 访客资料列表/详情:`TempVisitorListItemDto.remark` / `TempVisitorDetailDto`。
- 管理端统一历史 `GET /api/admin/v1/customer-service/center/history-sessions?customerRemark=<关键字>` 现在也覆盖 Widget 渠道(按访客备注筛+回显),详见 [history-sessions-unified-2026-06-10.md](./history-sessions-unified-2026-06-10.md)。

### 2.3 ⚠️ 谁能被备注:必须有 customerId

**只有「带了 `customerId` 且该 customerId 被认定可信」的访客才能设备注。** 否则返回:

```
409  { "code": "TEMP_VISITOR_REMARK_NO_CUSTOMER_ID" }
```

「可信」的判定与 customerId 签名一致(见 §3):

| 进线情况 | 能否设客户级备注 |
|---|---|
| 带 `customerId` + **正确签名**(或租户未启用签名校验) | ✅ 可备注(归到该实名客户,复访可见) |
| 带 `customerId` + 签名错误 / 未带签名(租户启用了签名) | ❌ 409(此 customerId 不落库,无稳定身份可挂) |
| 纯匿名(根本没带 `customerId`) | ❌ 409 |

> 原因:未验证 / 匿名的访客是一次性临时身份,给它打的备注下次复访也认不回来,因此服务端直接拒绝,避免误导。

## 3. customerId 与签名(`customerSignValid` 的来历)

- `customerId` 是**你方业务系统的客户标识**,由你方在 Widget 进线时带入(URL / SDK / 建会话接口),平台原样存储,不生成。
- 为防「改 URL 冒充他人」,平台用 HMAC 签名(`customerSign`)校验该 `customerId`。**验签通过** → 该访客 `customerSignValid=true`,且其 `customerId` 落库、可续聊、可被备注。
- 签名算法、如何把 `customerId`/`customerSign` 传给挂件,见 [widget-customer-sign-2026-06-21.md](./widget-customer-sign-2026-06-21.md)。
- 已验证(`customerSignValid=true`)与未验证的**同一个** `customerId`,在平台内部是**两个不同的访客实体**,各自的备注互不相通 —— 这正是「未验证不让备注」的设计目的。

## 4. 响应时长(接入 / 首次 / 平均)

坐席端「响应时长」三态取自坐席工作台仪表盘:

```http
GET /api/client/v1/customer-service/temp-sessions/dashboard
Authorization: Bearer <坐席 token>
X-Tenant-Id: <tenantId>
```

`data` 内三个字段(单位:秒,均为平均值,非负):

| 页面标签 | 字段 | 口径 |
|---|---|---|
| 接入 | `avgWaitSeconds` | 客户进线/排队 → 被坐席接起(AssignedAt − QueueEnteredAt) |
| 首次 | `avgFirstResponseSeconds` | 坐席接起 → 首次回复(FirstResponseAt − AssignedAt) |
| 平均 | `avgTotalResponseSeconds` | **端到端**:进线 → 收到第一句回复 = `avgWaitSeconds + avgFirstResponseSeconds` |

> 这三个是**全局平均**(看板顶部 KPI),脏数据行(接起早于进线等负差)已在服务端剔除,不会出现负数。
> **单条会话**的接入/首次/平均(列表每行各自的三个值)在统一历史接口的 item 上:`accessSeconds` / `firstResponseSeconds` / `totalResponseSeconds`,见 [history-sessions-unified-2026-06-10.md](./history-sessions-unified-2026-06-10.md)。

## 5. 权限

上述读端点用坐席(客服)token 即可;写端点(`visitor-remark`)要求坐席身份(与会话备注 `notes` 同一门槛)。
