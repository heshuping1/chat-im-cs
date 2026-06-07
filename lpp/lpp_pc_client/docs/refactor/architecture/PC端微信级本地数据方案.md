# PC 端微信级本地数据方案

状态：存量 API 可落地版 + V2 服务端增强稿

日期：2026-06-07

适用范围：`lpp/lpp_pc_client`

## 1. 目标

本方案用于把 PC 端 IM + 在线客服客户端升级到接近微信 PC 的本地数据能力。这里的“对标微信”不是复制微信内部实现，而是对标用户体验和工程能力：

1. 已有消息进入聊天窗口应本地秒开，不依赖远端首包。
2. 图片、视频、文件应本地可复用、可打开、可搜索、可清理。
3. 弱网、断线、重启后，成功历史消息和已缓存媒体仍可读。
4. 消息、媒体、发送箱、搜索、清理、诊断必须进入统一本地 owner。
5. UI 不直接管理本地库、文件路径、媒体下载、清理策略或服务端补洞。

当前 PC 端 P27 已补齐 IndexedDB 成功消息本地库，但媒体仍是文件系统缓存 + renderer localStorage 索引。微信级方案必须继续收敛，不能让消息本地库、媒体缓存、发送箱、搜索各自为政。

## 2. 当前差距

### 2.1 已具备能力

1. 成功消息已经有 P27 IndexedDB read model，入口在 `src/renderer/data/message-store/`。
2. 图片、视频、文件本体会通过 Electron main 落盘，入口在 `src/main/media-storage.ts`。
3. 发送本地文件时，会通过 preload 读取用户选择或粘贴文件，再复制到 app cache。
4. 媒体打开、复制、另存、显示位置已通过 typed `desktopApi` 和 main process handler 隔离。
5. 远端媒体坏缓存检测已处理 JSON/HTML 错误页，失败会进 electron runtime diagnostics。

### 2.2 不合格点

1. 消息主库是 renderer IndexedDB，媒体索引是 renderer localStorage，媒体本体是 main 文件系统，权威 owner 分裂。
2. IndexedDB 当前查询会 `getAll()` 后在内存过滤，长期面对大消息量不合格。
3. 媒体索引只记录 `cacheKey -> fileUrl`，缺少 mediaId、messageId、variant、size、hash、引用关系、清理策略。
4. 聊天记录搜索只覆盖已加载或本地有限范围，没有统一 FTS 全文索引。
5. 缺少磁盘占用统计、LRU、孤儿文件清理、按账号/会话清理和清理诊断。
6. 消息、媒体、发送箱之间没有事务级一致性，可能出现消息引用的文件不存在，或文件已存在但索引丢失。
7. 客服与普通 IM 共用消息底座但本地化边界不够完整，长期会影响客服历史、质检和会话追溯。

## 3. 技术选型结论

### 3.1 推荐路线

采用 **SQLite + WAL + FTS5 + 文件系统媒体目录 + Electron main/preload typed IPC** 作为 PC 本地数据平面。

| 能力 | 选型 | 说明 |
| --- | --- | --- |
| 本地关系数据 | SQLite | 消息、会话、媒体索引、发送箱、同步游标、清理任务统一建模。 |
| 并发与可靠性 | SQLite WAL | 允许读写并发，适合聊天窗口读、Gateway 写、搜索读并行。 |
| 全文搜索 | SQLite FTS5 | 消息文本、文件名、媒体摘要、客服备注可进入全文索引。 |
| 执行位置 | Electron main 下的 local-data worker | 避免 renderer 直接访问本地文件和 native DB，避免 main 线程长事务卡 UI。 |
| Node SQLite 绑定 | `better-sqlite3` 优先评估 | API 简洁、事务稳定；必须放到 worker 中，避免同步调用阻塞 main。 |
| 媒体文件 | 文件系统 | SQLite 只存索引和引用，不存大 blob。 |
| 鉴权信息 | 不入库 | token 仍走现有 secure session，媒体下载临时使用 authToken，不持久化 token。 |
| 加密 | 二期 SQLCipher 评估 | v1 先把数据边界做对；全库加密另设安全任务验证打包、性能和恢复。 |

SQLite 官方 WAL 文档说明 WAL 提供更多并发能力；FTS5 是 SQLite 官方全文搜索虚拟表模块。Electron 官方 `app.getPath("userData")` 是用户数据目录入口。SQLCipher 可作为 SQLite 加密能力的后续安全方案参考。

参考：

- SQLite WAL: https://www.sqlite.org/wal.html
- SQLite FTS5: https://www.sqlite.org/fts5.html
- Electron `app.getPath`: https://www.electronjs.org/docs/latest/api/app#appgetpathname
- SQLCipher: https://www.zetetic.net/sqlcipher/

### 3.2 不推荐路线

| 路线 | 结论 | 原因 |
| --- | --- | --- |
| 继续扩展 IndexedDB | 不推荐作为长期主库 | renderer owner、安全边界和大规模查询能力都不适合微信级 PC 本地数据。 |
| 全部存文件 JSON | 不推荐 | 查询、搜索、迁移、事务、清理和一致性都差。 |
| 引入开源 IM 产品 | 不推荐 | 当前业务协议、客服状态机、Gateway、权限和 API 都是自有体系，引入整套产品会制造新边界冲突。 |
| 媒体 blob 存 SQLite | 不推荐 | 大文件会拖慢 DB、备份和清理；微信级 PC 应文件本体走文件系统，DB 只管索引。 |

### 3.3 存量 API 可落地边界

基于当前 PC 端已经接入的 API，可以做 **V1 存量 API 可落地版**。V1 的目标是把“本机已见事实”统一收敛到 SQLite 和媒体文件系统，解决首屏本地可见、重启可恢复、媒体可复用、搜索不依赖当前组件内存的问题。

当前 API 已支持的能力：

1. 会话列表支持 `limit/cursor`。
2. 普通 IM 消息列表支持按会话拉取当前窗口。
3. 普通 IM 支持文本、媒体发送、已读、撤回、删除、转发等核心动作。
4. 媒体上传返回 `MediaResourceDto`，包含 `mediaId/resourceId/fileId/objectKey/storageKey/relativePath/signedUrl/downloadUrl/url/fileName/mimeType/sizeBytes` 等可用于本地索引的字段。
5. 在线客服支持 thread 列表、thread detail、thread messages、staff service history、动作流和 profile-card。
6. Gateway push 作为实时性主通道，PC 端默认 push 可靠，高频轮询不作为 IM 默认刷新策略。

V1 可以承诺：

1. 本机已经拉取、收到 push、发送成功或迁移过的消息全部落入 SQLite。
2. 打开聊天先读 SQLite 本地消息，再后台拉取当前服务端窗口合并。
3. React Query、Zustand、UI 组件不再作为消息事实源。
4. 本机已落库范围内支持 FTS 搜索，搜索结果可跳转。
5. 媒体按 best-effort 稳定身份入库，优先使用 `mediaId/resourceId/fileId/objectKey/storageKey/relativePath`，签名 URL 只作为下载入口和远端位置线索。
6. 已缓存图片、视频、文件重启后可复用；签名 URL 过期不影响本地 variant。
7. 在线客服最近 thread、消息、状态和客户快照可本地恢复；客服未读和普通 IM 未读保持领域隔离。

V1 不能伪装承诺：

1. 不能保证服务端全量历史都已经在本机，除非用户曾经拉取或后续 API 提供全量历史分页。
2. 不能保证 push 漏消息后的精确补洞，只能记录 gap 并 fallback 拉取当前服务端窗口。
3. 不做跨设备全量历史搜索；搜索只面向本机 SQLite 已落库消息。
4. 如果服务端只返回会过期的签名 URL 且没有稳定 media identity，本地媒体去重只能 best-effort。
5. 客服 thread 状态如果没有稳定 `statusVersion/eventId`，只能按现有 thread snapshot 和 Gateway event 做本地投影，不能证明完整事件追溯。

因此，本方案实施时拆成两条线：

1. **P28-LD：V1 存量 API 可落地版**，不等待新增服务端 API。
2. **P29-LD：V2 服务端合同增强版**，补齐精确补洞、按需历史分页、稳定媒体身份和客服事件版本。

### 3.4 当前 API 到本地领域映射

P28 不新增服务端接口。所有本地写入先从当前 API、Gateway 和 Electron 桌面能力归约。

| 当前能力 | 当前入口 | 本地领域写入 | P28 规则 |
| --- | --- | --- | --- |
| 会话列表 | `GET /api/client/v1/conversations?limit&cursor` | `conversations`、`sync_cursors` | 只作为服务端当前列表 snapshot；不删除本地已有成功消息。 |
| 私聊消息窗口 | `GET /api/client/v1/direct-chats/{conversationId}/messages?limit` | `messages`、`message_fts`、`message_media_refs` | 作为当前窗口校准来源；缺少 before/after cursor 时标记 degraded。 |
| 群聊消息窗口 | `GET /api/client/v1/groups/{conversationId}/messages?limit` | `messages`、`message_fts`、`message_media_refs` | 与私聊同一 LocalMessageStore，conversationType 只作为聚合 scope。 |
| 普通 IM 发送 | `POST /direct-chats|groups/{conversationId}/messages` | `send_outbox`、`messages`、`conversations` | `clientMsgId` 必须与服务端确认合并，不能出现双消息。 |
| 媒体上传 | `POST /api/client/v1/media/upload` | `media_assets`、`media_variants` | 使用 `mediaId/resourceId/fileId/objectKey/storageKey/relativePath` 生成 best-effort identity。 |
| 已读 | `POST /direct-chats|groups/{conversationId}/read`、read-status | `messages.read_at/read_count/is_read`、`conversations.unread_count` | read metadata 进本地库，不由 UI patch。 |
| 撤回/删除 | `/messages/{messageId}/recall|delete` | `messages.status/is_recalled/is_deleted_local` | 撤回保留记录，删除语义区分本地隐藏和服务端删除。 |
| 批量转发/删除 | `/messages/batch-forward|batch-delete` | `messages`、`conversations`、diagnostics | 部分失败要保留失败项，不做乐观全成功。 |
| 客服 thread 列表 | `/customer-service/workbench/threads`、staff history | `cs_threads`、`conversations` | 客服 thread 状态归客服 owner，不复用普通 IM unread。 |
| 客服 thread 详情 | `/customer-service/workbench/threads/{threadType}/{threadId}` | `cs_threads`、`cs_customer_snapshots` | 详情是 snapshot，不伪装完整事件流。 |
| 客服消息 | `/customer-service/workbench/threads/{threadType}/{threadId}/messages` | `messages`、`cs_threads`、`send_outbox` | 消息复用 message/media 底座，thread 状态进入客服模型。 |
| 客服动作 | `/customer-service/workbench/threads/{threadActionType}/{threadId}/{action}` | `cs_thread_events`、`cs_threads` | 记录动作结果和本地状态投影；缺 eventId 时使用本地诊断 ID。 |
| 客户资料卡 | `/profile-card` | `cs_customer_snapshots` | 失败时展示本地 stale snapshot，不阻塞聊天消息。 |
| Gateway push | `/ws/client` | message/conversation/read/cs projection | 默认实时主通道可靠；不使用高频轮询兜底。 |
| 桌面媒体缓存 | `desktopApi.cacheMediaFile/cacheLocalMediaFile` | `media_variants`、`media_jobs` | 迁移到 LocalMediaLibrary 统一 owner，renderer 不管真实路径。 |

### 3.5 顶级 IM 产品验收口径

P28 的目标不是“把 IndexedDB 换成 SQLite”，而是让 PC 端达到专业 IM 的端侧体验：

1. **秒开**：已有本地消息的会话，进入后 1 秒内看到最近 50 条，不等服务端首包。
2. **不中断**：服务端当前窗口拉取失败时，本地成功历史仍可读，错误只做非阻塞提示。
3. **一致**：列表提醒、会话未读、聊天窗口、搜索索引必须来自同一 LocalDataProjection。
4. **可恢复**：发送中断、媒体上传失败、worker 崩溃、重启后都能恢复 pending/outbox。
5. **可复用**：已缓存图片、视频、文件不因签名 URL 过期重新下载。
6. **可治理**：用户能看到本地数据占用，能清理媒体缓存，且不会误删云端消息。
7. **可诊断**：每次迁移、写入失败、gap fallback、媒体坏缓存、cleanup 都能导出结构化诊断。
8. **不撒规则**：UI 不判断消息合并、媒体身份、搜索范围、客服状态机或清理策略。
9. **不伪装**：本机未落库历史不会被搜索命中；UI 文案不能暗示跨设备全量搜索。

## 4. 总体架构

```text
Renderer UI
  MessageCenter / CustomerService / Search / Settings
        |
        v
Renderer Application Adapters
  localMessageRepository / localMediaRepository / localSearchRepository
        |
        v
Preload desktopApi
  typed + validated IPC
        |
        v
Electron Main
  LocalDataService facade
        |
        v
LocalDataWorker
  SQLite connection + transaction + migration + FTS + cleanup
        |
        +--> lpp-local-v1.sqlite
        |
        +--> Media file root
```

核心原则：

1. Renderer 只拿 read model，不拿 DB 连接，不拼 SQL，不处理本地路径安全。
2. Main 只暴露最小 typed IPC，所有 payload 必须经过 `desktop-api-validation`。
3. Worker 是 SQLite 唯一连接 owner，所有写入通过 transaction。
4. 文件本体只能由 main/worker 管理，renderer 通过 fileUrl/dataUrl 或 open action 使用。
5. React Query 只管服务端 snapshot 和 UI cache，本地事实源是 LocalDataService。

### 4.1 UI 统一出口

所有消息相关 UI 必须从 LocalDataProjection 读取同一份领域投影，不能列表、聊天窗口、提醒、搜索各读各的。

```text
LocalDataService
  -> LocalDataProjection
       -> ConversationListProjection
       -> MessageTimelineProjection
       -> ReminderProjection
       -> SearchProjection
       -> CustomerServiceProjection
```

出口规则：

1. 会话列表、聊天窗口、桌面提醒、未读 badge、搜索结果、客服工作台只能消费 projection read model。
2. Gateway push、服务端 snapshot、发送确认、已读、撤回、删除必须先写本地事实，再刷新 projection。
3. React Query refetch 成功后不能直接驱动提醒或红点；只能进入本地归约再由 projection 输出。
4. ReminderProjection 必须和 ConversationListProjection 使用同一 unread/read ledger。
5. SearchProjection 必须只搜索本机已落库消息，结果跳转时通过 MessageTimelineProjection 拉取上下文。
6. projection 可以按 UI 需要裁剪字段，但不能新增业务事实或重新解释 raw DTO。

## 5. DDD 边界

| 领域 | Owner | 职责 |
| --- | --- | --- |
| Conversation | Local Conversation Store | 会话列表本地投影、last message、unread mirror、sync state。 |
| Message | Local Message Store | 成功消息、本地发送成功消息、撤回、删除、read metadata、本地分页。 |
| Media | Local Media Library | media asset、variant、本地路径、引用关系、缓存状态、清理策略。 |
| Outbox | Send Outbox | 文本/图片/视频/文件发送中断恢复、重试、失败原因。 |
| Sync | Sync Cursor Store | afterSeq/cursor、fallback refetch、gap diagnostic、补洞状态。 |
| Search | Local Search Index | FTS 文本、文件名、客服备注、消息摘要。 |
| Diagnostics | Local Data Diagnostics | DB migration、write failure、media cache failure、cleanup result。 |

不得把以下逻辑写在 UI：

1. 消息去重、seq 合并、server echo/local echo 合并。
2. 媒体是否可复用、是否坏缓存、是否需要重下。
3. 消息和媒体引用关系。
4. 搜索范围、FTS query、分页游标。
5. 磁盘清理、过期策略、孤儿文件判断。
6. 客服 thread 状态机、普通 IM read receipt 与客服未读语义转换。

## 6. 本地文件与数据库布局

### 6.1 根目录

```text
{app.getPath("userData")}/LPP Local Data/
  profiles/
    default/
      lpp-local-v1.sqlite
      lpp-local-v1.sqlite-wal
      lpp-local-v1.sqlite-shm
      Media/
        {scopeHash}/
          {conversationHash}/
            Images/
              2026-06/
            Videos/
              2026-06/
            Files/
              2026-06/
            Posters/
              2026-06/
      Migrations/
        p27-indexeddb-import.jsonl
      Diagnostics/
        local-data.jsonl
```

### 6.2 Scope

`scopeKey` 必须包含：

1. `apiBaseUrl`
2. `tenantId` 或 `spaceId`
3. `userId/platformUserId/lppId`
4. `profileId`

文件目录使用 `sha256(scopeKey).slice(0, 16)`，不把租户、用户、会话明文直接放入目录名。DB 内允许存脱敏必要 ID，但 diagnostics 不输出完整敏感 ID。

## 7. SQLite Schema

### 7.1 元信息

```sql
CREATE TABLE local_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);
```

### 7.2 会话

```sql
CREATE TABLE conversations (
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  title TEXT,
  avatar_url TEXT,
  last_message_id TEXT,
  last_message_preview TEXT,
  last_message_at TEXT,
  last_seq INTEGER,
  local_unread_count INTEGER NOT NULL DEFAULT 0,
  server_unread_count INTEGER,
  muted INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL DEFAULT 'unknown',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, conversation_type, conversation_id)
);

CREATE INDEX idx_conversations_scope_last
ON conversations(scope_key, pinned DESC, last_message_at DESC);
```

### 7.3 消息

```sql
CREATE TABLE messages (
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  client_msg_id TEXT,
  sender_id TEXT,
  sender_type TEXT,
  direction TEXT NOT NULL,
  message_type TEXT NOT NULL,
  body_json TEXT NOT NULL,
  preview TEXT,
  conversation_seq INTEGER,
  server_seq INTEGER,
  sent_at TEXT,
  status TEXT NOT NULL,
  is_recalled INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  read_state_json TEXT,
  source TEXT NOT NULL,
  inserted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, conversation_type, conversation_id, message_id)
);

CREATE UNIQUE INDEX idx_messages_client_msg
ON messages(scope_key, conversation_type, conversation_id, client_msg_id)
WHERE client_msg_id IS NOT NULL;

CREATE INDEX idx_messages_page
ON messages(scope_key, conversation_type, conversation_id, conversation_seq, sent_at);
```

`source` 枚举：

1. `server_snapshot`
2. `gateway_push`
3. `send_confirm`
4. `local_outbox`
5. `migration`

### 7.4 搜索

```sql
CREATE VIRTUAL TABLE message_fts USING fts5(
  scope_key UNINDEXED,
  conversation_type UNINDEXED,
  conversation_id UNINDEXED,
  message_id UNINDEXED,
  content,
  tokenize = 'unicode61'
);
```

v1 只保证英文、数字、文件名、URL、ID 和简单 CJK 连续文本可搜索。中文分词增强作为后续任务评估，不在 SQLite 主库第一阶段阻塞。

### 7.5 媒体资产

```sql
CREATE TABLE media_assets (
  scope_key TEXT NOT NULL,
  media_key TEXT NOT NULL,
  media_id TEXT,
  cache_identity TEXT,
  kind TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  content_sha256 TEXT,
  remote_url_hash TEXT,
  auth_required INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_accessed_at INTEGER,
  PRIMARY KEY (scope_key, media_key)
);

CREATE INDEX idx_media_assets_scope_kind
ON media_assets(scope_key, kind, updated_at DESC);
```

`media_key` 生成优先级：

1. `mediaId`
2. `cacheIdentity`
3. `content_sha256`
4. `sha256(stableRemoteUrlWithoutSig)`
5. `sha256(messageId + partIndex + fileName)`

签名 URL 不得直接作为长期 cache identity。

### 7.6 媒体变体

```sql
CREATE TABLE media_variants (
  scope_key TEXT NOT NULL,
  media_key TEXT NOT NULL,
  variant TEXT NOT NULL,
  local_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  status TEXT NOT NULL,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_accessed_at INTEGER,
  PRIMARY KEY (scope_key, media_key, variant),
  FOREIGN KEY (scope_key, media_key)
    REFERENCES media_assets(scope_key, media_key)
    ON DELETE CASCADE
);

CREATE INDEX idx_media_variants_cleanup
ON media_variants(scope_key, status, last_accessed_at);
```

`variant` 枚举：

1. `original`
2. `thumbnail`
3. `poster`
4. `transcoded`
5. `download_copy`

### 7.7 消息媒体引用

```sql
CREATE TABLE message_media_refs (
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  part_index INTEGER NOT NULL,
  media_key TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (
    scope_key,
    conversation_type,
    conversation_id,
    message_id,
    part_index
  ),
  FOREIGN KEY (scope_key, media_key)
    REFERENCES media_assets(scope_key, media_key)
    ON DELETE RESTRICT
);

CREATE INDEX idx_media_refs_asset
ON message_media_refs(scope_key, media_key);
```

`role` 枚举：`image`、`video`、`file`、`poster`、`thumbnail`、`avatar`。

### 7.8 发送箱

```sql
CREATE TABLE send_outbox (
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  local_task_id TEXT NOT NULL,
  client_msg_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  media_key TEXT,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, local_task_id)
);
```

### 7.9 同步游标

```sql
CREATE TABLE sync_cursors (
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  last_server_seq INTEGER,
  last_conversation_seq INTEGER,
  cursor TEXT,
  gap_state TEXT NOT NULL DEFAULT 'unknown',
  last_full_sync_at INTEGER,
  last_incremental_sync_at INTEGER,
  last_error_code TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, conversation_type, conversation_id)
);
```

### 7.10 清理任务

```sql
CREATE TABLE cleanup_jobs (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  policy TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  result_json TEXT,
  error_code TEXT
);
```

## 8. 数据写入规则

### 8.1 服务端快照

1. API 返回消息先经过现有 normalizer。
2. 进入 `LocalDataService.replaceConversationSnapshot()` 或 `upsertMessages()`。
3. 同一事务写入：
   - `messages`
   - `conversations.last_message`
   - `message_fts`
   - `media_assets`
   - `message_media_refs`
   - `sync_cursors`
4. React Query cache 只作为 server snapshot mirror 更新。

### 8.2 Gateway push

1. raw event 必须先经过 Gateway adapter。
2. domain event 进入 `LocalMessageIngestService`。
3. 先写本地库，再通知 query invalidation 或 local projection subscription。
4. 如果发现 seq gap：
   - 写 `sync_cursors.gap_state = 'gap_detected'`
   - 触发 fallback refetch
   - 记录 diagnostics
   - 不宣称精确补洞，除非服务端提供 afterSeq/cursor 合同

### 8.3 发送确认

1. local echo 先进入 `send_outbox` 和 `messages(status=sending)`。
2. 媒体上传完成后写 `media_assets/media_variants`。
3. 发送 API 成功后，在一个事务内：
   - 合并 `client_msg_id -> message_id`
   - 更新 `messages(status=sent/read)`
   - 清理或归档 `send_outbox`
   - 写入 `message_media_refs`
   - 更新 conversation projection
4. 发送失败只更新 outbox 和本地 message status，不删除本地待重试记录。

### 8.4 已读、撤回、删除

1. 已读是 message metadata update，不走 UI patch。
2. 撤回保留 message record，更新 `is_recalled/status/body_json/preview`。
3. 删除分为本地隐藏和服务端删除，不得混用。
4. 客服关闭、转接、排队事件不写成普通访客消息，进入客服 thread owner。

## 9. 媒体策略

### 9.1 下载与复用

1. UI 可见消息触发媒体 materialization，但 UI 不是落盘 owner。
2. `LocalMediaLibrary.resolveMedia()` 先查 `media_variants(original/thumbnail/poster)`。
3. 命中且文件存在、大小和基础格式校验通过，直接返回本地 fileUrl。
4. 未命中或坏缓存时，由 main 下载并写入临时文件，校验通过后原子 rename 到目标路径。
5. 下载失败写 `media_variants.status=failed` 和 runtime diagnostics，不污染 message 状态。

### 9.2 图片

1. 原图、缩略图分开记录。
2. 聊天首屏优先显示缩略图；点击查看时再确保原图。
3. 复制图片走 main 读本地文件并写剪贴板。

### 9.3 视频

1. 视频 original 与 poster 分开记录。
2. 打开播放器前必须确保 original 本地可用。
3. 当前 Chromium codec 不支持时，保留 P23 播放器评估，不在本地库任务中直接引入 mpv/libmpv。
4. 已下载但内容是 JSON/HTML 错误页的文件必须标记坏缓存并重下。

### 9.4 文件

1. 文件成功发送后必须在 `media_assets` 登记。
2. 打开、复制、另存、显示位置复用同一 local variant。
3. 另存为只复制到用户选择目录，不改变 cache owner。

## 10. 清理与容量治理

### 10.1 默认策略

1. 默认不清理最近 30 天访问过的媒体。
2. 默认不清理仍被未删除消息引用的媒体。
3. 默认不清理 sending/failed 可重试 outbox 关联媒体。
4. 默认先清理孤儿 variant，再清理过期 thumbnail/poster，最后清理长时间未访问 original。

### 10.2 用户可见能力

设置页提供：

1. 本地数据总占用。
2. 图片/视频/文件/索引分项占用。
3. 按账号或当前空间清理。
4. 清理媒体缓存，不删除云端消息。
5. 清理本地消息索引，需要二次确认并提示会重新同步。

### 10.3 清理事务

清理流程：

1. DB 选出候选 `media_variants`。
2. 检查 message refs 和 outbox refs。
3. 删除文件。
4. 删除 variant record。
5. 如果 asset 无任何 variant 且无 message refs，删除 asset。
6. 写 cleanup job result。

如果文件删除失败，不删除 DB 记录，标记 `error_code` 并保留下次重试。

## 11. 安全与隐私

1. Renderer 不接触真实本地绝对路径，除非用户明确执行“显示位置/复制路径”动作。
2. IPC payload 禁止携带 renderer 伪造 source path；本地文件来源继续通过 preload `webUtils.getPathForFile()` 获取。
3. token 不入 SQLite，不入 media index，不入 diagnostics。
4. DB 路径和媒体目录必须在 `userData/LPP Local Data` 下。
5. main 打开文件前必须校验路径属于受控目录或用户刚选择的导出路径。
6. SQLCipher 加密作为二期专项，必须验证：
   - Electron native module 打包
   - Mac/Windows 性能
   - 密钥来源 safeStorage
   - 密钥丢失后的恢复策略

## 12. 迁移策略

### 12.1 P27 IndexedDB 消息迁移

1. 首次启用 SQLite 时，读取 IndexedDB `lpp-pc-im-message-store`。
2. 按 scope/conversation 批量导入 SQLite。
3. 导入时保留 message DTO 原始 body_json，同时补 conversation projection 和 FTS。
4. 导入成功写 `local_meta.p27_indexeddb_imported_at`。
5. 导入失败不阻塞登录，记录 `local-data.migration_failed`。
6. 迁移稳定一个版本后，IndexedDB 只读 fallback 可删除。

### 12.2 媒体 localStorage 索引迁移

1. 读取 `lpp-pc-materialized-media-files` 和 legacy image key。
2. 对每个 fileUrl 检查文件是否存在。
3. 能从 cacheKey 解析出 kind/media identity 的，写入 media asset 和 variant。
4. 无法解析身份但文件存在的，写入 `legacy_orphan`，等待清理或后续消息引用补全。
5. 迁移后新媒体不再写 localStorage 索引。

### 12.3 旧 `LPP Files` 目录

1. 不在首版启动时搬迁所有旧文件，避免卡启动。
2. 使用时按需登记 legacy variant。
3. 设置页提供“整理旧媒体缓存”动作，后台搬迁并写 cleanup job。

## 13. Renderer 接口

新增或替换的 renderer application repository：

```ts
export interface LocalMessageRepository {
  listMessages(input: LocalMessageListInput): Promise<LocalMessagePage>;
  upsertMessages(input: LocalMessageUpsertInput): Promise<void>;
  applyReadMetadata(input: LocalReadMetadataInput): Promise<void>;
  markRecalled(input: LocalMessageMutationInput): Promise<void>;
  markDeleted(input: LocalMessageMutationInput): Promise<void>;
}

export interface LocalMediaRepository {
  resolveMedia(input: LocalMediaResolveInput): Promise<LocalMediaResolveResult>;
  registerSentMedia(input: LocalSentMediaInput): Promise<LocalMediaAsset>;
  getMediaStatus(input: LocalMediaStatusInput): Promise<LocalMediaStatus>;
}

export interface LocalSearchRepository {
  searchMessages(input: LocalSearchInput): Promise<LocalSearchResult[]>;
}

export interface LocalStorageRepository {
  getStats(input: LocalStorageStatsInput): Promise<LocalStorageStats>;
  cleanup(input: LocalStorageCleanupInput): Promise<LocalStorageCleanupResult>;
}
```

这些接口只返回领域 read model，不暴露 SQL、表结构或不受控本地路径。

## 14. Desktop API 合同

新增 desktop API 必须集中在 `src/shared/desktop-api.ts` 和 `desktop-api-validation.ts`：

1. `localDataListMessages`
2. `localDataUpsertMessages`
3. `localDataSearchMessages`
4. `localDataResolveMedia`
5. `localDataRegisterMedia`
6. `localDataGetStorageStats`
7. `localDataCleanup`
8. `localDataExportDiagnostics`

命名可以在实施时按现有 `desktopApi` 风格压缩，但不能新增未校验 IPC。

## 15. 实施分期

### P28-LD-001 技术验证

目标：验证 SQLite native dependency、worker、WAL、FTS5、打包可行。

验收：

1. Mac dev 可创建 DB、建表、读写、FTS 查询。
2. `npm run build:electron` 可通过。
3. native dependency 打包风险记录清楚。
4. Windows 实机验证登记为发布前阻塞项。

### P28-LD-002 LocalDataService 地基

目标：main/preload/shared typed IPC、worker、migration runner、diagnostics。

验收：

1. 所有 IPC typed + validated。
2. renderer 无 SQL 和 Node 文件访问。
3. migration 幂等。
4. worker 异常不会杀死 renderer。

### P28-LD-003 消息库迁移

目标：替换 P27 IndexedDB 为 SQLite 消息库，基于存量 API 建立本机已见消息事实源。

验收：

1. local-first 聊天首屏语义不退化。
2. 服务端当前窗口 snapshot、Gateway push、发送确认、撤回、已读都写 SQLite。
3. IndexedDB 迁移可重复、可跳过、可诊断。
4. 普通 IM 不使用高频轮询掩盖 push 或本地库问题。
5. 服务端缺少精确补洞合同时，只记录 degraded diagnostic 并保留本地成功消息。

### P28-LD-004 媒体库迁移

目标：替换 localStorage 媒体索引，媒体 asset/variant/ref 统一入库。

验收：

1. 图片、视频、文件发送成功后都有 asset/ref。
2. 打开/复制/另存/显示位置复用同一 local variant。
3. 坏缓存重下、失败诊断和旧缓存登记可用。

### P28-LD-005 搜索与历史

目标：本机已落库消息历史、本地全文搜索、媒体文件名搜索进入 FTS。

验收：

1. 当前账号/空间内搜索不依赖当前组件已加载 50 条。
2. 搜索结果可跳转到会话和消息附近。
3. 搜索不把客服 thread 状态事件误当普通访客消息。
4. UI 文案不暗示本机未落库历史也已被搜索。

### P28-LD-006 清理与设置页

目标：磁盘占用统计、媒体清理、旧缓存整理。

验收：

1. 设置页展示总占用和分项占用。
2. 清理媒体缓存不删除云端消息。
3. 清理过程有 job 和 diagnostics。

### P28-LD-007 稳定性与发布验证

目标：性能、Windows、打包、恢复、回滚。

验收：

1. 1 万条单会话分页性能达标。
2. 10 万条消息搜索可用。
3. Windows packaged app 验证 DB、媒体、打开文件、清理。
4. 回滚到 IndexedDB fallback 的策略清楚。

### P29-LD-001 服务端合同增强

目标：不阻塞 P28，但为微信级终态补齐服务端合同。

验收：

1. 普通 IM 支持 `afterSeq/beforeSeq/cursor` 精确增量和历史分页。
2. Gateway 消息、撤回、删除、已读事件携带稳定 seq 或 version。
3. 媒体返回稳定 `mediaId/cacheIdentity` 和明确鉴权错误码。
4. 客服 thread 事件携带稳定 `eventId/statusVersion`。

## 16. 测试方案

### 16.1 Unit

1. schema migration 幂等。
2. message upsert 去重、seq 排序、撤回、删除、read metadata。
3. media key 生成不受签名 URL 变化影响。
4. media variant 坏缓存检测。
5. message-media refs 防止误删仍引用文件。
6. FTS 写入、更新、删除同步。
7. cleanup candidate 选择。
8. IPC validation 拒绝非法路径、非法 scope、非法 kind。

### 16.2 Integration

1. 打开会话先显示 SQLite 本地消息，再后台同步远端。
2. Gateway push 后消息列表、会话列表、搜索结果一致。
3. 发送图片/视频/文件成功后，重启仍能打开。
4. 断网后重启，已缓存媒体可打开，未缓存媒体显示可恢复状态。
5. 清理媒体缓存后，消息仍在，媒体需要时可重下。

### 16.3 Electron

1. dev 和 packaged 都能打开 DB。
2. worker 崩溃有诊断并可重启。
3. main process 不因长查询卡死。
4. 文件路径只能落在受控目录。
5. Mac 和 Windows 的 open/reveal/save 行为一致。

### 16.4 性能预算

| 场景 | 目标 |
| --- | --- |
| 会话首屏本地消息查询 50 条 | P95 < 80ms |
| 单会话向上分页 50 条 | P95 < 120ms |
| 10 万消息 FTS 搜索 | P95 < 500ms |
| 媒体状态查询 100 条 | P95 < 100ms |
| 存储统计普通扫描 | P95 < 1000ms，且不阻塞 UI |

## 17. 回滚策略

1. SQLite 功能 behind feature flag：`localData.sqlite.enabled`。
2. 首版迁移后保留 IndexedDB 只读 fallback。
3. 写入 SQLite 失败时：
   - 不删除 React Query server snapshot。
   - 不阻塞用户看服务端消息。
   - 记录 `local-data.write_failed`。
4. 媒体 SQLite 索引失败时：
   - 文件缓存仍可由 `ensureLocalMediaFile` 临时兜底。
   - 不再写 localStorage 新索引。
   - 诊断提示本地媒体库降级。

## 18. 服务端合同边界

SQLite 本地库不能替代服务端合同，但 P28 不等待新增 API。服务端合同按 V1/V2 分层处理。

### 18.1 V1 使用存量 API

P28 直接基于当前 API 落地：

1. 普通 IM 会话列表、消息列表、发送、媒体上传、已读、撤回、删除。
2. 在线客服 thread 列表、详情、消息、历史、动作和客户快照。
3. Gateway push 作为 IM 实时主通道。
4. `MediaResourceDto` 中已有的 media/resource/file/object/storage/path/url 字段作为媒体身份候选。
5. 当前服务端窗口 snapshot 作为打开会话后的后台校准来源。

V1 的工程规则：

1. 本地库记录所有已见事实，不因为服务端当前窗口缺少旧消息而删除本地成功消息。
2. 如果 API 没有精确 cursor，`sync_cursors.gap_state` 标记为 `degraded_refetch`。
3. 如果媒体没有稳定 identity，按候选字段生成 best-effort `cache_identity`，并记录来源。
4. 本地搜索只承诺覆盖本机 SQLite 中的消息。

### 18.2 V2 服务端增强

以下能力是微信级终态增强，不作为 P28 阻塞：

1. 每个消息稳定 `messageId`。
2. 会话内单调递增 `conversationSeq` 或等价 cursor。
3. gap sync API：`afterSeq` / `beforeSeq` / `cursor`。
4. 媒体稳定 `mediaId` 或 `cacheIdentity`。
5. 媒体鉴权失败明确错误码，不能返回 HTML 错误页。
6. 撤回、删除、已读、客服 thread 状态的 Gateway 事件字段稳定。

## 19. 讨论待确认

1. SQLite native dependency 是否接受 `better-sqlite3 + worker` 路线。
2. SQLCipher 是否进入 v1，还是先作为 P29 安全专项。
3. 客服历史是否和普通 IM 同期迁入 SQLite，推荐同期迁入消息/媒体底座，但客服 thread 状态保留客服 owner。
4. 旧 `LPP Files` 是否首版只登记不搬迁，推荐只登记。
5. 中文分词是否 v1 必须增强，推荐 v1 先用 FTS5 unicode61，后续按搜索质量专项优化。
6. Windows 实机验证是否作为 P28 发布前阻塞项，推荐阻塞。

## 20. 阶段判断

PC 端要对标微信，本地数据能力不能停留在“消息有 IndexedDB、媒体有文件缓存”。正确方向是建立统一本地数据平面：

```text
SQLite 负责事实、索引、搜索、引用、清理和迁移。
文件系统负责图片、视频、文件本体。
Electron main/preload 负责安全边界。
Renderer 只消费 read model 和用户动作结果。
```

这套方案会引入 native SQLite 依赖和迁移成本，但这是从“能跑的聊天客户端”走向“专业 PC IM + 客服客户端”的必要地基。

## 21. Local Sync Engine

微信级本地库不能只做缓存，必须有本地同步引擎。同步引擎负责把服务端快照、Gateway push、发送确认、断线恢复、手动刷新和本地发送箱归约到同一个本地事实源。

### 21.1 状态模型

每个会话维护独立 sync state：

| 状态 | 含义 | UI 行为 |
| --- | --- | --- |
| `local_ready` | 本地已有消息可展示，远端同步未完成。 | 先展示本地消息，顶部或轻提示显示正在同步。 |
| `server_synced` | 已与服务端当前窗口同步。 | 正常展示。 |
| `gap_detected` | 本地 seq/cursor 发现缺口。 | 保留本地消息，后台补洞；不整屏 loading。 |
| `gap_repairing` | 正在执行 afterSeq/cursor 补洞。 | 展示本地消息，必要时显示非阻塞同步提示。 |
| `degraded_refetch` | 服务端缺少精确补洞，只能 fallback refetch。 | 记录诊断，UI 不宣称已精确补齐。 |
| `offline` | 网络不可用或 Gateway 断开。 | 本地可读，发送走 outbox。 |
| `blocked` | 权限、合同或账号 scope 异常。 | 显示产品化错误，真实原因进 diagnostics。 |

### 21.2 归约顺序

同一会话的写入必须串行化，顺序为：

1. 本地 pending outbox echo。
2. 服务端 snapshot。
3. Gateway push。
4. 发送确认。
5. read metadata。
6. recall/delete event。
7. sync cursor update。

如果事件乱序，以 `conversationSeq/serverSeq/sentAt/updatedAt` 加 source priority 归约：

```text
send_confirm > gateway_push > server_snapshot > local_outbox > migration
```

同一 `messageId` 的新事实只能合并，不能创建重复消息。同一 `clientMsgId` 收到服务端确认后必须合并到服务端 `messageId`，并保留发送状态演进记录。

### 21.3 Gap Sync

P28 默认 push 可靠。没有外部新消息时，普通 IM 不做高频刷新；打开会话后的远端请求只用于校准当前窗口和补齐本地未见内容。

P28 基于存量 API 的 fallback：

1. 本地检测到 seq/cursor 缺口时标记 `degraded_refetch`。
2. 拉取当前服务端窗口并合并，不删除本地已有成功消息。
3. 记录 `local-sync.gap_contract_missing` 诊断。
4. UI 不宣称已经精确补齐缺口。
5. 后续依赖 Gateway push 继续维护实时性。

真正闭环的 V2 需要服务端提供：

1. `afterSeq` 或 `cursor` 增量消息接口。
2. `beforeSeq` 历史分页接口。
3. Gateway 消息携带会话内稳定 seq。
4. 撤回、删除、已读、客服状态事件携带 seq 或 version。

### 21.4 Sync Tables 补充

现有 `sync_cursors` 需要补充：

```sql
ALTER TABLE sync_cursors ADD COLUMN local_min_seq INTEGER;
ALTER TABLE sync_cursors ADD COLUMN local_max_seq INTEGER;
ALTER TABLE sync_cursors ADD COLUMN server_ack_seq INTEGER;
ALTER TABLE sync_cursors ADD COLUMN gap_ranges_json TEXT;
ALTER TABLE sync_cursors ADD COLUMN source_watermark_json TEXT;
```

新增 sync 事件流水：

```sql
CREATE TABLE sync_events (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  seq INTEGER,
  cursor TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);
```

`sync_events` 只保留最近有限条数，用于 diagnostics 和问题复盘，不作为业务事实源。

## 22. Customer Service Local Model

在线客服不能只当成普通 IM 消息。客服消息可以复用本地 message/media 底座，但客服 thread、接待状态、队列、客户资料、SLA 和动作权限必须有独立领域模型。

### 22.1 客服本地表

```sql
CREATE TABLE cs_threads (
  scope_key TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  thread_type TEXT NOT NULL,
  customer_id TEXT,
  visitor_id TEXT,
  assignee_id TEXT,
  status TEXT NOT NULL,
  queue_state TEXT,
  priority TEXT,
  visitor_unread_count INTEGER NOT NULL DEFAULT 0,
  agent_unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_id TEXT,
  last_status_version INTEGER,
  opened_at TEXT,
  closed_at TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, thread_id)
);

CREATE TABLE cs_thread_events (
  scope_key TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status_version INTEGER,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, thread_id, event_id)
);

CREATE TABLE cs_customer_snapshots (
  scope_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  profile_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope_key, customer_id)
);
```

### 22.2 客服事件规则

1. 访客消息写入 `messages`，并关联 `cs_threads.thread_id`。
2. 接入、转接、关闭、排队、SLA、评价写入 `cs_thread_events`，不伪装成普通消息。
3. 客服 thread 权限由客服 domain 推导，不由 message status 推导。
4. 客服未读只从 `cs_threads`、服务端 thread summary、Gateway thread event 归约，不复用普通 IM unread。
5. 终态会话只读状态必须本地可恢复，不能依赖刷新后重新请求。

### 22.3 客服验收

1. PC 重启后，客服工作台能本地恢复最近 thread 列表和状态。
2. 已关闭会话打开后仍显示历史消息，但输入区本地推导为只读。
3. 转接/排队事件不计入访客未读。
4. 客户资料接口失败时，仍可展示本地最后一次快照并标记非阻塞 stale。

## 23. Media Pipeline

媒体库必须覆盖“选择/粘贴 -> 本地临时资产 -> 上传 -> 服务端确认 -> 本地长期资产 -> 打开/搜索/清理”的完整生命周期。

### 23.1 媒体状态机

`media_assets.status` 枚举：

| 状态 | 含义 |
| --- | --- |
| `local_pending` | 用户刚选择、粘贴或拖入，本地临时文件已登记。 |
| `uploading` | 正在上传。 |
| `uploaded` | 上传完成，已有服务端 mediaId/cacheIdentity。 |
| `linked` | 已被成功消息引用。 |
| `cached` | 远端媒体已下载成本地 variant。 |
| `stale` | 本地文件存在，但需要重新校验或刷新鉴权。 |
| `failed` | 下载、上传或校验失败。 |
| `orphan` | 本地文件存在，但没有消息或 outbox 引用。 |

### 23.2 上传临时资产

发送图片、视频、文件时：

1. preload 获取真实本地文件或 bytes。
2. main 复制到受控 `Media/_pending/` 目录。
3. SQLite 写入 `media_assets(status=local_pending)` 和 `media_variants(variant=original)`。
4. outbox 引用 `media_key`。
5. 上传成功后补 `media_id/cache_identity/remote_url_hash/status=uploaded`。
6. 消息发送成功后写 `message_media_refs`，状态变为 `linked`。

### 23.3 下载与生成任务

新增媒体任务队列表：

```sql
CREATE TABLE media_jobs (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  media_key TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  input_json TEXT NOT NULL,
  result_json TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

`job_type` 枚举：

1. `download_original`
2. `generate_thumbnail`
3. `generate_poster`
4. `copy_local_file`
5. `verify_file`
6. `rehydrate_legacy`

媒体下载、封面生成、旧缓存整理都必须走 job，不能在 UI 可见时无限制并发执行。

### 23.4 去重与复用

1. 同一 `mediaId/cacheIdentity` 复用同一个 asset。
2. 同一 `content_sha256` 可以跨会话复用文件本体，但必须分别记录 message ref。
3. 签名 URL 过期不影响本地 asset identity。
4. 文件名只用于展示和另存默认名，不作为唯一身份。
5. 用户主动另存为不改变 cache variant。

### 23.5 大文件策略

v1 最低要求：

1. 下载采用临时文件 + 原子 rename。
2. 下载失败保留 partial 标记但不作为可打开文件。
3. 上传失败保留 local pending 文件和 outbox。
4. 大于阈值的文件不自动预下载，只在用户打开或可见策略允许时下载。

断点上传/下载作为 P29/P30 能力，但 schema 预留 `media_jobs.input_json/result_json` 保存 range/chunk 元数据。

## 24. Integrity And Repair

顶级 IM 必须具备本地自愈。SQLite 和文件系统任何一边都可能损坏、丢失或被用户清理。

### 24.1 启动检查

启动时执行轻量检查：

1. DB schema version 是否匹配。
2. WAL 是否可打开。
3. 最近一次 migration 是否完成。
4. 上次 cleanup job 是否中断。
5. 最近 N 条 media variants 是否存在。

不在启动时全量扫描所有媒体，避免卡启动。

### 24.2 深度检查

设置页提供“检查本地数据”：

1. `PRAGMA integrity_check`。
2. 扫描 `media_variants.local_path` 是否存在。
3. 扫描受控 Media 目录是否有 DB 未登记文件。
4. 重建 `message_fts`。
5. 修复 orphan asset/variant。
6. 输出 diagnostics summary。

### 24.3 修复策略

| 问题 | 修复 |
| --- | --- |
| DB 可打开但 FTS 损坏 | 删除并重建 FTS，不删除 messages。 |
| variant 文件缺失 | 标记 `stale`，下次打开时重下。 |
| 文件存在但 DB 无记录 | 登记为 `orphan`，等待 ref 补全或清理。 |
| message ref 指向不存在 asset | 从 message body 尝试重建 asset；失败则记录合同异常。 |
| WAL 长期膨胀 | 空闲期 checkpoint，不在聊天首屏执行。 |
| migration 中断 | 根据 migration journal 重试或回滚该批次。 |

### 24.4 崩溃恢复

1. worker crash 后 main 重启 worker，并恢复 DB connection。
2. 未完成 transaction 依赖 SQLite rollback/WAL 保证一致性。
3. 未完成 media job 标记为 `failed` 或 `pending_retry`。
4. outbox 不因 crash 丢失。

## 25. Privacy And Storage Policy

### 25.1 多账号和多空间隔离

1. 所有本地数据必须按 `scope_key` 隔离。
2. 不同 profile 使用不同 DB 目录。
3. 文件目录使用 scope hash，不暴露租户、用户、会话明文。
4. 设置页清理必须明确当前账号、当前空间或全部 profile。

### 25.2 退出登录策略

默认策略：

1. 退出登录不删除本地聊天记录。
2. 清除 token 和 secure session。
3. 本地库标记该 scope 为 `logged_out`。
4. 重新登录同账号同空间可复用本地历史。

用户可选：

1. 仅退出登录。
2. 退出并清理当前账号本地缓存。
3. 退出并清理当前账号所有本地消息和媒体。

### 25.3 加密路线

v1：

1. token 不入 DB。
2. 本地路径不输出到普通 diagnostics。
3. DB 和媒体目录仅放在 app userData。
4. 文件名做安全清洗。

v2：

1. SQLCipher 加密 SQLite。
2. safeStorage 派生或保存 DB key。
3. 媒体文件可选文件级加密。
4. 设备迁移、备份恢复、密钥丢失策略单独设计。

### 25.4 用户可理解的存储文案

设置页不得使用“数据库”“FTS”等内部词作为用户主文案。用户看到的是：

1. 聊天记录。
2. 图片与视频。
3. 文件。
4. 可清理缓存。
5. 不会删除云端消息。
6. 清理后再次查看可能需要重新下载。

## 26. WeChat-Level Acceptance Matrix

后续实现不能只用单测证明通过，必须用场景验收确认体验达到顶级 IM 标准。

### 26.1 P28 存量 API 可落地验收

| 场景 | V1 预期 | 验收标准 |
| --- | --- | --- |
| 断网打开老会话 | 不整屏 loading，直接看到本机已落库历史。 | 1 秒内展示最近 50 条本地消息。 |
| 新消息 push 到达 | 列表、聊天窗口、搜索索引一致更新。 | Gateway event 后本地库和 UI projection 一致。 |
| push 漏消息 | 能识别 gap，不误判精确同步。 | 记录 gap diagnostic，触发当前窗口 fallback，不删除本地成功消息。 |
| 签名 URL 过期 | 已缓存图片/视频仍能打开。 | 不请求过期 URL，直接使用 local variant。 |
| 视频刚发送成功 | 重启后仍能打开本地视频。 | outbox/media/message ref 全部恢复。 |
| 清理媒体缓存 | 消息还在，媒体可重新下载。 | 清理后 message record 不丢，点击显示可恢复状态。 |
| 搜索历史 | 不依赖当前组件已加载 50 条。 | 本机 SQLite 中的消息可搜索，结果可跳转。 |
| 客服终态会话 | 重启后仍只读，历史可见。 | cs thread 本地状态恢复，不靠接口首包。 |
| 多账号切换 | 不串消息、不串媒体、不串未读。 | scopeKey 隔离测试覆盖。 |
| DB/文件损坏 | 可诊断、可修复、可降级。 | 设置页深度检查能发现并修复常见问题。 |
| Windows 发布包 | native SQLite、文件打开、清理可用。 | Windows 实机 smoke 作为发布阻塞项。 |

### 26.2 P29 微信级终态验收

| 场景 | V2 预期 | 依赖 |
| --- | --- | --- |
| 精确补洞 | push 漏消息后按 seq/cursor 补齐。 | `afterSeq/beforeSeq/cursor` API 和 Gateway seq。 |
| 全量历史分页 | 本机可按需同步更早历史。 | 服务端历史分页 cursor。 |
| 媒体稳定去重 | 签名 URL 改变不影响同一媒体身份。 | 稳定 `mediaId/cacheIdentity`。 |
| 客服事件追溯 | thread 状态流可完整回放。 | 稳定 `eventId/statusVersion`。 |

## 27. 补强后的最终判断

补充 Local Sync Engine、Customer Service Local Model、Media Pipeline、Integrity And Repair、Privacy And Storage Policy 和 WeChat-Level Acceptance Matrix 后，本方案才形成微信级本地数据闭环。

当前结论分两层：

1. P28 可以基于存量 API 先做，目标是“本机已见事实本地化、统一 owner、local-first、媒体可复用、可诊断、可清理”。
2. P29 再补服务端合同，目标是“精确补洞、按需历史分页、稳定媒体身份、客服事件版本”。

最终架构判断：

```text
SQLite 是本地事实和索引平面。
文件系统是媒体本体平面。
Local Sync Engine 是服务端与本地事实的归约平面。
Media Pipeline 是媒体生命周期平面。
Customer Service Local Model 是客服领域事实平面。
Integrity And Repair 是长期可靠性平面。
Privacy And Storage Policy 是用户信任平面。
```

没有这些补强，SQLite 只是一个更好的缓存库；有这些补强，PC 端才具备接近微信级 IM 客户端的本地数据地基。
