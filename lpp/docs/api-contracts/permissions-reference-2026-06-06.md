# ZTChat 权限体系参考 —— 角色 / 权限码 / 定义

> 版本:2026-06-06 · 适用环境:生产已上线
> 面向:第三方集成开发者
> 一句话:**全项目权限只有一个权威来源(`AuthorizationCatalog.cs`),结构是「角色 → 权限码 → 分类」;后端鉴权一律按权限码判定,角色只是权限码的默认组合。**

本文回答第三方反复问到的:**本项目有哪些权限?每个权限是什么定义?**

---

## 0. 先看三句话

1. **唯一权威来源**:所有权限码、中文名、定义、分类、角色默认组合,全部集中在
   `src/Shared/ZTChat.Shared.Application/AuthorizationCatalog.cs` 一个文件里,无散落。
   后台「角色与权限」页面就是渲染这份 catalog。
2. **角色 ≠ 权限**:角色(`tenant_owner` 等)只是一组权限码的**默认组合**,租户可在后台自定义增删。
   后端**永远按权限码鉴权**,不按角色名硬编码。
3. **共 8 个系统角色 + 80 个权限码 + 16 个分类**。其中 10 个权限码(租户管理 6 + 平台超管 4)
   当前是 **`IsEnforced=false` 占位待实现**,后端尚未强制校验,接入时**不要依赖它们已生效**。

> ⚠️ **群内设置 ≠ 后台权限**:App 里「群管理」页的开关(二维码进群、@所有人、全员禁言、互加好友、
> 查看成员列表、解散该群聊等)是**群级别设置项**,由群主/群管理员在群内操作,**不消耗下面这套后台 RBAC 权限码**。
> 后台权限里与「群」相关的是管理员**跨群强治理**(`admin.group.*`)和后台**强制解散**(`conversation.disband`),
> 二者是两套独立体系。详见第 4 节。

---

## 1. 8 个系统角色

| 角色码 | 名称 | 简称 | 进管理后台 | 一句话定位 |
|---|---|---|:---:|---|
| `platform_admin` | 平台超级管理员 | 平台超管 | ✅ | 全量权限(含占位),可跨租户。≤3 人 |
| `tenant_owner` | 租户主账号 | 租户主 | ✅ | 本租户全部业务能力 + **角色权限管理**(`admin.role.manage` 专属) |
| `tenant_admin` | 租户管理员 | 租户管 | ✅ | 同 owner,但**去掉**角色管理、解散群、强制关闭/转接、影子禁言、强结束通话 |
| `ops_operator` | 运营运维专员 | 运营运维 | ✅ | 用户/群组治理 + 客服调度 + 运维侧(Outbox/Webhook/告警/健康度/系统日志) |
| `customer_service` | 客服坐席 | 客服 | ✅ | 接待台 + 临时会话 + 客户归属 + 消息检索。不涉及强治理/运维 |
| `audit_operator` | 审计合规员 | 审计 | ✅ | 全只读 + 数据导出。不能改任何业务数据 |
| `config_operator` | 配置管理员 | 配置管 | ✅ | 系统配置/通知/推送/公告/语音节点。不碰用户与消息治理 |
| `standard_user` | 终端用户 | 用户 | ❌ | C 端注册用户默认角色,**仅**创建群聊 + 管理会话成员两权限,**无后台访问权** |

> `standard_user` 由 C 端用户自动拥有,管理后台**不分配**此角色。
> 是否拥有管理后台访问权由角色的 `IsConsoleAccess` 决定(上表「进管理后台」列)。

---

## 2. 80 个权限码(按 16 个分类)

> 每行的「权限码」是后端真实校验串,「名称」是后台展示中文名,「定义」是其能力边界。
> 标 ⚠️ 的为 `IsEnforced=false` 占位权限,当前后端未强制。

### 2.1 控制台读取(`Console` / 只读类)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `dashboard.view` | 查看控制台概览 | 看首页概览与各类指标摘要,无任何修改能力 |
| `onboarding.view` | 使用配置向导 | 走场景化首配向导(品牌账号/AI/知识库/技能组/Widget),只读+写自身进度 |
| `admin.user.view` | 查看后台用户 | 看本租户用户列表/详情(基础信息),**不含**手机/邮箱等敏感字段 |
| `online_user.view` | 查看在线用户 | 看实时在线连接列表与设备类型,排查掉线/重连 |
| `admin_login_log.view` | 查看登录日志 | 看后台所有登录尝试(成功/失败、IP、UA、风控标记) |
| `verification_code.view` | 查看验证码记录 | 看短信/邮件验证码发送日志与配额。**可见验证码明文,敏感** |

### 2.2 消息能力(`Message` / 记审计)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `message.recall.any` | 撤回任意消息 | 撤回任何会话任何成员的消息,对双方消息列表生效。强治理操作 |
| `message.search.history` | 检索消息历史 | 按用户/会话/关键词/时间范围检索全租户消息。建议仅给合规岗与客服主管 |

### 2.3 会话管理(`Conversation`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `conversation.manage.members` | 管理会话成员 | 群聊新增/移除成员,调整参与范围。不涉及群主转让或解散 |
| `conversation.create.group` | 创建群聊 | 主动发起多人群聊或业务群组。**所有用户默认拥有** |
| `conversation.disband` | 解散群聊 | 强制解散任意群聊,成员将无法继续发消息。**不可恢复** |
| `conversation.transfer` | 员工会话转移 | 员工离职/调岗时,把其单聊会话与群成员身份整体转给另一员工 |
| `customer_service.assign` | 客户归属维护 | 为客户分配/更换归属客服员工,按需转交服务会话 |
| `conversation.admin.view` | 查看会话管理 | 后台只读查看全量会话(单聊/群聊/临时会话)列表与统计概览 |

### 2.4 统一客服中心(`CsCenter` / 面向已登录客户)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `customer_service.center.view` | 查看客服中心 | 看看板、线程池、线程详情与客服状态 |
| `customer_service.center.manage` | 管理客服中心 | 转派、接管、调度,以及客服在线状态管理 |
| `customer_service.center.force_close` | 强制关闭客服线程 | 强关客服中心任意线程(访客会话或注册客户线程)。仅限主管 |
| `customer_service.center.freeze` | 冻结客服线程 | 冻结/解冻访客临时会话或注册客户直聊线程。冻结后双方禁发、历史可读、写审计 |
| `customer_service.center.intervene` | 管理员介入接待 | 非坐席(管理员/督导)代发消息,审计为 `manager_intervention`,**不计 SLA / 坐席统计** |
| `customer_service.customer.view` | 查看客户管理 | 按「已分配/未分配」只读查看客户列表与统计,用于客户归属盘点 |
| `customer_service.broadcast.send` | 客服主动群发 | 以**发起客服本人身份**向全租户/某群成员群发私聊,或群内群发一条。异步、不可撤回、限流+内容审核兜底 |
| `enterprise_broadcast.send` | 企业群发 | 以**企业官方账号身份**向全体/员工/客户/官方群异步群发。记录实际操作人,缺官方账号时拒绝 |

### 2.5 临时会话客服(`CsTemp` / 面向匿名访客 · Widget)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `customer_service.temp_session.view` | 查看临时会话 | 看看板、列表/详情、消息回放与事件时间线 |
| `customer_service.temp_session.manage` | 管理临时会话 | 工作台领取访客、回复,管排队/配置/黑名单/敏感词。**坐席必备** |
| `customer_service.temp_session.force_close` | 强制关闭临时会话 | 后台强关任意临时会话。主管/运维兜底 |
| `customer_service.temp_session.force_transfer` | 强制转接临时会话 | 后台强制转接给其他客服或技能组,无需当前坐席同意 |
| `customer_service.temp_session.quality_check` | 临时会话质检 | 质检评分、打标签、记录意见。建议给客服主管/质检岗 |
| `customer_service.temp_visitor.view` | 查看访客画像 | 看临时访客详情、来源、历史会话与绑定关系 |
| `customer_service.temp_visitor.block` | 封禁临时访客 | 按 IP/设备指纹/客户 ID/访客 ID 封禁,命中黑名单后立即关会话 |
| `customer_service.content_moderation.view` | 查看风控事件 | 看跨频道(临时会话/直聊/群)敏感词命中与内容风控事件审计列表 |
| `customer_service.content_moderation.manage` | 处理风控事件 | 标记状态(确认违规/误判/忽略)并写审核备注 |
| `customer_service.temp_config.manage` | 管理临时会话配置 | 改临时会话开关、超时阈值、Widget 域名白名单与 webhook 事件配置 |
| `customer_service.temp_stats.view` | 查看临时会话统计 | 看接待量、首响时长、CSAT、客服绩效等统计报表 |
| `customer_service.temp_export.create` | 导出临时会话数据 | 创建明细/访客画像/质检结果/统计报表的导出任务 |
| `ai_service.config.manage` | 管理 AI 服务配置 | 改 AI 提供商/模型/密钥/提示词/RAG/客服话术全部配置 |
| `translation.config.manage` | 管理翻译配置 | 改翻译提供商/密钥/fast-quality 模型链/系统提示词/预算全部配置 |
| `customer_service.config.manage` | 管理客服业务配置 | 改队列容量/SLA 超时/协作/工作时间/技能组路由/Webhook(所有客服渠道共享) |
| `widget.config.manage` | 管理 Widget 接入配置 | 改 Web Widget 标题/主题色/嵌入域名白名单/匿名访客限流(接入路径专属) |

### 2.6 用户资料(`UserProfile`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `user.view.extended_profile` | 查看扩展资料 | 看用户手机号/邮箱/设备名/IP/User-Agent 等敏感字段。**按合规最小化授予** |

### 2.7 用户治理(`UserGovernance` / 强治理)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `admin.user.disable` | 禁用 / 启用用户 | 后台禁用账号(禁止登录)或重新启用 |
| `admin.user.reset_password` | 重置用户密码 | 后台重置登录密码,重置后通过通知渠道告知用户 |
| `admin.user.force_logout` | 强制下线用户 | 撤销用户所有活跃会话立即下线。账号疑似被盗时紧急止损 |
| `admin.user.manage_roles` | 分配用户角色 | 为用户分配/移除角色。**权限提升能力,严格控制授予对象** |
| `admin.user.mute` | 禁言用户 | 常规禁言,期间发消息被服务端拒绝并提示用户 |
| `admin.user.shadow_mute` | 无感禁言(影子禁言) | 客户端显示发送成功,服务端不转发给其他成员。用于灰产治理,避免对方察觉 |
| `admin.user.rate_limit` | 调整发消息频率上限 | 对特定用户单独设发消息频率,覆盖全局限流策略 |
| `admin.user.force_profile` | 强制修改用户资料 | 强改用户昵称与头像,用于违规昵称/头像快速整改 |
| `admin.user.note` | 维护治理备注 | 为用户加内部治理备注,仅管理员可见 |

### 2.8 群组治理(`GroupGovernance`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `admin.group.mute_member` | 群内禁言成员 | 对群聊特定成员执行禁言,不影响其在其他群发言 |
| `admin.group.mute_all` | 群全员禁言 | 将群聊设为全员禁言,仅群主与管理员可发言 |
| `admin.group.freeze` | 冻结会话 | 冻结整个会话使任何人禁发。用于违规事件现场保全 |

### 2.9 角色与权限(`RoleAuth` / 元权限)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `admin.role.manage` | 管理角色与权限 | 看/改租户内所有角色权限组合,创建/禁用角色。**元权限,务必谨慎授予** |

### 2.10 开放平台(`OpenPlatform`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `bot_app.manage` | 管理 BOT 应用 | 创建/启用/禁用 BOT,管理 AppId/AppSecret/回调地址 |
| `service_account.manage` | 管理服务号 | 创建/编辑服务号、调状态。服务号是租户对外的官方身份 |

### 2.11 系统配置(`SystemConfig`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `system_config.manage` | 管理系统配置 | 看/改/回滚租户级系统配置项。所有修改写版本历史与审计日志 |

### 2.12 运维监控(`Ops`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `outbox.view` | 查看 Outbox | 看事务发件箱发布状态、积压与死信 |
| `webhook.manage` | 管理 Webhook 投递 | 看投递日志、执行重试与死信重放 |
| `broadcast.send` | 发送系统广播 | 向本租户全体/分组/单会话推系统通知。发送后不可撤回 |
| `service_health.view` | 查看系统健康 | 看服务节点、依赖组件、Worker 心跳的健康度 |
| `system_log.view` | 查看系统日志 | 按服务/按天浏览/搜索/下载后端 Warning/Error 日志,配置保留天数 |
| `alert.manage` | 管理告警规则 | 看/建/改/确认/静默告警规则与告警历史事件 |
| `notify_channel.manage` | 管理通知渠道 | 看/建/改/测/删通知渠道(邮件、短信、Webhook 等) |
| `push.manage` | 管理移动推送 | 管 iOS/Android 推送通道、路由规则,执行受控测试推送 |
| `announcement.manage` | 管理系统公告 | 创建/发布/归档面向后台用户的内部公告 |
| `export_task.manage` | 管理数据导出 | 创建/查看/下载租户数据导出任务。导出过程被审计 |
| `client_error.view` | 查看客户端错误 | 看 App/Web/PC 端崩溃与异常聚类、堆栈、上下文,用于稳定性排查 |
| `client_error.manage` | 处理客户端错误 | 标记客户端错误处理状态(受理/已解决/忽略)并记备注,状态流转写审计 |
| `feedback.view` | 查看用户反馈 | 看用户从客户端提交的投诉/建议/缺陷反馈及附件 |
| `feedback.manage` | 处理用户反馈 | 受理并处理用户反馈,回写状态供用户在客户端查看进度 |

### 2.13 语音通话(`VoiceCall`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `voicecall.view` | 查看语音通话 | 看语音节点、通话记录、活跃通话状态 |
| `voicecall.manage_nodes` | 管理语音节点 | 对媒体中转节点执行进入/退出维护模式 |
| `voicecall.force_end` | 强制结束通话 | 强制结束任意活跃语音通话。仅限运维兜底 |
| `voicecall.manage_recordings` | 管理通话录音 | 看/下载/删/清理通话录音。受合规留存策略约束 |

### 2.14 审计合规(`Audit`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `audit_log.view` | 查看审计日志 | 看/导出操作审计日志。**审计日志只增不删** |

### 2.15 租户管理(`TenantManage` / ⚠️ 占位待实现,`IsEnforced=false`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `tenant.info.manage` ⚠️ | 维护租户基础信息 | 维护租户名称/Logo/描述/联系方式等基础信息 |
| `tenant.member.manage` ⚠️ | 管理租户成员 | 租户内添加/移除/调整成员归属与角色 |
| `tenant.member.invite` ⚠️ | 邀请租户成员 | 生成邀请链接/邀请码邀请新成员 |
| `tenant.join_request.review` ⚠️ | 审核入驻申请 | 审核用户提交的加入租户申请 |
| `tenant.department.manage` ⚠️ | 管理部门 | 维护租户内部部门层级与成员归属 |
| `tenant.settings.manage` ⚠️ | 管理租户设置 | 修改租户级业务策略与功能开关 |

### 2.16 平台超管(`Platform` / ⚠️ 占位待实现,`IsEnforced=false`)
| 权限码 | 名称 | 定义 |
|---|---|---|
| `platform.tenant.manage` ⚠️ | 管理租户(开通/停用/删除) | 平台层创建/冻结/删除租户 |
| `platform.tenant.approve` ⚠️ | 审批租户申请 | 审批租户注册/认证/升级申请 |
| `platform.user.manage` ⚠️ | 管理平台账号 | 管理平台级账号(平台超管账号)的开通与吊销 |
| `platform.stats.view` ⚠️ | 查看平台统计 | 看跨租户的平台运营统计数据 |

---

## 3. 角色 → 默认权限矩阵(摘要)

> 完整组合见 `AuthorizationCatalog.DefaultRolePermissionCodes`。下表为关键差异速查,
> ✅=默认包含,空=不含。`platform_admin` 默认包含全部 80 个(含占位),故不单列。

| 权限码(选取关键项) | owner | admin | ops | cs | audit | config |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `message.search.history` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `message.recall.any` | ✅ | ✅ | ✅ | ✅ | | |
| `conversation.disband` | ✅ | | | | | |
| `customer_service.temp_session.manage` | ✅ | ✅ | ✅ | ✅ | | |
| `customer_service.center.force_close` | ✅ | | ✅ | | | |
| `customer_service.center.force_transfer` 类 | ✅ | | ✅ | | | |
| `user.view.extended_profile` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `admin.user.shadow_mute` | ✅ | | ✅ | | | |
| `admin.user.manage_roles` | ✅ | | | | | |
| `admin.group.freeze` | ✅ | | ✅ | | | |
| `admin.role.manage` | ✅ | | | | | |
| `system_config.manage` | ✅ | ✅ | | | | ✅ |
| `audit_log.view` | ✅ | | | | ✅ | |
| `voicecall.force_end` | ✅ | | ✅ | | | |
| `export_task.manage` | ✅ | ✅ | ✅ | | ✅ | |

要点:
- **`tenant_admin` 比 `tenant_owner` 少**:角色管理(`admin.role.manage`)、解散群(`conversation.disband`)、客服中心强制关闭/转接、影子禁言(`admin.user.shadow_mute`)、强结束通话(`voicecall.force_end`)。
- **`customer_service` 最克制**:只有接待/临时会话/客户归属/消息检索 + 扩展资料,**不含任何强治理或运维**。
- **`audit_operator` 全只读** + 仅 `export_task.manage` 一个「写」(导出本身被审计)。

---

## 4. 第三方最容易踩的边界澄清

1. **群内设置 vs 后台权限是两套体系。**
   App「群管理」页的开关(二维码进群、@所有人、互加好友、查看成员列表、全员禁言、解散该群聊…)
   是**群主/群管理员**在群内对**自己这个群**的设置,走的是会话/群成员接口,**不需要也不消耗**上面任何后台权限码。
   上面的 `admin.group.*` 是**后台管理员跨群强治理**(对全租户任意群下手),`conversation.disband` 是**后台强制解散**,
   两者面向的是后台管理员,不是普通群主。

2. **角色是默认组合,不是硬规则。** 接入时请按**权限码**判断用户能力(后台「角色与权限」可自定义任意组合),
   不要假设「客服角色 = 固定那几个权限」。

3. **`IsEnforced=false` 的 10 个码暂未生效。** 租户管理(6)+ 平台超管(4)目前是占位,
   后端未强制校验——别基于它们做集成判断。其余 70 个均已强制。

4. **`standard_user`(C 端用户)没有后台访问权**,只有 `conversation.create.group` + `conversation.manage.members`。
   这也是为什么普通用户能建群、能管自己建的群成员,但进不了管理后台。

---

## 5. 权威来源(单文件)

```
src/Shared/ZTChat.Shared.Application/AuthorizationCatalog.cs
├─ SystemRoleCodes                 // 8 个角色码常量
├─ SystemPermissionCodes           // 80 个权限码常量
├─ PermissionCategories            // 16 个分类
├─ AuthorizationCatalog.RoleDefinitions          // 角色元数据(名称/说明/受众/是否进后台)
├─ AuthorizationCatalog.PermissionDefinitions    // 每个权限码的中文名/定义/分类/IsEnforced
└─ AuthorizationCatalog.DefaultRolePermissionCodes // 角色 → 默认权限码集合
```

后台「角色与权限」页、登录后台访问资格判定(`ConsoleAccessRoleCodes`)、新部署初始化,全部读这一份。
如需机读,可请后端提供 catalog 的导出接口(后台权限页即基于此渲染)。
