# 客服配置(开场白/自动发话/快捷回复)+ 会话备注 + 复访续聊 —— 接口与对接说明

> 版本:2026-06-10(第二批) · 适用环境:生产已上线
> 面向:产品经理 + APP/前端开发者
> 一句话:**「管理端配置开场白/自动发话」「客服工作台备注访客」「同一访客复访看到上次对话」三项缺口已补齐上线;快捷回复的管理端接口本来就有(本文列全)。**

域名/鉴权约定与上一篇([customer-service-suite-2026-06-10.md](customer-service-suite-2026-06-10.md))一致:
管理端 `admin.hearteasechat.com` + `X-Tenant-Id`;客服端 `chat.hearteasechat.com/api/client/v1` + `X-Tenant-Code`;访客 Widget `chat.hearteasechat.com/api/widget/v1` + `X-Tenant-Code`。返回统一信封 `{ code, message, data }`。

---

## 1. 管理端配置:开场白 / 自动发话 / 快捷回复

### 1.1 开场白与自动发话(auto-replies)— 🆕 本次补齐写接口

此前只有查询接口,文案永远是系统默认("您好,欢迎咨询在线客服。"),管理账号无从配置 —— 即你们反馈的问题。现在完整 CRUD:

```
GET    /api/admin/v1/customer-service/temp-sessions/auto-replies            列表
POST   /api/admin/v1/customer-service/temp-sessions/auto-replies            新建
PUT    /api/admin/v1/customer-service/temp-sessions/auto-replies/{ruleId}   更新
DELETE /api/admin/v1/customer-service/temp-sessions/auto-replies/{ruleId}   删除
```

请求体(POST/PUT 同构):

```json
{
  "ruleType": 0,
  "content": "您好,欢迎咨询 XX 官方客服,工作时间 9:00-21:00。",
  "locale": "zh-CN",
  "keywordPattern": null,
  "skillGroupId": null,
  "category": null,
  "sortOrder": 0,
  "isEnabled": true
}
```

| 字段 | 说明 |
|---|---|
| `ruleType` | **0 = 开场白**(访客进线自动发送);**1 = 关键词自动回复**(访客消息命中 `keywordPattern` 即自动发 `content`,即"自动发话");**2 = 排队提示**(进入排队时发送)。其他值返回 `AUTO_REPLY_RULE_TYPE_INVALID` |
| `content` | 必填,≤2000 字符 |
| `locale` | 可选;空 = `*`(全语言)。同 ruleType 多条规则按 locale 精确命中优先、再按 `sortOrder` 取第一条 |
| `keywordPattern` | `ruleType=1` 必填(包含匹配,大小写不敏感),否则 `AUTO_REPLY_KEYWORD_REQUIRED` |
| `category` / `skillGroupId` | 可选,限定只对某分类/技能组的会话生效;空 = 不限定 |
| `isEnabled` | 停用规则不删数据 |

生效方式:**即改即生效**,新进线会话立刻使用新文案(无缓存延迟)。所有写操作进审计日志。

> AI 客服的问候语/免责声明是另一套(AI 人设的一部分),在临时会话总配置里:
> `GET/PUT /api/admin/v1/customer-service/temp-sessions/config`(`ai.greetingMessages` / `ai.disclaimerMessages` / `ai.autoGreetEnabled` 等字段)。

### 1.2 快捷回复 — ✅ 接口早已齐全(直接对接)

```
GET    /api/admin/v1/customer-service/quick-replies?scope=&includeDisabled=true
POST   /api/admin/v1/customer-service/quick-replies
PUT    /api/admin/v1/customer-service/quick-replies/{quickReplyId}
POST   /api/admin/v1/customer-service/quick-replies/{quickReplyId}/enabled    { "enabled": false }
POST   /api/admin/v1/customer-service/quick-replies/reorder                   { "items": [{ "quickReplyId": "...", "sortOrder": 1 }] }
DELETE /api/admin/v1/customer-service/quick-replies/{quickReplyId}
```

新建/更新请求体(**`category` 必填**,缺失返回 `CUSTOMER_SERVICE_QUICK_REPLY_CATEGORY_REQUIRED`;`scope` 可空 = `all`,可选值 `all` / `temp_session` / `direct_customer`):

```json
{ "scope": null, "locale": "zh-CN", "category": "售后",
  "title": "退款流程", "content": "您好,退款将在 1-3 个工作日原路退回。",
  "tags": ["售后"], "sortOrder": 1, "enabled": true }
```

客服端读取(原有):`GET /api/client/v1/customer-service/quick-replies`,移动端增量同步 `GET .../quick-replies/sync?updatedSince=...`。

> 权限:以上配置接口要求管理角色持有 `customer_service.temp_session.manage`(查询仅需 `.view`)。若管理账号调用返回 403,请到 管理后台 → 角色权限 给对应角色勾上该权限,而不是接口缺失。

---

## 2. 客服工作台备注访客资讯 — 🆕 全新接口

会话备注(temp_session_notes)此前只有 AI 交接摘要的系统写入,坐席没有任何写入口。现已补齐(客服端 client token):

```
GET    /api/client/v1/customer-service/temp-sessions/{sessionId}/notes                 列表(置顶在前)
POST   /api/client/v1/customer-service/temp-sessions/{sessionId}/notes                 新建
PUT    /api/client/v1/customer-service/temp-sessions/{sessionId}/notes/{noteId}/pin    置顶/取消 { "pinned": true }
DELETE /api/client/v1/customer-service/temp-sessions/{sessionId}/notes/{noteId}        删除
```

新建请求体:`{ "content": "VIP 客户,关注退款时效", "isPinned": false }`(content ≤2000 字)。

返回的备注对象:`{ noteId, staffDisplayName, content, isPinned, createdAt }`。

行为约定:

- **访客永远看不到备注**(纯内部信息);
- 备注随会话详情(`GET .../temp-sessions/{sessionId}` 的 `notes` 字段)与接待历史回放,**主管/质检在管理后台同样可见**;
- 新建/删除会写入会话时间线(`note_created` / `note_deleted` 事件),可追溯;
- 建议把"跨会话的客户长期画像"写在置顶备注里 —— 复访续聊(见 §3)后同一会话的备注天然延续;跨会话的历史备注通过"按客户查服务历史"接口逐会话回放。

---

## 3. 同一访客再次进线看到上一次对话 — 🆕 `resumeRecentSession`

**你们问的"是不是访客参数要增加一个参数"——对,而且是两件事:**

### 3.1 前提:访客身份必须可识别(你们现在可能没传)

服务端按以下优先级把进线访客匹配回老访客:**`customerId` → `fingerprint` → `visitorMobile` → `visitorEmail`**。
如果建会话时这些一个都不传,每次进线都是"全新访客",任何续聊/历史都无从谈起。请务必稳定传:

- 已登录业务用户:传你们系统的 `customerId`(配合 `customerSign` 签名,防伪冒);
- 匿名访客:前端生成并持久化(localStorage/设备指纹)一个稳定 `fingerprint`。

### 3.2 新参数:`resumeRecentSession: true`

```
POST /api/widget/v1/{tenantCode}/sessions
{
  "fingerprint": "fp-8f3a...",          // 或 customerId(+customerSign)
  "locale": "zh-CN",
  "resumeRecentSession": true           // 🆕
}
```

行为:

| 该访客最近会话状态 | 结果 |
|---|---|
| 进行中(排队/接待中/AI 接待) | 直接返回该会话(忽略创建冷却窗口),**同 sessionId 同历史** |
| 已关闭(超时/客服关/访客关) | **自动重开同一会话**:状态回到 AI 接待或重新排队,`GET /sessions/{id}/messages` 返回全部历史消息;响应签发**新 visitorToken**(必须替换本地存储) |
| 已归档 / 从无会话 | 走原逻辑开新会话 |

- 不传或 `false` = 旧行为(每次进线开新会话),完全向后兼容。
- 重开会写入会话时间线 `reopened` 事件;客服侧该会话回到工作台列表。
- 产品建议:widget 初始化时一律带 `resumeRecentSession: true`;若希望"超过 N 天的旧对话不再续上",由前端自行决定何时不带该参数即可(服务端不强加时效)。

---

## 4. 「发送后输入框失焦」问题

经排查为前端实现问题(发送期间禁用输入框/未在发送完成后重新 focus),与服务端无关、服务端无任何会"锁输入"的状态,由前端团队自行处理,本文不涉及。

---

## 验证与兼容性

- 全部为新增端点/新增可选参数,**无破坏性变更、无数据库迁移**。
- 集成测试 3 例(配置开场白真实生效 / 备注闭环 / 复访重开)+ 单测 682/682 绿。
- 生产 E2E 探针 `e2e/ws-probe/cs-config-notes-resume-probe.mjs`:管理端配置开场白后新会话即用新文案、快捷回复 CRUD、坐席备注闭环、复访 `resumeRecentSession` 同会话重开且历史留言可见 —— 上线后实测通过(结果见探针 transcript)。
