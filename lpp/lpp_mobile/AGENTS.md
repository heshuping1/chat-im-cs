# LPP Mobile Codex 规则

本目录是 LPP Flutter 移动端 App。当前项目文档入口为：

- `lpp/docs/00-ECC工作流.md`
- `lpp/docs/01-需求规格说明书.md`
- `lpp/docs/02-功能矩阵和实现情况.md`
- `lpp/docs/03-技术方案.md`
- `lpp/docs/04-测试验收方案.md`
- `lpp/docs/05-接口与服务端依赖.md`
- `lpp/docs/06-发布风险与检查清单.md`

## 必读

任何非简单工程改动前，必须先阅读：

1. `lpp/docs/00-ECC工作流.md`
2. `lpp/docs/01-需求规格说明书.md`
3. `lpp/docs/02-功能矩阵和实现情况.md`
4. `lpp/docs/03-技术方案.md`
5. `../../.codex/skills/karpathy-guidelines.md`

涉及接口、权限、客服工作台、通话、发布或测试验收时，还必须阅读：

- `lpp/docs/04-测试验收方案.md`
- `lpp/docs/05-接口与服务端依赖.md`
- `lpp/docs/06-发布风险与检查清单.md`

## 文档优先流程

所有非简单工程改动必须按 `lpp/docs/00-ECC工作流.md` 执行。需求规格说明书、功能矩阵和技术方案是 ECC 流程中的核心产物，不是替代 ECC 的独立流程。

1. 确认或更新需求规格说明书。
2. 确认或更新功能矩阵和实现情况。
3. 确认或更新技术方案。
4. 按既有架构修改代码。
5. 执行测试验收并记录结论。
6. 判断发布风险和遗留问题。

如果用户只是讨论方案、纠正理解或评估可行性，不得直接改代码。

涉及产品逻辑、权限边界、角色差异、业务流程、接口语义、状态闭环、数据持久化或跨模块影响时，必须先给方案并等待用户确认。

## 架构规则

- 状态管理使用 Riverpod 2。
- 路由使用 GoRouter。
- 网络请求使用 Dio 和项目已有 `HttpClient`。
- 实时聊天使用 SignalR / WebSocket。
- 音视频通话使用 `flutter_webrtc`。
- 本地数据使用 Hive 和 SQLite。
- 会话和消息数据按 `spaceId` 隔离。
- 优先本地缓存展示，再后台同步远端数据。

## Token 规则

- `platformToken` 用于 `/api/platform/v1/*`。
- 租户 `accessToken` / `refreshToken` 用于 `/api/client/v1/*`、`/ws/client`、`/hubs/voicecall`。
- admin API 必须使用 admin token，并调用 `/api/admin/v1/*`。
- 不得使用普通租户 token 调用 admin API。
- admin 401 时清理 admin token，并用 platform token 重新签发。

## IM 规则

- 不得在 `build()` 中触发 API 请求或状态变更。
- 进入聊天页后本地立即清未读，服务端已读只在必要时上报。
- WebSocket 重连后执行增量同步，不全量重拉历史。
- 消息发送使用乐观插入和 `clientMsgId`。
- 消息列表必须使用虚拟化列表。
- 媒体消息必须考虑缓存和鉴权加载。

## UI 规则

移动 App 任务还必须按微信级移动 IM 体验处理：重视会话流畅度、输入体验、触控反馈、弱网与重连、通知触达、媒体加载、权限引导、列表性能和移动端视觉克制。不得只按功能可用标准完成，应同时保证移动端交互自然、状态完整、性能稳定。

- 匹配克制的微信式移动端视觉语言。
- 补齐 loading、空态、错误态、权限态、禁用态和重复点击保护。
- 文本必须能在移动端完整显示，不允许遮挡。
- 远程图片优先使用项目已有鉴权图片组件或缓存图片方案。

## API 调试报告

接口异常或非预期结果需要提供：

- endpoint、method、status code、server code、message、requestId。
- 可复现 curl。
- 完整 response body。
- 默认脱敏 Authorization、token、cookie、password、verification code。

## Android 优先

当前直接运行目标是 Android。涉及权限、通知、后台、扫码、通话、相机、麦克风、文件时，优先真机验证。
