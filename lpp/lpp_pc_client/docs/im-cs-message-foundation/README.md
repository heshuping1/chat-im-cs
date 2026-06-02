# IM + 在线客服消息地基专业行动

日期：2026-06-02

## 目标

本目录用于独立沉淀 PC 端 IM 与在线客服消息系统的真实代码分析、目标设计、重构行动和测试矩阵。后续修复未读、提醒、会话串线、发送状态时，以这里的边界为准，避免继续按局部现象打补丁。

## 当前结论

当前系统大约分为 7 层：

1. UI 组件层：`MessageCenter`、`OnlineServicePage`、`Sidebar` 等负责页面装配。
2. UI hook/controller 层：IM 的发送、已读、会话选择 hook；客服的发送、工作台、生命周期 hook。
3. Domain/model 层：IM read model、message display、message cache mutation；客服 cache adapter、conversation index、reminder model。
4. API client/contract 层：IM `MessagesApiClient` 与客服 `customer-service-client` 分别封装后端接口。
5. Gateway routing/side effects 层：统一接收 gateway，再分发到 IM 或在线客服。
6. Shared runtime 层：上传、视频封面、本地媒体缓存、outbox、发送状态机、提醒服务等。
7. Electron/diagnostics 层：桌面通知、任务栏、日志落盘、preload 能力。

消息底层发送不是完全公用：

- 公用的是上传、发送 outbox、发送状态机、视频封面、本地媒体缓存、诊断等底层工具。
- 不公用的是业务发送 use case：IM 和在线客服分别有自己的 API endpoint、缓存写入、未读处理、权限规则和失败恢复。
- 当前架构最容易出问题的点，是“共享工具”和“业务状态源”边界没有彻底稳定，导致 IM 和客服在归属、未读、提醒上互相影响。

## 文档索引

- [当前代码方案分析](./01-current-code-architecture.md)
- [目标设计与重构行动](./02-target-design-and-refactor-action.md)
- [场景与测试矩阵](./03-scenarios-and-tests.md)

## 执行原则

- 先验证模型，再改 UI。
- IM 和在线客服可以共享底层工具，但不能共享未读状态源。
- 未知消息默认保护 IM。
- 在线客服 temp session 永远不能回流普通 IM 会话列表。
- 所有 badge、提醒、任务栏状态必须读取统一 effective 状态，不允许组件自行叠加。
