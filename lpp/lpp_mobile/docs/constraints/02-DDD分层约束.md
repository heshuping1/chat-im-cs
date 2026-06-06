# APP DDD 分层约束

状态：当前有效

日期：2026-06-06

适用范围：`lpp_mobile`

## 1. 分层职责

| 层 | 职责 |
| --- | --- |
| UI / Page | 只负责页面装配、状态展示、用户事件转发。 |
| Application / Hook / Controller | 负责编排用例、调用服务、处理流程状态。 |
| Domain / Model | 负责业务规则、状态推导、纯函数判断。 |
| Data / API / Repository | 负责接口请求、DTO 转换、缓存读写、防腐层。 |
| Infrastructure / Runtime | 负责平台能力、推送、存储、文件、通知、权限、系统能力。 |

## 2. 硬规则

1. Page 不直接调用 API client。
2. Page 不解释 raw DTO。
3. Page 不拼接复杂权限、发送、已读、客服状态机规则。
4. Domain 不依赖 Flutter Widget、`BuildContext`、storage、API client 或平台能力。
5. Domain 不写 UI 文案。
6. Data 层不写 UI 文案，不决定页面交互。
7. Repository 对外暴露领域模型，不把 raw DTO 泄漏给 Page。
8. Runtime 能力必须有 owner，不允许散落调用。
9. Gateway、推送、通话、文件、相机、录音、通知、存储都属于 Runtime 能力，必须通过明确 adapter 或 service 使用。
10. 会话、消息、草稿、未读、token、缓存和 Gateway 必须按 `spaceId` 隔离。

## 3. 典型落点

| 需求 | 推荐落点 |
| --- | --- |
| 页面布局、列表、按钮、输入态 | `features/*/presentation` |
| 发送消息、接入客服、关闭会话等流程 | usecase / controller / notifier |
| 是否可发送、是否只读、状态机推导 | domain service / model |
| API 请求、DTO、分页、缓存转换 | data source / repository |
| 通知、文件、媒体保存、权限、设备信息 | core runtime/service/adapter |
