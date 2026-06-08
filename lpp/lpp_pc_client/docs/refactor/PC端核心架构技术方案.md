# PC 端核心架构技术方案

状态：活跃架构入口

日期：2026-05-29

适用范围：`lpp/lpp_pc_client`

目标读者：后续参与 PC 客服 IM 客户端功能开发、重构、测试验收和代码审查的工程师与 agent。

---

## 1. 定位

本文是 PC 端架构短入口，不再承载全部历史细节。日常任务先读 `AGENTS.md` 的 L0-L3 分级策略，再按本文和冷参考文档定位必要上下文。

PC 客户端继续采用 `Electron + React + TypeScript + Vite + React Query + Zustand + SignalR`。技术路线成立，当前核心要求是让普通 IM、在线客服、Gateway、媒体、通知、诊断和 Electron 能力保持清晰边界、可测试、可追踪。

本文保留必须遵守的架构原则。低频细节迁移到：

| 主题 | 冷参考文档 | 读取时机 |
| --- | --- | --- |
| 状态机与时序 | `architecture/PC端核心链路状态机与时序.md` | 消息发送、已读、客服线程、Gateway 连接状态变化 |
| API 字段矩阵 | `architecture/PC端API合同与字段依赖矩阵.md` | API/DTO/Gateway 字段兼容和 wire shape 判断 |
| 质量/安全/性能/诊断 | `architecture/PC端质量安全性能诊断参考.md` | L2/L3 测试、性能、安全、诊断和 DoD 判断 |
| 历史迁移路线 | `archive/PC端历史迁移路线-P0-P19.md` | 追溯旧阶段、迁移路线和历史任务背景 |

---

## 2. 阅读策略

1. L0 低风险任务：只读 `AGENTS.md` 和当前相关源码入口。
2. L1 普通小改动：读 `PC端AI文件路由表.md`，按场景进入 owner 文件。
3. L2 架构/状态/协议/Gateway/Electron/性能/工程门禁：读本文，再按主题跳到冷参考文档。
4. L3 复杂重构、跨 owner 或需要验证证据：读任务矩阵、相关计划、验证记录和必要冷参考。

不要为了“保险”默认打开所有大文档。阅读范围必须服务于当前任务风险。

---

## 3. 产品与技术目标

PC 客户端是客服主力工作台，不是移动端简单放大版。

产品目标：

1. 客服可以稳定处理普通 IM 和在线客服会话。
2. 多会话切换、消息收发、图片文件、未读已读、接入接管、客户上下文不出错。
3. 弱网、重连、字段变化、终态会话、权限不足时有明确降级。
4. 桌面通知、托盘、文件打开、截图、诊断包等能力可控可靠。

技术目标：

1. 核心链路可测试：Gateway、消息 normalize、local echo、server echo、read model、客服状态机必须能单测。
2. 状态流可追踪：服务端快照、Gateway 事件、用户操作、本地缓存、Electron 事件必须进入明确 adapter。
3. 分层边界稳定：组件不直接解释接口字段，不直接改 React Query 缓存，不直接决定核心状态终态。
4. 可渐进迁移：每一阶段都保持可运行、可验证、可回滚。

---

## 4. 总体架构

```text
Electron Main
  Window / Tray / Notification / File / Screenshot / Secure Storage
        |
        v
Electron Preload
  Typed desktopApi + payload validation + capability boundary
        |
        v
Renderer App
  app shell / routes / providers
        |
        v
Feature Presentation
  IM / Customer Service / Contacts / Settings
        |
        v
Application + Domain
  use cases / state machines / view models / reducers
        |
        v
Infrastructure
  API clients / Gateway adapters / React Query cache / Zustand stores
```

推荐 owner 边界：

| 层级 | 负责 | 不负责 |
| --- | --- | --- |
| Page / Shell | 布局、装配、路由、弹层入口 | 协议解析、cache merge、状态机 |
| Feature hooks/controller | 用户动作编排、调用用例、局部 UI 状态 | raw DTO 兼容、跨域副作用 |
| Domain/model | 纯规则、状态机、展示模型 | React、Electron、网络请求 |
| Data/infrastructure | API、Gateway、query cache、持久化 | 页面布局和视觉决策 |
| Main/preload/shared | 桌面能力、IPC contract、安全边界 | 业务页面逻辑 |

---

## 5. 架构硬规则

1. Gateway raw event 必须先进入 adapter，再进入 dispatcher/handler。
2. 页面组件不得直接解释 Gateway raw payload 或后端 raw DTO。
3. 页面组件不得直接承载未读、已读、客服状态机、发送状态机等核心规则。
4. React Query 管服务端快照和缓存；Zustand 管客户端状态、UI 状态和必要持久化。
5. 新增业务状态前先确认 owner、持久化 key、迁移和回滚策略。
6. 头像、时间、badge、空态、错误态、媒体预览、通知等公共能力不得重复散落实现。
7. Electron IPC 必须 typed、validated、最小能力暴露。
8. 新增依赖、替换技术、扩大公共抽象、删除核心旧链路前必须找负责人确认。
9. 服务端 API/Gateway 违反合同或缺少强归属字段时，先作为服务端合同异常记录并提醒；PC 端不得用猜测归属、默认纳入或 UI 兜底修补来破坏 DDD 边界。

---

## 6. 普通 IM 原则

1. 会话列表、消息历史、发送状态、已读未读、媒体上传必须有稳定 owner。
2. 本地发送使用 local echo 和 `clientMsgId`，服务端确认后合并，不用刷新掩盖状态问题。
3. 消息发送、失败、重发、撤回、删除和已读更新优先进入 message core/model，再更新 cache。
4. 群聊回执入口只消费服务端消息快照已有聚合字段；缺字段时降级展示。点击消息旁详情浮层可实时请求服务端精确名单，但不得写回本地库、不得参与 `msg.read` 或本地人数累加。
5. 文本、图片、视频、文件的发送态展示可不同，但状态来源必须统一。

禁止项：

1. 页面组件直接 patch 消息 cache。
2. 为解决单个展示问题绕过 send queue 或 message core。
3. 在 UI 中展示未产品化的 403/FORBIDDEN/server code 文案。
4. 媒体上传未完成时假装发送成功。

---

## 7. 在线客服原则

1. 客服线程状态、接入/接管/关闭、只读终态、动作权限必须由状态机或 action service 推导。
2. 客服消息和普通 IM 复用消息底座，但保留客服线程、客户资料、队列和权限 owner。
3. 终态会话默认只读，权限不足时显示产品化原因，真实错误写入 diagnostics。
4. 客服工作台 UI 优先保障信息密度、处理效率、多状态反馈和客户上下文稳定。

禁止项：

1. 客服页面直接合并 thread/message/queue cache。
2. 把客服状态判断散落到多个组件条件分支。
3. 用普通 IM 的状态语义覆盖客服接待语义。

---

## 8. Gateway 原则

1. Gateway 连接只负责接收和分发，不在入口堆业务分支。
2. raw payload 先进入 adapter，得到 typed domain event 后再进入 router/handler。
3. handler 异常必须隔离，不得影响其他事件处理。
4. Gateway 与轮询/手动刷新必须进入同一 cache/model 归约路径，避免多入口状态漂移。
5. 关键事件需要 traceId/correlationId，能通过 diagnostics 复盘。

---

## 9. API 与数据模型原则

1. API client 只处理请求、响应和错误模型，不返回页面定制结构。
2. 后端 DTO 进入 domain/view model 前必须经过 normalizer 或 adapter。
3. 字段缺失、字段别名、枚举兼容、权限失败必须有稳定降级规则。
4. React Query query key 是公共合同，变更前必须确认影响范围。
5. wire shape 变化优先更新 API 合同和 fixture，再改 UI。
6. 服务端返回与 API 合同冲突时，先输出脱敏证据和合同缺口提醒；仅允许在 API/Gateway 防腐层做白名单阻断或显式隔离，不允许把错误数据解释成其它领域事实。

字段依赖细节见 `architecture/PC端API合同与字段依赖矩阵.md`。

---

## 10. Electron 与桌面能力原则

1. Renderer 禁止直接使用 Node 能力。
2. 所有本地能力必须通过 preload 暴露的白名单 `desktopApi`。
3. IPC payload 必须 typed + validated；main 侧只接收最小必要参数。
4. token、文件路径、媒体缓存、截图窗口、系统播放器等能力必须按安全边界处理。
5. main/template 改动必须重新构建或确认 dist 同步，不能只刷新 renderer。

安全细节见 `architecture/PC端质量安全性能诊断参考.md`。

---

## 11. 性能与体验原则

1. 消息列表、会话列表、媒体预览和客服工作台必须优先保护流畅度。
2. 性能优化先定义场景和预算，再调整实现；禁止无证据引入复杂优化。
3. 长列表必须避免全量重渲染；未变化消息尽量复用对象。
4. 媒体加载必须考虑缓存、鉴权、坏缓存、失败回退和本地刚发送资源。
5. PC UI 遵守桌面 IM + 客服工作台标准：高信息密度、清晰层级、克制反馈、稳定热区。

---

## 12. 工程质量原则

1. L1 小改动至少做静态检查或局部单测。
2. L2 核心链路改动必须补相关 unit/integration 测试。
3. L3 跨 owner 或核心路径改动必须有验证记录、风险说明和必要手工验收。
4. P0/P1 运行链路任务必须留下结构化诊断证据，或说明为什么不新增日志。
5. 文档更新必须保持入口可查、历史可追溯、当前任务可恢复。

推荐验证入口：

| 场景 | 优先命令 |
| --- | --- |
| 核心模型/状态 | `npm run test:core` 或对应 `vitest run tests/unit/...` |
| 架构边界 | `npm run lint:boundaries` |
| 快速综合检查 | `npm run check:quick` |
| 文档结构 | `npm run docs:check` |
| 发布/浏览器 | `npm run build`、`npm run test:browser` |

---

## 13. 新功能开发规则

1. 先按 `PC端AI文件路由表.md` 找 owner。
2. 新功能必须补齐 loading、empty、error、disabled、permission、retry、offline/reconnect 关键状态。
3. UI 方案默认按专业桌面 IM + 客服工作台标准处理，不做普通网页式拼装。
4. 需要新增依赖、替换技术、扩大公共抽象或删除核心旧链路时，先形成评估结论并确认。
5. 完成后更新任务矩阵或相关任务清单，必要时补验证记录。

---

## 14. 与现有文档关系

| 文档 | 关系 |
| --- | --- |
| `AGENTS.md` | PC 端最短入口和强制规则，优先于本文 |
| `PC端AI文件路由表.md` | L1/L2 任务选择最小上下文的主要入口 |
| `PC端重构任务矩阵.md` | 活跃任务总账、阶段摘要和风险入口 |
| `architecture/*.md` | 低频但必须保留的架构细节 |
| `archive/*.md` | 历史阶段、迁移路线和旧任务明细 |
| `lpp/docs/03-技术方案.md` | App 技术方案、业务口径和接口规则参考，不再作为 PC 架构主方案 |

如果文档冲突，优先级为：当前用户明确指令 > PC `AGENTS.md` > 本文 > 任务矩阵 > 冷参考/归档文档。

---

## 15. 文档维护规则

需要更新本文的情况：

1. 核心架构边界变化。
2. 普通 IM、在线客服、Gateway、API、Electron 的 owner 规则变化。
3. React Query/Zustand/SignalR/Electron IPC 职责边界变化。
4. 新增会影响多数任务的性能、安全、诊断或测试原则。

不需要更新本文的情况：

1. 纯视觉微调。
2. 单个文案调整。
3. 不改变架构边界的小 bugfix。
4. 某阶段任务状态更新；这类内容进入任务矩阵或 archive。

重大决策应另外写 ADR，并在本文或 README 文档地图中引用。
