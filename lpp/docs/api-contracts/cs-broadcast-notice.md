# 致第三方开发者 — 客服主动群发功能上线通知

> 上线日期:2026-05-22
> 影响范围:管理后台 API（`https://admin.hearteasechat.com` → `/api/admin/v1/...`），需管理端 token
> 兼容性:纯新增，不改动任何现有端点，老代码无需改动
> 文档校对快照:2026-05-22

## 一句话说明

客服现在可以**主动发起群发**，把同一条消息一次性发给一批成员 —— 支持发给全租户成员、发给某个群的成员、或直接在某个群里群发。

## 三种群发方式

| `targetType` | 含义 | 成员收到的形式 |
|---|---|---|
| `1` | 全租户成员 | 与该客服的**单聊**里收到一条消息（逐人各开一个单聊） |
| `2` | 某个群的成员（逐人私聊） | 与该客服的**单聊**里收到（不在群里出现） |
| `3` | 某个群（群内群发） | 在**该群聊**里看到一条消息 |

## 关键规则（对接前必读）

- **权限**:调用者需要 `customer_service.broadcast.send` 权限。客服坐席、客服主管、租户管理员默认已具备，无需额外配置。
- **发送身份**:群发以**发起人本人的身份**发出。成员收到的是来自这个客服的真实单聊/群消息，**可以直接回复**，会转入正常会话。
- **群范围限制**:选群目标（方式 2/3）时，只能选**发起人本人是成员的群**；否则返回 `403 CS_BROADCAST_GROUP_FORBIDDEN`。
- **支持的消息类型**:`text`、`markdown`、`image`、`video`、`voice`、`file`、`contact_card`、`location`（消息体结构与单聊一致；媒体先用管理端媒体上传拿到 URL 再填入对应字段）。
- **异步投递**:提交后立即返回任务 ID，实际发送在后台进行。通过任务详情轮询进度（成功/失败/跳过计数）。
- **不可撤回**:发出后无法撤回。文本内容会过敏感词审核，命中会在提交时被拒。
- **跳过 ≠ 失败**:发给已拉黑、已注销的成员会记为「跳过」，不计失败。
- **频率限制**:同一操作者单位时间内群发提交次数有上限，超出返回 `429 CS_BROADCAST_RATE_LIMITED`。

## 端点清单

Base URL:`/api/admin/v1/customer-service/broadcasts`，全部需管理端 `accessToken`（Bearer）+ `customer_service.broadcast.send` 权限。

| 端点 | 方法 | 用途 |
|---|---|---|
| `/preview` | POST | 干跑预览，返回「将影响多少人 + 样本名」，供二次确认（不真正发送） |
| `/` | POST | 提交群发任务，立即返回 `taskId` |
| `/` | GET | 任务列表（`?mine=true` 只看自己发的，`?limit=` 控制条数） |
| `/{taskId}` | GET | 任务详情 + 进度 + 失败/跳过明细（`?failedLimit=` 控制明细条数） |
| `/{taskId}/retry-failed` | POST | 把失败收件人重新排队重试（仅私聊模式 1/2 有效） |

## 字段说明

### `POST /preview` 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | number | 是 | `1`=全租户成员；`2`=某群成员逐人私聊；`3`=某群群内群发 |
| `groupId` | string(GUID) | 当 `targetType` 为 2/3 时必填 | 目标群会话 ID |

响应 `data`:`recipientCount`(将影响人数)、`groupTitle`(群标题，选群时)、`sampleDisplayNames`(样本展示名数组)。

### `POST /`（提交）请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | number | 是 | 同上 |
| `groupId` | string(GUID) | 当 `targetType` 为 2/3 时必填 | 目标群会话 ID |
| `messageType` | string | 是 | `text`/`markdown`/`image`/`video`/`voice`/`file`/`contact_card`/`location` |
| `body` | object | 是 | 消息体，结构同单聊消息体；文本放 `text`，媒体放对应字段 |

响应 `data`:`taskId`、`status`(提交后为 `0`)、`totalCount`(目标总数)。

### 任务状态 `status`

`0`=待投递　`1`=投递中　`2`=已完成　`3`=失败

### 任务详情 `data` 关键字段

`status`、`totalCount`、`sentCount`、`failedCount`、`skippedCount`、`failureReason`(任务级失败时)、`failedRecipients[]`（每项:`targetUserId`、`displayName`、`status`(2=失败/3=跳过)、`errorCode`、`retryCount`）。

## 推荐对接流程

```
1. POST /preview  { targetType, groupId? }
   → recipientCount（将影响人数）、sampleDisplayNames（样本）
   → UI 上让操作者确认「将发给 N 人」再继续

2. POST /         { targetType, groupId?, messageType, body }
   → taskId

3. 轮询 GET /{taskId}
   → status / sentCount / failedCount / skippedCount / totalCount

4.（可选）若有失败:POST /{taskId}/retry-failed
```

## 可直接运行的示例（curl）

> 把 `$TOKEN` 换成你的管理端 accessToken。下面以「全租户成员群发一条文本」为例。

```bash
BASE="https://admin.hearteasechat.com/api/admin/v1/customer-service/broadcasts"
TOKEN="<你的管理端 accessToken>"

# 1) 预览：确认将影响多少人
curl -s -X POST "$BASE/preview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "targetType": 1 }'
# 返回示例：
# { "code":"OK","message":"","requestId":"...","data":{
#     "targetType":1,"recipientCount":128,
#     "sampleDisplayNames":["张三","李四","王五"] } }

# 2) 提交群发任务
curl -s -X POST "$BASE/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "targetType": 1,
        "messageType": "text",
        "body": { "text": "您好，这是一条全员通知。" }
      }'
# 返回示例：
# { "code":"OK","data":{ "taskId":"0190...","status":0,"totalCount":128 } }

# 3) 轮询任务进度（把 TASK_ID 换成上一步返回的 taskId）
TASK_ID="0190..."
curl -s "$BASE/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"
# data.status: 0 待投递 / 1 投递中 / 2 已完成 / 3 失败
# data.sentCount / failedCount / skippedCount / totalCount

# 4)（可选）重试失败收件人
curl -s -X POST "$BASE/$TASK_ID/retry-failed" \
  -H "Authorization: Bearer $TOKEN"
# 返回示例： { "data":{ "taskId":"0190...","requeuedCount":2 } }
```

**给某个群的成员逐人私聊**（方式 2）和**群内群发**（方式 3）只需改 `targetType` 并带上 `groupId`:

```bash
# 方式 2：把某群成员展开，逐人私聊
curl -s -X POST "$BASE/" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "targetType": 2, "groupId": "<群会话ID>", "messageType": "text",
        "body": { "text": "给本群每位成员的私聊通知" } }'

# 方式 3：直接在群里群发一条
curl -s -X POST "$BASE/" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "targetType": 3, "groupId": "<群会话ID>", "messageType": "text",
        "body": { "text": "群内公告" } }'

# 发图片（先用管理端媒体上传拿到 url，再填进 body.image.url）
curl -s -X POST "$BASE/" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "targetType": 1, "messageType": "image",
        "body": { "image": { "url": "<媒体上传返回的 url>", "fileName": "promo.png" } } }'
```

## 主要错误码

| code | HTTP | 含义 |
|---|---|---|
| `CS_BROADCAST_GROUP_FORBIDDEN` | 403 | 发起人不是该群成员 |
| `CS_BROADCAST_GROUP_REQUIRED` | 400 | 选了群目标但没传 `groupId` |
| `CS_BROADCAST_GROUP_NOT_ALLOWED` | 400 | 全租户目标却传了 `groupId` |
| `CS_BROADCAST_GROUP_NOT_FOUND` | 404 | 目标群不存在 |
| `CS_BROADCAST_NOT_A_GROUP` | 400 | 目标会话不是群 |
| `CS_BROADCAST_GROUP_UNAVAILABLE` | 400 | 目标群已归档或冻结 |
| `CS_BROADCAST_INVALID_TYPE` | 400 | `messageType` 不支持 |
| `CS_BROADCAST_BODY_INVALID` | 400 | 消息体与类型不匹配 |
| `CS_BROADCAST_NO_RECIPIENTS` | 400 | 目标范围内没有可投递成员 |
| `CS_BROADCAST_TOO_MANY_RECIPIENTS` | 400 | 目标人数超过单任务上限 |
| `CS_BROADCAST_BLOCKED_BY_MODERATION` | 400 | 文本命中敏感词 |
| `CS_BROADCAST_RATE_LIMITED` | 429 | 群发提交频率超限 |
| `CS_BROADCAST_NOT_FOUND` | 404 | 任务不存在 |
| `CS_BROADCAST_RETRY_UNSUPPORTED` | 400 | 群内群发任务没有逐收件人重试 |

## 完整文档

- `admin-api.md` §3.2A+（完整请求/响应字段表 + 全部错误码）
- `admin-api-reference.md` §2.5+（速查表）
- `CHANGES-2026-05.md` §3.4（本次变更通知）
