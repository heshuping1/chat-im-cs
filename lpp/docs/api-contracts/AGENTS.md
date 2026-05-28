# 3rddocs 写作规则(面向第三方开发者的对接文档)

本目录下所有 `*.md` / `*.html` 文档是**交付给第三方开发者**(APP / Web 客户端开发者、第三方系统集成方)用来对接 ZTChat 的接入文档。**未来在本目录下做任何修改的智能体必须严格遵守以下规则,否则会让第三方写错代码或暴露内部实现。**

## 1. 视角与受众

- **受众**:不熟悉本项目源码的外部开发者。他们只看本目录的文档,**没有源码、没有 git 历史、没有内存备忘**。
- **视角**:以「**对外行为契约**」为中心——
  - HTTP / WebSocket / Hub 端点的 URL、方法、参数、返回字段、错误码
  - 事件 payload schema、字段语义、值域
  - 状态机的对外可观察状态、转移规则
  - 客户端必须遵守的接入要求与限制
  - 已知现象、影响、应对建议
- **不是**「内部架构介绍」、不是「源码导读」、不是「changelog」、不是「最近 commit 总结」。

## 2. 严禁出现的内容(写之前自检)

写入文档前必须**逐项排除**以下内容。如果一句话提到了下面任何一项,需要改写或删除。

### 2.1 内部实现命名

**禁止暴露**:
- C# 类名 / 接口名 / 方法名,如 `RtpForwarder`、`OpusRecordingPipeline`、`CallStateSweepWorker`、`HeartbeatWorker`、`CallSessionService.cs`、`IAiServiceConfigService`、`MediaRelayConfigurationGuard`、`VoiceCallSignalingHub`、`StaffHeartbeatMiddleware`、`AiServiceConfigCompatAdapter`、`Clients.User`、`PushDispatcherImpl`、`AdministrationModuleExtensions`、`TempSessionService.VisitorMessage` 等等
- 源码文件路径,如 `src/Modules/.../XxxContracts.cs`、`Program.cs:L###`
- 项目名 / 程序集名,如 `ZTChat.Modules.VoiceCall.Application`、`ZTChat.Shared.Infrastructure`
- 内部 worker / scheduler / pipeline 的具体类名

**改成**:用对外可观察的现象或用「服务端 / 后端 / 客户端 / API host / Gateway / relay」这样的角色名描述。

> ❌ "录音通过 `OpusRecordingPipeline` 按包级解码后写盘"
> ✅ "录音由服务端在媒体路径之外的独立管线处理,即使录音失败也不会影响通话本身"

### 2.2 实现机制与底层栈

**禁止暴露**:
- 使用了哪个 SignalR 协议、有无 Redis backplane、Redis Stream 名 / Pub-Sub 频道名 / Lua script、EF Core 行为、`HubConnectionBuilder` 内部行为
- 数据库表名(`temp_session_staff_status`、`message_outbox` 等)、列名、SQL 约束名、`migration` 序号
- 进程内字典、缓存的具体数据结构(`Channel<T>`、`ConcurrentDictionary` 等)
- `appsettings.json` 内部 key 名(除非这是部署给第三方私有化时需要他们了解的)
- 内部 Redis key / Stream key

**改成**:描述「现象」与「客户端需要遵守什么」。

> ❌ "SignalR 没有 Redis backplane,所以 `Clients.User(...)` 跨进程会丢消息"
> ✅ "客户端通话期间不要切换 relay 节点,否则可能错过服务端推送的事件"

### 2.3 内部时间常数与魔法数字

不要写「Redis dedupe 120 秒」「sweeper 每 15 秒扫一次」「heartbeat 节流 15 秒」这种**内部周期**。要写**客户端能观测到的对外契约**:

- ✅ "拿到 `callId` 后必须在 60 秒内调用 `StartCall`"
- ✅ "被叫端需要在响铃 45 秒内 `AnswerCall`,否则会话自动关闭"
- ❌ "服务端 sweeper 每 15 秒扫一次,Initiating 状态过 60 秒会被回收"
- ❌ "客服心跳中间件 15 秒节流"

### 2.4 commit hash / PR / issue / 内部 changelog

**禁止**:
- 写 `commit a7706dd` / `commit 094c7b3` 等 hash
- 写 `commit 9e135db: feat(ai): perfection phase 0-11` 这种描述
- 写「最近 4 月份重构后...」「commit a7706dd 改成了 packet-level SFU」

**允许**:
- 用日期标记重大公开变更,例如 "自 2026-05-14 起 OPUS 默认码率从 24kbps 调整为 32kbps"
- 在文档顶部加 `> 文档校对快照:YYYY-MM-DD` 一行,让第三方知道基线日期

### 2.5 内部待办、TODO、未决事项

**禁止**:
- 在文档里写「目前没实现,待 follow-up」「后续可在 `XxxService` 加 region 偏好」「建议项目侧把 zombie 清理也补上 sweeper」「P0 fix:此处实现/文档脱节」
- 暴露内部已知 bug 或脱节

**改成**:
- 如果是真的对外限制,写到「已知限制」一节,以现象+应对方式描述
- 如果只是内部 backlog,根本不要出现在 3rddocs

## 3. 推荐写法

### 3.1 端点描述模板

每个端点至少包含:

```
### POST /api/.../xxx

权限:<token 类型,如:租户业务 accessToken / 平台 platformToken / 访客 visitorToken / 管理员 adminToken>
其它要求:<如:操作者需要 `xxx.manage` 权限>

请求体:
| 字段 | 类型 | 必填 | 说明 |
| ...

响应:`{ code, message, requestId, data }`,`data` 形状:
| 字段 | 类型 | 说明 |
| ...

错误码:
| code | HTTP 状态 | 触发条件 |
| ...
```

### 3.2 事件 / Webhook payload

只写 payload 顶层 + `data` 字段表 + 字段值域,不写「该事件由 `Gateway/RealtimeDispatchServices.cs:L###` 发布」。

### 3.3 状态机

写**对外可观察的状态枚举值** + **转移规则的对外可见后果**。不要写"内部 `UpdateStateAsync` 用 `UPDATE … WHERE state IN (allowed_from)` 做 first-writer-wins"——只需说"并发结束以先到的为准,后续写入静默忽略不报错"。

### 3.4 已知限制章节

每个主文档可以有 §`当前公开边界`/`已知限制` 一节,描述:

- 当前不支持的功能(不暴露原因,只说"当前不提供")
- 客户端需要遵守的硬性约束(如:不要中途换 relay 节点)
- 接入方需要自行兜底的场景(如:relay 节点重启时不会收到 `CallEnded`,客户端需按本地连接断开 + WebRTC ICE 失败自行结束)

**不写**:为什么不支持、内部原因、内部 follow-up。

### 3.5 鉴权语义

每个端点显式标注:
- 接受哪种 Token(平台 Token / 客户端业务 Token / 访客 Token / 管理员 Token)
- 是否接受个人空间引导态
- 401(认证未通过)vs 403(认证通过但权限不够)的区别——只写客户端能观察到的响应形式,不写中间件实现细节

## 4. 内容组织

### 4.1 文档分工

| 文件 | 用途 |
|---|---|
| `README.md` | 整体导览、Token 体系、推荐认证流程、文档目录索引 |
| `client-api.md` / `*-reference.md` | 客户端 REST + WebSocket 接入 |
| `admin-api.md` / `*-reference.md` | 管理后台接入(给私有化部署方 / 集成方搭后台用) |
| `open-platform.md` / `*-reference.md` | BOT / Webhook / 主动发消息 |
| `voice-video-call.md` / `*-reference.md` | 音视频通话接入 |
| `field-enum-reference.md` | 跨文档共享的枚举值表、补遗字段表 |
| `followme.md` | 端到端业务流程示例(把多个端点串起来) |
| `audit-report.md` | **内部维护用快照,不是给第三方看的**,如果它存在请保留 `> Status: archived` 头部 |

主文档(`xxx.md`)负责「定义 + 流程」,reference 负责「速查表」。两者不应自相矛盾。

### 4.2 主文档与 reference 的一致性

任何字段、枚举、错误码改动**必须**同时改主文档和对应的 reference。先改主文档,再扫 reference 是否一致。

### 4.3 跨文档锚点

使用相对链接 `[client-api.md §10](./client-api.md#10-)`。改章节号时要回扫所有引用方,避免悬空。

## 5. 验证清单(每次提交前自检)

- [ ] 没出现任何 C# 类名、接口名、源码文件路径
- [ ] 没出现 commit hash、PR / issue 号、`commit xxxxxxx` 字样
- [ ] 没出现内部数据库表/列名(除非确实是对外契约的一部分)
- [ ] 没出现内部时间常数(sweeper 周期、heartbeat 节流值等)
- [ ] 没暴露内部 known bug / 内部 follow-up
- [ ] 端点的请求/响应字段与当前实际响应一致(不能比代码字段多/少,字段大小写一致)
- [ ] 错误码清单与服务端实际抛出的 code 字符串一致
- [ ] 与对应 reference / 兄弟文档无矛盾
- [ ] 文档顶部 `> 文档校对快照:YYYY-MM-DD` 已更新到当次校对日期

## 6. 修订日志惯例

不要在文档里维护「修订日志 / changelog」。若需要标识版本,在 README.md 顶部统一维护一行 `版本:X.Y | 更新日期:YYYY-MM-DD`,各分文档顶部用 `> 文档校对快照:YYYY-MM-DD` 标记。

---

**总原则**:第三方开发者读完应该能照着写代码 + 排错;不应该需要知道我们用了什么语言、什么框架、什么内部组件、最近改了什么。
