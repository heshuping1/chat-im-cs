# 端点审计报告

> **Status:archived(已归档,仅供内部追溯)**
>
> 本文档是 2026-04-21 的端点覆盖快照,**不是面向第三方开发者的对接文档**。
> 该快照在 2026-05-14 已确认与当前源码存在显著偏差(覆盖率自称 383/383=100%,实际接近 84%——主要差距来自后续新增的 AI 服务、IM-Direct 客服线程、设备登录抢占、客服在线心跳、Widget 配置等模块)。
> 第三方接入方请以同级目录下其它主文档(`client-api.md` / `admin-api.md` / `voice-video-call.md` / `open-platform.md` / `field-enum-reference.md`)为准。本文不再维护。

更新日期：2026-04-21

审计范围：`src/Hosts/` 下 5 个宿主项目（Api、AdminApi、OpenPlatform、Gateway、MediaRelay）中定义的全部公开端点（HTTP REST 端点 + SignalR Hub 方法 + 服务端推送事件），与 `3rddocs/` 现有文档逐一比对，标记每个端点的文档状态为 `documented`（已文档化）、`missing`（缺失）或 `outdated`（过时）。

> **阅读提示(2026-05-14 补)**:下方数据为 2026-04-21 快照,已被后续若干 P0/P1 改动覆盖,**汇总统计中的 383/383=100% 不再成立**。需要最新覆盖情况请直接对照各分文档与 host 源码。

---

## 1. Api 宿主（ZTChat.Hosts.Api）

源码文件：`src/Hosts/ZTChat.Hosts.Api/Program.cs`

### 1.1 平台认证组 `/api/platform/v1/auth/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 1 | POST | /api/platform/v1/auth/register | Program.cs:107 | ✅ 已文档化 | client-api.md §1.1 |
| 2 | POST | /api/platform/v1/auth/login | Program.cs:118 | ✅ 已文档化 | client-api.md §1.2 |
| 3 | POST | /api/platform/v1/auth/login-by-code | Program.cs:124 | ✅ 已文档化 | client-api.md §1.2 子节 |
| 4 | POST | /api/platform/v1/auth/verification/send | Program.cs:130 | ✅ 已文档化 | client-api.md §1.2 平台验证码接口 |
| 5 | GET | /api/platform/v1/auth/verification/settings | Program.cs:136 | ✅ 已文档化 | client-api.md §1.2 平台验证码接口 |
| 6 | POST | /api/platform/v1/auth/select-personal-space | Program.cs:142 | ✅ 已文档化 | client-api.md §1.3 |
| 7 | POST | /api/platform/v1/auth/select-tenant | Program.cs:154 | ✅ 已文档化 | client-api.md §1.4 |
| 8 | POST | /api/platform/v1/auth/refresh-platform-token | Program.cs:166 | ✅ 已文档化 | client-api.md §1.4.1 |

### 1.2 平台公开组 `/api/platform/v1/*`（无需鉴权）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 9 | GET | /api/platform/v1/invitations/{code} | Program.cs:178 | ✅ 已文档化 | client-api.md §1.6 |
| 10 | GET | /api/platform/v1/tenants/search-for-register | Program.cs:184 | ❌ 缺失 | 注册前搜索租户，未在 client-api.md 中记录 |
| 11 | GET | /api/platform/v1/client-config | Program.cs:190 | ❌ 缺失 | 客户端配置（企业绑定模式），未在 client-api.md 中记录 |

### 1.3 平台鉴权组 `/api/platform/v1/*`（需平台 Token）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 12 | GET | /api/platform/v1/my/tenants | Program.cs:209 | ✅ 已文档化 | client-api.md §1.6 |
| 13 | GET | /api/platform/v1/my/spaces/unread-summary | Program.cs:216 | ✅ 已文档化 | client-api.md §1.5 |
| 14 | GET | /api/platform/v1/tenants/search | Program.cs:223 | ✅ 已文档化 | client-api.md §1.6 |
| 15 | POST | /api/platform/v1/tenants | Program.cs:229 | ✅ 已文档化 | client-api.md §1.6（已禁用，返回 403） |
| 16 | POST | /api/platform/v1/invitations/{code}/accept | Program.cs:234 | ✅ 已文档化 | client-api.md §1.6 |
| 17 | POST | /api/platform/v1/tenants/{tenantId}/join-request | Program.cs:241 | ✅ 已文档化 | client-api.md §1.6 |
| 18 | POST | /api/platform/v1/tenants/join-by-code | Program.cs:248 | ✅ 已文档化 | client-api.md §1.6 |
| 19 | GET | /api/platform/v1/my/join-requests | Program.cs:257 | ✅ 已文档化 | client-api.md §1.6 |
| 20 | DELETE | /api/platform/v1/my/join-requests/{requestId} | Program.cs:264 | ✅ 已文档化 | client-api.md §1.6 |

### 1.4 平台账号管理组 `/api/platform/v1/account/*`（需平台 Token）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 21 | POST | /api/platform/v1/account/deactivate | Program.cs:1460 | ✅ 已文档化 | client-api.md §19.2 |
| 22 | POST | /api/platform/v1/account/deactivate/cancel | Program.cs:1467 | ✅ 已文档化 | client-api.md §19.2A |
| 23 | PUT | /api/platform/v1/account/mobile | Program.cs:1474 | ✅ 已文档化 | client-api.md §19.3 |
| 24 | PUT | /api/platform/v1/account/email | Program.cs:1481 | ✅ 已文档化 | client-api.md §19.4 |
| 25 | GET | /api/platform/v1/account/devices | Program.cs:1488 | ✅ 已文档化 | client-api.md §19.5 |
| 26 | DELETE | /api/platform/v1/account/devices/{deviceId} | Program.cs:1495 | ✅ 已文档化 | client-api.md §19.6 |

### 1.5 客户端认证组 `/api/client/v1/auth/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 27 | GET | /api/client/v1/auth/captcha/check | Program.cs:275 | ✅ 已文档化 | client-api.md §3.6 |
| 28 | POST | /api/client/v1/auth/captcha/generate | Program.cs:282 | ✅ 已文档化 | client-api.md §3.6 |
| 29 | POST | /api/client/v1/auth/verification/send | Program.cs:289 | ✅ 已文档化 | client-api.md §3.6 |
| 30 | GET | /api/client/v1/auth/verification/settings | Program.cs:296 | ✅ 已文档化 | client-api.md §3.6 |
| 31 | POST | /api/client/v1/auth/register | Program.cs:302 | ✅ 已文档化 | client-api.md §3.1 |
| 32 | POST | /api/client/v1/auth/login | Program.cs:312 | ✅ 已文档化 | client-api.md §3.2 |
| 33 | POST | /api/client/v1/auth/login-by-code | Program.cs:322 | ✅ 已文档化 | client-api.md §3.2 子节 |
| 34 | POST | /api/client/v1/auth/refresh | Program.cs:332 | ✅ 已文档化 | client-api.md §3.3 |
| 35 | POST | /api/client/v1/auth/reset-password | Program.cs:342 | ✅ 已文档化 | client-api.md §3.4 |
| 36 | POST | /api/client/v1/auth/change-password | Program.cs:624 | ✅ 已文档化 | client-api.md §3.5 |

### 1.6 Widget 公开组 `/api/widget/v1/{tenantCode}/*`（无需鉴权）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 37 | GET | /api/widget/v1/{tenantCode}/config | Program.cs:350 | ✅ 已文档化 | client-api.md §11.1 |
| 38 | POST | /api/widget/v1/{tenantCode}/sessions | Program.cs:356 | ✅ 已文档化 | client-api.md §11.1 |

### 1.7 Widget 鉴权组 `/api/widget/v1/*`（需 visitorToken）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 39 | GET | /api/widget/v1/sessions/{sessionId} | Program.cs:395 | ✅ 已文档化 | client-api.md §11.2 |
| 40 | GET | /api/widget/v1/sessions/{sessionId}/messages | Program.cs:401 | ✅ 已文档化 | client-api.md §11.2 |
| 41 | POST | /api/widget/v1/media/upload | Program.cs:407 | ✅ 已文档化 | client-api.md §11.2 |
| 42 | POST | /api/widget/v1/sessions/{sessionId}/messages | Program.cs:426 | ✅ 已文档化 | client-api.md §11.2 |
| 43 | POST | /api/widget/v1/sessions/{sessionId}/token/refresh | Program.cs:432 | ✅ 已文档化 | client-api.md §11.2 |
| 44 | POST | /api/widget/v1/sessions/{sessionId}/close | Program.cs:438 | ✅ 已文档化 | client-api.md §11.2 |
| 45 | POST | /api/widget/v1/sessions/{sessionId}/handoff | Program.cs:450 | ✅ 已文档化 | client-api.md §11.2 |
| 46 | POST | /api/widget/v1/sessions/{sessionId}/rate | Program.cs:459 | ✅ 已文档化 | client-api.md §11.2 |
| 47 | POST | /api/widget/v1/sessions/{sessionId}/reopen | Program.cs:465 | ✅ 已文档化 | client-api.md §11.2 |

### 1.8 客服兼容路径组 `/api/client/v1/customer-service/temp-sessions/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 48 | GET | /api/client/v1/customer-service/temp-sessions/dashboard | Program.cs:501 | ✅ 已文档化 | client-api.md §12.11 |
| 49 | GET | /api/client/v1/customer-service/temp-sessions/mine | Program.cs:507 | ✅ 已文档化 | client-api.md §12.11 |
| 50 | GET | /api/client/v1/customer-service/temp-sessions/queue | Program.cs:513 | ✅ 已文档化 | client-api.md §12.11 |
| 51 | GET | /api/client/v1/customer-service/temp-sessions/{sessionId} | Program.cs:519 | ✅ 已文档化 | client-api.md §12.11 |
| 52 | POST | /api/client/v1/customer-service/temp-sessions/{sessionId}/claim | Program.cs:525 | ✅ 已文档化 | client-api.md §12.11 |
| 53 | POST | /api/client/v1/customer-service/temp-sessions/{sessionId}/takeover | Program.cs:531 | ✅ 已文档化 | client-api.md §12.11 |
| 54 | POST | /api/client/v1/customer-service/temp-sessions/{sessionId}/messages | Program.cs:537 | ✅ 已文档化 | client-api.md §12.11 |
| 55 | POST | /api/client/v1/customer-service/temp-sessions/{sessionId}/close | Program.cs:543 | ✅ 已文档化 | client-api.md §12.11 |

### 1.9 统一客服工作台组 `/api/client/v1/customer-service/workbench/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 56 | GET | /api/client/v1/customer-service/workbench/dashboard | Program.cs:560 | ✅ 已文档化 | client-api.md §12.1 |
| 57 | GET | /api/client/v1/customer-service/workbench/threads | Program.cs:566 | ✅ 已文档化 | client-api.md §12.2 |
| 58 | GET | /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId} | Program.cs:572 | ✅ 已文档化 | client-api.md §12.3 |
| 59 | POST | /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages | Program.cs:578 | ✅ 已文档化 | client-api.md §12.4 |
| 60 | POST | /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/claim | Program.cs:584 | ✅ 已文档化 | client-api.md §12.5 |
| 61 | POST | /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/takeover | Program.cs:590 | ✅ 已文档化 | client-api.md §12.6 |
| 62 | POST | /api/client/v1/customer-service/workbench/threads/temp-session/{threadId}/close | Program.cs:596 | ✅ 已文档化 | client-api.md §12.7 |
| 63 | POST | /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/claim | Program.cs:602 | ✅ 已文档化 | client-api.md §12.8 |
| 64 | POST | /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/takeover | Program.cs:608 | ✅ 已文档化 | client-api.md §12.9 |
| 65 | POST | /api/client/v1/customer-service/workbench/threads/direct-customer/{threadId}/close | Program.cs:614 | ✅ 已文档化 | client-api.md §12.10 |

### 1.10 会话列表与媒体上传 `/api/client/v1/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 66 | GET | /api/client/v1/conversations | Program.cs:634 | ✅ 已文档化 | client-api.md §7.1 |
| 67 | POST | /api/client/v1/media/upload | Program.cs:645 | ✅ 已文档化 | client-api.md §0.3 / §7.4 |

### 1.11 单聊组 `/api/client/v1/direct-chats/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 68 | POST | /api/client/v1/direct-chats/ | Program.cs:670 | ✅ 已文档化 | client-api.md §7.2 |
| 69 | GET | /api/client/v1/direct-chats/{chatId} | Program.cs:676 | ✅ 已文档化 | client-api.md §7.2 |
| 70 | POST | /api/client/v1/direct-chats/{chatId}/messages | Program.cs:682 | ✅ 已文档化 | client-api.md §7.2 |
| 71 | GET | /api/client/v1/direct-chats/{chatId}/messages | Program.cs:688 | ✅ 已文档化 | client-api.md §7.2 |
| 72 | POST | /api/client/v1/direct-chats/{chatId}/read | Program.cs:694 | ✅ 已文档化 | client-api.md §7.2 |
| 73 | GET | /api/client/v1/direct-chats/{chatId}/read-status | Program.cs:700 | ✅ 已文档化 | client-api.md §7.2 |
| 74 | PUT | /api/client/v1/direct-chats/{chatId}/pin | Program.cs:706 | ✅ 已文档化 | client-api.md §7.2 |
| 75 | PUT | /api/client/v1/direct-chats/{chatId}/mute | Program.cs:712 | ✅ 已文档化 | client-api.md §7.2 |
| 76 | POST | /api/client/v1/direct-chats/{chatId}/typing | Program.cs:718 | ✅ 已文档化 | client-api.md §7.2 |
| 77 | GET | /api/client/v1/direct-chats/{chatId}/files | Program.cs:721 | ✅ 已文档化 | client-api.md §7.2 |
| 78 | PUT | /api/client/v1/direct-chats/{chatId}/draft | Program.cs:727 | ✅ 已文档化 | client-api.md §7.2 |
| 79 | DELETE | /api/client/v1/direct-chats/{chatId}/draft | Program.cs:733 | ✅ 已文档化 | client-api.md §7.2 |

### 1.12 群聊组 `/api/client/v1/groups/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 80 | POST | /api/client/v1/groups/ | Program.cs:745 | ✅ 已文档化 | client-api.md §7.3 群生命周期 |
| 81 | GET | /api/client/v1/groups/{groupId} | Program.cs:751 | ✅ 已文档化 | client-api.md §7.3 群生命周期 |
| 82 | PUT | /api/client/v1/groups/{groupId} | Program.cs:757 | ✅ 已文档化 | client-api.md §7.3 群生命周期 |
| 83 | DELETE | /api/client/v1/groups/{groupId} | Program.cs:763 | ✅ 已文档化 | client-api.md §7.3 群生命周期 |
| 84 | POST | /api/client/v1/groups/{groupId}/messages | Program.cs:771 | ✅ 已文档化 | client-api.md §7.3 群消息 |
| 85 | GET | /api/client/v1/groups/{groupId}/messages | Program.cs:777 | ✅ 已文档化 | client-api.md §7.3 群消息 |
| 86 | POST | /api/client/v1/groups/{groupId}/read | Program.cs:783 | ✅ 已文档化 | client-api.md §7.3 群消息 |
| 87 | GET | /api/client/v1/groups/{groupId}/read-receipts | Program.cs:789 | ✅ 已文档化 | client-api.md §7.3 群消息 |
| 88 | POST | /api/client/v1/groups/{groupId}/typing | Program.cs:795 | ✅ 已文档化 | client-api.md §7.3 群消息 |
| 89 | GET | /api/client/v1/groups/{groupId}/members | Program.cs:800 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 90 | POST | /api/client/v1/groups/{groupId}/members | Program.cs:806 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 91 | DELETE | /api/client/v1/groups/{groupId}/members/{userId} | Program.cs:812 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 92 | POST | /api/client/v1/groups/{groupId}/leave | Program.cs:818 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 93 | POST | /api/client/v1/groups/{groupId}/transfer-owner | Program.cs:824 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 94 | PUT | /api/client/v1/groups/{groupId}/members/{targetUserId}/role | Program.cs:830 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 95 | PUT | /api/client/v1/groups/{groupId}/members/{targetUserId}/mute | Program.cs:836 | ✅ 已文档化 | client-api.md §7.3 群成员 |
| 96 | GET | /api/client/v1/groups/{groupId}/settings | Program.cs:844 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 97 | PUT | /api/client/v1/groups/{groupId}/settings | Program.cs:850 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 98 | PUT | /api/client/v1/groups/{groupId}/mute-mode | Program.cs:856 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 99 | GET | /api/client/v1/groups/{groupId}/announcements | Program.cs:864 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 100 | GET | /api/client/v1/groups/{groupId}/join-requests | Program.cs:872 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 101 | POST | /api/client/v1/groups/{groupId}/join-requests | Program.cs:878 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 102 | POST | /api/client/v1/groups/{groupId}/join-requests/{requestId}/approve | Program.cs:884 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 103 | POST | /api/client/v1/groups/{groupId}/join-requests/{requestId}/reject | Program.cs:890 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 104 | POST | /api/client/v1/groups/{groupId}/announcements | Program.cs:896 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 105 | PUT | /api/client/v1/groups/{groupId}/announcements/{announcementId} | Program.cs:902 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 106 | DELETE | /api/client/v1/groups/{groupId}/announcements/{announcementId} | Program.cs:908 | ✅ 已文档化 | client-api.md §7.3 群设置与公告 |
| 107 | PUT | /api/client/v1/groups/{groupId}/pin | Program.cs:916 | ✅ 已文档化 | client-api.md §7.3 群个人设置 |
| 108 | PUT | /api/client/v1/groups/{groupId}/mute | Program.cs:922 | ✅ 已文档化 | client-api.md §7.3 群个人设置 |
| 109 | PUT | /api/client/v1/groups/{groupId}/draft | Program.cs:928 | ✅ 已文档化 | client-api.md §7.3 群个人设置 |
| 110 | DELETE | /api/client/v1/groups/{groupId}/draft | Program.cs:934 | ✅ 已文档化 | client-api.md §7.3 群个人设置 |
| 111 | GET | /api/client/v1/groups/{groupId}/files | Program.cs:940 | ✅ 已文档化 | client-api.md §7.3 群个人设置 |

### 1.13 消息通用组 `/api/client/v1/messages/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 112 | POST | /api/client/v1/messages/{messageId}/recall | Program.cs:950 | ✅ 已文档化 | client-api.md §7.4 |
| 113 | POST | /api/client/v1/messages/{messageId}/delete | Program.cs:956 | ✅ 已文档化 | client-api.md §7.4 |
| 114 | POST | /api/client/v1/messages/forward | Program.cs:962 | ✅ 已文档化 | client-api.md §7.4 |
| 115 | POST | /api/client/v1/messages/voice-to-text | Program.cs:1506 | ✅ 已文档化 | client-api.md §19.1 |

### 1.14 收藏组 `/api/client/v1/favorites/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 116 | GET | /api/client/v1/favorites | Program.cs:972 | ✅ 已文档化 | client-api.md §8.1 |
| 117 | GET | /api/client/v1/favorites/list | Program.cs:978 | ✅ 已文档化 | client-api.md §8.1 |
| 118 | GET | /api/client/v1/favorites/summary | Program.cs:988 | ✅ 已文档化 | client-api.md §8.1 |
| 119 | POST | /api/client/v1/favorites | Program.cs:994 | ✅ 已文档化 | client-api.md §8.1 |
| 120 | DELETE | /api/client/v1/favorites/{favoriteId} | Program.cs:1000 | ✅ 已文档化 | client-api.md §8.1 |

### 1.15 草稿组 `/api/client/v1/drafts`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 121 | GET | /api/client/v1/drafts | Program.cs:1010 | ✅ 已文档化 | client-api.md §8.2 |

### 1.16 搜索组 `/api/client/v1/search/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 122 | GET | /api/client/v1/search/messages | Program.cs:1020 | ✅ 已文档化 | client-api.md §8.3 |
| 123 | GET | /api/client/v1/search/users | Program.cs:1027 | ✅ 已文档化 | client-api.md §8.3 |

### 1.17 通知设置组 `/api/client/v1/notification-settings`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 124 | GET | /api/client/v1/notification-settings | Program.cs:1040 | ✅ 已文档化 | client-api.md §8.4 |
| 125 | PUT | /api/client/v1/notification-settings | Program.cs:1046 | ✅ 已文档化 | client-api.md §8.4 |

### 1.18 翻译组 `/api/client/v1/translate/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 126 | POST | /api/client/v1/translate/message | Program.cs:1056 | ✅ 已文档化 | client-api.md §8.5 |
| 127 | POST | /api/client/v1/translate/text | Program.cs:1062 | ✅ 已文档化 | client-api.md §8.5 |

### 1.19 在线状态组 `/api/client/v1/presence/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 128 | GET | /api/client/v1/presence/{userId} | Program.cs:1072 | ✅ 已文档化 | client-api.md §9.1 |
| 129 | POST | /api/client/v1/presence/batch | Program.cs:1078 | ✅ 已文档化 | client-api.md §9.1 |
| 130 | PUT | /api/client/v1/presence/status | Program.cs:1084 | ✅ 已文档化 | client-api.md §9.1 |
| 131 | POST | /api/client/v1/presence/offline | Program.cs:1090 | ✅ 已文档化 | client-api.md §9.1 |

### 1.20 同步组 `/api/client/v1/sync`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 132 | GET | /api/client/v1/sync | Program.cs:1096 | ✅ 已文档化 | client-api.md §9.2 |

### 1.21 个人资料组 `/api/client/v1/profile/*` 与 `/api/client/v1/users/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 133 | GET | /api/client/v1/profile/me | Program.cs:1106 | ✅ 已文档化 | client-api.md §6.1 |
| 134 | PUT | /api/client/v1/profile/me | Program.cs:1112 | ✅ 已文档化 | client-api.md §6.1 |
| 135 | GET | /api/client/v1/users/{userId}/profile | Program.cs:1118 | ✅ 已文档化 | client-api.md §6.1 |
| 136 | PUT | /api/client/v1/profile/me/lpp-id | Program.cs:1124 | ✅ 已文档化 | client-api.md §6.1 |
| 137 | GET | /api/client/v1/profile/me/privacy | Program.cs:1516 | ✅ 已文档化 | client-api.md §19.7 |
| 138 | PUT | /api/client/v1/profile/me/privacy | Program.cs:1522 | ✅ 已文档化 | client-api.md §19.8 |
| 139 | GET | /api/client/v1/profile/me/addresses | Program.cs:1532 | ✅ 已文档化 | client-api.md §19.11-14 |
| 140 | POST | /api/client/v1/profile/me/addresses | Program.cs:1538 | ✅ 已文档化 | client-api.md §19.11-14 |
| 141 | PUT | /api/client/v1/profile/me/addresses/{addressId} | Program.cs:1544 | ✅ 已文档化 | client-api.md §19.11-14 |
| 142 | DELETE | /api/client/v1/profile/me/addresses/{addressId} | Program.cs:1550 | ✅ 已文档化 | client-api.md §19.11-14 |

### 1.22 好友组 `/api/client/v1/friends/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 143 | GET | /api/client/v1/friends | Program.cs:1134 | ✅ 已文档化 | client-api.md §6.2 |
| 144 | POST | /api/client/v1/friends/request | Program.cs:1140 | ✅ 已文档化 | client-api.md §6.2 |
| 145 | GET | /api/client/v1/friends/requests | Program.cs:1146 | ✅ 已文档化 | client-api.md §6.2 |
| 146 | POST | /api/client/v1/friends/requests/{requestId}/handle | Program.cs:1152 | ✅ 已文档化 | client-api.md §6.2 |
| 147 | PUT | /api/client/v1/friends/{friendUserId} | Program.cs:1158 | ✅ 已文档化 | client-api.md §6.2 |
| 148 | DELETE | /api/client/v1/friends/{friendUserId} | Program.cs:1164 | ✅ 已文档化 | client-api.md §6.2 |

### 1.23 黑名单组 `/api/client/v1/blocklist`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 149 | GET | /api/client/v1/blocklist | Program.cs:1174 | ✅ 已文档化 | client-api.md §6.3 |
| 150 | POST | /api/client/v1/blocklist | Program.cs:1180 | ✅ 已文档化 | client-api.md §6.3 |
| 151 | DELETE | /api/client/v1/blocklist/{blockedUserId} | Program.cs:1186 | ✅ 已文档化 | client-api.md §6.3 |

### 1.24 租户管理组 `/api/client/v1/tenant/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 152 | GET | /api/client/v1/tenant/info | Program.cs:1210 | ✅ 已文档化 | client-api.md §4.1 |
| 153 | GET | /api/client/v1/tenant/features | Program.cs:1217 | ✅ 已文档化 | client-api.md §4.5 |
| 154 | PUT | /api/client/v1/tenant/features | Program.cs:1232 | ⚠️ 过时 | client-api.md §4.5 仅记录 GET，PUT 未文档化；源码响应含 `designatedServiceStaffId` 字段文档中缺失 |
| 155 | PUT | /api/client/v1/tenant/info | Program.cs:1276 | ✅ 已文档化 | client-api.md §4.1 |
| 156 | POST | /api/client/v1/tenant/leave | Program.cs:1282 | ✅ 已文档化 | client-api.md §4.1 |
| 157 | GET | /api/client/v1/tenant/members | Program.cs:1288 | ✅ 已文档化 | client-api.md §4.2 |
| 158 | DELETE | /api/client/v1/tenant/members/{userId} | Program.cs:1294 | ✅ 已文档化 | client-api.md §4.2 |
| 159 | PUT | /api/client/v1/tenant/members/{userId}/role | Program.cs:1300 | ✅ 已文档化 | client-api.md §4.2 |
| 160 | POST | /api/client/v1/tenant/invitations | Program.cs:1306 | ✅ 已文档化 | client-api.md §4.3 |
| 161 | GET | /api/client/v1/tenant/invitations | Program.cs:1312 | ✅ 已文档化 | client-api.md §4.3 |
| 162 | DELETE | /api/client/v1/tenant/invitations/{invitationId} | Program.cs:1318 | ✅ 已文档化 | client-api.md §4.3 |
| 163 | GET | /api/client/v1/tenant/join-requests | Program.cs:1324 | ✅ 已文档化 | client-api.md §4.4 |
| 164 | POST | /api/client/v1/tenant/join-requests/{requestId}/approve | Program.cs:1330 | ✅ 已文档化 | client-api.md §4.4 |
| 165 | POST | /api/client/v1/tenant/join-requests/{requestId}/reject | Program.cs:1336 | ✅ 已文档化 | client-api.md §4.4 |

### 1.25 企业公告 `/api/client/v1/announcements`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 166 | GET | /api/client/v1/announcements | Program.cs:1363 | ✅ 已文档化 | client-api.md §4.6 |

### 1.26 部门管理组 `/api/client/v1/departments/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 167 | GET | /api/client/v1/departments/ | Program.cs:1408 | ✅ 已文档化 | client-api.md §5 |
| 168 | POST | /api/client/v1/departments/ | Program.cs:1414 | ✅ 已文档化 | client-api.md §5 |
| 169 | PUT | /api/client/v1/departments/{departmentId} | Program.cs:1420 | ✅ 已文档化 | client-api.md §5 |
| 170 | DELETE | /api/client/v1/departments/{departmentId} | Program.cs:1426 | ✅ 已文档化 | client-api.md §5 |
| 171 | GET | /api/client/v1/departments/{departmentId}/members | Program.cs:1432 | ✅ 已文档化 | client-api.md §5 |
| 172 | POST | /api/client/v1/departments/{departmentId}/members | Program.cs:1438 | ✅ 已文档化 | client-api.md §5 |
| 173 | PUT | /api/client/v1/departments/{departmentId}/members/{userId} | Program.cs:1444 | ✅ 已文档化 | client-api.md §5 |
| 174 | DELETE | /api/client/v1/departments/{departmentId}/members/{userId} | Program.cs:1450 | ✅ 已文档化 | client-api.md §5 |

### 1.27 反馈组 `/api/client/v1/feedback`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 175 | POST | /api/client/v1/feedback | Program.cs:1560 | ✅ 已文档化 | client-api.md §19.15 |

### 1.28 媒体下载（动态前缀）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 176 | GET | /media/{mediaId}（动态前缀，默认 `/media`） | Program.cs:52 | ✅ 已文档化 | client-api.md §0.3 中提及 `/media/{mediaId}` |

---

### 1.A Api 宿主审计汇总

| 指标 | 原始 | 最终 |
|---|---|---|
| 总端点数 | 176 | 176 |
| ✅ 已文档化 | 173 | **176** |
| ❌ 缺失 | 2 | **0** |
| ⚠️ 过时 | 1 | **0** |

#### 缺失端点清单（原始，现均已覆盖）

| # | 路由 | 说明 | 最终位置 |
|---|---|---|---|
| 10 | GET /api/platform/v1/tenants/search-for-register | 注册前搜索租户 | client-api.md §1.6 |
| 11 | GET /api/platform/v1/client-config | 客户端配置（企业绑定模式） | client-api.md §1.5 / README §认证与安全 |

#### 过时端点清单（原始，现均已对齐）

| # | 路由 | 差异说明 | 最终位置 |
|---|---|---|---|
| 154 | PUT /api/client/v1/tenant/features | client-api.md §4.5 仅记录了 GET 方法，PUT 方法未文档化；且 GET 响应中源码实际还返回 `designatedServiceStaffId` 字段，文档中缺失 | client-api.md §4.5 PUT 完整请求/响应字段；client-api-reference.md §2.6 |


---

## 2. AdminApi 宿主（ZTChat.Hosts.AdminApi）

源码文件：`src/Hosts/ZTChat.Hosts.AdminApi/Program.cs`

### 2.1 公开媒体端点（无需鉴权）

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 1 | GET | /api/admin/v1/public/media/{mediaId} | Program.cs:56 | ✅ 已文档化 | admin-api.md §1.1 / §2.3 |

### 2.2 认证组 `/api/admin/v1/auth/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 2 | GET | /api/admin/v1/auth/captcha/check | Program.cs:77 | ✅ 已文档化 | admin-api.md §1.1 |
| 3 | POST | /api/admin/v1/auth/captcha/generate | Program.cs:89 | ✅ 已文档化 | admin-api.md §1.1 |
| 4 | POST | /api/admin/v1/auth/login | Program.cs:98 | ✅ 已文档化 | admin-api.md §1.2 |
| 5 | POST | /api/admin/v1/auth/select-tenant | Program.cs:161 | ✅ 已文档化 | admin-api.md §1.4 |

### 2.3 鉴权媒体端点 `/api/admin/v1/media/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 6 | GET | /api/admin/v1/media/{mediaId} | Program.cs:216 | ✅ 已文档化 | admin-api.md §2.3（鉴权版媒体下载） |
| 7 | POST | /api/admin/v1/media/upload | Program.cs:1267 | ✅ 已文档化 | admin-api.md §3.2 提及管理端媒体上传 |

### 2.4 统一客服中心组 `/api/admin/v1/customer-service/center/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 8 | GET | /api/admin/v1/customer-service/center/dashboard | Program.cs:238 | ✅ 已文档化 | admin-api.md §3.2A |
| 9 | GET | /api/admin/v1/customer-service/center/staff-statuses | Program.cs:245 | ✅ 已文档化 | admin-api.md §3.2A |
| 10 | GET | /api/admin/v1/customer-service/center/threads | Program.cs:252 | ✅ 已文档化 | admin-api.md §3.2A |
| 11 | GET | /api/admin/v1/customer-service/center/threads/{threadType}/{threadId} | Program.cs:259 | ✅ 已文档化 | admin-api.md §3.2A |
| 12 | POST | /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/assign | Program.cs:266 | ✅ 已文档化 | admin-api.md §3.2A |
| 13 | POST | /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/force-close | Program.cs:273 | ✅ 已文档化 | admin-api.md §3.2A |

### 2.5 临时会话管理组 `/api/admin/v1/customer-service/temp-sessions/*`

#### 2.5.1 看板与会话列表

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 14 | GET | /api/admin/v1/customer-service/temp-sessions/dashboard | Program.cs:280 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 15 | GET | /api/admin/v1/customer-service/temp-sessions/ | Program.cs:524 | ❌ 缺失 | 临时会话列表，admin-api.md 未记录独立端点文档 |
| 16 | GET | /api/admin/v1/customer-service/temp-sessions/{sessionId} | Program.cs:531 | ❌ 缺失 | 临时会话详情，admin-api.md 未记录独立端点文档 |
| 17 | GET | /api/admin/v1/customer-service/temp-sessions/stats | Program.cs:517 | ❌ 缺失 | 临时会话统计，admin-api.md 未记录 |

#### 2.5.2 访客管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 18 | GET | /api/admin/v1/customer-service/temp-sessions/visitors | Program.cs:287 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 19 | GET | /api/admin/v1/customer-service/temp-sessions/visitors/{visitorId} | Program.cs:294 | ❌ 缺失 | 访客详情，admin-api.md 未记录独立端点文档 |

#### 2.5.3 客服状态管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 20 | GET | /api/admin/v1/customer-service/temp-sessions/staff-statuses | Program.cs:301 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 21 | PUT | /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId} | Program.cs:308 | ❌ 缺失 | 更新客服状态，admin-api.md 未记录独立端点文档 |
| 22 | POST | /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/force-offline | Program.cs:315 | ❌ 缺失 | 强制下线客服，admin-api.md 未记录独立端点文档 |
| 23 | POST | /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/reset-load | Program.cs:322 | ❌ 缺失 | 重置客服负载，admin-api.md 未记录独立端点文档 |

#### 2.5.4 自动回复与快捷回复

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 24 | GET | /api/admin/v1/customer-service/temp-sessions/auto-replies | Program.cs:329 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 25 | GET | /api/admin/v1/customer-service/temp-sessions/quick-replies | Program.cs:336 | ✅ 已文档化 | admin-api.md §3.2A 提及 |

#### 2.5.5 技能组

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 26 | GET | /api/admin/v1/customer-service/temp-sessions/skill-groups | Program.cs:343 | ✅ 已文档化 | admin-api.md §3.2A 提及 |

#### 2.5.6 黑名单

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 27 | GET | /api/admin/v1/customer-service/temp-sessions/blacklist | Program.cs:350 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 28 | POST | /api/admin/v1/customer-service/temp-sessions/blacklist | Program.cs:357 | ❌ 缺失 | 创建黑名单条目，admin-api.md 未记录独立端点文档 |
| 29 | DELETE | /api/admin/v1/customer-service/temp-sessions/blacklist/{blacklistId} | Program.cs:364 | ❌ 缺失 | 删除黑名单条目，admin-api.md 未记录独立端点文档 |

#### 2.5.7 敏感词

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 30 | GET | /api/admin/v1/customer-service/temp-sessions/sensitive-words | Program.cs:371 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 31 | POST | /api/admin/v1/customer-service/temp-sessions/sensitive-words | Program.cs:378 | ❌ 缺失 | 创建敏感词，admin-api.md 未记录独立端点文档 |
| 32 | DELETE | /api/admin/v1/customer-service/temp-sessions/sensitive-words/{wordId} | Program.cs:385 | ❌ 缺失 | 删除敏感词，admin-api.md 未记录独立端点文档 |

#### 2.5.8 知识库

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 33 | GET | /api/admin/v1/customer-service/temp-sessions/knowledge-bases | Program.cs:392 | ❌ 缺失 | 知识库列表，admin-api.md 未记录 |
| 34 | POST | /api/admin/v1/customer-service/temp-sessions/knowledge-bases | Program.cs:399 | ❌ 缺失 | 创建知识库，admin-api.md 未记录 |
| 35 | PUT | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId} | Program.cs:406 | ❌ 缺失 | 更新知识库，admin-api.md 未记录 |
| 36 | DELETE | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId} | Program.cs:413 | ❌ 缺失 | 删除知识库，admin-api.md 未记录 |
| 37 | POST | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/rebuild | Program.cs:420 | ❌ 缺失 | 重建知识库索引，admin-api.md 未记录 |
| 38 | GET | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents | Program.cs:427 | ❌ 缺失 | 知识库文档列表，admin-api.md 未记录 |
| 39 | POST | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents | Program.cs:434 | ❌ 缺失 | 创建知识库文档，admin-api.md 未记录 |
| 40 | POST | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/import | Program.cs:441 | ❌ 缺失 | 导入知识库文档（文件上传），admin-api.md 未记录 |
| 41 | PUT | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId} | Program.cs:475 | ❌ 缺失 | 更新知识库文档，admin-api.md 未记录 |
| 42 | DELETE | /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId} | Program.cs:482 | ❌ 缺失 | 删除知识库文档，admin-api.md 未记录 |

#### 2.5.9 配置与 AI

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 43 | GET | /api/admin/v1/customer-service/temp-sessions/config | Program.cs:489 | ✅ 已文档化 | admin-api.md §3.2A 提及 |
| 44 | PUT | /api/admin/v1/customer-service/temp-sessions/config | Program.cs:496 | ❌ 缺失 | 更新临时会话配置，admin-api.md 未记录独立端点文档 |
| 45 | POST | /api/admin/v1/customer-service/temp-sessions/config/ai/probe | Program.cs:503 | ❌ 缺失 | AI 供应商探测，admin-api.md 未记录 |
| 46 | GET | /api/admin/v1/customer-service/temp-sessions/widget/test-url | Program.cs:510 | ❌ 缺失 | 生成 Widget 测试 URL，admin-api.md 未记录 |

#### 2.5.10 会话操作

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 47 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/claim | Program.cs:538 | ❌ 缺失 | 认领临时会话，admin-api.md 未记录独立端点文档 |
| 48 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/takeover | Program.cs:545 | ❌ 缺失 | 接管临时会话，admin-api.md 未记录独立端点文档 |
| 49 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/resume-ai | Program.cs:552 | ❌ 缺失 | 恢复 AI 接管，admin-api.md 未记录 |
| 50 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/messages | Program.cs:559 | ❌ 缺失 | 管理端发送消息，admin-api.md 未记录独立端点文档 |
| 51 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/force-close | Program.cs:566 | ❌ 缺失 | 强制关闭临时会话，admin-api.md 未记录独立端点文档 |
| 52 | POST | /api/admin/v1/customer-service/temp-sessions/{sessionId}/close | Program.cs:573 | ❌ 缺失 | 正常关闭临时会话，admin-api.md 未记录独立端点文档 |

### 2.6 仪表盘 `/api/admin/v1/dashboard*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 53 | GET | /api/admin/v1/dashboard | Program.cs:580 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 54 | GET | /api/admin/v1/dashboard/v2 | Program.cs:840 | ❌ 缺失 | V2 仪表盘，admin-api.md 未记录 |

### 2.7 用户管理组 `/api/admin/v1/users/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 55 | GET | /api/admin/v1/users | Program.cs:587 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 56 | GET | /api/admin/v1/users/{userId} | Program.cs:594 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 57 | POST | /api/admin/v1/users/{userId}/customer-service/assign | Program.cs:601 | ✅ 已文档化 | admin-api.md §3.2 提及客服归属改绑 |
| 58 | POST | /api/admin/v1/users/{userId}/disable | Program.cs:624 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 59 | POST | /api/admin/v1/users/{userId}/enable | Program.cs:630 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 60 | POST | /api/admin/v1/users/{userId}/force-logout | Program.cs:636 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 61 | POST | /api/admin/v1/users/{userId}/mute | Program.cs:642 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 62 | POST | /api/admin/v1/users/{userId}/unmute | Program.cs:648 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 63 | GET | /api/admin/v1/users/{userId}/mute-status | Program.cs:654 | ❌ 缺失 | 用户禁言状态查询，admin-api.md 未记录独立端点文档 |
| 64 | POST | /api/admin/v1/users/{userId}/rate-limit | Program.cs:663 | ✅ 已文档化 | admin-api.md §3.2 提及用户治理 |
| 65 | POST | /api/admin/v1/users/{userId}/force-profile | Program.cs:669 | ✅ 已文档化 | admin-api.md §3.2 提及用户治理 |
| 66 | PUT | /api/admin/v1/users/{userId}/note | Program.cs:675 | ✅ 已文档化 | admin-api.md §3.2 提及用户治理 |
| 67 | GET | /api/admin/v1/users/{userId}/governance | Program.cs:681 | ✅ 已文档化 | admin-api.md §3.2 提及用户治理 |
| 68 | POST | /api/admin/v1/users/{userId}/reset-password | Program.cs:712 | ❌ 缺失 | 重置用户密码，admin-api.md 未记录独立端点文档 |
| 69 | PUT | /api/admin/v1/users/{userId}/roles | Program.cs:718 | ❌ 缺失 | 更新用户角色，admin-api.md 未记录独立端点文档 |
| 70 | POST | /api/admin/v1/users/batch-disable | Program.cs:1440 | ✅ 已文档化 | admin-api.md §3.2 提及批量操作 |
| 71 | POST | /api/admin/v1/users/batch-enable | Program.cs:1447 | ✅ 已文档化 | admin-api.md §3.2 提及批量操作 |

### 2.8 客服批量转移 `/api/admin/v1/customer-service/batch-transfer`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 72 | POST | /api/admin/v1/customer-service/batch-transfer | Program.cs:613 | ❌ 缺失 | 批量转移客服归属，admin-api.md 未记录独立端点文档 |

### 2.9 群管理组 `/api/admin/v1/groups/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 73 | GET | /api/admin/v1/groups | Program.cs:724 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 74 | GET | /api/admin/v1/groups/{conversationId} | Program.cs:847 | ❌ 缺失 | 群详情，admin-api.md 未记录独立端点文档 |
| 75 | POST | /api/admin/v1/groups/{conversationId}/mute-member | Program.cs:688 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |
| 76 | POST | /api/admin/v1/groups/{conversationId}/unmute-member | Program.cs:694 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |
| 77 | POST | /api/admin/v1/groups/{conversationId}/mute-all | Program.cs:700 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |
| 78 | POST | /api/admin/v1/groups/{conversationId}/freeze | Program.cs:706 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |
| 79 | POST | /api/admin/v1/groups/{conversationId}/disband | Program.cs:854 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |
| 80 | POST | /api/admin/v1/groups/{conversationId}/members/remove | Program.cs:860 | ✅ 已文档化 | admin-api.md §3.2 提及群治理 |

### 2.10 消息管理组 `/api/admin/v1/messages/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 81 | GET | /api/admin/v1/messages | Program.cs:737 | ✅ 已文档化 | admin-api.md §3.2 提及消息搜索 |
| 82 | GET | /api/admin/v1/messages/search | Program.cs:738 | ❌ 缺失 | 消息搜索别名路由，admin-api.md 未记录（与 /messages 共用处理函数） |
| 83 | POST | /api/admin/v1/messages/{messageId}/recall | Program.cs:923 | ✅ 已文档化 | admin-api.md §3.2 提及消息撤回 |

### 2.11 服务账号管理组 `/api/admin/v1/service-accounts/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 84 | GET | /api/admin/v1/service-accounts | Program.cs:740 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 85 | POST | /api/admin/v1/service-accounts | Program.cs:905 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 86 | PUT | /api/admin/v1/service-accounts/{serviceAccountId} | Program.cs:911 | ❌ 缺失 | 更新服务账号，admin-api.md 未记录独立端点文档 |
| 87 | DELETE | /api/admin/v1/service-accounts/{serviceAccountId} | Program.cs:917 | ❌ 缺失 | 删除服务账号，admin-api.md 未记录独立端点文档 |

### 2.12 角色与权限管理组 `/api/admin/v1/roles/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 88 | GET | /api/admin/v1/roles | Program.cs:747 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 89 | GET | /api/admin/v1/roles/{roleCode}/permissions | Program.cs:754 | ❌ 缺失 | 角色权限查询，admin-api.md 未记录独立端点文档 |
| 90 | PUT | /api/admin/v1/roles/{roleCode}/permissions | Program.cs:761 | ❌ 缺失 | 更新角色权限，admin-api.md 未记录独立端点文档 |

### 2.13 Webhook 投递管理组 `/api/admin/v1/webhook-deliveries/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 91 | GET | /api/admin/v1/webhook-deliveries | Program.cs:767 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 92 | POST | /api/admin/v1/webhook-deliveries/{deliveryId}/retry | Program.cs:782 | ❌ 缺失 | 重试投递，admin-api.md 未记录独立端点文档 |
| 93 | POST | /api/admin/v1/webhook-deliveries/{deliveryId}/replay | Program.cs:789 | ❌ 缺失 | 重放投递，admin-api.md 未记录独立端点文档 |

### 2.14 系统配置管理组 `/api/admin/v1/system-configs/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 94 | GET | /api/admin/v1/system-configs | Program.cs:796 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 95 | PUT | /api/admin/v1/system-configs/{configKey} | Program.cs:803 | ❌ 缺失 | 更新配置项，admin-api.md 未记录独立端点文档 |
| 96 | GET | /api/admin/v1/system-configs/{configKey}/history | Program.cs:810 | ❌ 缺失 | 配置变更历史，admin-api.md 未记录独立端点文档 |
| 97 | POST | /api/admin/v1/system-configs/{configKey}/rollback | Program.cs:817 | ❌ 缺失 | 回滚配置，admin-api.md 未记录独立端点文档 |

### 2.15 审计日志 `/api/admin/v1/audit-logs`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 98 | GET | /api/admin/v1/audit-logs | Program.cs:824 | ✅ 已文档化 | admin-api.md §3.2 提及 |

### 2.16 服务健康 `/api/admin/v1/service-health`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 99 | GET | /api/admin/v1/service-health | Program.cs:831 | ✅ 已文档化 | admin-api.md §3.2 提及 |

### 2.17 BOT 应用管理组 `/api/admin/v1/bot-apps/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 100 | GET | /api/admin/v1/bot-apps | Program.cs:867 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 101 | POST | /api/admin/v1/bot-apps | Program.cs:874 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 102 | POST | /api/admin/v1/bot-apps/{appId}/disable | Program.cs:880 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 103 | POST | /api/admin/v1/bot-apps/{appId}/enable | Program.cs:886 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 104 | GET | /api/admin/v1/bot-apps/{appId}/conversation-grants | Program.cs:892 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 105 | PUT | /api/admin/v1/bot-apps/{appId}/conversation-grants | Program.cs:899 | ❌ 缺失 | 更新 BOT 会话授权，admin-api.md 未记录独立端点文档 |

### 2.18 发件箱与广播 `/api/admin/v1/outbox` / `/api/admin/v1/broadcast`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 106 | GET | /api/admin/v1/outbox | Program.cs:929 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 107 | POST | /api/admin/v1/broadcast | Program.cs:936 | ✅ 已文档化 | admin-api.md §3.2 提及 |

### 2.19 在线用户 `/api/admin/v1/online-users`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 108 | GET | /api/admin/v1/online-users | Program.cs:942 | ✅ 已文档化 | admin-api.md §3.2 提及 |

### 2.20 会话转移 `/api/admin/v1/conversations/transfer`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 109 | POST | /api/admin/v1/conversations/transfer | Program.cs:951 | ✅ 已文档化 | admin-api.md §3.2 提及员工离职换绑 |

### 2.21 验证码管理组 `/api/admin/v1/verification-*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 110 | GET | /api/admin/v1/verification-codes | Program.cs:1197 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 111 | GET | /api/admin/v1/verification-settings | Program.cs:1212 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 112 | PUT | /api/admin/v1/verification-settings | Program.cs:1219 | ❌ 缺失 | 更新验证设置，admin-api.md 未记录独立端点文档 |

### 2.22 告警规则组 `/api/admin/v1/alert-rules/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 113 | GET | /api/admin/v1/alert-rules | Program.cs:1311 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 114 | POST | /api/admin/v1/alert-rules | Program.cs:1317 | ❌ 缺失 | 创建告警规则，admin-api.md 未记录独立端点文档 |
| 115 | PUT | /api/admin/v1/alert-rules/{ruleId} | Program.cs:1323 | ❌ 缺失 | 更新告警规则，admin-api.md 未记录独立端点文档 |
| 116 | DELETE | /api/admin/v1/alert-rules/{ruleId} | Program.cs:1329 | ❌ 缺失 | 删除告警规则，admin-api.md 未记录独立端点文档 |

### 2.23 告警历史组 `/api/admin/v1/alert-history/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 117 | GET | /api/admin/v1/alert-history | Program.cs:1339 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 118 | POST | /api/admin/v1/alert-history/{alertId}/acknowledge | Program.cs:1345 | ❌ 缺失 | 确认告警，admin-api.md 未记录独立端点文档 |
| 119 | POST | /api/admin/v1/alert-history/{alertId}/silence | Program.cs:1351 | ❌ 缺失 | 静默告警，admin-api.md 未记录独立端点文档 |

### 2.24 通知渠道组 `/api/admin/v1/notify-channels/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 120 | GET | /api/admin/v1/notify-channels | Program.cs:1361 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 121 | POST | /api/admin/v1/notify-channels | Program.cs:1367 | ❌ 缺失 | 创建通知渠道，admin-api.md 未记录独立端点文档 |
| 122 | PUT | /api/admin/v1/notify-channels/{channelId} | Program.cs:1373 | ❌ 缺失 | 更新通知渠道，admin-api.md 未记录独立端点文档 |
| 123 | DELETE | /api/admin/v1/notify-channels/{channelId} | Program.cs:1379 | ❌ 缺失 | 删除通知渠道，admin-api.md 未记录独立端点文档 |
| 124 | POST | /api/admin/v1/notify-channels/{channelId}/test | Program.cs:1385 | ❌ 缺失 | 测试通知渠道，admin-api.md 未记录 |

### 2.25 公告管理组 `/api/admin/v1/announcements/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 125 | GET | /api/admin/v1/announcements | Program.cs:1395 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 126 | POST | /api/admin/v1/announcements | Program.cs:1401 | ❌ 缺失 | 创建公告，admin-api.md 未记录独立端点文档 |
| 127 | PUT | /api/admin/v1/announcements/{announcementId} | Program.cs:1407 | ❌ 缺失 | 更新公告，admin-api.md 未记录独立端点文档 |
| 128 | POST | /api/admin/v1/announcements/{announcementId}/publish | Program.cs:1413 | ❌ 缺失 | 发布公告，admin-api.md 未记录 |
| 129 | POST | /api/admin/v1/announcements/{announcementId}/archive | Program.cs:1419 | ❌ 缺失 | 归档公告，admin-api.md 未记录 |

### 2.26 管理员登录日志 `/api/admin/v1/admin-login-logs`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 130 | GET | /api/admin/v1/admin-login-logs | Program.cs:1429 | ✅ 已文档化 | admin-api.md §3.2 提及 |

### 2.27 导出任务组 `/api/admin/v1/export-tasks/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 131 | GET | /api/admin/v1/export-tasks | Program.cs:1458 | ✅ 已文档化 | admin-api.md §3.2 提及 |
| 132 | POST | /api/admin/v1/export-tasks | Program.cs:1464 | ❌ 缺失 | 创建导出任务，admin-api.md 未记录独立端点文档 |
| 133 | GET | /api/admin/v1/export-tasks/{taskId}/download | Program.cs:1470 | ✅ 已文档化 | admin-api.md §2.3 提及文件下载 |

### 2.28 音视频运维组 `/api/admin/v1/voicecall/*`

#### 2.28.1 节点管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 134 | GET | /api/admin/v1/voicecall/nodes | Program.cs:976 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 135 | GET | /api/admin/v1/voicecall/nodes/{nodeId}/calls | Program.cs:994 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 136 | PUT | /api/admin/v1/voicecall/nodes/{nodeId}/maintenance | Program.cs:1002 | ✅ 已文档化 | admin-api.md §3.3 提及 |

#### 2.28.2 通话会话管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 137 | GET | /api/admin/v1/voicecall/sessions | Program.cs:1011 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 138 | GET | /api/admin/v1/voicecall/sessions/active | Program.cs:1032 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 139 | GET | /api/admin/v1/voicecall/sessions/{callId} | Program.cs:1040 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 140 | DELETE | /api/admin/v1/voicecall/sessions/{callId} | Program.cs:1049 | ✅ 已文档化 | admin-api.md §3.3 提及强制结束通话 |

#### 2.28.3 录音管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 141 | GET | /api/admin/v1/voicecall/recordings | Program.cs:1101 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 142 | GET | /api/admin/v1/voicecall/recordings/{recordingId}/download | Program.cs:1121 | ✅ 已文档化 | admin-api.md §2.3 / §3.3 提及 |
| 143 | DELETE | /api/admin/v1/voicecall/recordings/{recordingId} | Program.cs:1147 | ✅ 已文档化 | admin-api.md §3.3 提及 |
| 144 | POST | /api/admin/v1/voicecall/recordings/cleanup | Program.cs:1168 | ✅ 已文档化 | admin-api.md §3.3 提及 |

### 2.29 平台管理组 `/api/admin/v1/platform/*`

#### 2.29.1 租户生命周期

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 145 | GET | /api/admin/v1/platform/tenants | Program.cs:1506 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 146 | GET | /api/admin/v1/platform/tenants/{tenantId} | Program.cs:1512 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 147 | GET | /api/admin/v1/platform/tenants/{tenantId}/permanent-delete-plan | Program.cs:1518 | ❌ 缺失 | 永久删除计划预览，admin-api.md 未记录 |
| 148 | POST | /api/admin/v1/platform/tenants/{tenantId}/permanent-delete | Program.cs:1524 | ❌ 缺失 | 永久删除租户，admin-api.md 未记录 |
| 149 | POST | /api/admin/v1/platform/tenants/{tenantId}/approve | Program.cs:1530 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 150 | POST | /api/admin/v1/platform/tenants/{tenantId}/reject | Program.cs:1536 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 151 | POST | /api/admin/v1/platform/tenants/{tenantId}/suspend | Program.cs:1542 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 152 | POST | /api/admin/v1/platform/tenants/{tenantId}/resume | Program.cs:1548 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 153 | DELETE | /api/admin/v1/platform/tenants/{tenantId} | Program.cs:1554 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 154 | PUT | /api/admin/v1/platform/tenants/{tenantId}/info | Program.cs:1560 | ❌ 缺失 | 更新租户信息，admin-api.md 未记录独立端点文档 |
| 155 | POST | /api/admin/v1/platform/tenants | Program.cs:1574 | ✅ 已文档化 | admin-api.md §3.4 提及平台侧创建租户 |
| 156 | POST | /api/admin/v1/platform/tenants/batch-approve | Program.cs:1590 | ✅ 已文档化 | admin-api.md §3.4 提及批量审批 |

#### 2.29.2 租户配额与功能

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 157 | PUT | /api/admin/v1/platform/tenants/{tenantId}/quota | Program.cs:1599 | ❌ 缺失 | 更新租户配额，admin-api.md 未记录独立端点文档 |
| 158 | PUT | /api/admin/v1/platform/tenants/{tenantId}/features | Program.cs:1605 | ❌ 缺失 | 更新租户功能开关，admin-api.md 未记录独立端点文档 |

#### 2.29.3 平台统计

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 159 | GET | /api/admin/v1/platform/stats | Program.cs:1566 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 160 | GET | /api/admin/v1/platform/storage-stats | Program.cs:1582 | ❌ 缺失 | 租户存储统计，admin-api.md 未记录独立端点文档 |

#### 2.29.4 租户用户管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 161 | GET | /api/admin/v1/platform/tenants/{tenantId}/users | Program.cs:1613 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 162 | GET | /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | Program.cs:1619 | ❌ 缺失 | 租户用户详情，admin-api.md 未记录独立端点文档 |
| 163 | POST | /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/customer-service/assign | Program.cs:1625 | ✅ 已文档化 | admin-api.md §3.4 提及客服改绑 |
| 164 | POST | /api/admin/v1/platform/tenants/{tenantId}/users | Program.cs:1637 | ❌ 缺失 | 平台侧创建租户用户，admin-api.md 未记录 |
| 165 | PUT | /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | Program.cs:1643 | ❌ 缺失 | 平台侧更新租户用户，admin-api.md 未记录 |
| 166 | POST | /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/reset-password | Program.cs:1649 | ❌ 缺失 | 平台侧重置用户密码，admin-api.md 未记录 |
| 167 | POST | /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/disable | Program.cs:1655 | ❌ 缺失 | 平台侧禁用用户，admin-api.md 未记录 |
| 168 | POST | /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/enable | Program.cs:1661 | ❌ 缺失 | 平台侧启用用户，admin-api.md 未记录 |
| 169 | DELETE | /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | Program.cs:1667 | ❌ 缺失 | 平台侧移除用户，admin-api.md 未记录 |

#### 2.29.5 租户加入申请

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 170 | GET | /api/admin/v1/platform/tenants/{tenantId}/join-requests | Program.cs:1673 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 171 | POST | /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/approve | Program.cs:1679 | ❌ 缺失 | 审批加入申请，admin-api.md 未记录独立端点文档 |
| 172 | POST | /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/reject | Program.cs:1685 | ❌ 缺失 | 拒绝加入申请，admin-api.md 未记录独立端点文档 |

#### 2.29.6 平台用户管理

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 173 | GET | /api/admin/v1/platform/users | Program.cs:1693 | ✅ 已文档化 | admin-api.md §3.4 提及 |
| 174 | GET | /api/admin/v1/platform/users/{platformUserId} | Program.cs:1699 | ❌ 缺失 | 平台用户详情，admin-api.md 未记录独立端点文档 |
| 175 | PUT | /api/admin/v1/platform/users/{platformUserId} | Program.cs:1705 | ❌ 缺失 | 更新平台用户，admin-api.md 未记录独立端点文档 |

---

### 2.A AdminApi 宿主审计汇总

| 指标 | 原始 | 最终 |
|---|---|---|
| 总端点数 | 175 | 175 |
| ✅ 已文档化 | 96 | **175** |
| ❌ 缺失 | 79 | **0** |
| ⚠️ 过时 | 0 | 0 |

说明：原始审计中，admin-api.md 仅以"模块总览 + 路由列表"形式记录了大部分端点的存在，但绝大多数端点缺少独立的请求/响应字段级文档。上表中"已文档化"指 admin-api.md 中至少提及了该端点路由或在模块总览中列出；"缺失"指 admin-api.md 中完全未提及该端点，或虽在总览中提及了所属模块但该具体端点路由从未出现。当前 admin-api.md §3.2A–§3.4 + admin-api-reference.md §2.1–§2.6 + field-enum-reference.md §3 已覆盖全部 175 个端点的独立请求/响应字段文档，最终覆盖率 100%。

#### 缺失端点清单（原始，现均已覆盖）

| # | 路由 | 说明 |
|---|---|---|
| 15 | GET /api/admin/v1/customer-service/temp-sessions/ | 临时会话列表 |
| 16 | GET /api/admin/v1/customer-service/temp-sessions/{sessionId} | 临时会话详情 |
| 17 | GET /api/admin/v1/customer-service/temp-sessions/stats | 临时会话统计 |
| 19 | GET /api/admin/v1/customer-service/temp-sessions/visitors/{visitorId} | 访客详情 |
| 21 | PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId} | 更新客服状态 |
| 22 | POST /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/force-offline | 强制下线客服 |
| 23 | POST /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/reset-load | 重置客服负载 |
| 28 | POST /api/admin/v1/customer-service/temp-sessions/blacklist | 创建黑名单条目 |
| 29 | DELETE /api/admin/v1/customer-service/temp-sessions/blacklist/{blacklistId} | 删除黑名单条目 |
| 31 | POST /api/admin/v1/customer-service/temp-sessions/sensitive-words | 创建敏感词 |
| 32 | DELETE /api/admin/v1/customer-service/temp-sessions/sensitive-words/{wordId} | 删除敏感词 |
| 33 | GET /api/admin/v1/customer-service/temp-sessions/knowledge-bases | 知识库列表 |
| 34 | POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases | 创建知识库 |
| 35 | PUT /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId} | 更新知识库 |
| 36 | DELETE /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId} | 删除知识库 |
| 37 | POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/rebuild | 重建知识库索引 |
| 38 | GET /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents | 知识库文档列表 |
| 39 | POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents | 创建知识库文档 |
| 40 | POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/import | 导入知识库文档 |
| 41 | PUT /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId} | 更新知识库文档 |
| 42 | DELETE /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId} | 删除知识库文档 |
| 44 | PUT /api/admin/v1/customer-service/temp-sessions/config | 更新临时会话配置 |
| 45 | POST /api/admin/v1/customer-service/temp-sessions/config/ai/probe | AI 供应商探测 |
| 46 | GET /api/admin/v1/customer-service/temp-sessions/widget/test-url | 生成 Widget 测试 URL |
| 47 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/claim | 认领临时会话 |
| 48 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/takeover | 接管临时会话 |
| 49 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/resume-ai | 恢复 AI 接管 |
| 50 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/messages | 管理端发送消息 |
| 51 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/force-close | 强制关闭临时会话 |
| 52 | POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/close | 正常关闭临时会话 |
| 54 | GET /api/admin/v1/dashboard/v2 | V2 仪表盘 |
| 63 | GET /api/admin/v1/users/{userId}/mute-status | 用户禁言状态查询 |
| 68 | POST /api/admin/v1/users/{userId}/reset-password | 重置用户密码 |
| 69 | PUT /api/admin/v1/users/{userId}/roles | 更新用户角色 |
| 72 | POST /api/admin/v1/customer-service/batch-transfer | 批量转移客服归属 |
| 74 | GET /api/admin/v1/groups/{conversationId} | 群详情 |
| 82 | GET /api/admin/v1/messages/search | 消息搜索别名路由 |
| 86 | PUT /api/admin/v1/service-accounts/{serviceAccountId} | 更新服务账号 |
| 87 | DELETE /api/admin/v1/service-accounts/{serviceAccountId} | 删除服务账号 |
| 89 | GET /api/admin/v1/roles/{roleCode}/permissions | 角色权限查询 |
| 90 | PUT /api/admin/v1/roles/{roleCode}/permissions | 更新角色权限 |
| 92 | POST /api/admin/v1/webhook-deliveries/{deliveryId}/retry | 重试 Webhook 投递 |
| 93 | POST /api/admin/v1/webhook-deliveries/{deliveryId}/replay | 重放 Webhook 投递 |
| 95 | PUT /api/admin/v1/system-configs/{configKey} | 更新配置项 |
| 96 | GET /api/admin/v1/system-configs/{configKey}/history | 配置变更历史 |
| 97 | POST /api/admin/v1/system-configs/{configKey}/rollback | 回滚配置 |
| 105 | PUT /api/admin/v1/bot-apps/{appId}/conversation-grants | 更新 BOT 会话授权 |
| 112 | PUT /api/admin/v1/verification-settings | 更新验证设置 |
| 114 | POST /api/admin/v1/alert-rules | 创建告警规则 |
| 115 | PUT /api/admin/v1/alert-rules/{ruleId} | 更新告警规则 |
| 116 | DELETE /api/admin/v1/alert-rules/{ruleId} | 删除告警规则 |
| 118 | POST /api/admin/v1/alert-history/{alertId}/acknowledge | 确认告警 |
| 119 | POST /api/admin/v1/alert-history/{alertId}/silence | 静默告警 |
| 121 | POST /api/admin/v1/notify-channels | 创建通知渠道 |
| 122 | PUT /api/admin/v1/notify-channels/{channelId} | 更新通知渠道 |
| 123 | DELETE /api/admin/v1/notify-channels/{channelId} | 删除通知渠道 |
| 124 | POST /api/admin/v1/notify-channels/{channelId}/test | 测试通知渠道 |
| 126 | POST /api/admin/v1/announcements | 创建公告 |
| 127 | PUT /api/admin/v1/announcements/{announcementId} | 更新公告 |
| 128 | POST /api/admin/v1/announcements/{announcementId}/publish | 发布公告 |
| 129 | POST /api/admin/v1/announcements/{announcementId}/archive | 归档公告 |
| 132 | POST /api/admin/v1/export-tasks | 创建导出任务 |
| 147 | GET /api/admin/v1/platform/tenants/{tenantId}/permanent-delete-plan | 永久删除计划预览 |
| 148 | POST /api/admin/v1/platform/tenants/{tenantId}/permanent-delete | 永久删除租户 |
| 154 | PUT /api/admin/v1/platform/tenants/{tenantId}/info | 更新租户信息 |
| 157 | PUT /api/admin/v1/platform/tenants/{tenantId}/quota | 更新租户配额 |
| 158 | PUT /api/admin/v1/platform/tenants/{tenantId}/features | 更新租户功能开关 |
| 160 | GET /api/admin/v1/platform/storage-stats | 租户存储统计 |
| 162 | GET /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | 租户用户详情 |
| 164 | POST /api/admin/v1/platform/tenants/{tenantId}/users | 平台侧创建租户用户 |
| 165 | PUT /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | 平台侧更新租户用户 |
| 166 | POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/reset-password | 平台侧重置用户密码 |
| 167 | POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/disable | 平台侧禁用用户 |
| 168 | POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/enable | 平台侧启用用户 |
| 169 | DELETE /api/admin/v1/platform/tenants/{tenantId}/users/{userId} | 平台侧移除用户 |
| 171 | POST /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/approve | 审批加入申请 |
| 172 | POST /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/reject | 拒绝加入申请 |
| 174 | GET /api/admin/v1/platform/users/{platformUserId} | 平台用户详情 |
| 175 | PUT /api/admin/v1/platform/users/{platformUserId} | 更新平台用户 |


---

## 3. OpenPlatform 宿主（ZTChat.Hosts.OpenPlatform）

源码文件：`src/Hosts/ZTChat.Hosts.OpenPlatform/Program.cs`

所有端点注册在 `openGroup = app.MapGroup("/api/open/v1")` 路由组下，需租户空间客户端业务 Token（`token_type=tenant`，且 `space_type≠1`）。

### 3.1 应用管理组 `/api/open/v1/apps/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 1 | POST | /api/open/v1/apps | Program.cs:44 | ✅ 已文档化 | open-platform.md §2.1 |
| 2 | POST | /api/open/v1/apps/{appId}/credentials/rotate | Program.cs:50 | ✅ 已文档化 | open-platform.md §2.2 |
| 3 | PUT | /api/open/v1/apps/{appId}/webhook | Program.cs:56 | ✅ 已文档化 | open-platform.md §2.3 |
| 4 | PUT | /api/open/v1/apps/{appId}/subscriptions | Program.cs:62 | ✅ 已文档化 | open-platform.md §2.4 |

### 3.2 媒体上传 `/api/open/v1/apps/{appId}/media/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 5 | POST | /api/open/v1/apps/{appId}/media/upload | Program.cs:68 | ✅ 已文档化 | open-platform.md §3 |

### 3.3 消息发送 `/api/open/v1/apps/{appId}/messages/*`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 6 | POST | /api/open/v1/apps/{appId}/messages/send | Program.cs:87 | ✅ 已文档化 | open-platform.md §4 |

### 3.4 投递记录查询 `/api/open/v1/apps/{appId}/deliveries`

| # | HTTP 方法 | 路由 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 7 | GET | /api/open/v1/apps/{appId}/deliveries | Program.cs:93 | ✅ 已文档化 | open-platform.md §6 |

---

### 3.A OpenPlatform 宿主审计汇总

| 指标 | 数量 |
|---|---|
| 总端点数 | 7 |
| ✅ 已文档化 | 7 |
| ❌ 缺失 | 0 |
| ⚠️ 过时 | 0 |

说明：OpenPlatform 宿主的全部 7 个端点均已在 `open-platform.md` 中完整文档化，包含请求体字段、响应结构、枚举值和使用说明。文档与源码路由路径完全一致，无缺失或过时条目。


## 4. Gateway 宿主（ZTChat.Hosts.Gateway）

源码文件：`src/Hosts/ZTChat.Hosts.Gateway/Program.cs`、`src/Hosts/ZTChat.Hosts.Gateway/RealtimeDispatchServices.cs`

Hub 映射（Program.cs）：

| Hub 类 | 路径 | 源码行号 | 认证要求 |
|---|---|---|---|
| `ClientGatewayHub` | `/ws/client` | Program.cs:35 | `RequireAuthorization()`，需租户级 `accessToken`（`token_type=tenant`） |
| `WidgetGatewayHub` | `/ws/widget` | Program.cs:36 | `RequireAuthorization()`，需访客 `visitorToken`（`token_type=visitor_session`） |

### 4.1 ClientGatewayHub 方法

| # | Hub 类 | 方法名 | 参数 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|---|
| 1 | ClientGatewayHub | `SendAsync` | `SendMessageRequest request` | Program.cs:80 | ✅ 已文档化 | client-api.md §10 上行方法表 |
| 2 | ClientGatewayHub | `ReadAsync` | `Guid conversationId, long readSeq` | Program.cs:111 | ✅ 已文档化 | client-api.md §10 上行方法表 |
| 3 | ClientGatewayHub | `HeartbeatAsync` | `string platform` | Program.cs:127 | ✅ 已文档化 | client-api.md §10 上行方法表 |

### 4.2 WidgetGatewayHub 方法

| # | Hub 类 | 方法名 | 参数 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|---|
| 4 | WidgetGatewayHub | `HeartbeatAsync` | `string platform` | Program.cs:291 | ❌ 缺失 | client-api.md 未记录 `/ws/widget` Hub 及其方法 |

### 4.3 服务端推送事件

以下事件由 `GatewayDispatchWorker`（通过 `TryBuildRealtimeEvent`）和 `PresenceDispatchWorker` 生成，推送至 `ClientGatewayHub` 和/或 `WidgetGatewayHub` 的已连接客户端。

#### 4.3.1 固定事件名

| # | 事件名 | 源码文件 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 1 | `msg.new` | RealtimeDispatchServices.cs | :553 | ✅ 已文档化 | client-api.md §10.1；含完整 payload 结构 |
| 2 | `msg.read` | RealtimeDispatchServices.cs | :530 | ❌ 缺失 | 已读回执推送；payload 为 `RealtimeReadEnvelope`（`tenantId`, `conversationId`, `userId`, `readSeq`） |
| 3 | `msg.recalled` | RealtimeDispatchServices.cs | :537 | ❌ 缺失 | 消息撤回推送；payload 为 `RealtimeRecallEnvelope`（`tenantId`, `messageId`, `conversationId`, `conversationSeq`, `operatorUserId`） |
| 4 | `auth.force_logout` | RealtimeDispatchServices.cs | :486 | ❌ 缺失 | 强制登出推送；payload 为 `RealtimeForceLogoutPayload`（`platformUserId`, `deviceId`, `reason`, `revokedAt`, `deactivateRequestedAt?`, `cooldownEndsAt?`）；推送后立即移除连接 |
| 5 | `space.notice` | RealtimeDispatchServices.cs | :388 | ✅ 已文档化 | client-api.md §10.2；跨空间未读提醒 |
| 6 | `presence.changed` | RealtimeDispatchServices.cs | :801 | ✅ 已文档化 | client-api.md §10.3；由 `PresenceDispatchWorker` 推送给好友 |

#### 4.3.2 动态前缀事件名（`temp_session.*`）

`dispatchKind` 以 `temp_session.` 开头时，`eventName` 直接使用 `dispatchKind` 值，payload 为原始 JSON。以下为源码中实际发布到 Outbox 的具体事件：

| # | 事件名 | 源码文件 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 7 | `temp_session.assigned` | TempSessionService.cs | :1182 | ❌ 缺失 | 临时会话分配客服；payload 含 `tenantId`, `sessionId`, `staffUserId` |
| 8 | `temp_session.closed` | TempSessionService.cs | :2990 | ❌ 缺失 | 临时会话关闭；payload 含 `tenantId`, `sessionId`, `status`, `reasonCode`, `reasonText`, `closedAt` |
| 9 | `temp_session.rated` | TempSessionService.cs | :430 | ❌ 缺失 | 临时会话评价；payload 含 `tenantId`, `sessionId`, `rating`, `tags`, `comment`, `ratedAt` |

#### 4.3.3 动态前缀事件名（`tenant.*`）

`dispatchKind` 以 `tenant.` 开头时，`eventName` 直接使用 `dispatchKind` 值，payload 为原始 JSON。

| # | 事件名 | 源码文件 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 10 | `tenant.join_request.reviewed` | TenantJoinRequestService.cs | :320 | ❌ 缺失 | 租户加入申请审核结果推送；payload 含审核结果详情 |

#### 4.3.4 动态前缀事件名（`customer_service.*`）

`dispatchKind` 以 `customer_service.` 开头时，`eventName` 直接使用 `dispatchKind` 值，payload 为原始 JSON。

| # | 事件名 | 源码文件 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|
| 11 | `customer_service.assigned` | AdministrationModuleExtensions.cs | :2855 | ❌ 缺失 | 客服归属变更推送；payload 含客服分配详情 |

---

### 4.A Gateway 宿主审计汇总

#### Hub 方法汇总

| 指标 | 原始 | 最终 |
|---|---|---|
| 总方法数 | 4 | 4 |
| ✅ 已文档化 | 3 | **4** |
| ❌ 缺失 | 1 | **0** |
| ⚠️ 过时 | 0 | 0 |

#### 服务端推送事件汇总

| 指标 | 原始 | 最终 |
|---|---|---|
| 总事件数 | 11 | 11 |
| ✅ 已文档化 | 3 | **11** |
| ❌ 缺失 | 8 | **0** |
| ⚠️ 过时 | 0 | 0 |

#### 缺失 Hub 方法清单（原始，现均已覆盖）

| # | Hub 类 | 方法名 | 说明 | 最终位置 |
|---|---|---|---|---|
| 4 | WidgetGatewayHub | `HeartbeatAsync` | `/ws/widget` Hub 及其方法 | client-api.md §11 访客 Widget 实时通道；client-api-reference.md §2.8 |

#### 缺失服务端推送事件清单（原始，现均已覆盖至 client-api.md §10）

| # | 事件名 | 说明 | 最终位置 |
|---|---|---|---|
| 2 | `msg.read` | 已读回执实时推送 | client-api.md §10 服务端推送事件 |
| 3 | `msg.recalled` | 消息撤回实时推送 | client-api.md §10 |
| 4 | `auth.force_logout` | 强制登出推送（含账号注销冷却期信息） | client-api.md §10 |
| 7 | `temp_session.assigned` | 临时会话分配客服推送 | client-api.md §10 + §11.2 |
| 8 | `temp_session.closed` | 临时会话关闭推送 | client-api.md §10 + §11.2 |
| 9 | `temp_session.rated` | 临时会话评价推送 | client-api.md §10 + §11.2 |
| 10 | `tenant.join_request.reviewed` | 租户加入申请审核结果推送 | client-api.md §10 |
| 11 | `customer_service.assigned` | 客服归属变更推送 | client-api.md §10 |

说明：

- `ClientGatewayHub` 的 3 个上行方法（`SendAsync`、`ReadAsync`、`HeartbeatAsync`）均已在 client-api.md §10 中文档化
- `WidgetGatewayHub` 的 `/ws/widget` 路径及其 `HeartbeatAsync` 方法完全未在文档中出现
- 服务端推送事件中，仅 `msg.new`、`space.notice`、`presence.changed` 3 个事件有完整文档；其余 8 个事件（含 3 个动态前缀族）均缺失
- 动态前缀事件（`temp_session.*`、`tenant.*`、`customer_service.*`）的 `eventName` 由发布方决定，Gateway 仅做透传；上表列出的是源码中实际发布到 Outbox 的具体事件类型
- `space.notice` 不经过 Outbox，而是在 `msg.new` 投递后由 Gateway 内部生成并推送给跨空间连接
- `presence.changed` 由独立的 `PresenceDispatchWorker` 处理，不经过 Redis Stream 分发
- voice-video-call.md 中的事件（`IncomingCall`、`CallRinging` 等）属于 MediaRelay 宿主的 `VoiceCallSignalingHub`，不在本节审计范围内


---

## 5. MediaRelay 宿主（ZTChat.Hosts.MediaRelay）

源码文件：`src/Hosts/ZTChat.Hosts.MediaRelay/VoiceCallSignalingHub.cs`

Hub 映射：

| Hub 类 | 路径 | 认证要求 |
|---|---|---|
| `VoiceCallSignalingHub` | `/hubs/voicecall` | `[Authorize]`，需租户级 `accessToken`（`token_type=tenant`） |

### 5.1 VoiceCallSignalingHub 方法

| # | Hub 类 | 方法名 | 参数 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|---|
| 1 | VoiceCallSignalingHub | `StartCall` | `string targetUserId, string sdpOffer, string? videoProfile = null` | VoiceCallSignalingHub.cs:150 | ✅ 已文档化 | voice-video-call.md §4 Hub 方法表 + 参数/返回结构表 |
| 2 | VoiceCallSignalingHub | `AnswerCall` | `string callId, string sdpOffer, string? videoProfile = null` | VoiceCallSignalingHub.cs:236 | ✅ 已文档化 | voice-video-call.md §4 Hub 方法表 + 参数/返回结构表 |
| 3 | VoiceCallSignalingHub | `RejectCall` | `string callId` | VoiceCallSignalingHub.cs:301 | ✅ 已文档化 | voice-video-call.md §4 Hub 方法表 + 参数结构表 |
| 4 | VoiceCallSignalingHub | `Hangup` | `string callId` | VoiceCallSignalingHub.cs:339 | ✅ 已文档化 | voice-video-call.md §4 Hub 方法表 + 参数结构表 |
| 5 | VoiceCallSignalingHub | `SendDtmf` | `string callId, string digits` | VoiceCallSignalingHub.cs:387 | ✅ 已文档化 | voice-video-call.md §4 Hub 方法表 + 参数结构表 |

### 5.2 服务端推送事件（Hub 内部推送）

以下事件由 `VoiceCallSignalingHub` 内部通过 `Clients.User(...).SendAsync(...)` 或 `Clients.Caller.SendAsync(...)` 推送，不经过 Gateway 的 Redis Stream 分发。

| # | 事件名 | 推送目标 | 参数 | 源码行号 | 文档状态 | 备注 |
|---|---|---|---|---|---|---|
| 1 | `IncomingCall` | 被叫用户 | `callId, callerUserId, callerDisplayName, sdpOffer, callerVideoProfile?` | VoiceCallSignalingHub.cs:178 | ✅ 已文档化 | voice-video-call.md §5 事件表 + 参数结构表 |
| 2 | `CallRinging` | 主叫方（Caller） | `callId` | VoiceCallSignalingHub.cs:184 | ✅ 已文档化 | voice-video-call.md §5 事件表 + 参数结构表 |
| 3 | `CallAnswered` | 主叫用户 | `callId` | VoiceCallSignalingHub.cs:240 | ✅ 已文档化 | voice-video-call.md §5 事件表 + 参数结构表 |
| 4 | `CallEnded` | 对方用户 | `callId, reason` | VoiceCallSignalingHub.cs:271/313/380 | ✅ 已文档化 | voice-video-call.md §5 已补齐完整 reason 值域表（rejected、hangup、connection_lost、admin_force_end、failed） |
| 5 | `DtmfReceived` | 对方用户 | `callId, digits` | VoiceCallSignalingHub.cs:349 | ✅ 已文档化 | voice-video-call.md §5 事件表 + 参数结构表 |

---

### 5.A MediaRelay 宿主审计汇总

#### Hub 方法汇总

| 指标 | 数量 |
|---|---|
| 总方法数 | 5 |
| ✅ 已文档化 | 5 |
| ❌ 缺失 | 0 |
| ⚠️ 过时 | 0 |

#### 服务端推送事件汇总

| 指标 | 数量 |
|---|---|
| 总事件数 | 5 |
| ✅ 已文档化 | 5 |
| ❌ 缺失 | 0 |
| ⚠️ 过时 | 0 |

说明：

- `VoiceCallSignalingHub` 的全部 5 个公开方法（`StartCall`、`AnswerCall`、`RejectCall`、`Hangup`、`SendDtmf`）均已在 `voice-video-call.md` §4 中完整文档化，包含方法签名、参数类型、返回值结构
- 5 个服务端推送事件均已完全对齐，`CallEnded` 事件的 `reason` 值域已补齐完整（含 `connection_lost`、`admin_force_end`、`failed`）
- Hub 端点路径 `/hubs/voicecall` 与文档 §2.1 一致
- 认证要求（租户级 `accessToken`）与文档 §2.2 一致
- 返回值 DTO（`CallStartResult`、`CallAnswerResult`）的字段名与文档 §4 中的字段表一致


---

## 6. 汇总统计

> 最终更新时间：2026-04-21

### 6.1 各宿主端点统计

| 宿主 | 端点类型 | 总端点数 | 已文档化 | 缺失 | 过时 |
|---|---|---|---|---|---|
| Api | HTTP REST | 176 | 176 | 0 | 0 |
| AdminApi | HTTP REST | 175 | 175 | 0 | 0 |
| OpenPlatform | HTTP REST | 7 | 7 | 0 | 0 |
| Gateway | Hub 方法 | 4 | 4 | 0 | 0 |
| Gateway | 服务端推送事件 | 11 | 11 | 0 | 0 |
| MediaRelay | Hub 方法 | 5 | 5 | 0 | 0 |
| MediaRelay | 服务端推送事件 | 5 | 5 | 0 | 0 |
| **合计** | | **383** | **383** | **0** | **0** |

### 6.2 汇总说明

- **文档覆盖率**：383 / 383 = 100.00%
- **缺失率**：0 / 383 = 0.00%
- **过时率**：0 / 383 = 0.00%

#### 原始缺失与过时项一览

以下为首次审计时发现的缺失/过时项及其当前覆盖位置：

| 宿主 | 原始问题 | 数量 | 最终位置 |
|---|---|---|---|
| Api | 缺失：`GET /api/platform/v1/tenants/search-for-register`、`GET /api/platform/v1/client-config` | 2 | client-api.md §1.5 / §1.6 |
| Api | 过时：`PUT /api/client/v1/tenant/features` 文档不完整 | 1 | client-api.md §4.5 |
| AdminApi | 缺失：79 个端点（客服管理、平台管理、告警/通知/公告等） | 79 | admin-api.md §3.2A–§3.4 |
| Gateway | 缺失：`WidgetGatewayHub` 1 个 Hub 方法 | 1 | client-api.md §11 |
| Gateway | 缺失：8 个服务端推送事件 | 8 | client-api.md §10 |
| MediaRelay | 过时：`CallEnded` 事件 `reason` 字段值域不一致 | 1 | voice-video-call.md / voice-video-call-reference.md |

#### 关键结论

1. **全部 5 个宿主项目的公开端点已 100% 文档化**，无缺失、无过时
2. **Api 宿主**（176 端点）：原缺失 2 个 + 过时 1 个，均已在 client-api.md 中补齐
3. **AdminApi 宿主**（175 端点）：原缺失 79 个，均已在 admin-api.md 与 admin-api-reference.md 中补齐独立端点文档
4. **OpenPlatform 宿主**（7 端点）：初始审计即已完全覆盖，后续进一步完善了字段级文档
5. **Gateway 宿主**（4 Hub 方法 + 11 服务端推送事件）：原缺失 1 个 Hub 方法 + 8 个事件，均已在 client-api.md §10 / §11 中补齐
6. **MediaRelay 宿主**（5 Hub 方法 + 5 服务端推送事件）：原有 1 个过时事件字段已修正
