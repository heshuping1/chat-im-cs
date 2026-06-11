# 历史对话页面统一查询接口 history-sessions —— 对接说明

> 版本:2026-06-10 · 适用环境:生产已上线
> 面向:管理后台前端开发者
> 一句话:**你们提的"缺一个面向页面的统一历史会话查询 read model"已采纳并上线——一个接口完成 时间范围 + 客户 + 坐席 + 状态 + 关键字 + 来源 + 评分 + SLA 风险 的组合筛选,首页同时返回与列表完全同口径的统计 summary。**

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
| `from` / `to` | ISO 时间 | 按会话**创建时间**过滤,`from` 闭、`to` 开。倒置返回 400 `CUSTOMER_SERVICE_HISTORY_RANGE_INVALID` |
| `keyword` | string | **只匹配客户身份字段**:访客名/客户名/外部客户ID/邮箱/手机(Widget 渠道),昵称/登录名/邮箱/手机(IM 渠道)。**不搜消息内容**——消息全文请用 `/messages/search` |
| `threadType` | string | `temp_session` / `im_direct`,缺省两渠道都查。非法值 400 `CUSTOMER_SERVICE_HISTORY_THREAD_TYPE_INVALID` |
| `status` | string | 语义值 `open` / `queued` / `active` / `closed`(按渠道映射,与 service-history 同一套词汇);兼容单个数字状态码(原样套两渠道)。非法值 400 `CUSTOMER_SERVICE_HISTORY_STATUS_INVALID` |
| `customerUserId` | GUID | IM 渠道的客户(租户 User) |
| `visitorUserId` | GUID | Widget 渠道的访客用户 |
| `customerId` | string | Widget 渠道的外部/业务客户 ID(你们系统的 ID) |
| `staffUserId` | GUID | 坐席,**曾参与即算**(当前/最初接待 + 转接历史涉及,与 service-history 同语义) |
| `sourcePlatform` | string | 进线平台(`app`/`h5`/`web`/...) |
| `sourceChannel` | string | 来源渠道标识 |
| `country` / `region` | string | 访客地区 |
| `locale` | string | 会话语言 |
| `minRating` / `maxRating` | 1-5 | 按满意度评分过滤(共享评分表;条件为闭区间,只命中**已评分**会话) |
| `minRiskLevel` | 0-2 | SLA 风险下限:`1`=至少"有风险",`2`=只看"已违约" |
| `limit` | int | 每页条数,默认 50,上限 200 |
| `cursor` | string | 游标分页,传上一页的 `nextCursor` |
| `includeSummary` | bool | 默认 `true`;只翻页时可设 `false` 省一次聚合 |

### ⚠️ 渠道不对称字段(重要,不是 bug)

两渠道数据模型不同,部分字段只存在于一侧。**带上只属于某一渠道的筛选条件时,另一渠道的行会被整体排除**:

- `customerUserId` 只属于 `im_direct` → 单独使用时结果只含 IM 渠道;
- `visitorUserId` / `customerId` 只属于 `temp_session` → 单独使用时结果只含 Widget 渠道;
- `sourcePlatform` / `country` / `region` 只在 `temp_session` 上有值 → 使用时 `im_direct` 行整体不出现。

`from/to`、`keyword`、`status`、`staffUserId`、`sourceChannel`、`locale`、评分、风险等其余条件两渠道通用。

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
        "createdAt": "2026-06-09T08:00:00Z",
        "queueEnteredAt": "...", "acceptedAt": "...",
        "firstResponseAt": "...", "closedAt": "...", "lastMessageAt": "...",
        "firstResponseSeconds": 38,             // 首响 = firstResponseAt - acceptedAt
        "durationSeconds": 1520,                // 时长 = closedAt - createdAt(已结束才有)
        "transferCount": 0,
        "rating": 5,                            // 满意度(未评分为 null)
        "riskLevel": 0,                         // SLA:0 正常 / 1 有风险 / 2 已违约
        "locale": "zh-CN", "category": null,
        "sourceChannel": "website", "sourcePlatform": "h5",
        "country": "CN", "region": "广东"      // temp_session 渠道才有
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

### summary 口径保证(这正是本接口要解决的问题)

- `summary` 与 `items` 由**同一组筛选条件**计算——页面上方的统计数字和下方列表永远是同一范围,不会再出现"统计按全量、列表按筛选"的错位。
- `totalSessions`、`channelDistribution`、`avgRating`、`ratingCount` 是**精确**聚合(数据库端计算)。
- `avgFirstResponseSeconds` / `avgDurationSeconds` / `sourcePlatformDistribution` 在匹配集超大时按**最近样本**计算(每渠道上限 2 万行);`sampledSessions` 报告实际参与样本数,`sampledSessions < totalSessions` 即表示均值是最近样本口径(正常使用按月/周筛时间范围不会触达)。
- `summary` 只在首页计算;翻页请求(带 `cursor`)`summary` 恒为 `null`,前端缓存首页值即可。

## 前端落地建议

1. 页面加载/改筛选条件:不带 `cursor` 调一次 → 渲染 summary + 第一页;
2. 滚动加载:带 `nextCursor` 继续调(可加 `includeSummary=false`,虽然带 cursor 时本来也不算);
3. 点击行:用该行 `threadType`+`threadId` 调 `/center/threads/{threadType}/{threadId}` 看完整对话;
4. 详情里搜消息内容:`/messages/search?conversationId=...&keyword=...`。

## 已知边界

- `keyword` 是客户身份匹配,按"包含"匹配、大小写不敏感;身份匹配命中数上限 2000 人/访客(用于人名/手机号/客户 ID 检索绰绰有余,不适合拿单个字母全库扫)。
- 评分筛选只返回已评分会话;"未评分"不可作为筛选值(如有需要请提需求)。
- 统计有口径差的旧接口 `temp-sessions/stats`(全租户全历史、仅 Widget 渠道维度)仍在,做"历史对话"页面请一律以本接口的 summary 为准。

## 验证状态(2026-06-10)

- 单元测试 13 项:筛选组合/渠道不对称/游标翻页不重不漏/summary 与列表同谓词/语义状态映射/非法入参错误码。
- 生产 E2E:声明式 6 spec + 专用链式探针(全量翻页条数==totalSessions、渠道分布求和==总数、与窄入口 service-history 结果集逐 ID 对齐、非法入参业务错误码),部署前探针对未上线环境实跑 404 全红、部署后全绿。
