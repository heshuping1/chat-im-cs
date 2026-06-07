# PC 端 P28 微信级本地数据任务清单

状态：待开始

日期：2026-06-07

适用范围：`lpp/lpp_pc_client`

关联方案：

- `architecture/PC端微信级本地数据方案.md`
- `PC端重构任务矩阵.md`
- `../05-服务端支持.md`

## 1. 执行原则

1. P28 基于当前 API 落地，不等待新增服务端接口。
2. 默认 Gateway push 可靠；普通 IM 不用高频轮询掩盖本地库或 push 问题。
3. 不做跨设备全量历史搜索；搜索只覆盖本机 SQLite 已落库消息。
4. UI 只消费 LocalDataProjection，不直接读取 DB、文件路径、媒体缓存、React Query raw snapshot 或 Gateway raw event。
5. 消息、媒体、发送箱、搜索、清理、诊断必须进入 LocalDataService 统一 owner。
6. 每个任务都必须保留 DDD 边界：domain 规则不进 UI，API DTO 先过 adapter/normalizer，Electron IPC typed + validated。
7. 新增 native SQLite 依赖、替换长期存储技术、删除 IndexedDB fallback 前必须负责人确认。

## 2. 状态枚举

| 状态 | 含义 |
| --- | --- |
| 待开始 | 尚未执行。 |
| 进行中 | 已开始实现。 |
| 待验证 | 代码完成但验证未闭环。 |
| 已完成 | 已实现并通过验收。 |
| 阻塞 | 依赖负责人确认、服务端合同或外部环境。 |

## 3. P28 任务总览

| 编号 | 任务 | Owner | 依赖 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P28-LD-001 | SQLite 技术验证与 ADR | Electron Main / Local Data | 负责人确认 native 依赖 | L4 | 已完成 |
| P28-LD-002 | LocalDataService IPC 与 worker 地基 | Electron Main / Shared Desktop API | P28-LD-001 | L3 | 已完成 |
| P28-LD-003 | SQLite schema、migration、diagnostics | Local Data Worker | P28-LD-002 | L3 | 已完成 |
| P28-LD-004 | P27 IndexedDB 消息迁移 | Message Store | P28-LD-003 | L3 | 已完成 |
| P28-LD-005 | Local Message Store 写入路径迁移 | Message Domain | P28-LD-004 | L3 | 已完成 |
| P28-LD-006 | LocalDataProjection 统一 UI 出口 | Message / Reminder / CS UI | P28-LD-005 | L3 | 已完成 |
| P28-LD-007 | Local Sync Engine fallback 与诊断 | Sync Domain | P28-LD-005 | L3 | 已完成 |
| P28-LD-008 | Media identity normalizer 与 media schema | Media Domain | P28-LD-003 | L3 | 已完成 |
| P28-LD-009 | Media Pipeline 文件缓存迁移 | Electron Main / Media Runtime | P28-LD-008 | L4 | 已完成 |
| P28-LD-010 | Send Outbox 与媒体引用一致性 | Send Queue / Message Domain | P28-LD-005、P28-LD-009 | L3 | 已完成 |
| P28-LD-011 | 本机已落库搜索与跳转 | Search / Message Timeline | P28-LD-005 | L3 | 已完成 |
| P28-LD-012 | Customer Service Local Model | Customer Service Domain | P28-LD-005 | L3 | 已完成 |
| P28-LD-013 | 存储统计、清理与设置页入口 | Storage / Settings | P28-LD-009 | L3 | 已完成 |
| P28-LD-014 | Integrity And Repair 自愈工具 | Local Data Worker / Settings | P28-LD-003、P28-LD-009 | L3 | 已完成 |
| P28-LD-015 | 发布验证、性能预算与回滚 | Release / QA | P28-LD-001 至 P28-LD-014 | L4 | 待验证 |

## 4. P28 任务明细

### P28-LD-001 SQLite 技术验证与 ADR

目标：验证 `better-sqlite3 + worker + WAL + FTS5` 在 PC Electron dev/package 环境可行。

修改范围：

1. 新增本地验证脚本或 spike，验证建库、迁移、事务、FTS 查询和 WAL。
2. 记录 native dependency 打包风险。
3. 新增 ADR，说明为什么从 IndexedDB 升级到 SQLite。

验收：

1. Mac dev 环境能创建 DB、写入消息、FTS 查询。
2. `npm run build:electron` 风险已明确；不能跑时记录原因。
3. Windows packaged app 验证登记为 P28-LD-015 发布阻塞项。

### P28-LD-002 LocalDataService IPC 与 worker 地基

目标：建立 renderer 无 SQL、main 无长事务、worker 独占 DB 的最小链路。

修改范围：

1. `src/shared/desktop-api.ts`
2. `src/shared/desktop-api-validation.ts`
3. `src/main/main.ts`
4. 新增 `src/main/local-data/`
5. 新增 renderer local-data repository adapter。

验收：

1. 所有 IPC typed + validated。
2. renderer 不接触 DB 连接或真实本地路径。
3. worker 异常不杀死 renderer，并能写 `local-data.worker_failed` 诊断。

### P28-LD-003 SQLite schema、migration、diagnostics

目标：落地 schema version、migration runner、diagnostics 和幂等迁移。

修改范围：

1. `local_meta`
2. `conversations`
3. `messages`
4. `message_fts`
5. `media_assets`
6. `media_variants`
7. `message_media_refs`
8. `send_outbox`
9. `sync_cursors`
10. `cleanup_jobs`

验收：

1. migration 可重复执行。
2. schema 变更有版本记录。
3. 写入失败、迁移失败、FTS 重建失败都有脱敏 diagnostics。

### P28-LD-004 P27 IndexedDB 消息迁移

目标：把 P27 `lpp-pc-im-message-store` 成功消息迁入 SQLite，保留只读 fallback。

修改范围：

1. `src/renderer/data/message-store/`
2. LocalDataService migration import API。
3. migration journal。

验收：

1. 同一 scope/conversation/messageId 不重复导入。
2. 迁移失败不阻塞登录和聊天。
3. 导入后本地首屏语义不退化。

### P28-LD-005 Local Message Store 写入路径迁移

目标：服务端 snapshot、Gateway push、发送确认、read metadata、撤回、删除统一写入 SQLite。

修改范围：

1. 普通 IM message repository。
2. Gateway message handler。
3. 发送确认路径。
4. read metadata 路径。
5. recall/delete action path。

验收：

1. 同一 `messageId` 或 `clientMsgId` 不产生双消息。
2. React Query 只作为服务端 snapshot mirror，不再是成功消息事实源。
3. 离线或接口失败时本地成功历史仍展示。

### P28-LD-006 LocalDataProjection 统一 UI 出口

目标：列表、聊天窗口、提醒、badge、搜索、客服工作台都从 LocalDataProjection 读取。

修改范围：

1. ConversationListProjection。
2. MessageTimelineProjection。
3. ReminderProjection。
4. SearchProjection。
5. CustomerServiceProjection。

验收：

1. 列表有新消息时，提醒和 badge 来源一致。
2. 当前打开会话不会产生未读红点。
3. UI 不直接解释 Gateway raw payload 或 API raw DTO。
4. 服务端 snapshot refetch 不直接驱动提醒。

### P28-LD-007 Local Sync Engine fallback 与诊断

目标：在缺少精确 `afterSeq/beforeSeq` API 时，建立可诊断的 degraded sync。

修改范围：

1. `sync_cursors`
2. `sync_events`
3. Gateway gap detection。
4. current-window fallback refetch。

验收：

1. 缺 seq/cursor 时记录 `degraded_refetch`。
2. fallback 不删除本地成功消息。
3. UI 不宣称精确补洞完成。
4. 普通 IM 不引入高频轮询。

### P28-LD-008 Media identity normalizer 与 media schema

目标：基于当前 `MediaResourceDto` 生成 best-effort media identity。

修改范围：

1. Media identity normalizer。
2. `media_assets`
3. `media_variants`
4. `message_media_refs`

验收：

1. 优先级为 `mediaId > resourceId > fileId > objectKey > storageKey > relativePath > url hash`。
2. 签名 URL 不作为首选长期身份。
3. identity 来源写入 diagnostics 或 metadata，便于后续替换为服务端稳定身份。

### P28-LD-009 Media Pipeline 文件缓存迁移

目标：替换 renderer localStorage 媒体索引，收敛到 LocalMediaLibrary。

修改范围：

1. `src/main/media-storage.ts`
2. `src/renderer/media/runtime/localMediaCache.ts`
3. `src/renderer/media/runtime/mediaMaterialization.ts`
4. LocalDataService media APIs。

验收：

1. 图片、视频、文件缓存命中时直接使用 local variant。
2. JSON/HTML 错误页坏缓存被标记并重下。
3. 本机刚发送媒体重启后仍可打开。
4. renderer 不保存真实本地绝对路径。

### P28-LD-010 Send Outbox 与媒体引用一致性

目标：发送中、失败、重试、发送成功后的 message/media/outbox 事务一致。

修改范围：

1. send outbox schema。
2. 文本发送路径。
3. 媒体发送路径。
4. 发送失败重试路径。

验收：

1. 上传成功但消息发送失败时，媒体 asset 不丢。
2. 消息发送成功后 outbox 归档，message ref 和 media ref 一致。
3. app 重启后失败项可恢复或明确失败原因。

### P28-LD-011 本机已落库搜索与跳转

目标：搜索覆盖本机 SQLite 已落库消息，不依赖当前组件已加载 50 条。

修改范围：

1. `message_fts`
2. LocalSearchRepository。
3. 搜索面板 adapter。
4. MessageTimelineProjection 跳转上下文。

验收：

1. 本机已落库但当前未加载的消息可命中。
2. 搜索结果可跳转到消息附近。
3. 客服 thread 状态事件不被当成普通访客消息。
4. UI 明确搜索范围，不暗示跨设备全量搜索。

### P28-LD-012 Customer Service Local Model

目标：客服消息复用 message/media 底座，thread 状态、队列、客户快照保持客服领域 owner。

修改范围：

1. `cs_threads`
2. `cs_thread_events`
3. `cs_customer_snapshots`
4. 客服 thread list/detail/message/action/profile adapter。

验收：

1. PC 重启后可恢复最近客服 thread 列表和终态只读状态。
2. profile-card 失败时展示本地 stale snapshot。
3. 转接、排队、关闭事件不计入普通 IM unread。

### P28-LD-013 存储统计、清理与设置页入口

目标：用户可理解地查看和清理本地数据。

修改范围：

1. LocalStorageRepository。
2. cleanup jobs。
3. 设置页存储入口。
4. diagnostics export。

验收：

1. 展示聊天记录、图片与视频、文件、索引的占用。
2. 清理媒体缓存不删除云端消息。
3. 清理本地消息索引需要二次确认。
4. cleanup 失败保留 DB 记录并可重试。

### P28-LD-014 Integrity And Repair 自愈工具

目标：DB、FTS、媒体文件、引用关系损坏时可诊断、可修复、可降级。

修改范围：

1. `PRAGMA integrity_check`
2. FTS rebuild。
3. media variants file existence scan。
4. orphan file registration。
5. settings deep check action。

验收：

1. FTS 损坏可重建，不删除 messages。
2. 文件缺失标记 stale，下次打开可重下。
3. DB 未登记文件登记为 orphan。
4. 深度检查输出 diagnostics summary。

### P28-LD-015 发布验证、性能预算与回滚

目标：P28 发布前完成性能、安全、Windows、回滚验证。

修改范围：

1. 核心单测。
2. Electron integration。
3. Mac packaged smoke。
4. Windows packaged smoke。
5. rollback flag。

验收：

1. 本地消息首屏 50 条 P95 < 80ms。
2. 单会话分页 50 条 P95 < 120ms。
3. 10 万消息 FTS P95 < 500ms。
4. Windows packaged app 可打开 DB、媒体、清理和诊断导出。
5. SQLite flag 关闭后 IndexedDB 只读 fallback 可用。

## 5. P29 服务端合同增强登记

P29 不阻塞 P28。只有服务端确认合同后再执行。

| 编号 | 任务 | 服务端依赖 | 状态 |
| --- | --- | --- | --- |
| P29-LD-001 | 精确 gap sync | 普通 IM `afterSeq/beforeSeq/cursor` 与 Gateway seq | 待合同确认 |
| P29-LD-002 | 按需历史分页 | 服务端历史分页 cursor，不含跨设备全文搜索 | 待合同确认 |
| P29-LD-003 | 稳定媒体身份 | 服务端稳定 `mediaId/cacheIdentity` 和鉴权错误码 | 待合同确认 |
| P29-LD-004 | 客服事件版本 | 客服 thread `eventId/statusVersion` | 待合同确认 |
| P29-LD-005 | 本地数据加密专项 | SQLCipher、safeStorage key、恢复策略 | 待安全评估 |

## 6. 推荐执行顺序

1. P28-LD-001 到 P28-LD-003：先把 SQLite/IPC/worker/schema 地基跑通。
2. P28-LD-004 到 P28-LD-007：迁移普通 IM 消息和统一 projection。
3. P28-LD-008 到 P28-LD-010：迁移媒体与发送箱一致性。
4. P28-LD-011 到 P28-LD-012：补搜索和客服本地模型。
5. P28-LD-013 到 P28-LD-015：补清理、自愈、发布验证。

## 7. 每项任务完成记录模板

## 8. 执行记录

### 2026-06-07

已完成：

1. 新增 `better-sqlite3` 和 `@types/better-sqlite3`，建立 SQLite 本地数据 ADR。
2. 新增 LocalDataService typed IPC：消息列表、搜索、写入、删除、scope 清理、存储统计、清理任务。
3. 新增 SQLite driver：`local_meta`、`messages`、`message_fts`、`conversations`、`media_assets`、`media_variants`、`message_media_refs`、`send_outbox`、`sync_cursors`、`cleanup_jobs`。
4. 新增 schema version 记录和 Local Data 脱敏诊断回调。
5. IM message store 在 desktop 环境优先走 LocalDataService，保留 IndexedDB/memory fallback。
6. P27 IndexedDB 消息后台导入 SQLite，按 scope 分组，失败不阻塞聊天。
7. 本机已落库搜索接入 `ImMessageStore.searchMessages`，UI 不直接调用 SQLite 或 desktopApi。
8. 媒体身份统一到 `mediaIdentityFromResource`，完整签名 URL 只作为最后 hash 兜底。
9. 设置页新增本地消息库统计和本机索引清理入口。
10. 新增 LocalData media/outbox/customer-service/repair typed IPC，拆分 `local-data-ipc-validation.ts` 避免 validation owner 超限。
11. 媒体物化成功后写入 LocalData media variant；desktop 环境不再把媒体长期索引写入 renderer localStorage，旧 localStorage 仅作为非 desktop fallback/兼容读取。
12. `ChatSendRuntime` 复用既有 IndexedDB blob outbox，并把 outbox 元数据镜像到 SQLite；发送成功删除 outbox 时同步删除 SQLite 元数据。
13. 客服 thread/profile snapshot 通过 `cs-local-data-repository` 写入 LocalData；profile-card 失败时可使用本地 stale snapshot。
14. 设置页补充媒体缓存清理和本地库 deep check/FTS rebuild 入口。
15. 确认既有 `message-gap-sync-coordinator` 满足 degraded fallback：记录 `fallback-refetch`、不宣称精确补洞、不引入普通 IM 高频轮询。

已验证：

1. `npm run typecheck -- --pretty false`
2. `npx vitest --configLoader runner run tests/unit/im-message-store.spec.ts tests/unit/message-lookup-ui.spec.ts`
3. `npx vitest --configLoader runner run tests/unit/media-materialization.spec.ts tests/unit/image-precache.spec.ts tests/unit/local-data-contract.spec.ts tests/unit/media-message.spec.ts`
4. `npx vitest --configLoader runner run tests/unit/desktop-api-validation.spec.ts tests/unit/local-data-sqlite-driver.spec.ts`
5. `npx vitest --configLoader runner run tests/unit/local-data-sqlite-driver.spec.ts tests/unit/local-data-file-driver.spec.ts tests/unit/desktop-api-validation.spec.ts tests/unit/media-materialization.spec.ts tests/unit/send-queue.spec.ts tests/unit/architecture-boundaries.spec.ts`
6. `npm run check:quick`

未闭环：

1. P28-LD-015 Windows packaged native SQLite 验证仍是发布阻塞项。
2. 10 万消息 FTS P95、Mac packaged smoke、Windows packaged smoke 尚未执行。
3. 当前 API 不支持精确 `afterSeq/beforeSeq/cursor`，P28 只能 degraded refetch；精确补洞登记到 P29。

```text
日期：
任务编号：
状态：
修改范围：
是否新增依赖：
是否改变 IPC：
是否改变 query key / projection：
验证命令：
验证结果：
遗留风险：
下一项任务：
```
