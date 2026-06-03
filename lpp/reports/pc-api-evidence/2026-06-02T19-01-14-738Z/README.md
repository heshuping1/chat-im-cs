# PC IM + 在线客服真实 API 流水证据包

- 生成时间：2026-06-02T19:01:40.125Z
- API Base：https://chat.hearteasechat.com
- 测试账号：lpp_gs9fn2c7 / mouse客服1
- tenantId：019da0ce-9cd2-7623-8808-a0ab11da318a
- userId：019da55e-923d-7678-8799-8bbc7820b79a
- 脱敏规则：未写入 token、密码、Authorization、正文、手机号、邮箱。

## 结论

- /api/client/v1/conversations?limit=100 返回 temp_session：是
- 同帧 direct-like + temp evidence：否
- 发送尝试：是，status=503, ok=false
- 初步归因：server_im_list_pollution

## 关键 requestId

- 2026-06-02T19:01:19.498Z GET /api/client/v1/profile/me status=200 requestId=0HNM0QEC5Q9IV:00000001 label=profile-me
- 2026-06-02T19:01:20.239Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9J2:00000001 label=baseline-conversations
- 2026-06-02T19:01:21.114Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9J5:00000001 label=baseline-workbench
- 2026-06-02T19:01:21.288Z GET /api/client/v1/customer-service/staff/service-history?threadType=temp_session&limit=50 status=200 requestId=0HNM0QEC5Q9J6:00000001 label=baseline-history-temp-session
- 2026-06-02T19:01:21.494Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9J8:00000001 label=baseline-detail-target
- 2026-06-02T19:01:21.680Z POST /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf/messages status=503 requestId=0HNM0QEC5Q9JA:00000001 label=send-target-temp-session
- 2026-06-02T19:01:21.868Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9JC:00000001 label=poll-1-conversations
- 2026-06-02T19:01:22.324Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9JD:00000001 label=poll-1-workbench
- 2026-06-02T19:01:22.494Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9JE:00000001 label=poll-1-detail-target
- 2026-06-02T19:01:25.680Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9JP:00000001 label=poll-2-conversations
- 2026-06-02T19:01:25.959Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9JT:00000001 label=poll-2-workbench
- 2026-06-02T19:01:26.125Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9JV:00000001 label=poll-2-detail-target
- 2026-06-02T19:01:29.304Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9K6:00000001 label=poll-3-conversations
- 2026-06-02T19:01:29.564Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9K9:00000001 label=poll-3-workbench
- 2026-06-02T19:01:29.731Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9KB:00000001 label=poll-3-detail-target
- 2026-06-02T19:01:32.913Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9KQ:00000001 label=poll-4-conversations
- 2026-06-02T19:01:33.169Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9KR:00000001 label=poll-4-workbench
- 2026-06-02T19:01:33.338Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9KS:00000001 label=poll-4-detail-target
- 2026-06-02T19:01:36.519Z GET /api/client/v1/conversations?limit=100 status=200 requestId=0HNM0QEC5Q9LD:00000001 label=poll-5-conversations
- 2026-06-02T19:01:36.772Z GET /api/client/v1/customer-service/workbench/threads status=200 requestId=0HNM0QEC5Q9LF:00000001 label=poll-5-workbench
- 2026-06-02T19:01:36.940Z GET /api/client/v1/customer-service/workbench/threads/temp-session/019e8979-3f19-7383-8712-e0e47e47d1bf status=200 requestId=0HNM0QEC5Q9LG:00000001 label=poll-5-detail-target

## IM 列表快照摘要

### baseline-conversations
- time=2026-06-02T19:01:20.239Z status=200 requestId=0HNM0QEC5Q9J2:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null
### poll-1-conversations
- time=2026-06-02T19:01:21.868Z status=200 requestId=0HNM0QEC5Q9JC:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null
### poll-2-conversations
- time=2026-06-02T19:01:25.680Z status=200 requestId=0HNM0QEC5Q9JP:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null
### poll-3-conversations
- time=2026-06-02T19:01:29.304Z status=200 requestId=0HNM0QEC5Q9K6:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null
### poll-4-conversations
- time=2026-06-02T19:01:32.913Z status=200 requestId=0HNM0QEC5Q9KQ:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null
### poll-5-conversations
- time=2026-06-02T19:01:36.519Z status=200 requestId=0HNM0QEC5Q9LD:00000001
- count=100 tempLike=90 directLike=7 tempAndDirectLike=0
- temp item: conversationId=019e8979-3f19-7784-9f5f-34bbf7038fcf conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e897a-5ca9-711b-9548-ccaf33c3d665 lastMessageAt=null
- temp item: conversationId=019e8959-c31b-748e-a5c9-cb182025c5d1 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8964-7a78-7d86-996f-5de11645d28e lastMessageAt=null
- temp item: conversationId=019e8814-becc-79a6-967b-3d73f711d08c conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e8815-cecd-7712-b7a3-fa5f9191cde1 lastMessageAt=null
- temp item: conversationId=019e880a-70e9-71d7-b3e6-1ca6cb01a5f6 conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e880b-ba98-7317-91fe-bb18bc50d3a2 lastMessageAt=null
- temp item: conversationId=019e87dc-3fd9-7286-90b8-a76dc9b47a2a conversationType=temp_session threadType=null tempSessionExists=true tempSession=true lastMessageId=019e87dd-00b4-76a6-9359-9f8b897b54b0 lastMessageAt=null

## 目标客服会话
```json
{
  "threadId": "019e8979-3f19-7383-8712-e0e47e47d1bf",
  "conversationId": null,
  "threadType": "temp_session",
  "status": 7,
  "tempSession": null,
  "customerId": null,
  "lastMessageId": null,
  "lastMessageAt": "2026-06-02T17:55:58.249312+00:00"
}
```

## 前端过滤诊断摘要

### cs-routing.jsonl
- newLines=1
```json
[
  "platform\":\"[undefined]\",\"provider\":\"[undefined]\",\"isVip\":\"[undefined]\",\"customerLevel\":\"[undefined]\",\"tags\":[]}],\"queueItems\":[],\"summary\":{\"activeCount\":0,\"allCount\":0,\"queuedCount\":0,\"vipCount\":0}}}"
]
```
### message-source.jsonl
- newLines=0
```json
[]
```
### message-trace.jsonl
- newLines=0
```json
[]
```
### message-delivery.jsonl
- newLines=0
```json
[]
```
## 补充：尾部可解析诊断摘要

### cs-routing.jsonl
- tailLines=80
- parsedLines=80
```json
[
  {
    "at": "[redacted-phone]T19:02:07.097Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:07.102Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:10.017Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:10.022Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:10.117Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:10.121Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:12.234Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:12.242Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:12.318Z",
    "event": "pc-im-conversations",
    "source": "messages-client",
    "phase": "filter",
    "route": "conversation-list",
    "classification": {
      "total": 18,
      "kept": 18,
      "dropped": 0
    },
    "summary": []
  },
  {
    "at": "[redacted-phone]T19:02:12.405Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:12.410Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:14.466Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:14.473Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:14.634Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:14.638Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:16.855Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:16.860Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.026Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "raw",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00"
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": "[undefined]",
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00"
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.031Z",
    "event": "pc-cs-workbench-threads",
    "source": "customer-service-client",
    "phase": "overlay",
    "route": "thread-list",
    "classification": {
      "active": 112,
      "queue": 0
    },
    "summary": {
      "activeItems": [
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T18:14:41.782816+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T18:14:30.514944+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:55:58.249312+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:54:45.144756+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T17:32:04.088235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T17:20:21.786134+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:26:31.11763+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:25:21.483225+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T11:15:30.584235+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T11:14:06.184372+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:24:28.34053+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:23:38.968036+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T10:01:58.772566+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T10:00:12.540763+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        },
        {
          "accessMode": "management_readonly",
          "assignedAt": null,
          "avatarUrl": null,
          "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
          "customerAvatarUrl": null,
          "lastMessageAt": "[redacted-phone]T06:08:38.243502+00:00",
          "lastMessagePreview": "[undefined]",
          "priority": "normal",
          "source": "[undefined]",
          "sourceChannel": "temp-chat-widget",
          "status": "closed_timeout",
          "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
          "threadType": "temp_session",
          "title": "访客",
          "unreadCount": 0,
          "updatedAt": "[redacted-phone]T06:07:58.132093+00:00",
          "from": "[undefined]",
          "channel": "[undefined]",
          "entryChannel": "[undefined]",
          "platform": "[undefined]",
          "provider": "[undefined]",
          "isVip": "[undefined]",
          "customerLevel": "[undefined]",
          "tags": []
        }
      ],
      "queueItems": [],
      "summary": {
        "activeCount": 0,
        "allCount": 0,
        "queuedCount": 0,
        "vipCount": 0
      }
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.059Z",
    "event": "pc-im-conversations",
    "source": "messages-client",
    "phase": "filter",
    "route": "conversation-list",
    "classification": {
      "total": 18,
      "kept": 18,
      "dropped": 0
    },
    "summary": []
  }
]
```

### message-source.jsonl
- tailLines=80
- parsedLines=80
```json
[
  {
    "at": "[redacted-phone]T19:02:17.031Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.031Z",
      "latencyMs": 2855249,
      "serverSentAt": "[redacted-phone]T18:14:41.782816+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 3978783,
      "serverSentAt": "[redacted-phone]T17:55:58.249312+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 5412944,
      "serverSentAt": "[redacted-phone]T17:32:04.088235+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 27345915,
      "serverSentAt": "[redacted-phone]T11:26:31.11763+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 28006448,
      "serverSentAt": "[redacted-phone]T11:15:30.584235+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 31068692,
      "serverSentAt": "[redacted-phone]T10:24:28.34053+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 32418260,
      "serverSentAt": "[redacted-phone]T10:01:58.772566+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "latencyMs": 46418789,
      "serverSentAt": "[redacted-phone]T06:08:38.243502+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.033Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86e0-e492-7a21-a[redacted-phone]f15484",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86e0-e492-70f7-814d-2d9dfdc947e2",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.033Z",
      "latencyMs": 47501923,
      "serverSentAt": "[redacted-phone]T05:50:35.110244+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.033Z",
    "event": "[redacted-jwt]",
    "source": "customer-service-client",
    "phase": "http-query",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86b7-a91a-71e0-a2a0-b3ae40c5e1a5",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "itemCount": "[undefined]",
      "messageId": "[undefined]",
      "messageType": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86b7-a91a-7097-95c6-e833afa1b389",
      "threadType": "temp_session",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.033Z",
      "latencyMs": 50251841,
      "serverSentAt": "[redacted-phone]T05:04:45.192907+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.059Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "conversationSeq": 375,
      "conversationType": "direct",
      "itemCount": "[undefined]",
      "messageId": "019e8997-742e-73a2-8063-f9930be8c810",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.059Z",
      "latencyMs": 2073245,
      "serverSentAt": "[redacted-phone]T18:27:44.814195+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.059Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e22-33dd-707f-a61d-69833d957ab9",
      "conversationSeq": 2,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e87c6-210d-77fd-a39d-eafedef2591e",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.059Z",
      "latencyMs": 32568766,
      "serverSentAt": "[redacted-phone]T09:59:29.293091+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e2664-594a-76ff-90b0-4fade673df0a",
      "conversationSeq": 40,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e83e5-b89d-7884-affe-5b830f097ede",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "latencyMs": 97607215,
      "serverSentAt": "[redacted-phone]T15:55:30.845666+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7025-8e71-73af-80fc-ca8e1f607b73",
      "conversationSeq": 6,
      "conversationType": "direct",
      "itemCount": "[undefined]",
      "messageId": "019e82ac-404a-75d5-ad7f-c010ef09e3c7",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "latencyMs": 118150786,
      "serverSentAt": "[redacted-phone]T10:13:07.274609+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e28-94a2-733b-8c1a-b7dbd5a5c015",
      "conversationSeq": 1,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e7e28-9f0b-7993-b82a-8d9c50253c5c",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "latencyMs": 193886145,
      "serverSentAt": "[redacted-phone]T13:10:51.915401+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e1f-dca6-78e6-94fc-2115ba72db02",
      "conversationSeq": 1,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e7e1f-e728-748f-bd2d-e90e4794a0d3",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "latencyMs": 194457508,
      "serverSentAt": "[redacted-phone]T13:01:20.552807+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7dd7-dd66-7962-b82d-f8f7634c089b",
      "conversationSeq": 1,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e7dd7-e79d-71c9-a134-e181218f79c4",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "latencyMs": 199175983,
      "serverSentAt": "[redacted-phone]T11:42:42.077184+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7dd1-747b-7379-9bd6-6ecc8fbd5020",
      "conversationSeq": 1,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e7dd1-7de0-758e-a6e[redacted-phone]c5df4",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "latencyMs": 199596269,
      "serverSentAt": "[redacted-phone]T11:35:41.792542+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e4ac4-38b9-7dda-ad66-696a155551df",
      "conversationSeq": 19,
      "conversationType": "group",
      "itemCount": "[undefined]",
      "messageId": "019e79c0-be49-7ada-baf0-dae1eef440b6",
      "messageType": "video",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "latencyMs": 267802756,
      "serverSentAt": "[redacted-phone]T16:38:55.305319+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "[redacted-jwt]",
    "source": "messages-client",
    "phase": "http-query",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e64de-5256-7ddb-ac78-e1ce6e53b120",
      "conversationSeq": 10,
      "conversationType": "direct",
      "itemCount": "[undefined]",
      "messageId": "019e6513-61ff-[redacted-phone]d67164a2e02",
      "messageType": "text",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "threadType": "[undefined]",
      "unreadCount": 0
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "latencyMs": 614708430,
      "serverSentAt": "[redacted-phone]T16:17:09.631487+00:00"
    }
  }
]
```

### message-trace.jsonl
- tailLines=80
- parsedLines=80
```json
[
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e898b-5573-7cdb-9e74-da5c744da664",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e898b-5573-78f3-a6a8-1a92bfce9562",
      "traceId": "019e898b-5573-7cdb-9e74-da5c744da664"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 2855250,
      "serverSentAt": "[redacted-phone]T18:14:41.782816+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8979-3f[redacted-phone]-e0e47e47d1bf",
      "traceId": "019e8979-3f[redacted-phone]f5f-34bbf7038fcf"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 3978783,
      "serverSentAt": "[redacted-phone]T17:55:58.249312+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8959-c31b-748e-a5c9-cb182025c5d1",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8959-c31b-7802-83c9-e1757971f3ff",
      "traceId": "019e8959-c31b-748e-a5c9-cb182025c5d1"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 5412944,
      "serverSentAt": "[redacted-phone]T17:32:04.088235+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e8814-becc-79a6-967b-3d73f711d08c",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e8814-becc-7af9-92e1-ed0811c2a76c",
      "traceId": "019e8814-becc-79a6-967b-3d73f711d08c"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 27345915,
      "serverSentAt": "[redacted-phone]T11:26:31.11763+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e880a-70e9-7026-a656-c8eecd4e513c",
      "traceId": "019e880a-70e9-71d7-b3e6-1ca6cb01a5f6"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 28006448,
      "serverSentAt": "[redacted-phone]T11:15:30.584235+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e87dc-3fd9-7c3e-b382-1f87f4862587",
      "traceId": "019e87dc-3fd[redacted-phone]b8-a76dc9b47a2a"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 170,
      "latencyMs": 31068692,
      "serverSentAt": "[redacted-phone]T10:24:28.34053+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.032Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e87c6-c9fe-7451-990f-eac314d2bb4b",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e87c6-c9fe-7988-9a4e-f46172333d8d",
      "traceId": "019e87c6-c9fe-7451-990f-eac314d2bb4b"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.032Z",
      "durationFromPreviousMs": 170,
      "latencyMs": 32418260,
      "serverSentAt": "[redacted-phone]T10:01:58.772566+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.033Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86f2-2ab5-755c-bad6-5fd0841ea735",
      "traceId": "019e86f2-2ab5-7ce2-bb1b-74c04118bda3"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.033Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 46418790,
      "serverSentAt": "[redacted-phone]T06:08:38.243502+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.033Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86e0-e492-7a21-a[redacted-phone]f15484",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86e0-e492-70f7-814d-2d9dfdc947e2",
      "traceId": "019e86e0-e492-7a21-a[redacted-phone]f15484"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.033Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 47501923,
      "serverSentAt": "[redacted-phone]T05:50:35.110244+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:17.033Z",
    "event": "message.trace",
    "source": "customer-service-client",
    "phase": "[redacted-jwt]",
    "route": "cs-workbench",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e86b7-a91a-71e0-a2a0-b3ae40c5e1a5",
      "conversationSeq": "[undefined]",
      "conversationType": "[undefined]",
      "messageId": "[undefined]",
      "owner": "customerService",
      "sourceChannel": "http-query",
      "threadId": "019e86b7-a91a-7097-95c6-e833afa1b389",
      "traceId": "019e86b7-a91a-71e0-a2a0-b3ae40c5e1a5"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:17.033Z",
      "durationFromPreviousMs": 171,
      "latencyMs": 50251841,
      "serverSentAt": "[redacted-phone]T05:04:45.192907+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.059Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "conversationSeq": 375,
      "conversationType": "direct",
      "messageId": "019e8997-742e-73a2-8063-f9930be8c810",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e8997-742e-73a2-8063-f9930be8c810"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.059Z",
      "durationFromPreviousMs": 5740,
      "latencyMs": 2073245,
      "serverSentAt": "[redacted-phone]T18:27:44.814195+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.059Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e22-33dd-707f-a61d-69833d957ab9",
      "conversationSeq": 2,
      "conversationType": "group",
      "messageId": "019e87c6-210d-77fd-a39d-eafedef2591e",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e87c6-210d-77fd-a39d-eafedef2591e"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.059Z",
      "durationFromPreviousMs": 5740,
      "latencyMs": 32568766,
      "serverSentAt": "[redacted-phone]T09:59:29.293091+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e2664-594a-76ff-90b0-4fade673df0a",
      "conversationSeq": 40,
      "conversationType": "group",
      "messageId": "019e83e5-b89d-7884-affe-5b830f097ede",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e83e5-b89d-7884-affe-5b830f097ede"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 97607215,
      "serverSentAt": "[redacted-phone]T15:55:30.845666+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7025-8e71-73af-80fc-ca8e1f607b73",
      "conversationSeq": 6,
      "conversationType": "direct",
      "messageId": "019e82ac-404a-75d5-ad7f-c010ef09e3c7",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e82ac-404a-75d5-ad7f-c010ef09e3c7"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 118150786,
      "serverSentAt": "[redacted-phone]T10:13:07.274609+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e28-94a2-733b-8c1a-b7dbd5a5c015",
      "conversationSeq": 1,
      "conversationType": "group",
      "messageId": "019e7e28-9f0b-7993-b82a-8d9c50253c5c",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e7e28-9f0b-7993-b82a-8d9c50253c5c"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 193886145,
      "serverSentAt": "[redacted-phone]T13:10:51.915401+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7e1f-dca6-78e6-94fc-2115ba72db02",
      "conversationSeq": 1,
      "conversationType": "group",
      "messageId": "019e7e1f-e728-748f-bd2d-e90e4794a0d3",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e7e1f-e728-748f-bd2d-e90e4794a0d3"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 194457508,
      "serverSentAt": "[redacted-phone]T13:01:20.552807+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.060Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7dd7-dd66-7962-b82d-f8f7634c089b",
      "conversationSeq": 1,
      "conversationType": "group",
      "messageId": "019e7dd7-e79d-71c9-a134-e181218f79c4",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e7dd7-e79d-71c9-a134-e181218f79c4"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.060Z",
      "durationFromPreviousMs": 5740,
      "latencyMs": 199175983,
      "serverSentAt": "[redacted-phone]T11:42:42.077184+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e7dd1-747b-7379-9bd6-6ecc8fbd5020",
      "conversationSeq": 1,
      "conversationType": "group",
      "messageId": "019e7dd1-7de0-758e-a6e[redacted-phone]c5df4",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e7dd1-7de0-758e-a6e[redacted-phone]c5df4"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 199596269,
      "serverSentAt": "[redacted-phone]T11:35:41.792542+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e4ac4-38b9-7dda-ad66-696a155551df",
      "conversationSeq": 19,
      "conversationType": "group",
      "messageId": "019e79c0-be49-7ada-baf0-dae1eef440b6",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e79c0-be49-7ada-baf0-dae1eef440b6"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 267802756,
      "serverSentAt": "[redacted-phone]T16:38:55.305319+00:00"
    }
  },
  {
    "at": "[redacted-phone]T19:02:18.061Z",
    "event": "message.trace",
    "source": "messages-client",
    "phase": "[redacted-jwt]",
    "route": "im-conversation-list",
    "classification": {
      "clientMsgId": "[undefined]",
      "conversationId": "019e64de-5256-7ddb-ac78-e1ce6e53b120",
      "conversationSeq": 10,
      "conversationType": "direct",
      "messageId": "019e6513-61ff-[redacted-phone]d67164a2e02",
      "owner": "im",
      "sourceChannel": "http-query",
      "threadId": "[undefined]",
      "traceId": "019e6513-61ff-[redacted-phone]d67164a2e02"
    },
    "summary": {
      "clientObservedAt": "[redacted-phone]T19:02:18.061Z",
      "durationFromPreviousMs": 5741,
      "latencyMs": 614708430,
      "serverSentAt": "[redacted-phone]T16:17:09.631487+00:00"
    }
  }
]
```

### message-delivery.jsonl
- tailLines=80
- parsedLines=80
```json
[
  {
    "at": "[redacted-phone]T18:27:44.924Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.924Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.925Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.925Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.948Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.948Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.949Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.949Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.967Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.967Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.968Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.968Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.988Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.988Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:44.988Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:44.988Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.007Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.007Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.007Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.007Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.027Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.027Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.027Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.027Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.046Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.046Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.046Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.046Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.068Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.068Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:45.068Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:45.068Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:47.954Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:47.954Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:47.955Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:47.955Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:47.974Z",
    "event": "[redacted-jwt]",
    "source": "gateway-bridge",
    "phase": "received",
    "route": "push",
    "classification": {
      "argCount": 1,
      "eventName": "msg.read",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:47.974Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  },
  {
    "at": "[redacted-phone]T18:27:47.975Z",
    "event": "message.delivery",
    "source": "gateway-router",
    "phase": "read",
    "route": "im-read-first-stage",
    "classification": {
      "owner": "im",
      "scopeKey": "[scope-key len=37 hash=a9cb5172defe]"
    },
    "summary": {
      "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
      "latency": {
        "clientObservedAt": "[redacted-phone]T18:27:47.975Z",
        "latencyMs": "[undefined]",
        "source": "push",
        "serverSentAt": "[undefined]"
      },
      "message": {
        "clientMsgId": "[undefined]",
        "conversationId": "019e4ec8-4b60-7c6d-b9d6-0466b55eab5d",
        "conversationSeq": "[undefined]",
        "messageId": "[undefined]",
        "messageType": "[undefined]",
        "sentAt": "[undefined]"
      }
    }
  }
]
```
