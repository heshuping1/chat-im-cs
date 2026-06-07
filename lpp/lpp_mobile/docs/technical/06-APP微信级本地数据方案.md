# APP微信级本地数据方案

状态：当前有效

日期：2026-06-07

适用范围：`lpp_mobile`

## 1. 定位

本文件是 APP 端普通 IM 与在线客服聊天底座的微信级本地数据专题方案。它不是单纯的媒体缓存方案，而是覆盖聊天体验中所有需要端侧稳定恢复的本地事实：

- 本地消息库
- 会话快照
- 发送队列与失败恢复
- 媒体本体本地化
- 本地搜索与媒体索引
- 存储治理与清理
- 启动恢复与数据自检

前序聊天中的两个计划已经合并进本文：

- `App 聊天媒体本地化执行方案`：提供媒体本地化的产品体验、执行顺序、阶段一边界和验收标准。
- `聊天媒体本地化技术方案`：提供 SQLite 媒体账本、Dio 下载器、持久文件目录、图片缓存边界、controller 编排和分层落点。

后续实施、评审、验收和任务跟踪均以本文为准，不再引用聊天上下文里的旧计划作为独立依据。

本专题属于 L2 核心链路，影响聊天首屏、本地消息、会话恢复、消息发送、媒体预览、媒体下载、搜索、存储、弱网恢复和 Android 真机验收。执行时必须遵守本地优先、`spaceId` 隔离、DDD 分层、Runtime owner 明确和 UI 不遮挡已有本地数据的规则。

## 2. 顶级产品验收

微信级本地数据体验的核心目标不是“缓存一些文件”，而是：

1. App 重启后，用户进入会话应立即看到本地消息、会话标题、头像、未读、草稿和媒体预览。
2. 网络慢、断网、token 刷新或远端同步失败时，不得清空已有本地消息。
3. 用户发送中的文本、图片、视频、文件、语音必须可恢复、可重试、可替换服务端回包。
4. 用户打开过的图片、视频、文件、语音应进入本地账本，重启后可复用。
5. 聊天内搜索、图片视频、文件入口应优先复用本地索引和本地媒体状态。
6. 存储占用要可统计、可治理、可按会话清理，清理文件不应误删消息。
7. App 启动时要能自检本地账本和文件状态，修复下载中断、文件丢失、脏状态。

第一屏硬标准：

- SQLite 本地消息先显示。
- 会话快照先显示标题、头像、最后消息、未读和草稿。
- 媒体消息 body 存在时，气泡必须出现。
- 预览资源存在时优先展示本地预览、封面或缩略图。
- 预览资源暂不可用时展示轻量占位或文件卡，不隐藏整条消息。
- 远端同步、媒体下载和搜索索引刷新只能局部更新，不能整块 loading 遮挡已有消息列表。

## 3. 方案闭环评估

| 模块 | 当前已有基础 | 需要补齐到微信级 |
| --- | --- | --- |
| 本地消息库 | 已有 SQLite 消息表和本地优先读取。 | 明确首屏窗口、历史分页、远端同步归并、消息 body 本地序列化契约。 |
| 会话快照 | 已有会话 SQLite 表和本地会话列表。 | 明确会话快照 owner、草稿、未读、最后消息、头像标题和空间隔离。 |
| 发送队列 | 已有 `clientMsgId`、pending queue 和乐观插入基础。 | 统一发送队列账本、媒体原始本地 body、失败重试、服务端替换、重启恢复。 |
| 媒体本体本地化 | 已有预览字段、视频 poster、临时下载能力。 | 新增 `media_local_files`，持久文件目录，按需下载，文件缺失回退。 |
| 本地搜索与媒体索引 | 已有会话内搜索和媒体网格产品要求。 | 本地索引、文件名索引、图片视频/文件快捷入口复用本地账本。 |
| 存储治理 | 当前缺统一治理。 | 统计占用、按会话清理、按类型清理、只清文件不删消息、空间级隔离。 |
| 启动恢复与自检 | 当前主要依赖进入会话时读取。 | 启动扫描 downloading/failed/文件丢失/孤儿文件，做轻量修复。 |

结论：媒体本地化已经有明确技术方案，但如果方案名是 `APP微信级本地数据方案`，必须按上述七个模块形成闭环后再进入完整实现。

## 4. 存量 API 支撑评估

本方案阶段一不要求新增服务端 API。所有能力优先基于当前已公开和 App 已接入的接口、Gateway 事件、SQLite 本地表和端侧文件系统完成。

### 4.1 可直接支撑的存量能力

| 方案模块 | 存量 API / 字段 | 支撑结论 |
| --- | --- | --- |
| 本地消息库 | `GET /direct-chats/{chatId}/messages`、`GET /groups/{groupId}/messages`、Gateway `msg.new`、`MessageItemDto` | 可做。消息拉取和实时增量可入 SQLite，首屏本地优先不需要新 API。 |
| 会话快照 | `GET /conversations`、`ConversationListItemDto`、单聊/群详情、pin/mute/read/draft 接口 | 可做。会话标题、头像、最后消息、未读、免打扰、置顶和草稿可按现有接口与本地表归并。 |
| 发送队列 | 单聊/群聊发送接口、`clientMsgId`、媒体上传接口、服务端回包 `messageId/conversationSeq/serverTime` | 可做。乐观插入、失败保留、重试和成功替换均可端侧实现。 |
| 媒体上传 | `POST /api/client/v1/media/upload`，返回 `mediaId/mediaKind/url/fileName/mimeType/sizeBytes/thumbnailUrl?` | 可做。发送侧可继续先上传媒体，再发送消息 body。 |
| 媒体接收 | `MediaResourceDto.url/fileName/mimeType/sizeBytes/width/height/durationSeconds/thumbnailUrl` | 可做。接收侧有足够字段做预览、文件卡、视频封面兜底和本体下载。 |
| 媒体下载 | 受保护 `url`，通常为 `/media/{mediaId}`，通过现有 Dio 鉴权访问 | 可做。无需新增下载 API；Dio 直接请求 `media.url` 并落盘。 |
| 图片/视频/文件快捷入口 | `/direct-chats/{chatId}/files`、`/groups/{groupId}/files`，`mediaKind=image/video/voice/file` | 可做。可作为会话媒体列表的远端补齐；本地索引优先展示。 |
| 会话内搜索 | `GET /api/client/v1/search/messages?keyword&conversationId` | 可做基础能力。时间范围、复杂筛选不依赖服务端，阶段一由本地索引补。 |
| 草稿 | 单聊/群聊 draft PUT/DELETE，另有 `/drafts` | 可做。端侧先本地保存，联网后按既有接口同步。 |
| 已读未读 | 单聊/群聊 read 接口、会话 unread/lastReadSeq 字段 | 可做。进入会话本地立即清未读，服务端后台上报。 |
| 撤回/删除 | `/messages/{messageId}/recall`、`/messages/{messageId}/delete` | 可做索引失效和本地展示更新。 |

### 4.2 需要端侧降级或分阶段处理的能力

| 能力 | 当前存量 API 限制 | 阶段一处理 |
| --- | --- | --- |
| “查看原图”按钮 | 当前消息资源只有 `url/thumbnailUrl`，没有明确“压缩图/原图”双资源合同。 | 不做原图按钮；图片查看页打开 `media.url`。 |
| 全量本地历史搜索 | 搜索 API 不提供时间范围；端侧也未必已拉全量历史。 | 只索引本地已有消息；远端搜索作为补齐，不承诺离线搜全量历史。 |
| 图片/视频全量历史网格 | files API 可按类型取列表，但是否覆盖所有历史、分页语义需实测。 | 本地索引优先，files API 只做远端补齐；不阻塞主链路。 |
| 下载进度精确百分比 | 远端响应若无 `content-length`，Dio 只能提供不确定进度。 | 有总大小显示百分比；无总大小显示下载中。 |
| 服务端存储清理 | 当前没有删除远端媒体或云端空间治理 API。 | 只做端侧本地文件清理，不删除服务端资源。 |
| 已下载跨设备同步 | 本地文件只属于当前设备。 | 不做跨设备已下载状态同步。 |
| 文件安全扫描/转码状态 | 当前消息资源没有扫描/转码状态字段。 | 不展示扫描/转码状态；仅处理下载、打开、失败。 |

### 4.3 基于存量 API 的可做结论

可以做：

- 本地消息库、会话快照、草稿、未读、发送队列和重启恢复。
- 图片、视频、文件、语音的媒体本体本地化。
- 已下载媒体重启复用、文件缺失回退、`.part` 清理。
- 会话内本地搜索索引、图片视频/文件本地快捷入口。
- 本地存储统计和端侧清理。
- 微信式消息列表、媒体预览、局部下载、失败重试和清理后重下 UI。

暂不做或降级：

- 不做依赖新增字段的“查看原图”按钮。
- 不承诺离线搜索未拉取过的全量历史。
- 不做服务端媒体删除、云端空间治理或跨设备下载状态同步。
- 不要求服务端新增专用媒体下载接口，直接使用 `media.url`。

因此，本方案可以继续执行，但执行口径必须是：**基于存量 API 做端侧微信级本地数据闭环；凡是需要新服务端合同的增强能力，阶段一降级或不做。**

### 4.4 当前 API 到端侧实现策略

| 端侧能力 | 当前 API | 端侧实现策略 |
| --- | --- | --- |
| 会话列表本地优先 | `GET /conversations` | 接口成功后写入会话快照表；下次启动先读本地，再后台刷新。 |
| 单聊消息首屏 | `GET /direct-chats/{chatId}/messages?beforeSeq&limit` | 远端只做补齐和分页；首屏先读 SQLite 最近窗口。 |
| 群聊消息首屏 | `GET /groups/{groupId}/messages?beforeSeq&limit` | 和单聊共用本地消息表，只在远端 datasource 区分 endpoint。 |
| 实时增量 | Gateway `msg.new`、同步返回 `messages[]` | 按 `messageId/clientMsgId/conversationSeq` upsert 本地消息，更新会话快照和索引。 |
| 发送文本 | 单聊/群聊 POST messages | 乐观插入本地 `sending`，成功后按 `clientMsgId` 替换服务端字段。 |
| 发送图片/视频/文件/语音 | `/media/upload` + POST messages | 先保留本地预览和 pending payload；上传成功后用 `MediaResourceDto` 发送消息。 |
| 草稿 | 单聊/群聊 draft PUT/DELETE、`GET /drafts` | 输入框变更先写本地草稿；联网时同步远端草稿。 |
| 未读/已读 | read 接口、会话 unread/lastReadSeq | 进入会话本地清未读，后台上报 readSeq，失败后保留本地体验并等待后续同步。 |
| 媒体下载 | `MediaResourceDto.url` | 使用现有 Dio 鉴权直接 GET `url`，写入持久文件目录和媒体账本。 |
| 图片/视频快捷入口 | direct/group files API | 本地索引优先；远端 files API 只做在线补齐和校正。 |
| 会话内搜索 | `/search/messages?keyword&conversationId` | 本地索引先返回当前已缓存结果，远端搜索补齐未缓存结果。 |
| 撤回/删除 | recall/delete API | 接口成功后更新本地消息状态并让搜索/媒体索引失效；Gateway 回包也需归并。 |

### 4.5 API 不新增前提下的顶级 IM 口径

阶段一的顶级体验标准是“端侧闭环”，不是“服务端能力全量补齐”。具体口径：

- 已经到过端上的会话、消息、草稿、发送失败、媒体预览和已下载文件，重启后必须可恢复。
- 没有拉取过的远端历史，不承诺离线可见，也不承诺离线可搜索。
- 没有服务端原图字段，不做原图按钮；`media.url` 视为查看页的大图资源。
- 没有服务端下载状态同步，不做跨设备“已下载”一致性。
- 没有服务端云端存储治理，不删除远端媒体，只清理当前设备本地文件。
- files API 和 search API 作为远端补齐能力，不能阻塞本地首屏。

这套口径能满足微信级 IM 的关键体验底线：**本地可见、可恢复、可重试、可清理、可重新下载、弱网不崩。**

## 5. 总体架构

本地数据分为四层 owner：

| Owner | 分层 | 职责 | 禁止事项 |
| --- | --- | --- | --- |
| `ChatLocalDataSource` | Data | 消息表、会话表、首屏消息、历史分页、远端同步归并。 | 不处理 UI loading，不下载媒体文件。 |
| `PendingMessageQueue` | Data/Application 边界 | 发送中、发送失败、重试、重启恢复、`clientMsgId` 归并。 | 不把失败消息伪装成成功。 |
| `MediaLocalStore` | Data | SQLite 媒体本地账本，记录媒体文件本体状态。 | 不下载文件，不写 UI 文案，不依赖 Widget。 |
| `MediaFileRuntime` | Runtime | 生成持久目录、安全文件名、`.part` 路径、文件存在性检查、原子文件替换。 | 不解释聊天业务，不直接操作页面状态。 |
| `MediaDownloadService` | Runtime/Data 边界 | 基于 Dio 下载远端媒体，复用既有鉴权能力，处理进度、失败和原子落盘。 | 不直接弹 UI，不越过账本写临时缓存。 |
| `MediaOpenController` | Application | 接收 UI 点击，查账本、下载、打开、重试、回退状态。 | Page 不直接下载远端媒体，不拼接下载状态机。 |
| `ChatLocalSearchIndex` | Data | 本地文本、文件名、媒体消息索引。 | 不替代服务端全量搜索，不伪造远端不存在的结果。 |
| `ChatStorageManager` | Application/Runtime | 统计和清理聊天本地数据。 | 不直接删除消息事实，不跨 `spaceId` 清理。 |
| `ChatStartupRecovery` | Application | App 启动和进入空间后的本地账本自检、残留修复。 | 不做重型全库扫描阻塞首屏。 |

本地存储分工：

- SQLite 存会话、消息、发送队列、媒体账本、搜索索引和清理标记。
- `getApplicationSupportDirectory()` 存聊天媒体文件本体。
- Dio 负责远端媒体下载。
- `flutter_cache_manager` 或既有 `AppNetworkImage` 只作为图片预览辅助缓存，不能作为媒体本体本地化账本。
- `getTemporaryDirectory()` 只能用于非正式临时文件，不能作为聊天媒体本体的正式存储。

## 6. 数据 owner 和主源规则

| 业务事实 | 主源 | 本地副本 | UI 使用规则 |
| --- | --- | --- | --- |
| 消息是否存在 | 服务端/Gateway 完整消息 + 本地乐观消息 | SQLite 消息表 | 首屏先读本地，再后台同步远端。 |
| 消息发送状态 | 本地发送生命周期 + 服务端回包 | 消息表 + pending queue | `sending/failed/sent` 不得只存内存。 |
| 会话最后消息 | 服务端/Gateway + 本地发送归并 | 会话表 | 会话列表先用本地快照。 |
| 未读/已读 | 服务端最终状态 + 本地进入会话即时清未读 | 会话表/未读账本 | 不用内存状态冒充持久未读。 |
| 草稿 | 端侧事实 | 本地草稿记录 | App 重启和切会话后应恢复。 |
| 媒体预览 | 消息 body + 本地预览字段 | 消息 body | 气泡展示用，不代表本体已下载。 |
| 媒体本体 | 远端 `media.url` + 本地下载结果 | `media_local_files` + 文件目录 | 打开/播放时优先本地。 |
| 搜索结果 | 服务端搜索 + 本地索引 | 本地索引 | 会话内快捷入口优先用本地可用数据，必要时远端补齐。 |
| 存储占用 | 本地文件系统 | 统计表或运行时扫描结果 | 只作为治理展示，不改变消息事实。 |

禁止规则：

- 不得用 Riverpod provider、普通内存 hot cache 或图片缓存冒充本地消息库。
- 不得把媒体文件是否已下载写进消息 body 作为唯一事实。
- 不得把 `.part` 文件当成可打开文件。
- 不得因为远端同步失败清空本地消息列表。
- 不得跨 `spaceId` 复用消息、媒体文件、搜索索引或草稿。

## 7. 顶级 IM 本地体验不变量

以下不变量高于具体实现细节，所有任务执行和 code review 都必须检查：

| 不变量 | 标准 |
| --- | --- |
| 本地先行 | 进入会话和会话列表时，先展示本地快照，再后台刷新远端。 |
| 消息不消失 | 只要 SQLite 有消息，媒体下载失败、预览失败、远端同步失败都不能让整条消息消失。 |
| 状态可恢复 | `sending/failed/downloading/downloaded/missing` 必须可持久化或可由账本恢复。 |
| 操作可重试 | 发送失败、媒体下载失败、文件缺失都必须有可重试路径。 |
| 清理不删事实 | 清理本地文件不能删除消息事实；消息仍可见，媒体可重新下载。 |
| 空间强隔离 | 消息、会话、草稿、发送队列、媒体文件、搜索索引、存储统计都必须按 `spaceId` 隔离。 |
| UI 局部反馈 | 失败和 loading 只影响对应消息、气泡、卡片或查看页，不遮挡整个聊天。 |
| 存量 API 优先 | 不为了阶段一体验要求新增服务端 API；不支持的高级能力必须降级或延后。 |

## 8. 模块一：本地消息库

目标：

- 进入会话时本地消息立即可见。
- 远端同步只补洞、更新状态、替换字段，不推翻本地首屏。
- 消息 body 本地序列化必须完整保留图片、视频、文件、语音的展示字段。

关键要求：

- `ChatLocalDataSource.getMessages()` 返回时间线升序，UI 不再自行猜排序语义。
- 首屏窗口默认读取最近消息，历史分页按 `conversationSeq` 稳定加载。
- 本地消息读取不依赖 `isGroup`，只依赖 `spaceId + conversationId`。
- 远端路由的 `isGroup` 只影响同步接口，不影响本地首屏。
- message body 本地序列化必须保留 `localPreviewUrl`、`localPosterUrl`、`thumbnailUrl`、`url`、`fileName`、`mimeType`、`sizeBytes`、`durationSeconds`、`width/height`。
- 服务端相对路径如 `/media`、`/api`、`/uploads`、`/files` 必须按远端资源处理，不得误判为本地文件路径。

验收：

- App 重启后进入普通群，本地已有视频消息气泡立即出现。
- 本地有图片/视频/文件/语音消息时，不因媒体本体未下载隐藏消息。
- 远端同步失败时，已有本地消息仍保留在列表。
- 历史分页不会因为首屏排序异常导致重复、漏消息或跳动。

基于当前 API 的实现边界：

- `limit` 最大可到接口允许范围，但首屏仍按端侧性能选择合理窗口。
- `beforeSeq` 只用于远端和本地历史分页，不影响首屏本地读取。
- 单聊和群聊远端 endpoint 不同，本地表和 UI 语义必须统一。
- 未拉取过的远端历史不属于本地可见范围，不能伪造。

## 9. 模块二：会话快照

目标：

- 会话列表和聊天页 header 在离线、弱网、重启后仍能展示本地快照。
- 会话的最后消息、未读、草稿、头像、标题不只依赖远端即时返回。

关键要求：

- 会话表按 `spaceId` 隔离。
- 普通会话只展示 `direct/group`，不把 `temp_session` 混入普通消息首页。
- 会话快照至少覆盖：`conversationId`、type、title、avatar、lastMessage、lastMessageAt、unreadCount、mute、draft、pinned/archived 如已有。
- 进入会话后本地立即清未读；服务端已读按既有策略后台上报。
- 草稿应作为端侧本地事实保存，不依赖消息发送队列。
- 会话列表不得因为远端加载中遮挡已有本地会话。

验收：

- App 重启离线进入会话列表，已有会话可见。
- 切换空间后不会显示其他空间会话。
- 草稿在切会话、重启后可恢复。
- 进入会话本地未读立即清除，不等待远端成功。

基于当前 API 的实现边界：

- 会话快照来自 `/conversations`、单聊详情、群详情、Gateway 增量和本地发送归并。
- 草稿可以先本地保存，再通过 direct/group draft 接口同步。
- `/drafts` 可作为启动后的远端草稿校正来源，但不能阻塞本地输入框恢复。

## 10. 模块三：发送队列与失败恢复

目标：

- 文本、图片、视频、文件、语音发送都具备乐观插入、失败可见、重启恢复、手动重试和服务端成功替换。

关键要求：

- 发送必须使用 `clientMsgId`。
- 发送中消息必须入本地消息表，不能只存在内存。
- pending queue 必须保存发送原始 payload 和必要本地媒体路径。
- 图片发送中保留 `localPreviewUrl`。
- 视频发送中保留 `localPosterUrl` 和原始本地视频路径。
- 文件发送中保留本地文件路径、文件名、大小和 MIME。
- 语音发送中保留本地语音路径、时长和 MIME。
- 网络恢复或用户手动重试时沿用原 `clientMsgId`，不能生成新消息导致重复。
- 服务端成功后按 `clientMsgId` 替换旧乐观/失败消息，不出现失败消息和成功消息并存。
- 服务端拒绝不能本地显示成功。

验收：

- 发送媒体时立即上屏。
- 杀 App 后重开，发送中/失败消息仍可见。
- 重试成功后旧失败消息被同一条成功消息替换。
- 同一 `clientMsgId` 不产生重复消息。

基于当前 API 的实现边界：

- 发送队列只保证当前设备恢复，不做跨设备发送中状态同步。
- 媒体发送依赖现有 `/media/upload`；上传失败保留 pending payload，不能生成服务端消息。
- 服务端返回成功字段为 `messageId/conversationId/conversationSeq/serverTime`，本地必须用这些字段替换乐观消息。

## 11. 模块四：媒体本体本地化

### 11.1 用户路径

图片：

```text
Gateway/API 收到图片消息 -> 消息 body 入 SQLite -> 聊天列表展示预览 -> 用户点击图片 -> ImageViewer 通过 MediaOpenController 获取 original -> 本地有则打开，本地无则下载 -> 下载成功后更新账本并展示
```

视频：

```text
Gateway/API 收到视频消息 -> 消息 body 入 SQLite -> 列表展示 localPosterUrl/thumbnailUrl/占位 -> 用户点击播放 -> MediaOpenController 获取 videoSource -> 本地有则打开，本地无则下载
```

文件：

```text
Gateway/API 收到文件消息 -> 消息 body 入 SQLite -> 列表展示文件名/大小/类型卡片 -> 用户点击 -> MediaOpenController 获取 attachment -> 下载或打开本地文件 -> OpenFilex 打开
```

语音：

```text
Gateway/API 收到语音消息 -> 消息 body 入 SQLite -> 列表展示语音气泡 -> 用户播放 -> MediaOpenController 获取 voiceSource -> 本地有则播放，本地无则下载后播放
```

### 11.2 媒体账本

新增 SQLite 表：`media_local_files`。数据库版本从当前 `2` 升到 `3`。

| 字段 | 类型 | 约束 | 含义 |
| --- | --- | --- | --- |
| `id` | `TEXT` | `PRIMARY KEY` | 稳定主键，由 `spaceId/conversationId/messageId/kind/variant` 生成。 |
| `space_id` | `TEXT` | `NOT NULL` | 空间隔离键。 |
| `conversation_id` | `TEXT` | `NOT NULL` | 会话 ID。 |
| `message_id` | `TEXT` | `NOT NULL` | 消息 ID；乐观消息可使用 `clientMsgId`，服务端替换后需可 upsert。 |
| `media_kind` | `TEXT` | `NOT NULL` | `image` / `video` / `file` / `voice`。 |
| `variant` | `TEXT` | `NOT NULL` | `thumbnail` / `original` / `videoPoster` / `videoSource` / `attachment` / `voiceSource`。 |
| `remote_url` | `TEXT` | `NOT NULL` | 服务端资源地址。 |
| `local_path` | `TEXT` | nullable | App 持久目录下的本地路径。 |
| `file_name` | `TEXT` | nullable | 展示和落盘文件名。 |
| `mime_type` | `TEXT` | nullable | MIME 类型。 |
| `size_bytes` | `INTEGER` | nullable | 文件大小。 |
| `status` | `TEXT` | `NOT NULL` | `missing` / `downloading` / `downloaded` / `failed`。 |
| `failure_reason` | `TEXT` | nullable | 最后失败原因。 |
| `created_at` | `INTEGER` | `NOT NULL` | 创建时间戳。 |
| `updated_at` | `INTEGER` | `NOT NULL` | 更新时间戳。 |
| `last_accessed_at` | `INTEGER` | nullable | 最近打开/播放时间戳。 |

唯一约束：

```text
space_id + conversation_id + message_id + media_kind + variant
```

建议索引：

```text
idx_media_local_files_conversation(space_id, conversation_id, updated_at)
idx_media_local_files_message(space_id, conversation_id, message_id)
idx_media_local_files_status(space_id, status)
```

本地路径：

```text
ApplicationSupport/lpp_media/{spaceId}/{conversationId}/{messageId}/{variant}/{safeFileName}
```

状态流转：

```text
missing -> downloading -> downloaded
missing -> downloading -> failed
failed -> downloading -> downloaded
downloaded + 文件丢失 -> missing
```

### 11.3 媒体类型策略

| 媒体 | 列表气泡职责 | 打开/播放职责 | 本地化变体 | 阶段一不做 |
| --- | --- | --- | --- | --- |
| 图片 | 展示 `localPreviewUrl`、`thumbnailUrl` 或 `url` 的预览。 | 图片查看页打开 `media.url` 对应大图。 | `original`，必要时可记录 `thumbnail`。 | 不新增“查看原图”按钮。 |
| 视频 | 展示 `localPosterUrl`、`thumbnailUrl` 或占位。 | 点击后获取 `videoSource` 本地文件或下载。 | `videoPoster`、`videoSource`。 | 不在列表内直接加载视频本体。 |
| 文件 | 展示文件名、大小、类型和局部下载状态。 | 点击后获取 `attachment` 本地文件或下载，再 OpenFilex 打开。 | `attachment`。 | 不做暂停/继续/取消。 |
| 语音 | 展示语音气泡和播放状态。 | 播放前获取 `voiceSource` 本地文件或下载。 | `voiceSource`。 | 不做批量预下载。 |

基于当前 API 的实现边界：

- `MediaResourceDto.url` 是本体下载地址，阶段一所有媒体本体下载都走该字段。
- `thumbnailUrl` 只作为预览或封面资源，不代表本体已下载。
- `width/height/durationSeconds` 有则用于尺寸和时长展示，缺失时端侧用稳定默认值。
- `fileName/mimeType/sizeBytes` 有则用于文件卡和落盘命名，缺失时端侧生成安全 fallback。
- 没有原图/压缩图双资源字段，所以不做“查看原图”按钮。

### 11.4 图片尺寸

图片气泡尺寸独立于文本气泡：

- 最大宽度：`min(220, screenWidth * 0.58)`。
- 最大高度：`280`。
- 最小宽高：`96`。
- 普通比例图按真实宽高等比缩放。
- 超长图使用窄高预览并 `cover` 裁切。
- 超宽图使用宽矮预览并 `cover` 裁切。
- 缺少宽高时使用稳定默认尺寸，不能因图片加载过程造成列表跳动。
- 列表预览只负责识别内容；完整展示交给图片查看页。

推荐比例分段：

| 图片比例 `width / height` | 展示策略 |
| --- | --- |
| `0.45 <= ratio <= 2.2` | 按真实比例等比缩放到最大宽高内。 |
| `ratio < 0.45` | 长图，宽度收敛到约 `112-132`，高度收敛到 `240-280`，`cover` 裁切。 |
| `ratio > 2.2` | 宽图，宽度收敛到 `200-220`，高度收敛到 `96-124`，`cover` 裁切。 |
| 缺少宽高 | 使用稳定默认尺寸，例如 `160 x 160` 或现有默认尺寸。 |

## 12. 模块五：本地搜索与媒体索引

目标：

- 会话内查找、图片及视频、文件快捷入口具备本地可见能力。
- 本地已有消息和媒体不必每次依赖远端搜索才能展示。

建议新增本地索引：

| 索引 | 字段 | 用途 |
| --- | --- | --- |
| `chat_message_search_index` | `spaceId/conversationId/messageId/text/plainText/type/sentAt/senderId` | 文本和链接搜索。 |
| `chat_media_index` | `spaceId/conversationId/messageId/mediaKind/fileName/mimeType/sizeBytes/thumbnailUrl/localPath/sentAt` | 图片视频网格、文件列表。 |

关键要求：

- 消息入库、远端同步、发送成功替换时同步更新索引。
- 删除或撤回消息时索引必须失效。
- 文件搜索展示真实文件名和大小，不显示 `[文件]` 占位。
- 图片视频快捷入口优先用本地消息 body 和媒体账本展示缩略/封面。
- 服务端搜索仍保留为远端补齐能力，本地索引不替代全量服务端搜索。
- 搜索结果按用户时区做日期分组。

验收：

- 离线状态下，会话内“图片及视频”“文件”能展示本地已有记录。
- 文件名搜索可命中本地文件消息。
- 图片视频结果优先展示本地缩略或 poster。
- 本地索引不会跨空间、跨会话串数据。

基于当前 API 的实现边界：

- 本地搜索只覆盖端上已经入库的消息。
- `/search/messages` 作为在线补齐，不替代本地索引，也不阻塞本地结果展示。
- direct/group files API 可用于在线补齐图片、视频、语音、文件列表，但本地 UI 不等待它才展示已缓存媒体。
- 没有时间范围搜索 API 时，时间筛选先在本地已有结果上做。

## 13. 模块六：存储治理与清理

目标：

- 用户和发布验收能知道聊天本地数据占用。
- 可以清理媒体本体而不误删消息事实。
- 可以按空间、会话、媒体类型、时间维度治理。

建议能力：

| 能力 | 说明 |
| --- | --- |
| 空间总占用 | 统计当前 `spaceId` 下聊天媒体文件大小。 |
| 会话占用 | 统计单个 `conversationId` 的媒体文件大小。 |
| 类型占用 | 图片、视频、文件、语音分别统计。 |
| 清理未打开媒体 | 清理未 `last_accessed_at` 的可再下载文件。 |
| 清理指定会话媒体 | 只清本地文件和媒体账本状态，不删除消息。 |
| 清理失效 `.part` | 清理下载中断残留。 |
| 文件缺失修复 | DB 标记 downloaded 但文件不存在时回退 missing。 |

关键规则：

- 清理文件不删除消息表中的消息。
- 清理后媒体气泡仍显示，点击可重新下载。
- 清理必须按 `spaceId` 隔离。
- 默认阶段不做复杂 UI，但底层 manager 必须为后续“存储空间管理”页面预留能力。

验收：

- 清理指定会话媒体后，消息仍在，媒体点击可重新下载。
- 清理 `.part` 不影响已下载文件。
- 不同空间占用统计互不混淆。

基于当前 API 的实现边界：

- 只治理当前设备本地文件和本地账本，不删除服务端媒体。
- 清理后再次点击媒体仍使用原 `media.url` 重新下载。
- 如果 `media.url` 已过期或无权限，进入媒体局部失败状态，不删除消息。

## 14. 模块七：启动恢复与数据自检

目标：

- App 重启、崩溃、下载中断、网络恢复后，本地数据状态可自我修复。

启动恢复分级：

| 时机 | 动作 | 性能要求 |
| --- | --- | --- |
| App 启动 | 只做轻量空间级检查，标记需要修复的任务。 | 不阻塞首页。 |
| 进入空间 | 检查该 `spaceId` 的残留 downloading 和过期 `.part`。 | 后台执行。 |
| 进入会话 | 检查当前会话 downloaded 文件是否存在，修复缺失状态。 | 不阻塞本地消息首屏。 |
| 打开媒体 | 精确检查目标文件，必要时回退 missing 并重下。 | 可局部 loading。 |

自检项目：

- `media_local_files.status = downloading` 且无活跃下载任务：回退 `failed` 或 `missing`。
- `.part` 文件超过阈值：清理。
- `downloaded` 但文件不存在：回退 `missing`。
- 文件存在但 DB 缺记录：阶段一不主动认领，避免误关联；可记录诊断。
- pending queue 中发送中消息：恢复为 sending 或 failed，允许重试。
- 本地消息有媒体 body 但索引缺失：后台重建索引。

验收：

- 下载中杀 App，重启后不会永久卡在 downloading。
- 删除本地媒体文件后，点击媒体能重新下载。
- pending 发送消息重启后仍可见且可重试。
- 自检不会阻塞聊天首屏本地消息展示。

## 15. 错误处理和 UI 状态

媒体状态：

- `missing`：展示可点击入口，点击后开始下载。
- `downloading`：展示局部进度或加载状态；不阻塞其他消息。
- `downloaded`：直接打开或播放。
- `failed`：展示局部失败和重试入口。

错误分类：

| 错误 | 处理 |
| --- | --- |
| 401/403 | 走现有 Dio 鉴权刷新；最终仍失败时记录 `failed`，提示文件无权限或已过期。 |
| 404 | 记录 `failed`，提示文件不存在或已被删除。 |
| 网络中断 | 记录 `failed`，允许点击重试。 |
| 磁盘写入失败 | 记录 `failed`，提示存储空间或文件写入失败。 |
| 文件下载后丢失 | 回退 `missing`，允许重新下载。 |
| pending 发送恢复失败 | 保留 failed 消息，允许手动重试。 |
| 本地索引损坏 | 后台重建索引，不遮挡消息列表。 |

失败边界：

- 媒体失败不得让整条消息从列表消失。
- 媒体失败不得触发会话全屏错误态。
- 媒体失败不得把服务端消息状态改成发送失败。
- 下载失败信息不写进消息 body，只写进媒体本地账本。
- 远端同步失败不得清空会话快照。

## 16. UI 展示细化方案

UI 展示必须按微信级聊天体验处理：消息先可见、状态局部化、反馈轻量、失败可恢复、尺寸稳定、触控明确。UI 只消费本地消息库、会话快照、发送队列、媒体账本和 controller 状态，不直接解释 raw DTO，不直接发起下载。

### 16.1 聊天首屏和消息列表

| 场景 | 展示要求 | 禁止事项 |
| --- | --- | --- |
| App 重启进入会话 | 立即展示 SQLite 本地消息；后台同步远端。 | 不用整页 loading 遮挡本地消息。 |
| 离线进入会话 | 展示本地消息和轻量离线提示。 | 不把会话显示为空会话。 |
| 远端同步失败 | 保留本地消息，局部提示同步失败。 | 不清空列表，不跳全屏错误页。 |
| 历史分页加载 | 顶部局部 loading，加载完成后保持滚动位置。 | 不导致首屏跳动或重复消息。 |
| 媒体本体未下载 | 气泡仍显示预览/占位/文件卡。 | 不隐藏整条消息。 |

消息列表布局要求：

- 文本、图片、视频、文件、语音各自稳定占位，加载前后不改变整体消息行高度。
- 发送中、下载中、失败态都只出现在对应消息气泡或卡片上。
- 同一条消息不能同时出现两个冲突状态，例如既显示发送成功又显示重试。
- 切换前后台或重启后，消息状态必须来自本地账本，不只来自内存。

### 16.2 图片气泡

图片气泡负责预览，不负责完整图片展示。

展示状态：

| 状态 | 展示 |
| --- | --- |
| 有 `localPreviewUrl` | 优先展示本地预览。 |
| 无本地预览但有 `thumbnailUrl` | 展示服务端缩略图。 |
| 无缩略但有 `url` | 展示远端资源预览或稳定占位。 |
| 预览加载中 | 保持目标尺寸，显示轻量 loading。 |
| 预览失败 | 显示图片占位和可点击查看入口。 |
| 发送中 | 图片上轻量进度覆盖层，不阻塞继续发送其他消息。 |
| 发送失败 | 保留本地预览，显示重试入口。 |

交互要求：

- 点击图片进入图片查看页。
- 长按仍进入既有消息菜单。
- 图片尺寸按 `7. 图片尺寸规则`，不得固定正方形。
- 预览失败不影响点击查看；查看页再处理 original 下载或失败。

### 16.3 图片查看页

图片查看页负责完整图片展示，阶段一打开 `media.url` 对应 `original`。

展示状态：

| 状态 | 展示 |
| --- | --- |
| 本地 original 已存在 | 直接展示本地图片。 |
| 本地没有 original | 展示缩略图或深色背景占位，同时下载 original。 |
| 下载中 | 居中轻量进度，不遮挡返回手势。 |
| 下载成功 | 无闪烁切换到清晰图。 |
| 下载失败 | 显示失败原因和重试入口。 |
| 资源 403/404 | 显示文件无权限、已过期或不存在，不回退成空白页。 |

交互要求：

- 支持返回、左右滑动查看同一入口传入的图片列表。
- 支持双击或手势缩放，如现有查看页已支持则沿用。
- 阶段一不新增“查看原图”按钮；后续若服务端区分压缩图/原图，再增加原图大小提示和下载状态。
- 图片查看页不直接使用 Dio；只通过 `MediaOpenController` 获取本地路径或状态。

### 16.4 视频气泡和视频播放

视频列表气泡只展示封面和播放入口，不在列表里加载视频本体。

视频气泡状态：

| 状态 | 展示 |
| --- | --- |
| 有 `localPosterUrl` | 优先展示本地封面。 |
| 无本地封面但有 `thumbnailUrl` | 展示服务端封面。 |
| 可生成首帧 | 后台生成首帧并回写本地展示字段。 |
| 无封面 | 展示浅色稳定占位、播放图标和时长。 |
| 视频源未下载 | 播放图标正常可点。 |
| 下载中 | 播放图标附近显示局部进度。 |
| 下载失败 | 显示失败和重试入口，不变成黑屏。 |

播放页要求：

- 点击视频后由 `MediaOpenController` 获取 `videoSource`。
- 本地视频存在时直接播放。
- 本地不存在时先下载，下载中展示进度。
- 下载失败显示可重试状态。
- 阶段一可以复用现有系统打开或播放能力；后续可升级沉浸式播放页。

禁止事项：

- 不在气泡内展示大面积黑屏。
- 不因视频本体未下载隐藏视频消息。
- 不重复下载已存在的视频源。

### 16.5 文件卡

文件卡负责展示文件事实和下载/打开状态。

展示内容：

- 文件名。
- 文件大小。
- 文件类型图标。
- 下载/打开状态。
- 发送或下载失败时的重试入口。

状态：

| 状态 | 展示 |
| --- | --- |
| 未下载 | 显示文件卡和下载/打开入口。 |
| 下载中 | 在卡片右侧图标或局部区域显示进度。 |
| 已下载 | 显示可打开状态，点击直接打开本地文件。 |
| 下载失败 | 保留文件卡，显示重试入口。 |
| 文件被清理 | 回到未下载状态，点击可重新下载。 |

交互要求：

- 点击文件卡通过 `MediaOpenController` 获取 `attachment`。
- 已下载文件不重复请求网络。
- 大文件下载需要可见进度或至少明确下载中状态。
- 阶段一不做暂停、继续、取消。

### 16.6 语音气泡

语音气泡负责播放状态和本地语音源恢复。

状态：

| 状态 | 展示 |
| --- | --- |
| 未下载 | 气泡可见，点击后下载并播放。 |
| 下载中 | 气泡内显示轻量加载。 |
| 已下载 | 点击直接播放本地文件。 |
| 播放中 | 展示播放动画或高亮状态。 |
| 下载/播放失败 | 保留气泡，显示重试入口。 |

交互要求：

- 同一时间只播放一条语音。
- 切换播放时停止上一条。
- 已下载语音重启后可直接播放。
- 语音下载失败不影响消息发送状态。

### 16.7 弱网、离线和重试

| 场景 | 展示要求 |
| --- | --- |
| 进入会话时离线 | 显示本地消息，顶部或轻量位置提示网络不可用。 |
| 媒体下载中断 | 对应媒体进入失败或可重试状态。 |
| token 刷新中 | 对应媒体保持下载中，不全局阻断聊天。 |
| token 最终失败 | 对应媒体提示无权限或登录状态异常。 |
| 网络恢复 | 不自动批量下载全部媒体，只恢复必要同步和用户触发的下载。 |

重试要求：

- 重试入口必须局部出现。
- 重试期间防重复点击。
- 重试成功后清除失败状态。
- 重试失败不改变消息存在性。

### 16.8 清理后重下载

清理媒体文件后，UI 必须表现为“消息还在、文件可重新获得”。

| 清理对象 | 清理后展示 | 再次点击 |
| --- | --- | --- |
| 图片 original | 聊天列表预览仍可见；查看页重新下载 original。 | 重新下载并展示。 |
| 视频 source | 视频封面仍可见；播放时重新下载 source。 | 重新下载并播放。 |
| 文件 attachment | 文件卡仍可见，状态回到未下载。 | 重新下载并打开。 |
| 语音 source | 语音气泡仍可见，状态回到未下载。 | 重新下载并播放。 |
| `.part` 残留 | UI 不显示为可打开文件。 | 重新开始完整下载。 |

### 16.9 存储治理 UI 预留

阶段一不做复杂存储清理 UI，但底层能力必须支持后续页面展示：

- 当前空间聊天数据总占用。
- 按会话展示占用。
- 按图片、视频、文件、语音展示占用。
- 清理指定会话媒体文件。
- 清理下载残留。
- 清理后保留消息并允许重新下载。

后续 UI 入口建议放在设置或聊天记录管理，不塞进聊天页主流程。

## 17. 可跟踪任务清单

| ID | 任务 | 主要文件 | 完成标准 | 验证 |
| --- | --- | --- | --- | --- |
| L0 | 文档准入和唯一入口 | docs | `REQ-CHAT-004`、功能矩阵、技术入口均指向本文 | `rg` 检查 |
| L1 | 本地消息库契约加固 | `ChatLocalDataSource`、message model | 首屏本地优先、升序时间线、body 字段完整 | 本地数据源测试 |
| L2 | 会话快照和草稿 | conversation datasource/provider | 会话列表离线可见，草稿可恢复，未读本地清除 | 会话测试 |
| L3 | 发送队列恢复 | pending queue、send lifecycle | 重启后 sending/failed 可见可重试，`clientMsgId` 替换 | pending queue 测试 |
| L4 | 媒体领域模型 | chat domain | `MediaKind/Variant/Status/MediaLocalFile` | domain 单测 |
| L5 | 媒体 SQLite 账本 | app database、media local store | v3 表、索引、upsert、文件缺失回退 | migration/store 测试 |
| L6 | 持久文件 Runtime | core runtime | ApplicationSupport 路径、safe filename、`.part`、rename | runtime 测试 |
| L7 | Dio 下载服务 | media download service | 鉴权下载、进度、失败、重试、原子落盘 | download 测试 |
| L8 | MediaOpenController | chat controller/provider | missing/downloaded/failed 统一编排，防重复下载 | controller 测试 |
| L9 | 文件/视频/语音接入 | message bubble、audio service | 点击/播放走 controller，不再正式依赖临时目录 | 集成测试 |
| L10 | 图片查看页接入 | image viewer、message bubble | 查看页打开 original，本地账本复用 | widget/controller 测试 |
| L11 | 图片尺寸优化 | media preview model | 方图、横图、竖图、长图、宽图稳定 | 尺寸模型测试 |
| L12 | 本地搜索索引 | search index datasource | 文本、文件名、媒体索引可重建 | search index 测试 |
| L13 | 存储治理 manager | storage manager | 占用统计、会话清理、`.part` 清理 | storage 测试 |
| L14 | 启动恢复自检 | startup recovery | downloading 残留、文件丢失、pending 恢复 | recovery 测试 |
| L15 | UI 展示闭环 | message bubble、image viewer、video/audio/file UI | 图片查看、视频播放、文件卡、语音、弱网、清理后重下状态完整 | widget/manual 测试 |
| L16 | Android 真机闭环 | Android device | 重启、离线、弱网、打开媒体、清理后重下可用 | 真机记录 |

### 17.1 可勾选执行清单

执行规则：

- 每个任务完成后必须跑该任务列出的最小验证。
- 涉及 SQLite、发送队列、媒体下载、启动恢复的任务必须先写测试再实现。
- 不依赖新增服务端 API；发现存量 API 不满足时，按停止条件暂停并记录证据。
- 不回滚无关工作区改动；每次提交只包含本任务相关文件。

#### Phase 1：本地消息、会话快照、发送恢复

- [ ] **T0：确认当前本地数据基线**
  - 交付物：当前 `ChatLocalDataSource`、`ChatRepositoryImpl`、`PendingMessageQueue`、会话表和消息表的现状记录。
  - 检查点：确认本地消息读取链路为 `repo.getCachedMessages(conversationId) -> ChatLocalDataSource.getMessages() -> SQLite`。
  - 验收：能说明首屏本地读、远端同步、Gateway 入库和 pending queue 的现有 owner。

- [ ] **T1：加固本地消息库契约**
  - 交付物：消息本地读取、排序、分页和 body 序列化测试。
  - 实现要求：`getMessages()` 返回时间线升序；本地读取不依赖 `isGroup`；图片/视频/文件/语音 body 本地字段完整保留。
  - 验收：本地已有视频消息在 App 重启后进入会话立即显示气泡，不因媒体本体未下载隐藏。

- [ ] **T2：补齐会话快照和草稿恢复**
  - 交付物：会话快照字段和草稿本地持久化规则。
  - 实现要求：会话列表先读本地；草稿先本地保存，联网后用 direct/group draft API 同步；`temp_session` 不进入普通消息首页。
  - 验收：离线重启后会话列表、会话标题、未读和草稿可见。

- [ ] **T3：发送队列恢复闭环**
  - 交付物：pending queue 恢复、失败重试、`clientMsgId` 替换测试。
  - 实现要求：发送中/失败消息入库；媒体 pending payload 保存原始本地路径；重试沿用原 `clientMsgId`。
  - 验收：发送图片/视频/文件过程中杀 App，重启后消息仍可见，可重试，成功后不重复。

#### Phase 2：媒体本体本地化

- [ ] **T4：新增媒体领域模型**
  - 交付物：`MediaKind`、`MediaVariant`、`MediaLocalStatus`、`MediaLocalFile`。
  - 实现要求：Domain 不依赖 Flutter、Dio、SQLite；提供是否可打开、是否需下载、是否可重试的纯判断。
  - 验收：domain 单测覆盖枚举序列化和状态判断。

- [ ] **T5：新增媒体 SQLite 账本**
  - 交付物：数据库 v3 migration、`media_local_files` 表、索引、upsert/query/status 更新能力。
  - 实现要求：唯一约束为 `space_id + conversation_id + message_id + media_kind + variant`；`downloaded` 文件不存在时回退 `missing`。
  - 验收：新装和 v2 升 v3 都有表；重复 upsert 不重复；文件缺失回退通过。

- [ ] **T6：新增持久文件 Runtime**
  - 交付物：`ApplicationSupport/lpp_media/{spaceId}/{conversationId}/{messageId}/{variant}/{safeFileName}` 路径能力。
  - 实现要求：safe file name、`.part` 路径、最终路径、文件存在性检查、rename 原子落盘。
  - 验收：不使用 `getTemporaryDirectory()` 作为正式媒体本体目录；不同空间路径隔离。

- [ ] **T7：新增 Dio 下载服务**
  - 交付物：基于现有 Dio 鉴权的媒体下载服务。
  - 实现要求：直接下载 `MediaResourceDto.url`；有 content-length 时显示百分比，无总大小时显示下载中；失败记录原因。
  - 验收：下载成功写最终文件；401/403、404、网络失败、磁盘失败进入 `failed`；`.part` 不可打开。

- [ ] **T8：新增 MediaOpenController**
  - 交付物：统一打开/下载 controller 和 provider。
  - 实现要求：处理 `missing/downloading/downloaded/failed`；防重复下载；成功更新 `lastAccessedAt`。
  - 验收：已下载文件不重复请求网络；文件丢失后回退并重下；失败可重试。

- [ ] **T9：接入文件、视频、语音**
  - 交付物：文件卡、视频气泡、语音播放入口统一走 `MediaOpenController`。
  - 实现要求：文件用 `attachment`，视频用 `videoSource`，语音用 `voiceSource`；移除聊天正式链路里的临时目录直下载。
  - 验收：点击文件/视频/语音按需下载；重启后已下载资源直接打开或播放。

- [ ] **T10：接入图片查看页**
  - 交付物：图片查看 item 模型和查看页本地化路径。
  - 实现要求：列表气泡只预览；查看页用 `MediaKind.image + MediaVariant.original` 打开 `media.url`。
  - 验收：图片查看页本地已存在、下载中、下载失败、重试成功状态可见；不新增“查看原图”按钮。

- [ ] **T11：优化图片和视频预览尺寸**
  - 交付物：图片尺寸模型和视频封面展示回归。
  - 实现要求：方图、横图、竖图、长图、宽图、缺宽高都有稳定尺寸；视频无封面时不黑屏。
  - 验收：尺寸模型测试通过；图片加载前后不跳动。

- [ ] **T12：补齐媒体 UI 状态闭环**
  - 交付物：图片气泡、图片查看页、视频气泡、文件卡、语音气泡的局部状态展示。
  - 实现要求：loading、failed、retry、downloaded、cleaned 后 missing 都在局部展示。
  - 验收：弱网、离线、清理后重下不遮挡已有消息，消息气泡不消失。

#### Phase 3：本地搜索和存储治理

- [ ] **T13：建立本地搜索与媒体索引**
  - 交付物：本地消息搜索索引和媒体索引。
  - 实现要求：索引本地已有消息；文件名可搜；图片视频/文件快捷入口优先本地，远端 search/files 只做补齐。
  - 验收：离线可看本地已有图片视频和文件；撤回/删除后索引失效。

- [ ] **T14：实现存储治理 manager**
  - 交付物：空间、会话、媒体类型占用统计和清理能力。
  - 实现要求：只清本地文件和账本状态，不删除消息；清理 `.part`；清理后可重新下载。
  - 验收：清理指定会话媒体后消息仍可见；不同 `spaceId` 统计不混淆。

#### Phase 4：启动恢复和真机闭环

- [ ] **T15：实现启动恢复和数据自检**
  - 交付物：App 启动、进入空间、进入会话、打开媒体四级自检。
  - 实现要求：修复残留 `downloading`、过期 `.part`、文件缺失、pending 发送残留、索引缺失。
  - 验收：下载中杀 App 不永久卡 downloading；pending 发送重启后可见可重试；自检不阻塞首屏。

- [ ] **T16：完成自动化回归**
  - 交付物：定向单测和 analyze 结果。
  - 验收命令：

```bash
cd /Users/treesoft/Downloads/lpp-flutte/lpp/lpp_mobile
flutter test ../scripts/mobile/test/flutter/automated/chat/message_model_contract_test.dart ../scripts/mobile/test/flutter/automated/chat/message_media_preview_model_test.dart
flutter analyze --no-fatal-infos
```

- [ ] **T17：完成 Android 真机验收**
  - 交付物：真机验收记录、截图或录屏路径、失败日志和 requestId。
  - 必测场景：重启、离线、弱网、发送中杀 App、图片查看、视频播放、文件打开、语音播放、清理后重下。
  - 验收：普通群已有图片/视频/文件/语音本地消息立即显示；已下载媒体重启后复用；失败可局部重试。

## 18. 分阶段实施

### Phase 1：先修聊天首屏和发送恢复

- L1 本地消息库契约加固。
- L2 会话快照和草稿。
- L3 发送队列恢复。

完成后应达到：

- App 重启后会话和消息先从本地可见。
- 发送中/失败消息可恢复。
- 群视频消息不会因为媒体本体未下载整条消失。

### Phase 2：媒体本体本地化

- L4 媒体领域模型。
- L5 媒体 SQLite 账本。
- L6 持久文件 Runtime。
- L7 Dio 下载服务。
- L8 MediaOpenController。
- L9 文件/视频/语音接入。
- L10 图片查看页接入。
- L11 图片尺寸优化。
- L15 UI 展示闭环。

完成后应达到：

- 图片、视频、文件、语音按需下载。
- 已下载媒体重启后可复用。
- 列表只预览，打开/播放走本地账本。
- 图片查看页、视频播放、文件卡、语音和弱网失败状态可见可恢复。

### Phase 3：搜索索引和存储治理

- L12 本地搜索索引。
- L13 存储治理 manager。

完成后应达到：

- 离线可看本地图片视频和文件列表。
- 可统计空间/会话媒体占用。
- 可清理媒体文件而不删除消息。

### Phase 4：启动恢复和真机闭环

- L14 启动恢复自检。
- L16 Android 真机闭环。

完成后应达到：

- 下载中断、文件丢失、pending 发送残留可恢复。
- Android 重启、弱网、离线、清理后重下都可验收。

## 19. 自动化验收清单

本地消息：

- 多条消息插入后按时间线升序返回。
- 视频消息 body 可完整恢复 `url/thumbnailUrl/localPosterUrl`。
- 本地读取不依赖 `isGroup`。
- 远端失败不清空本地消息。

会话快照：

- 会话列表本地可见。
- 草稿重启恢复。
- 进入会话本地未读立即清除。
- `temp_session` 不进入普通消息首页。

发送队列：

- `sending` 消息重启后仍可见。
- `failed` 消息可手动重试。
- 重试沿用原 `clientMsgId`。
- 成功回包替换旧本地消息。

媒体账本：

- 插入媒体记录。
- 重复插入同一 `spaceId + conversationId + messageId + kind + variant` 时更新而不是重复。
- `downloaded` 但本地文件不存在时回退 `missing`。
- `lastAccessedAt` 在打开成功后更新。

下载器：

- 下载成功写入最终文件。
- 下载失败记录 `failed` 和 `failureReason`。
- `.part` 文件不会被当成可用文件。
- 重试后能从 `failed` 变为 `downloaded`。

Controller：

- `missing -> downloading -> downloaded`。
- `failed -> downloading -> downloaded`。
- `downloaded + 文件丢失 -> missing -> downloading`。
- 已下载文件不重复请求网络。

聊天媒体：

- 文件点击走本地账本。
- 视频点击走 `videoSource`。
- 图片查看页打开大图资源。
- 语音播放优先本地文件。
- 重启后本地消息仍立即显示，不因媒体未下载隐藏消息。

搜索索引：

- 文件名可本地搜索。
- 图片视频快捷入口可展示本地已有记录。
- 删除/撤回后索引失效。
- 索引不跨空间串数据。

存储治理：

- 统计空间占用。
- 统计会话占用。
- 清理指定会话媒体后消息仍可见。
- 清理 `.part` 不影响已下载文件。

启动恢复：

- 下载中杀 App 后重启不永久卡 `downloading`。
- 删除本地媒体文件后点击可重新下载。
- pending 发送消息重启后仍可见且可重试。
- 自检不阻塞聊天首屏。

UI 展示：

- 图片气泡预览加载中、失败、发送中、发送失败状态可见。
- 图片查看页本地已存在、下载中、下载失败、重试成功状态可见。
- 视频气泡有封面、无封面、下载中、失败重试状态可见，不能黑屏。
- 文件卡未下载、下载中、已下载、失败、清理后未下载状态可见。
- 语音气泡未下载、下载中、播放中、失败重试状态可见。
- 弱网和离线状态不遮挡已有本地消息。

## 20. Android 真机验收

必测场景：

- 关闭 App 后重开，进入含图片、视频、文件、语音的普通群。
- 首屏立即显示 SQLite 本地消息，不因媒体本体未下载隐藏消息。
- 点击图片进入查看页，能查看大图。
- 点击视频、文件、语音后按需下载；再次进入直接使用本地文件。
- 弱网失败时对应媒体显示可恢复失败，不遮挡其他消息。
- 发送图片/视频/文件过程中杀 App，重启后消息仍可见并可重试。
- 清理某会话媒体文件后，消息仍可见，点击可重新下载。
- 离线进入会话列表和聊天页，已有本地快照可见。
- 图片查看页、视频播放、文件卡、语音气泡分别验证下载中、失败、重试成功。

真机记录必须包含：

- 设备型号和 Android 版本。
- App 构建类型和版本。
- 测试账号、角色、空间。
- 网络环境。
- 执行时间。
- 通过项、失败项、日志、requestId。
- 截图或录屏路径。

## 21. 阶段一不做范围

- 不做进入会话自动批量下载全部媒体。
- 不新增“查看原图”按钮。
- 不依赖新增服务端 API；存量 API 不支持的增强能力阶段一降级或不做。
- 不做复杂存储清理 UI；阶段一先做底层 manager 和可测试能力。
- 不扩展到 PC 端。
- 不扩展到收藏和转发历史的完整媒体本地化。
- 不变更服务端接口合同；若发现 `media.url`、鉴权下载、文件名、MIME 或大小字段不足，必须先停下来登记服务端支持风险。
- 不把 `flutter_cache_manager` 当成唯一媒体本地库，它只能辅助图片预览缓存。
- 不做文件下载的暂停、继续、取消控制。
- 不做全量本地全文搜索替代服务端搜索；阶段一只做会话内本地索引和快捷入口。
- 不在阶段一做完整存储管理页面，但底层统计和清理能力必须可测试。
- 不在阶段一强制自研沉浸式视频播放器，可先复用既有播放/打开能力，但状态闭环必须完整。

## 22. 停止条件

实施中出现以下情况必须暂停继续堆实现，先回到方案或服务端支持文档：

- 存量 `media.url` 在真实 Android 设备上无法通过现有 Dio 鉴权下载。
- 同一消息事实在本地消息表、pending queue、Gateway 回包和远端接口之间无法确定归并规则。
- 同一媒体事实在消息 body、图片缓存、临时文件和新账本之间无法确定主源。
- `spaceId/conversationId/messageId` 无法稳定获得，导致本地文件可能跨空间串用。
- UI 需要绕过 controller 直接下载才能完成某路径。
- Android 真机证明下载后重启不可复用。
- UI 只能通过全局 loading 或隐藏消息来规避状态问题。
- 继续局部 patch 会让业务规则散落到 UI、接口适配、缓存工具或临时状态。

## 23. 实施前检查

每次开始执行本专题任务前，先检查：

```bash
cd /Users/treesoft/Downloads/lpp-flutte
git status --short
rg -n "REQ-CHAT-004|APP微信级本地数据方案" lpp/lpp_mobile/docs
```

执行时不得回滚无关改动；如工作区已有 PC 或其他模块改动，只处理本专题涉及的 App 文件。
