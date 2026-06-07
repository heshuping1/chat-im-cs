# PC 端重构任务矩阵

状态：活跃总账

日期：2026-06-01

适用范围：`lpp/lpp_pc_client`

关联文档：

- [PC端核心架构技术方案.md](./PC端核心架构技术方案.md)
- [PC端AI文件路由表.md](./PC端AI文件路由表.md)
- [PC端重构任务矩阵-历史阶段-P0-P19.md](./archive/PC端重构任务矩阵-历史阶段-P0-P19.md)
- [PC端重构任务矩阵-近期阶段-P20-P26明细.md](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md)

---

## 1. 使用规则

本矩阵是活跃任务总账，不再承载全部历史明细。P0-P19 和已完成的近期长明细进入 archive，当前文件保留任务规则、阶段摘要、未完成/待确认事项和关键风险。

任务进入本矩阵的条件：

1. 影响 PC 端核心链路、架构边界、状态 owner、API 合同、Electron 能力、性能安全或发布质量。
2. 需要跨会话跟踪、负责人确认或后续验证。
3. 已完成阶段只保留摘要，详细任务迁入 archive。

不进入本矩阵的内容：

1. 单个文案或纯视觉微调。
2. 不影响 owner 和核心链路的小 bugfix。
3. 已经由阶段清单或验证记录完整承载的历史细节。

---

## 2. 状态、风险和验收等级

状态枚举：

| 状态 | 含义 |
| --- | --- |
| `待开始` | 尚未进入执行。 |
| `进行中` | 正在实现或验证。 |
| `待处理` | 已识别但当前不执行。 |
| `已缓解` | 风险已有控制措施但仍需保留追踪。 |
| `已完成` | 已实现并通过验收。 |

风险等级：

| 等级 | 含义 |
| --- | --- |
| P0 | 影响登录、消息收发、未读已读、客服接入等核心链路。 |
| P1 | 影响主要页面、状态边界、缓存一致性。 |
| P2 | 影响局部功能或开发体验。 |
| P3 | 文档、规范、低风险整理。 |

验收等级：

| 等级 | 标准 |
| --- | --- |
| L1 | 类型检查 + 代码审查。 |
| L2 | L1 + 单测/集成测试。 |
| L3 | L2 + 核心链路手工验证。 |
| L4 | L3 + E2E/性能/安全专项验证。 |

---

## 3. 单任务执行要求

每个活跃任务默认执行以下检查：

```text
任务编号：
任务类型：
文件 owner：
是否新增依赖：
是否替换技术：
是否复用已有能力：
是否涉及公共能力抽象：
是否影响核心链路：
是否改变 API DTO/wire shape：
是否改变 React Query query key：
是否改变 Zustand/store owner：
是否改变 Gateway 事件边界：
是否改变 Electron IPC/preload 边界：
是否需要负责人确认：
验收等级：
验证命令：
遗留风险：
```

硬规则：

1. Gateway raw event 必须先进入 adapter，再进入 dispatcher/handler。
2. 页面组件不得直接解释 raw DTO 或直接 patch cache。
3. 新业务状态必须明确 owner、持久化 key 和回滚策略。
4. 公共能力先查已有 owner，第三次重复必须抽象或登记任务。
5. Electron IPC 必须 typed、validated、最小能力暴露。
6. P0/P1 任务必须补测试或验证记录；无法验证必须说明原因。

---

## 4. 阶段摘要

| 阶段 | 名称 | 状态 | 明细 |
| --- | --- | --- | --- |
| P0-P8 | 架构地基、Gateway、Store、API、消息底座、客服、公共 UI、Electron 门禁 | 已完成 | [历史阶段 P0-P19](./archive/PC端重构任务矩阵-历史阶段-P0-P19.md) |
| P9-P19 | 成熟度提升、大文件收敛、职责治理、发布验证、坏味道修复、上下文预算 | 已完成 | [历史阶段 P0-P19](./archive/PC端重构任务矩阵-历史阶段-P0-P19.md) |
| P20 | 功能完善与回归治理 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P21 | 普通 IM 消息内核一致性治理 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P22 | 消息状态与已读回执统一治理 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P23 | 播放器能力技术评估 | 待处理 | 当前矩阵保留活跃项 |
| P24 | 联系人与好友关系闭环 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P25 | 聊天查找体验治理 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P26 | 客户信息、联系人入口与设置稳态治理 | 已完成 | [近期阶段 P20-P26 明细](./archive/PC端重构任务矩阵-近期阶段-P20-P26明细.md) |
| P27 | IM 本地消息库与核心链路纠偏 | 已完成 | [2026-06-07 P27 执行计划](../superpowers/plans/2026-06-07-pc-im-local-message-store-recovery.md) |

---

## 5. 当前活跃任务

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P23-PLAYER-001 | mpv/libmpv Assessment | 评估 mpv/libmpv 作为 PC 端全格式播放器能力的可行性，对比 Electron Chromium、系统播放器、外部 mpv 子进程和嵌入式 libmpv；覆盖 Windows 打包、签名、更新、体积、安全和 UX。新增 native 依赖、打包资源、外部播放器或 libmpv 嵌入前必须负责人确认。 | P1 | L1 | 待处理 |
| P27-IM-001 | IM Query Scope | 统一 IM 消息读取、发送写入、Gateway invalidation 的 session/workspace query key，修复 `imMessages` 与 `imMessagesForSession` 分裂。 | P0 | L2 | 已完成 |
| P27-IM-002 | IM Local Message Store | 新增 PC 端持久化本地消息仓库 owner，成功消息按 apiBaseUrl/tenant/user/conversation scope 物化到 IndexedDB，React Query 不再冒充消息本地库。 | P0 | L2 | 已完成 |
| P27-IM-003 | Local-first Chat Entry | 进入已有本地消息的聊天窗口时先展示本地消息，再后台同步服务端；不得用整块 loading 遮挡本地已有消息。 | P0 | L3 | 已完成 |
| P27-IM-004 | Message Write-through | 服务端快照、Gateway push、发送确认、撤回/删除/read metadata 统一写入本地消息仓库和 message core 归约路径。 | P0 | L3 | 已完成 |
| P27-IM-005 | Gap Sync Contract | 明确当前 fallback refetch 与真实 afterSeq/cursor gap sync 的边界，补诊断和服务端合同缺口记录。 | P0 | L3 | 已完成 |
| P27-IM-006 | History Search Source | 聊天历史分页和搜索不能只依赖当前 50 条 serverMessages；先接本地持久化范围，服务端全文搜索缺口显式呈现。 | P1 | L3 | 已完成 |
| P27-CS-001 | CS Unread Ledger Boundary | 客服未读长期事实从 CS ledger/server/Gateway 明确来源归约，IM list compat 只能作为迁移期显示 fallback。 | P1 | L3 | 已完成 |
| P27-ARCH-001 | P27 Boundary and Validation | 补架构边界测试、验证记录和任务矩阵闭环，防止再次把 React Query/hot cache 当消息本地库。 | P1 | L2 | 已完成 |

---

## 6. 当前关键风险清单

| 编号 | 风险 | 影响 | 控制方式 | 状态 |
| --- | --- | --- | --- | --- |
| RISK-001 | Gateway 职责回流 | Gateway 改动影响 IM/客服/通知/未读 | typed event、adapter、dispatcher、handler、事件注册表和 query invalidation 已建立；新增分支必须走 Gateway owner。 | 已缓解 |
| RISK-002 | 状态边界过宽 | 改一个状态影响多个模块 | auth/settings/workspace-ui/im-read/reminder owner 已拆；页面/feature 直连 backing store 由架构边界测试约束。 | 已缓解 |
| RISK-003 | raw DTO 兼容散落 | 后端字段变化导致页面异常 | DTO/Domain/ViewModel、contract diagnostics、API fixture 和 architecture-boundaries 已建立。 | 已缓解 |
| RISK-004 | 大页面承载业务规则 | 需求改动回归范围大 | MessageCenter、ChatWorkspace 已抽 view model/service，lint:shape 与 owner 规则防回流。 | 已缓解 |
| RISK-005 | Electron token/localStorage 风险 | 敏感信息暴露和会话安全问题 | 桌面端 auth session 已迁移到 safeStorage，浏览器开发环境保留回退。 | 已缓解 |
| RISK-006 | 缺少核心链路自动化验证 | 重构靠手工感觉 | check:quick、test:core、CI workflow、架构边界、文档门禁和 lint:core 已建立。 | 已缓解 |
| RISK-007 | 缺少结构化诊断日志 | 偶发消息/客服问题难排查 | 诊断字段规范、设置页诊断包导出和 send diagnostics 已建立。 | 已缓解 |
| RISK-008 | Windows 实机验证不足 | 发布包和系统能力可能与本机开发态不一致 | 发布前必须按核心路径 smoke 和发布检查清单记录 Windows 实机验证；非 Windows 环境不得伪造结果。 | 待处理 |
| RISK-009 | PC 端缺少真正本地消息库 | 新进入聊天窗口无法本地首屏可见，弱网/失败时成功历史消息被 loading 或远端失败影响。 | P27 已新增 IndexedDB 本地消息仓库，成功消息和服务端/Gateway 增量进入统一 read model；React Query/hot cache 不再作为本地库。 | 已缓解 |
| RISK-010 | IM 消息 query key / scope key 分裂 | 发送写入、聊天读取、Gateway invalidation 可能不在同一 workspace owner，导致乐观消息、刷新、跨账号隔离不稳定。 | P27-IM-001 已统一活跃消息读取、发送/cache mutation 写入和有 session 的 Gateway invalidation scope；P27-ARCH-001 继续补长期边界测试。 | 已缓解 |
| RISK-011 | Gap sync 只有 fallback refetch | 断线重连、离线恢复、seq 跳号无法精确补洞，可能丢增量或重复提示。 | P27-IM-005 已显式区分 fallback 与真实 afterSeq/cursor 合同；服务端合同未确认前不得宣称精确补洞。 | 已登记服务端合同缺口 |

---

## 7. 推进原则

1. 先做 P0/P1 核心链路，再做 P2/P3 清理。
2. 每次只推进一个 owner，避免顺手跨域扩大范围。
3. 任何新增依赖、技术替换、公共抽象扩大或核心旧链路删除，必须先确认。
4. 完成任务后优先补验证记录；历史明细归档，不回填到主矩阵造成膨胀。
5. 如果任务已完成且只需追溯，先查 archive 和 validation，不要把历史复制回主矩阵。
