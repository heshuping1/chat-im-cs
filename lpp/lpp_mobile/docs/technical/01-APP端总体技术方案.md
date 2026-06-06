# APP 端总体技术方案

状态：当前有效

日期：2026-06-06

适用范围：`lpp_mobile`

## 1. 目标

- 移动 IM 主链路稳定。
- 在线客服移动接待状态闭环。
- token、空间、权限、缓存和 Gateway 按 `spaceId` 隔离。
- Android 真机、弱网、推送、通话和媒体能力可验证。
- 后续需求按 DDD 分层落位，不把业务规则沉到 Page。

## 2. 目录职责

| 目录 | 职责 |
| --- | --- |
| `lib/app` | App 启动、路由、主题。 |
| `lib/core` | 网络、存储、数据库、空间、认证、权限、诊断、通知、平台能力。 |
| `lib/features` | 认证、聊天、通话、通讯录、客服、工作台、设置等业务模块。 |
| `lib/shared` | 共享组件、工具和扩展。 |
| `lib/l10n` | 多语言文案。 |
| `android` / `ios` | 平台壳工程和权限配置。 |

## 3. 数据流

```text
Page -> Notifier/Controller -> UseCase/Service -> Repository -> DataSource/API/Cache
                                      \-> Domain Model/Rule
Runtime capability -> core service/adapter -> feature usecase/controller
```

## 4. Token 和空间

| Token | 用途 |
| --- | --- |
| platformToken | 登录、租户、空间选择、签发 admin token。 |
| tenant accessToken | `/api/client/v1/*`、`/ws/client`、`/hubs/voicecall`。 |
| refreshToken | 刷新当前空间 accessToken。 |
| admin accessToken | `/api/admin/v1/*`。 |

要求：

- 切换空间后不能复用上个空间缓存、Gateway 连接或 admin token。
- 普通 tenant token 不调用 admin API。
- admin 401 后清理 admin token，并用 platform token 重新签发。

## 5. 技术风险

| 风险 | 约束 |
| --- | --- |
| token 混用 | 严格按接口域使用 token。 |
| 空间缓存串线 | 会话、消息、草稿、未读、Gateway 都按 `spaceId` 隔离。 |
| `temp_session` 污染消息首页 | 临时客服会话只能在客服工作台展示。 |
| 管理只读误发言 | 第三人查看必须禁用输入区并阻断写接口。 |
| 媒体和通话真机差异 | 图片、文件、语音、视频、通话、权限、后台必须真机专项。 |
| 大列表性能 | 会话、消息、联系人、客户、客服线程必须分页、懒加载和缓存。 |
