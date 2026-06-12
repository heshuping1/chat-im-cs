# 在线客服八项能力 —— 使用与对接说明

> 版本:2026-06-10 · 适用环境:生产已上线
> 面向:产品经理 + APP/前端开发者
> 一句话:**你们提的 8 项需求,5 项平台原本就有(本文教你怎么接),3 项缺口(输入预览 / 静默撤回 / 已读时间)+ 若干半缺口(temp 渠道坐席转接、超时后续聊豁免、客服报表导出)已于 2026-06-10 全部补齐并上线。**

## 域名与鉴权速查

| 调用方 | 域名 | 路径前缀 | 鉴权 |
|---|---|---|---|
| APP / 客服端(已登录用户) | `chat.hearteasechat.com` | `/api/client/v1` | `Authorization: Bearer <client token>` + `X-Tenant-Code` |
| 网页访客 Widget(匿名客户) | `chat.hearteasechat.com` | `/api/widget/v1` | `Authorization: Bearer <visitorToken>` + `X-Tenant-Code` |
| 管理后台(主管/管理员) | `admin.hearteasechat.com` | `/api/admin/v1` | `Authorization: Bearer <admin token>` + `X-Tenant-Id` |
| 实时推送(客服/客户 APP) | `chat.hearteasechat.com` | `/ws/client` | SignalR WebSocket,client token |
| 实时推送(网页访客) | `chat.hearteasechat.com` | `/ws/widget` | SignalR WebSocket,visitorToken |

所有 REST 返回统一信封 `{ code, message, data }`,`code === "OK"` 为成功。
所有 WS 帧统一信封 `{ event, traceId, sentAt, data }`,**业务字段都在 `data` 里**;客户端请忽略未识别字段(向后兼容约定)。

两条客服渠道的术语对照(全文通用):

| 渠道 | 会话对象 | threadType | 客户端 |
|---|---|---|---|
| 网页 Widget 匿名访客 | temp_session(临时会话) | `temp_session` | 访客网页 |
| IM 注册用户直聊客服 | 客服直聊线程 | `im_direct` | APP |

---

## 1. 历史对话(含统计与搜寻)— ✅ 原有,直接对接

### 1.1 历史会话列表与搜寻(管理后台)

> **🆕 2026-06-10:新增"历史对话"页面专用统一查询接口**
> `GET /api/admin/v1/customer-service/center/history-sessions`
> 一个接口完成 **时间范围 + 客户 + 坐席 + 状态 + 关键字 + 来源 + 评分 + SLA 风险** 的组合筛选,跨渠道单列表 + 游标分页,**首页附带与列表同口径的统计 summary**(总数/首响均值/时长均值/满意度/渠道分布)。做"历史对话(含统计与搜寻)"页面请直接以它为主查询,详见专项文档 **[history-sessions-unified-2026-06-10.md](history-sessions-unified-2026-06-10.md)**。下列窄入口接口全部保留,适合单客户/单坐席钻取场景。

- **跨渠道统一列表** `GET /api/admin/v1/customer-service/center/threads`
  查询参数:`keyword`(关键字)、`threadType`(`temp_session`/`im_direct`)、`status`(仅 `queued`/`active`——此接口是工作台**实时视图**,响应只有排队/接待中两组,不含已结束;查已结束历史请用下方 service-history)、`assignedStaffUserId`(按坐席)、`locale`。
- **按客户查历史** `GET /api/admin/v1/customer-service/center/customers/service-history`
  查询参数:`customerUserId` 或 `visitorUserId` 或 `customerId`(你们外部系统的客户 ID)、`limit`、`cursor`(游标分页,响应 `{ items, nextCursor }`)。
- **按坐席查历史(曾参与即算,含已转接出去的)** `GET /api/admin/v1/customer-service/center/staff/{staffUserId}/service-history`
  查询参数:`threadType`、`status`(语义值 `open`/`queued`/`active`/`closed`,按渠道映射;也兼容单个数字状态码,原样套两渠道)、`limit`、`cursor`。
  > **2026-06-10 修正**:此前 `status` 只收数字状态码,传 `closed` 会得到 HTTP 400(参数绑定失败,无业务错误码)。且两渠道数字状态空间互相冲突(temp_session 的已结束=5/6/7/8/9,im_direct 的已结束=3,而 3 在 temp_session 里是"协助中"),单个数字本就表达不了跨渠道"已结束"。现已支持上述语义值;非法值返回 400 `CUSTOMER_SERVICE_HISTORY_STATUS_INVALID`。
- **查看完整对话内容** `GET /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}`
  返回会话详情 + 消息记录 + 时间线事件(转接/关闭/评分等)+ AI 命中信息。
- **按消息内容全文搜寻(时间范围/发送人/会话)** `GET /api/admin/v1/messages/search`
  查询参数:`keyword`、`conversationId`、`senderUserId`、`from`、`to`(ISO 时间)。

客服自己的端上(APP)同源能力:
`GET /api/client/v1/customer-service/staff/service-history`(我的接待历史,`status` 参数同上支持 `open`/`queued`/`active`/`closed` 语义值)、
`GET /api/client/v1/customer-service/customers/service-history`(按客户)。

### 1.2 统计(总量/时长/满意度/地区/来源)

- `GET /api/admin/v1/customer-service/temp-sessions/stats` — 总量、状态分布、**满意度评分**(共享评分表,跨渠道)、平均处理时长、**坐席效能 staffPerformance**(合并 + `byChannel` 下钻 widget/im_direct)。
- `GET /api/admin/v1/customer-service/temp-sessions/dashboard` — 实时大盘(排队数/接待中/今日量等)。
- 地区(`country`/`region`)与来源(`sourcePlatform`/`sourceChannel`/UTM)在会话明细与导出报表中逐行可得(见 §4.2)。

> 注意:坐席效能是 Worker 分钟级离线聚合,**不是实时查询**;刚部署/刚产生的会话要等聚合周期跑过才进统计。

### 1.3 报表汇出 — 🆕 2026-06-10 新增导出类型

异步导出三件套(原有机制):

```
POST /api/admin/v1/export-tasks          { "exportType": "...", "filters": { ... } }
GET  /api/admin/v1/export-tasks          → 任务列表(含状态)
GET  /api/admin/v1/export-tasks/{taskId}/download   → CSV 文件
```

| exportType | 内容 | filters |
|---|---|---|
| `cs_sessions` 🆕 | 跨渠道历史会话明细:threadType、客户、坐席、状态、locale、来源(source_channel/source_platform)、**地区(country/region)**、创建/接入/关闭时间、**首响秒数**、**会话时长秒数**、转接次数、消息数、**满意度评分** | `from`/`to`(ISO 日期,按创建时间) |
| `cs_staff_daily_stats` 🆕 | 坐席×渠道日统计直出:接待量、转接量、首响均值、时长均值、评分均值、质检三档、消息量、在线时长 | `from`/`to`(按统计日) |
| `messages` / `users` / `audit_logs` 等 | 原有 | 见 admin-api 文档 |

---

## 2. 转接对话给另一位客服 — ✅ IM 原有 + 🆕 temp 渠道坐席侧补齐

### 2.1 IM 直聊渠道(原有)

```
POST /api/client/v1/customer-service/im-direct/{threadId}/transfer
{ "toStaffUserId": "<目标坐席 userId>", "reason": "客户要求粤语客服" }
```

🆕 2026-06-10 起,转接成功后服务端额外定向推送实时事件 **`customer_service.thread.transferred`**(/ws/client):

- **被转接坐席**收到一帧(`data.recipientRole = "staff"`):弹通知 + 凭 `threadId` 拉会话详情即可**预览完整对话记录**;
- **客户**收到一帧(`data.recipientRole = "customer"`):APP 据此渲染礼貌提示语(如"已为您转接专属客服,请稍候")。
  `data` 字段:`threadId, conversationId, customerUserId, fromStaffUserId, toStaffUserId, reason, transferredAt, recipientRole`。

### 2.2 temp_session(Widget)渠道 — 🆕 坐席侧转接端点

此前 widget 渠道只有管理员改派(center/threads/{}/assign),坐席自己不能转。现已补齐:

```
POST /api/client/v1/customer-service/temp-sessions/{sessionId}/transfer
{ "toStaffUserId": "<目标坐席 userId>", "reason": "需要二线技术支持" }
```

- **谁能调**:当前接待坐席本人(非 owner 调用返回 `403 TEMP_SESSION_TRANSFER_FORBIDDEN`)。
- **目标坐席要求**:必须是客服角色(membershipRole=customer_service)的在职成员,否则 `404 TEMP_SESSION_STAFF_NOT_FOUND`。
- **转接备注**:`reason` 写入跨渠道共享转接历史表(质检/接待历史可追溯);两渠道的转接历史都在会话详情时间线里可见。
- **客户礼貌提示**:服务端自动在会话里落一条系统消息「您的会话已转接至客服 X,将继续为您服务,请稍候。」,访客历史与实时(`msg.new`)都能看到,**前端无需自己拼提示**。
- **被转接方通知**:目标坐席转接瞬间即成为会话成员,/ws/client 收到 `temp_session.assigned` 与 `temp_session.transferred` 两帧;其工作台列表(`GET /customer-service/temp-sessions/mine`)立即出现该会话,可预览全部历史消息。
- 双方坐席负载计数自动重算。

---

## 3. 实时监控客服对话 — ✅ 原有,对接方式如下

主管/管理员后台:

1. **列表筛选**:`GET /api/admin/v1/customer-service/center/threads?status=active&assignedStaffUserId=...&threadType=...` — 按坐席、状态、渠道筛进行中的会话。
2. **同步查看内容**:`GET .../center/threads/{threadType}/{threadId}` 返回完整消息流;多窗口并排 = 前端同时打开多个详情(接口无并发限制,列表/详情都是毫秒级)。建议 3~5 秒轮询刷新详情,或订阅 /ws/admin 的 `customer_service.*` 状态事件做"何时该刷新"的信号。
3. **即时介入**:
   - 改派:`POST .../center/threads/{threadType}/{threadId}/assign`
   - 强制关闭:`POST .../force-close`
   - 冻结/解冻(双方禁言保留历史):`POST .../freeze`、`POST .../unfreeze`
   - 主管直接插话(管理员介入,消息带 `manager_intervention` 标识):`POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`
4. **坐席状态墙**:`GET .../center/staff-statuses`(在线/忙碌/小休/离线、并发负载、最近设备 IP)。
5. SLA 风险大盘:`GET .../center/sla/dashboard`(即将超时/已违约会话,适合做"需要介入"的提醒源)。

---

## 4. 统计对话(多维仪表板)— ✅ 原有 + 🆕 导出

- 大盘与多维统计接口见 §1.2;自定义日期范围的明细分析建议直接用 🆕 `cs_sessions` 导出(逐行带渠道/坐席/来源/地区/时长/评分,BI 想怎么切就怎么切)。
- 坐席接待数量与效率(含**平均首次回复时长** avg_first_response_seconds):`stats` 接口的 `staffPerformance`(支持渠道下钻),或 🆕 `cs_staff_daily_stats` 导出按日取数。
- 对话来源渠道分布:`stats` 内置按 `sourcePlatform` 的分布;明细在 `cs_sessions` 导出。

---

## 5. 查看客户正在输入的文字(未发送)— 🆕 全新能力

**机制**:输入预览是**瞬时信号**(不落库、不进消息历史、Redis 抖动时静默丢弃),发送端按"击键节流"上报,接收端收 WS 帧即时渲染、收到 `isTyping=false` 或超时(建议 5 秒)即清除。**预览内容服务端截断 500 字符。**

### 5.1 Widget 渠道(访客 → 客服,双向)

访客端(网页 widget)在输入框 onChange 时节流上报(建议 ≥500ms/次):

```
POST /api/widget/v1/sessions/{sessionId}/typing      (visitorToken)
{ "preview": "我想问一下退款流程,订单号是…" }        // 空 body 或 preview=null 表示停止输入
```

客服端 /ws/client 收帧 **`temp_session.typing`**:

```json
{ "event": "temp_session.typing", "data": {
    "sessionId": "…", "conversationId": "…",
    "senderUserId": "…", "senderType": "visitor",
    "preview": "我想问一下退款流程,订单号是…", "isTyping": true, "at": "2026-06-10T09:00:00Z" } }
```

反向(客服正在输入,给访客看"对方正在输入"):
`POST /api/client/v1/customer-service/temp-sessions/{sessionId}/typing`,访客 /ws/widget 收同名帧(`senderType:"staff"`)。给客户的展示**建议只显示"正在输入…"指示器,不要把客服的草稿内容显示给客户**(帧里有内容,展示策略由前端决定)。

### 5.2 IM 直聊渠道

```
POST /api/client/v1/direct-chats/{chatId}/typing
{ "preview": "这句话还没发出去" }                      // 空 body = 停止输入
```

对端 /ws/client 收帧 **`msg.typing`**,`data` 字段:`conversationId, senderUserId, preview, isTyping, at`。

> 隐私提示:输入预览会把客户未发送内容暴露给客服,属于你们明确要的产品决策;请在客户端隐私条款里覆盖。

---

## 6. 客户是否已读及已读时间 — 🆕 已读时间补齐

「已读位置」原本就有(readSeq),本次补上了**可信的已读时间**(`lastReadAt`,只在客户上报已读时推进,不会被置顶/免打扰等无关操作刷新)。

### 6.1 Widget 渠道

1. **访客标已读**(访客端在消息可见时上报):
   ```
   POST /api/widget/v1/sessions/{sessionId}/read     (visitorToken)
   { "readSeq": 42 }          // 已读到的 conversationSeq
   ```
2. **客服端实时收已读**(/ws/client 帧 `msg.read`,🆕 带 `readAt`):
   ```json
   { "event": "msg.read", "data": {
       "conversationId": "…", "userId": "<visitorUserId>", "readSeq": 42,
       "readAt": "2026-06-10T09:01:23Z" } }
   ```
3. **客服端拉取已读状态**(打开会话时初始化):
   ```
   GET /api/client/v1/customer-service/temp-sessions/{sessionId}/read-status
   → { "sessionId": "…", "conversationId": "…", "visitorUserId": "…",
       "members": [ { "userId": "…", "lastReadSeq": 42, "lastReadAt": "…" }, … ] }
   ```
   用 `visitorUserId` 挑出客户那一行;**每条客服消息的"已读/未读"= `消息.conversationSeq <= 客户.lastReadSeq`,已读时间 = `lastReadAt`**。

### 6.2 IM 直聊渠道

- 标已读(原有):`POST /api/client/v1/direct-chats/{chatId}/read { "readSeq": n }`
- 查对方已读:`GET /api/client/v1/direct-chats/{chatId}/read-status`
  → `{ "peerLastReadSeq": 42, "peerLastReadAt": "2026-06-10T09:01:23Z" }`(🆕 `peerLastReadAt` 从本次起为真实已读时间;**历史老会话从未上报过已读的为 null**,请按"未知"渲染,不要当 1970)。
- 实时:同 `msg.read` 帧(🆕 带 `readAt`)。
- 群聊已读回执 `GET /groups/{groupId}/read-receipts` 每个成员也新增 `lastReadAt`(尾部追加字段,老客户端不受影响)。

---

## 7. 客服撤回已发送信息(客户端不可见)— 🆕 静默撤回

```
POST /api/client/v1/messages/{messageId}/recall-silent
```

- **效果**:该消息在**所有端**(尤其客户端)的历史/同步/会话回放里**整行消失**,不显示任何"消息已撤回"占位;实时帧 `msg.recalled` 带 `silent: true`,客户端收到后**直接移除气泡,不渲染任何提示**:
  ```json
  { "event": "msg.recalled", "data": {
      "messageId": "…", "conversationId": "…", "conversationSeq": 7,
      "operatorUserId": "…", "silent": true } }
  ```
- **范围限制(产品红线)**:只允许在**客服会话**里用(widget 临时会话、IM 客服直聊线程);在普通单聊/群聊调用返回 `400 SILENT_RECALL_NOT_ALLOWED` —— 普通聊天对端有权知道消息被撤回。
- **谁能调**:消息发送者本人;或持 `message.recall_any` 权限的管理角色。
- 无时间窗限制(撤回任意时刻的自己消息)。
- 旧端点 `POST /messages/{messageId}/recall` 行为不变(普通撤回,显示"[消息已撤回]"占位,`silent:false`)。
- **客户端必须实现**:收到 `msg.recalled` 且 `silent===true` 时静默移除本地消息(含通知栏摘要的撤回);`silent===false` 时维持现有"已撤回"占位逻辑。
- 审计:静默撤回在服务端日志/管理端消息检索中仍可追溯(管理员视角不受"客户端不可见"影响)。

> 顺带修复:widget 历史回放此前对"普通撤回"的消息会返回原文(刷新页面又能看到被撤回内容),现已统一为占位 / 整行消失。

---

## 8. 客户超时关闭对话后可继续对话 — ✅ 原有 + 🆕 关键豁免修复

入口(原有):

```
POST /api/widget/v1/sessions/{sessionId}/reopen      (visitorToken)
→ { "sessionId": "…", "visitorToken": "<新 token,必须替换本地存储>" }
```

- 重开后:有 AI 则直接 AI 接待(active),否则重新排队(queued);**先前对话记录完整保留**(同一会话同一消息流)。
- 🆕 **修复**:此前"超时自动关闭/客服关闭"会使访客手里的旧 token 立即失效(token 版本+1),访客点"继续对话"必 401 —— 也就是需求描述的核心场景反而走不通。现 `reopen`(与 `rate` 评价一样)豁免 token 版本校验:JWT 签名/有效期/会话归属照常强校验,重开成功立刻签发新 token,旧 token 随即再次失效。
- **前端流程建议**:会话被关(收到 `temp_session.closed` 帧或接口报会话已结束)→ 展示「继续对话」按钮 + 服务评价;点继续 → 调 `reopen` → 用返回的新 `visitorToken` 覆盖本地 → 重连 /ws/widget → 正常收发。
- 若访客 JWT 本身已过期(超出令牌有效期),走 `POST /api/widget/v1/{tenantCode}/sessions` 重新进线:同一访客指纹/customerId 会复用访客身份,客服侧客户画像与历史会话(§1.1 按客户查)完整连续,但消息流是新会话。

附:服务评价(截图里那个弹窗)`POST /api/widget/v1/sessions/{sessionId}/rate { rating, tags, comment }` —— 🆕 修复了**带标签提交必报 "database operation failed"** 的线上 bug(评分表 tags_json 列 jsonb/text 类型失配,2026-06-10 已修);不带标签的评分一直正常,数据无损。

---

## 实时帧清单(本次相关)

| 帧 | 通道 | 何时 | 关键字段 |
|---|---|---|---|
| `temp_session.typing` 🆕 | /ws/client + /ws/widget | 对方正在输入(widget 渠道) | `preview, isTyping, senderType, sessionId` |
| `msg.typing` 🆕 | /ws/client | 对方正在输入(IM 直聊) | `preview, isTyping, conversationId, senderUserId` |
| `msg.read` | /ws/client + /ws/widget | 对方上报已读 | `readSeq`, 🆕 `readAt` |
| `msg.recalled` | /ws/client + /ws/widget | 消息被撤回 | `messageId`, 🆕 `silent` |
| `temp_session.transferred` 🆕 | /ws/client + /ws/widget | widget 会话被转接 | `fromStaffUserId, toStaffUserId, reason` |
| `customer_service.thread.transferred` 🆕 | /ws/client(定向) | IM 直聊被转接(新坐席+客户各一帧) | `threadId, recipientRole, reason` |
| `temp_session.assigned` / `temp_session.closed` | 同上 | 会话被分配/关闭(原有) | `sessionId, staffUserId` / `reasonCode` |

## 兼容性与上线说明

- 全部为**新增端点/新增字段**:`msg.read` 加 `readAt`、`msg.recalled` 加 `silent`、读回执 DTO 尾部加 `lastReadAt`,旧客户端忽略未知字段即可,无破坏性变更。
- 数据库:`conversation_members` 新增 `last_read_at` 列(migration `20260610_01`),老数据为 null(语义=从未上报已读)。
- 服务端验证:单元测试 682/682 绿;生产全链路探针 `e2e/ws-probe/cs-experience-probe.mjs`(输入预览双向/已读时间/静默撤回/转接/续聊/带标签评分)上线后实测通过,逐项结果见探针 transcript。
