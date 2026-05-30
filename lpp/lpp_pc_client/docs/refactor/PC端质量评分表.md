# PC 端质量评分表

日期：2026-05-30

评分：1 代表高风险/不可持续，5 代表边界清晰、可验证、可持续演进。

| 领域 | 当前分 | 目标分 | 已完成能力 | 主要差距 | 下一步 |
| --- | ---: | ---: | --- | --- | --- |
| Gateway | 5 | 5 | typed event、adapter、dispatcher、IM/CS handler、诊断、事件注册表、query invalidation helper、payload utils、code shape gate | 无 P0/P1 架构差距 | 新增 Gateway 事件必须先补 adapter/handler/diagnostics/test |
| Store | 5 | 5 | auth/settings/workspace-ui/im-read/reminder 拆分，secure session，页面层直接 `useWorkspaceStore` 读写已清理，Gateway auth 快照改用 auth owner，`architecture-boundaries` 防止页面/feature 直连 backing store | `store.ts` 仍作为内部兼容 backing store | 新增状态必须先落到 owner selectors/actions，不新增页面直连 workspace store |
| API/Contract | 5 | 5 | DTO normalizer、contract diagnostics、API error model、API contract fixtures、页面/feature 禁止直连 contract normalizer 的架构边界门禁 | 无 P0/P1 架构差距；合同样本需随接口变更持续补充 | 新增或变更接口必须补 fixture、normalizer 和 diagnostics |
| Message/IM | 5 | 5 | message domain、view model、send queue、列表分段渲染、群头像模型、媒体动作 runtime、文本发送控制器、媒体发送控制器、菜单 action 控制器、交互 handler、消息列表派生 hook、辅助数据 hook、会话选择 hook、菜单媒体状态 hook、动作 mutation 控制器、启动会话控制器、IM read command executor、direct read receipt hook、未读跳转控制器、页面生命周期 hook、消息展示模型、cache mutation model、composer model、composer surface、dialogs layer、profile dock、overlay layer、资料 presentation 拆分、IM read view model、header/chrome 组件、window dismiss hook，`MessageCenter.tsx` 已低于 shape 阈值 | 无 P0/P1 架构差距 | 新增 IM 能力优先进入 models/hooks/components，不回填页面大组件 |
| Customer Service | 5 | 5 | CS Gateway、状态机、action service、cache、workspace view model、发送控制器、复用消息域媒体动作和 composer model、客服媒体菜单组件、composer surface、线程操作按钮、消息 stage/bubble、header/reception 组件、通知和线程生命周期 hooks，`ChatWorkspace.tsx` 已低于 shape 阈值 | 无 P0/P1 架构差距 | 新增客服能力优先进入 customer-service hooks/components/data，不回填 workspace 大组件 |
| Electron/Security | 5 | 5 | typed desktopApi、IPC validation、safeStorage storage module、截图隔离、路径策略、main electron-runtime 诊断、renderer runtime-error 诊断、诊断包合并导出 | 截图 selector 仍在 main 中，但已隔离 preload；Windows 打包态仍需实机验证 | 后续做 Windows 打包验证和截图 selector window 拆分专项 |
| Performance | 4 | 5 | 启动预算、bundle 拆分、消息长列表分段、客服线程列表分段、媒体 preload 策略、diagnostics P75/P95 采样统计脚本 | 未做真实 Windows P75/P95 采样 | 在 Windows 打包态导出 diagnostics 后执行 `npm run perf:samples -- <diagnostics.json>` 回填数据 |
| Shared UI | 5 | 5 | Avatar、PanelState、badge/time、media action、notification、设置行组件、样式首批收敛，本地 `PanelState` 已清理并接入架构边界门禁 | 无 P0/P1 架构差距；业务专属状态组件按场景保留 | 新增通用空态/错误态必须复用 `PanelState` 或先登记公共能力任务 |
| Engineering Gates | 5 | 5 | check:quick、test:core、lint:core、test:coverage:core、docs:check、lint:shape、CI workflow、Mac production build 验证，shape 大文件 allowlist 已清空，核心覆盖率 hard gate 已建立，Electron/builder 已完成最小安全升级 | npm audit high 已清零；Windows 打包态仍需实机验证 | Windows 环境执行 `npm run dist:win`、安装包启动和 diagnostics/perf 回填；Electron 42 作为后续独立技术栈升级评估 |
| Documentation | 5 | 5 | AGENTS、README、任务矩阵、ADR、验证记录、docs:garden、活跃文档优先巡检、validation archive 汇总 | 无 P0/P1 架构差距；历史验证记录保留归档上下文 | 阶段收尾运行 docs:garden，活跃文档出现信号必须修复或记录理由 |

## 使用方式

- 每完成一个阶段，更新分数、差距和下一步。
- 分数下降必须写明原因。
- 分数不是 KPI，作用是帮助 Codex 和工程师快速判断重构健康度。
