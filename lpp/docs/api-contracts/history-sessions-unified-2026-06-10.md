# 历史对话页面统一查询接口 history-sessions —— 对接说明

> 版本:2026-06-22 · 适用环境:生产已上线
> 面向:管理后台前端开发者
> 一句话:**一个接口完成 时间范围 + 客户 + 坐席 + 状态 + 关键字 + 来源 + 地区 + 对话类别 + 评分 + 有效性(无效对话) + SLA 风险 + 客户备注 的组合筛选,首页同时返回与列表完全同口径的统计 summary。**

## 接口

```http
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/center/history-sessions
Authorization: Bearer <admin token>
X-Tenant-Id: <tenantId>
```

权限:`customer_service.center.view` 或 `customer_service.temp_session.view`(与既有客服中心接口一致)。

定位(与既有接口的分工,均保留不动):

| 场景 | 接口 |
|---|---|
| **历史对话页面:列表 + 搜寻 + 统计** | **本接口(主查询)** |
| 实时工作台(排队/接待中) | `/center/threads` |
| 查看完整对话内容(消息+时间线) | `/center/threads/{threadType}/{threadId}` |
| 聊天详情内搜消息 / 全局消息定位 | `/messages/search` |
| 单客户/单坐席的窄入口 | `/customers/service-history`、`/staff/{id}/service-history` |

列表行的 `threadType` + `threadId` 可直接拼详情接口 URL。

## 查询参数(全部可选,自由组合)

| 参数 | 类型 | 说明 |
|---|---|---|
| `from` / `to` | ISO 时间 | 按会话**创建时间(进线/访问时间)**过滤,`from` 闭、`to` 开。倒置返回 400 `CUSTOMER_SERVICE_HISTORY_RANGE_INVALID` |
| `keyword` | string | **只匹配客户身份字段**:访客名/客户名/外部客户ID/邮箱/手机(Widget 渠道),昵称/登录名/邮箱/手机(IM 渠道)。**不搜消息内容**——消息全文请用 `/messages/search` |
| `threadType` | string | `temp_session` / `im_direct`,缺省两渠道都查。非法值 400 `CUSTOMER_SERVICE_HISTORY_THREAD_TYPE_INVALID` |
| `status` | string | 语义值 `open` / `queued` / `active` / `closed`(按渠道映射,与 service-history 同一套词汇);兼容单个数字状态码(原样套两渠道)。非法值 400 `CUSTOMER_SERVICE_HISTORY_STATUS_INVALID` |
| `customerUserId` | GUID | IM 渠道的客户(租户 User) |
| `visitorUserId` | GUID | Widget 渠道的访客用户 |
| `customerId` | string | Widget 渠道的外部/业务客户 ID(你们系统的 ID) |
| `staffUserId` | GUID | 坐席,**曾参与即算**(当前/最初接待 + 转接历史涉及,与 service-history 同语义) |
| `sourcePlatform` | string | 进线平台(`app`/`h5`/`web`/...) |
| `sourceChannel` | string | 来源渠道标识 |
| `country` / `region` | string | 访客地区。**服务端按客户端 IP 自动解析填充**(ip2region):`country`=国家(如「中国」/「United States」),`region`=「省 市」拼串(如「广东省 广州市」)。IP 解析优先,接入方建会话时显式传的值作为回退;内网/无法解析时 `country` 可能为「本地/内网」或空 |
| `locale` | string | 会话语言 |
| `category` | string | **业务分类**(进线带的自由文本,如 billing/tech,精确匹配)。两渠道通用。注意:与下方质量分级 `conversationCategory` 不是一回事 |
| `conversationCategory` | string | **对话类别(质量分级)**:`only_visit`/`invalid`/`normal`/`good`/`excellent`,逗号分隔可多选(如 `good,excellent`)。判定见下方「对话类别(质量分级)」。非法值 400 `CUSTOMER_SERVICE_HISTORY_CATEGORY_INVALID`。两渠道通用 |
| `minRating` / `maxRating` | 1-5 | 按满意度评分(对话评价)过滤(闭区间,只命中**已评分**会话)。差评/中评/好评分段见下方「对话评价分段」,用这两个参数表达(如好评 `minRating=4`) |
| `minRiskLevel` | 0-2 | SLA 风险下限:`1`=至少"有风险",`2`=只看"已违约" |
| `isValid` | bool | **有效性筛选**。`true`=只看有效对话;`false`=只看无效对话。判定见下方「无效对话定义」。两渠道通用 |
| `customerRemark` | string | **客户备注**模糊匹配,大小写不敏感「包含」。**两渠道都参与**:`im_direct` 走注册用户备注(User.AdminNote),`temp_session` 走访客备注(TempVisitor.Remark,2026-06-23 起)。命中行的 `customerRemark` 字段回显具体备注 |
| `limit` | int | 每页条数,默认 50,上限 200 |
| `cursor` | string | 游标分页,传上一页的 `nextCursor` |
| `includeSummary` | bool | 默认 `true`;只翻页时可设 `false` 省一次聚合 |

### 时间字段语义(对接表格列时对照)

| 页面列 | 字段 | 含义 |
|---|---|---|
| 访问时间 / 进线时间 / 开始时间 | `createdAt` | 客户进线、会话创建的时刻 |
| 对话时间 | `lastMessageAt` | 最后一条消息的时刻(无消息时为 `null`) |
| 会话时长 | `durationSeconds` | `closedAt - createdAt`,**已结束**会话才有 |
| 响应时长·接入 | `accessSeconds` | 被接起耗时 = `acceptedAt - queueEnteredAt`(进线/排队 → 被坐席接起) |
| 响应时长·首次 | `firstResponseSeconds` | 首次响应 = `firstResponseAt - acceptedAt` |
| 响应时长·平均 | `totalResponseSeconds` | 端到端(进线 → 第一句回复)= `accessSeconds + firstResponseSeconds`(严格等于二者之和;接入或首次为 `null` 时也为 `null`) |

> 「响应时长」三态对应列表「接入/首次/平均」三个值,均为**单条会话**的秒数;时间戳缺失或脏行(接起早于进线等负差)记 `null`,不出负数。仪表盘的全局平均三态见 [workbench-customer-fields-2026-06-23.md](./workbench-customer-fields-2026-06-23.md) §4。

### 无效对话定义(`isValid` 判定口径)

**无效对话 = 客户进线后,从头到尾一句话都没说**(双方无实际来回)。例:客户 12:00 进线,一直未发话,到 12:05 自主离开,或 10 分钟后系统超时关闭 —— 判为无效。

- Widget(`temp_session`)渠道:访客消息数为 0 → `isValid=false`。
- IM(`im_direct`)渠道:客户从未发过消息 → `isValid=false`。
- 其余(客户至少发过一条消息)→ `isValid=true`。

> 注:是否有客服/AI 发过开场白**不影响**判定,只看客户是否开口。

### 对话类别(质量分级:仅访问 / 无效 / 一般 / 较好 / 极佳)

每条会话由服务端派生一个**质量分级** `conversationCategory`(互斥、全覆盖),用已有信号(访客是否发话、客服/AI 是否回过、评分)按优先级判定:

| 档(枚举) | 中文 | 判定(从上到下,命中即归档) |
|---|---|---|
| `excellent` | 极佳对话 | 评分 = 5 |
| `good` | 较好对话 | 评分 = 4 |
| `normal` | 一般对话 | 访客**发过话**(有实际来回),且评分 ∈ {无, 1, 2, 3} |
| `invalid` | 无效对话 | 访客**零发话**,但客服或 AI **回过**(招呼了客户没接) |
| `only_visit` | 仅访问 | 访客**零发话**,且客服/AI **也没回过**(纯进来没产生任何对话) |

> 评分优先:有 4/5 分的会话一律归 good/excellent(即使访客零发话)。每条会话只有一个 `conversationCategory`;`conversationCategory` 参数可逗号多选(如 `invalid,only_visit`)。

### 对话评价分段(差评 / 中评 / 好评 / 无评价)

评分字段 `rating` 是 **1–5 整数**;前端「差评/中评/好评」按下表分段,用 `minRating`/`maxRating` 表达:

| 分段 | rating | 筛选写法 |
|---|---|---|
| 差评 | 1–2 | `minRating=1&maxRating=2` |
| 中评 | 3 | `minRating=3&maxRating=3` |
| 好评 | 4–5 | `minRating=4`(或 `&maxRating=5`) |
| 无评价 | 无评分行 | `rating=null`,**不能作筛选值**;前端按响应 `rating==null` 自行归档 |

> 评分筛选只命中**已评分**会话;「无评价」无法用 `minRating/maxRating` 表达。

### 访问轨迹 / 历史轨迹(按访客时间线)

「访问轨迹/历史轨迹」= **同一访客每次会话的开始时间(`createdAt`)作为时间线**。取法:
- 按访客查其全部会话:`GET …/history-sessions?customerId=<业务客户ID>`(或 `?visitorUserId=`),
  返回该访客所有会话,每条带 `createdAt`(进线/开始时间)+ `lastMessageAt` —— 按 `createdAt` 排即「访问轨迹」。
- 或访客详情 `GET /api/admin/v1/customer-service/temp-sessions/visitors/{visitorId}` 的 `sessions[]`(同一访客全部会话)。
- 单次会话展开看完整对话内容:`GET …/temp-sessions/{sessionId}`(`messages[]` 全文 + `events[]` 时间线,含「客人主动发起/超时结束」系统事件)。

> 平台**没有逐页浏览埋点**(不记录"访客浏览了哪些页面"),只有进线来源页 `sourceUrl` + `entryPageTitle`。「访问轨迹」就是上述按会话开始时间的时间线。

### ⚠️ 渠道不对称字段(重要,不是 bug)

两渠道数据模型不同,部分字段只存在于一侧。**带上只属于某一渠道的筛选条件时,另一渠道的行会被整体排除**:

- `customerUserId` 只属于 `im_direct` → 单独使用时结果只含 IM 渠道;
- `visitorUserId` / `customerId` 只属于 `temp_session` → 单独使用时结果只含 Widget 渠道;
- `customerRemark` 两渠道通用(im_direct→User.AdminNote,temp_session→TempVisitor.Remark),不丢任何一边;
- `sourcePlatform` / `country` / `region` 只在 `temp_session` 上有值 → 使用时 `im_direct` 行整体不出现。

`from/to`、`keyword`、`status`、`staffUserId`、`sourceChannel`、`locale`、`category`、`isValid`、评分、风险等其余条件两渠道通用。

## 响应

```jsonc
{
  "code": "OK",
  "data": {
    "items": [
      {
        "threadType": "temp_session",          // temp_session | im_direct
        "threadId": "0197...",
        "status": "closed",                     // 语义值,与 status 筛选同词汇
        "statusCode": 6,                        // 渠道内原始数字码
        "customerUserId": null,                 // im_direct 渠道才有
        "visitorUserId": "0197...",            // temp_session 渠道才有
        "customerId": "ext-10086",             // 你们的外部客户 ID(如有)
        "customerDisplayName": "张三",
        "staffUserId": "0197...",
        "staffDisplayName": "客服小王",
        "createdAt": "2026-06-09T08:00:00Z",    // 访问/进线/开始时间
        "queueEnteredAt": "...", "acceptedAt": "...",
        "firstResponseAt": "...", "closedAt": "...",
        "lastMessageAt": "...",                 // 对话时间(末条消息)
        "firstResponseSeconds": 38,             // 响应时长 = firstResponseAt - acceptedAt
        "durationSeconds": 1520,                // 会话时长 = closedAt - createdAt(已结束才有)
        "transferCount": 0,
        "rating": 5,                            // 满意度/对话评价(未评分为 null)
        "riskLevel": 0,                         // SLA:0 正常 / 1 有风险 / 2 已违约
        "locale": "zh-CN",
        "category": "billing",                  // 业务分类(进线自由文本,无则 null)
        "conversationCategory": "excellent",    // 对话类别·质量分级:only_visit|invalid|normal|good|excellent
        "sourceChannel": "website", "sourcePlatform": "h5",
        "country": "中国", "region": "广东省 广州市", // temp_session 渠道;服务端按 IP 解析(ip2region),接入方传值作回退
        "isValid": true,                        // 有效对话?false = 无效对话(客户零发话)
        "customerRemark": "VIP 大客户"          // 客户备注:im_direct→User.AdminNote;temp→TempVisitor.Remark(未设/无则 null)
      }
    ],
    "nextCursor": "2026-06-09T08:00:00.0000000+00:00|0197abcd...",  // null = 没有更多
    "summary": {                                // 仅首页(无 cursor)返回
      "totalSessions": 1234,
      "avgFirstResponseSeconds": 41,
      "avgDurationSeconds": 980,
      "avgRating": 4.62,
      "ratingCount": 310,
      "sampledSessions": 1234,
      "channelDistribution": [
        { "label": "temp_session", "value": 900 },
        { "label": "im_direct", "value": 334 }
      ],
      "sourcePlatformDistribution": [
        { "label": "h5", "value": 500 }, { "label": "app", "value": 400 }, { "label": "im", "value": 334 }
      ]
    }
  }
}
```

排序固定:`(lastMessageAt ?? createdAt)` 降序(最近活跃在前)。

### summary 口径保证

- `summary` 与 `items` 由**同一组筛选条件**计算——页面上方的统计数字和下方列表永远是同一范围。
- `totalSessions`、`channelDistribution`、`avgRating`、`ratingCount` 是**精确**聚合(数据库端计算)。
- `avgFirstResponseSeconds` / `avgDurationSeconds` / `sourcePlatformDistribution` 在匹配集超大时按**最近样本**计算(每渠道上限 2 万行);`sampledSessions` 报告实际参与样本数,`sampledSessions < totalSessions` 即表示均值是最近样本口径(正常按月/周筛时间范围不会触达)。
- `summary` 只在首页计算;翻页请求(带 `cursor`)`summary` 恒为 `null`,前端缓存首页值即可。

## 典型用法

```http
# 只看无效对话(进线后客户零发话)
GET …/history-sessions?isValid=false

# 某类别 + 时间范围
GET …/history-sessions?category=billing&from=2026-06-01T00:00:00Z&to=2026-07-01T00:00:00Z

# 按客户备注关键字检索(两渠道:im_direct 走 User.AdminNote,temp_session 走 TempVisitor.Remark)
GET …/history-sessions?customerRemark=VIP

# 组合:有效对话 + 高评分 + 某地区
GET …/history-sessions?isValid=true&minRating=4&region=广东
```

## 前端落地建议

1. 页面加载/改筛选条件:不带 `cursor` 调一次 → 渲染 summary + 第一页;
2. 滚动加载:带 `nextCursor` 继续调(可加 `includeSummary=false`);
3. 点击行:用该行 `threadType`+`threadId` 调 `/center/threads/{threadType}/{threadId}` 看完整对话;
4. 详情里搜消息内容:`/messages/search?conversationId=...&keyword=...`。

## 已知边界

- `keyword` / `customerRemark` 按"包含"匹配、大小写不敏感;身份/备注匹配命中数上限 2000 条(用于人名/手机号/客户 ID/备注关键字检索绰绰有余,不适合拿单个字母全库扫)。
- 评分筛选只返回已评分会话;"未评分"不可作为筛选值(如有需要请提需求)。
- `customerRemark` 是客户级、跨会话的持久备注:`im_direct` 取注册用户备注(User.AdminNote),`temp_session` 取访客备注(TempVisitor.Remark)。Widget 访客备注只能给「带 customerId 且签名验证通过」的访客设(纯匿名/未验证访客无 customerId,不可备注),未设则响应 `customerRemark=null`。
- 统计有口径差的旧接口 `temp-sessions/stats`(全租户全历史、仅 Widget 渠道维度)仍在,做"历史对话"页面请一律以本接口的 summary 为准。
