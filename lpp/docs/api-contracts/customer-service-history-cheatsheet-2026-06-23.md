# 客服历史/会话 对接速查(2026-06-23)

> 面向:管理后台 / 坐席端 第三方开发者。
> 按「我要做什么 → 调哪个接口 / 看哪个字段」组织;详细契约见各专题文档链接。
> 鉴权:管理端用 admin token + `X-Tenant-Id`;坐席端用 client token。
> **注意:`customerId` 在不同租户间可能重复,所有查询都已限定在租户内,请始终带本租户上下文。**

---

## 1. 历史对话列表(主接口)

```http
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/center/history-sessions
Authorization: Bearer <admin token>
X-Tenant-Id: <tenantId>
```

跨渠道(Widget `temp_session` + IM `im_direct`)统一列表,所有筛选可组合,首页带同口径 `summary`。
完整契约:[history-sessions-unified-2026-06-10.md](./history-sessions-unified-2026-06-10.md)。

### 1.1 我想筛 ___ → 用这个参数

| 我想筛 | 参数 | 取值 |
|---|---|---|
| 时间范围(进线时间) | `from` / `to` | ISO 时间,`from` 闭 `to` 开 |
| 客户身份关键字 | `keyword` | 访客名/客户名/外部客户ID/邮箱/手机(不搜消息内容) |
| 渠道 | `threadType` | `temp_session` / `im_direct` |
| 状态 | `status` | `open`/`queued`/`active`/`closed` |
| 指定客户 | `customerUserId`(IM)/ `visitorUserId`、`customerId`(Widget) | GUID / 业务客户ID |
| 指定坐席(曾参与即算) | `staffUserId` | GUID |
| 来源平台 / 渠道 | `sourcePlatform` / `sourceChannel` | 字符串 |
| 地区 | `country` / `region` | 字符串(服务端 IP 解析,见 §4) |
| 语言 | `locale` | 如 `zh-CN` |
| 业务分类 | `category` | 进线带的自由文本(如 billing) |
| **对话类别(质量分级)** | `conversationCategory` | `only_visit`/`invalid`/`normal`/`good`/`excellent`,逗号多选。见 §2 |
| **对话评价** | `minRating` / `maxRating` | 1-5。差评/中评/好评分段见 §3 |
| **有效性(无效对话)** | `isValid` | `true`=有效 / `false`=无效(访客零发话) |
| SLA 风险下限 | `minRiskLevel` | 0-2 |
| 客户备注 | `customerRemark` | 模糊匹配(两渠道:IM 注册备注 + Widget 访客备注) |
| 分页 | `limit`(默认50,上限200)/ `cursor` | 翻页传上一页 `nextCursor` |

### 1.2 列表行(items[])关键字段

| 字段 | 含义 |
|---|---|
| `threadType` + `threadId` | 拼会话详情 URL |
| `status` / `statusCode` | 语义状态 / 渠道原始码 |
| `customerId` | 业务客户ID(Widget) |
| `customerDisplayName` / `staffDisplayName` | 客户名 / 接待坐席名 |
| `createdAt` | **访问/进线/开始时间** |
| `lastMessageAt` | **对话时间**(末条消息) |
| `durationSeconds` | 会话时长(已结束) |
| `accessSeconds` / `firstResponseSeconds` / `totalResponseSeconds` | **响应时长:接入 / 首次 / 平均**(见 §3) |
| `rating` | 对话评价 1-5(未评 null) |
| `isValid` | 是否有效对话 |
| `conversationCategory` | 对话类别(质量分级) |
| `customerRemark` | 客户备注 |
| `category` | 业务分类 |
| `country` / `region` | 地区(IP 解析) |
| `riskLevel` | SLA 风险 0/1/2 |

---

## 2. 对话类别(质量分级:仅访问 / 无效 / 一般 / 较好 / 极佳)

每条会话由服务端自动派生 `conversationCategory`(互斥、全覆盖),也可作筛选(逗号多选)。

| 枚举 | 中文 | 判定(评分优先,从上到下命中即归档) |
|---|---|---|
| `excellent` | 极佳对话 | 评分 = 5 |
| `good` | 较好对话 | 评分 = 4 |
| `normal` | 一般对话 | 访客发过话(有来回),且无评分或评分≤3 |
| `invalid` | 无效对话 | 访客零发话,但客服/AI 招呼过 |
| `only_visit` | 仅访问 | 访客零发话,且没人招呼 |

```http
# 只看较好+极佳
GET …/history-sessions?conversationCategory=good,excellent
# 只看无效+仅访问
GET …/history-sessions?conversationCategory=invalid,only_visit
```

> 与业务分类 `category`(billing/tech 自由文本)**不是一回事**。非法值返回 400 `CUSTOMER_SERVICE_HISTORY_CATEGORY_INVALID`。

---

## 3. 评价分段 & 响应时长

### 对话评价分段

| 分段 | rating | 筛选写法 |
|---|---|---|
| 差评 | 1–2 | `minRating=1&maxRating=2` |
| 中评 | 3 | `minRating=3&maxRating=3` |
| 好评 | 4–5 | `minRating=4` |
| 无评价 | 无评分(`rating=null`) | 不能作筛选值,按响应 `rating==null` 归档 |

### 响应时长三态(单条会话,列表每行各带,单位秒)

| 列 | 字段 | 口径 |
|---|---|---|
| 接入 | `accessSeconds` | 进线/排队 → 被坐席接起 |
| 首次 | `firstResponseSeconds` | 接起 → 首次回复 |
| 平均 | `totalResponseSeconds` | 接入 + 首次(端到端:进线 → 第一句回复) |

> 脏数据(接起早于进线)记 `null`,不出负数。**坐席仪表盘的全局平均**三态(`avgWaitSeconds`/`avgFirstResponseSeconds`/`avgTotalResponseSeconds`)见 §6。

---

## 4. 地区(country / region)

**服务端按客户端 IP 自动解析**(无需你方传、无需码表):
- `country` = 国家(如「中国」/「United States」)
- `region` = 「省 市」(如「广东省 广州市」)

IP 解析优先;你方建会话时显式传的值作回退;内网/解析不出时 `country` 可能为「本地/内网」或空。

---

## 5. 访客维度:信息 / 历史会话 / 访问轨迹 / 看对话内容

| 我要看 | 接口 |
|---|---|
| 访客**信息 + 全部历史会话列表** | `GET /api/admin/v1/customer-service/temp-sessions/visitors/{visitorId}` → 资料 + `sessions[]` |
| 同一访客的会话(跨会话查) | `GET …/history-sessions?customerId=<业务客户ID>`(或 `?visitorUserId=`) |
| **访问轨迹 / 历史轨迹** | 上面 `sessions[]`(或 history items)按 `createdAt` 排 = 该访客每次会话开始时间的时间线 |
| 单次会话**完整对话内容** | `GET /api/admin/v1/customer-service/temp-sessions/{sessionId}` → `messages[]` 全文 + `events[]` 时间线(含「客人主动发起/超时结束」系统事件) |

> 平台无逐页浏览埋点(不记录访客浏览了哪些页面);「访问轨迹」即上述按会话开始时间的时间线。
> `visitorUserId` 是平台给访客建的**用户 GUID**,不是设备 ID;设备维度是 `fingerprint`。

---

## 6. 坐席工作台(client token)

会话池列表 `GET /api/client/v1/customer-service/workbench/threads` 每行带:
- `customerId`(业务客户ID,接待中的 Widget 会话才有)
- `customerSignValid`(customerId 签名是否验证通过;未签名/IM=null)
- `visitorRemark`(访客客户级备注)

**访客客户级备注**(跨会话持久):
```http
PUT /api/client/v1/customer-service/temp-sessions/{sessionId}/visitor-remark
{ "remark": "VIP 老客户·谨慎报价" }   # 空=清空;仅对带 customerId 的可信访客可设,否则 409
```

**仪表盘全局平均响应时长**:`GET /api/client/v1/customer-service/temp-sessions/dashboard` →
`avgWaitSeconds`(接入)/ `avgFirstResponseSeconds`(首次)/ `avgTotalResponseSeconds`(平均)。

详见 [workbench-customer-fields-2026-06-23.md](./workbench-customer-fields-2026-06-23.md)、
customerId 签名见 [widget-customer-sign-2026-06-21.md](./widget-customer-sign-2026-06-21.md)。

---

## 接口分工速记

| 场景 | 接口 |
|---|---|
| 历史对话列表 + 搜寻 + 统计 | `…/center/history-sessions`(主) |
| 访客信息 + 其历史会话 | `…/temp-sessions/visitors/{visitorId}` |
| 单次会话完整对话内容 | `…/temp-sessions/{sessionId}` |
| 实时工作台会话池(坐席) | `…/client/v1/customer-service/workbench/threads` |
| 消息全文搜索 | `…/messages/search` |
