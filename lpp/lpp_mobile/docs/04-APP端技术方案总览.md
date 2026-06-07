# APP 端技术方案总览

状态：当前有效

日期：2026-06-06

适用范围：`lpp_mobile`

## 1. 文档定位

本文件是 APP 技术方案短入口。详细方案进入 `technical/`，分层硬规则进入 `constraints/02-DDD分层约束.md`。

## 2. 技术目标

- 移动 IM 主链路稳定，弱网可恢复。
- 在线客服移动接待状态闭环。
- token、空间、权限、缓存和 Gateway 连接严格隔离。
- Android 真机、推送、通话、媒体和性能可验证。
- 后续需求能按模块 owner 继续开发，不把页面逻辑写成业务核心。

## 3. 核心技术栈

| 层级 | 技术 |
| --- | --- |
| 跨端框架 | Flutter / Dart |
| 状态管理 | Riverpod 2 |
| 路由 | GoRouter |
| HTTP | Dio + 项目已有 `HttpClient` |
| 实时消息 | SignalR / WebSocket |
| 音视频 | `flutter_webrtc` |
| 本地存储 | Hive / SQLite / Flutter Secure Storage |

## 4. 快速读取

| 任务 | 读取文档 |
| --- | --- |
| 总体架构、目录职责、token 和空间 | `technical/01-APP端总体技术方案.md` |
| 普通 IM、消息、会话、在线客服线程 | `technical/02-消息与会话详细方案.md` |
| APP微信级本地数据、本地消息库、会话快照、发送队列、媒体账本、搜索索引、存储治理、启动恢复 | `technical/06-APP微信级本地数据方案.md` |
| 好友、组织、客户入口、通讯录边界 | `technical/03-通讯录详细方案.md` |
| 群聊、群资料、群治理和群权限 | `technical/04-群功能详细方案.md` |
| 设置、通知、诊断、运行时能力 | `technical/05-设置与诊断详细方案.md` |
| DDD 分层和禁止事项 | `constraints/02-DDD分层约束.md` |

## 5. 不变量

- Page 不直接调用 API client。
- Page 不解释 raw DTO。
- Domain 不依赖 Flutter Widget、React、window、storage 或 API client。
- Data 层不写 UI 文案。
- Runtime 能力必须有明确 owner。
- 会话、消息、草稿、未读、token、Gateway 和 admin token 必须按 `spaceId` 隔离。
- `temp_session` 不进入普通消息首页。
- 管理员/所有者第三人查看会话必须只读。
