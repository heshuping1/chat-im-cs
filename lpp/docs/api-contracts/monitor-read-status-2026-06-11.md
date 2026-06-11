# 管理员监控客服会话 —— 已读状态(对方是否读到)对接说明

> 版本:2026-06-11 · 适用环境:生产已上线(tag `prod-20260611-cs-monitor-read-r2`)
> 面向:管理后台 / 客服监控前端开发者
> 一句话:**你们问的"管理员监控在线客服聊天能不能看到已读状态"——现在监控会话详情接口会同时下发双方的已读位置与已读时间(尤其是"客户是否已读了客服的回复")。**

---

## 背景

此前监控详情只带"客服侧已读进度"(会话级 `lastReadSeq` / 未读数),看不到**客户侧是否已读、何时读到第几条**。本次补齐:

- **Widget 临时会话(`temp_session`)**:详情新增 `readStatus`,给出**全员**(客服 + 客户/访客)的已读位置与时间。
- **IM 注册客户直聊(`direct_customer`)**:详情的 `directChat` 新增**客户侧**已读字段。

> 说明:已读时间 `lastReadAt` **只在对方真正上报已读时推进**;为 `null` 表示"该成员从未上报过已读"=未知,不会误报成"已读"。

---

## 一、Widget 临时会话(temp_session)

监控详情(任选其一,返回体里都带 `readStatus`):

```http
# 客服中心监控入口
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/center/threads/temp_session/{threadId}
# 后台临时会话详情入口(admin-web 监控页用的同一份数据)
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/temp-sessions/{sessionId}
Authorization: Bearer <admin token>
X-Tenant-Id: <tenantId>
```

返回体新增字段:`center/threads` 入口在 `data.tempSession.readStatus`;`temp-sessions/{id}` 入口在 `data.readStatus`。结构一致:

```jsonc
"readStatus": {
  "sessionId": "019eb5c2-1fab-7a96-8d0a-42b5441893be",
  "conversationId": "019eb5c2-1fab-7b99-afdf-4f4e1ffb75fe",
  "visitorUserId": "019eb4bf-990c-71b0-9800-cfb7cc80de13",   // ← 客户/访客那一行的 userId
  "members": [
    { "userId": "019da95a-...(客服)", "lastReadSeq": 0, "lastReadAt": null },
    { "userId": "019eb4bf-...(客户)", "lastReadSeq": 1, "lastReadAt": "2026-06-11T08:17:43.566229+00:00" }
  ]
}
```

**怎么判断"客户读到哪了 / 客户是否已读客服最新消息":**

1. 用 `visitorUserId` 在 `members` 里挑出"客户那一行";
2. 该行的 `lastReadSeq` = 客户已读到的消息序号(`conversationSeq`);`lastReadAt` = 客户最后一次上报已读的时间;
3. 把 `lastReadSeq` 与会话里客服最新一条消息的 `conversationSeq` 比较:`客户lastReadSeq >= 该条seq` ⇒ 客户已读该条;否则未读。
4. `members` 里另一行(非 `visitorUserId`)即客服侧已读位置,可同样展示。

> `readStatus` 与客服工作台的 `GET /api/client/v1/customer-service/temp-sessions/{id}/read-status` **同源同口径**(同一 `conversationId`、同一套 members),监控端与工作台端看到的是同一份已读数据。

---

## 二、IM 注册客户直聊(direct_customer)

```http
GET https://admin.hearteasechat.com/api/admin/v1/customer-service/center/threads/direct_customer/{threadId}
Authorization: Bearer <admin token>
X-Tenant-Id: <tenantId>
```

返回体 `data.directChat` 字段(新增的在下半段):

```jsonc
"directChat": {
  "chatId": "...",
  "lastMessageSeq": 42,            // 会话最新消息序号

  // 客服(坐席)侧已读
  "lastReadSeq": 42,               // 坐席读到第几条
  "unreadCount": 0,                // 坐席还有几条未读
  "staffLastReadAt": "2026-06-11T08:10:00+00:00",   // ← 新增:坐席最后已读时间(null=未上报)

  // 客户侧已读(本次新增)——判断"客户是否已读客服回复"
  "customerLastReadSeq": 40,       // ← 客户读到第几条
  "customerLastReadAt": "2026-06-11T08:12:00+00:00", // ← 客户最后已读时间(null=未上报)
  "customerUnreadCount": 2,        // ← 客户还有几条未读(= lastMessageSeq - customerLastReadSeq)

  "messages": [ /* ... */ ]
}
```

**判断"客户是否已读客服最新回复":** `customerLastReadSeq >= 客服最新消息的 conversationSeq`(或直接看 `customerUnreadCount == 0`)。`customerLastReadAt` 给出客户读到的时间点。

> 仅当线程已分配坐席、双方有真实承载会话时才会有 `directChat`;排队中未分配的线程 `directChat` 为 `null`(此时还没有可读的消息流)。

---

## 兼容性 / 注意

- **纯新增字段,不破坏既有结构**:老字段(`lastReadSeq`/`lastMessageSeq`/`unreadCount`)语义不变(仍是客服侧)。没接入新字段的老前端不受影响。
- `*LastReadAt` 为 `null` = 对方从未上报已读 = **未知**,请在 UI 上显示成"未读/未知",不要默认成"已读"。
- 序号口径:`lastReadSeq` / `conversationSeq` 都是**会话内序号**(`conversationSeq`),不是全局 messageId。比较已读用序号,不要用时间。
- 时间为带时区的 ISO8601(UTC,`+00:00`)。

---

## 相关(同批次一并解决的两项,见各自说明)

- 所有者/管理员进**管理后台知识库**、进**客服工作台知识库/历史对话/实时监控**被 403 的问题已修(`prod-20260611-owner-admin-access` 起);"实时监控加载失败:操作过于频繁"即此根因(Owner/Admin 被拦后前端重试触发限流),现 Owner/Admin 可正常打开实时监控只读面。
