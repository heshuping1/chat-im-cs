# PC 端 P13 职责审计任务清单

状态：执行中

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

---

## 1. 目标

P13 不以继续压小文件为目标，而是对 P12 留下的 `data-main-edge-files` 做职责审计。

每个文件必须给出：

1. owner。
2. 当前职责。
3. 混入职责。
4. 稳定入口或 re-export。
5. 处理结论：拆分、保留例外或创建后续任务。

---

## 2. 当前基线

执行命令：

```bash
npm run p12:audit
wc -l src/renderer/data/api/types.ts src/renderer/data/customer-service/cs-cache-adapter.ts src/renderer/data/im-read-model.ts src/main/screenshot-selection-window.ts src/renderer/data/api/customer-service-client.ts src/renderer/data/workspace-ui/workspace-store-core.ts src/renderer/data/gateway/gateway-payload-utils.ts src/renderer/data/im-message-normalize.ts
```

当前 `p12:audit`：

```text
## css-large-files
none
## component-edge-files
none
## data-main-edge-files
src/renderer/data/api/types.ts lines=710
src/renderer/data/im-read-model.ts lines=512
src/renderer/data/api/customer-service-client.ts lines=508
src/renderer/data/workspace-ui/workspace-store-core.ts lines=466
src/renderer/data/im-message-normalize.ts lines=453
```

---

## 3. 审计结论

| 文件 | owner | 当前职责 | 混入职责 | 稳定入口 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `src/renderer/data/api/types.ts` | API DTO / contract types | 聚合账号、联系人、消息、客服、知识库、AI、企业广播等 DTO；提供少量客服状态/历史记录 helper。 | DTO 聚合中混入 `staffServiceHistoryItemToThread`、日期格式化等转换 helper。 | `src/renderer/data/api-client.ts` re-export。 | 已按 `P14-RESP-004` 登记长期例外；拆分前必须保持 DTO wire shape 和 `api-client.ts` re-export facade。 |
| `src/renderer/data/customer-service/cs-cache-adapter.ts` | 客服 React Query cache owner | 客服 thread/message/queue/detail cache 更新、本地消息合并、Gateway 消息合并、cache diagnostics。 | thread、message、queue、diagnostics 集中在一个 owner 内，职责相关但过宽。 | 现有导出函数。 | 已按 `P14-RESP-002` 拆出 message model 与 diagnostics owner，原文件保留 cache adapter 入口兼容。 |
| `src/renderer/data/im-read-model.ts` | IM read domain model | 已读 domain type、状态 reducer、view 派生、command 合并、identity 判断。 | 类型、reducer、view、identity helper 集中；均属于 IM read domain。 | 现有导出函数。 | 允许例外；创建 `P14-RESP-001`，后续只在新增 read 规则时再拆 `im-read-types` / `im-read-reducer` / `im-read-view`。 |
| `src/main/screenshot-selection-window.ts` | Electron screenshot window owner | 截图选择窗口创建、IPC channel 生命周期。 | 已将窗口配置和内嵌 HTML 模板拆到 main-only owner。 | `selectScreenshotRegion`。 | 已按 `P14-RESP-003` 拆出 `screenshot-selection-window-options.ts` 与 `screenshot-selection-template.ts`，不改变 IPC/preload contract。 |
| `src/renderer/data/api/customer-service-client.ts` | 客服 API client owner | 客服接口请求、路径拼接、request body、contract DTO normalize。 | client 请求和 response normalize helper 同文件；属于同 API owner 但偏宽。 | `CustomerServiceApiClient`。 | 允许临时例外；后续如继续增长，抽 `customer-service-response-normalizers.ts`。 |
| `src/renderer/data/workspace-ui/workspace-store-core.ts` | workspace-ui backing store owner | workspace UI state、auth/settings/read/reminder facade 兼容、持久化初始化。 | 兼容 facade 与 UI store core 共存。 | `useWorkspaceStore`，外部通过 owner selectors 使用。 | 保留例外；不删除核心旧链路，除非单独确认。 |
| `src/renderer/data/gateway/gateway-payload-utils.ts` | Gateway payload adapter helper owner | Gateway raw payload shape 兼容、IM event 构造、客服 payload 判断、自发消息判断。 | IM payload、客服 payload、read receipt helper 同文件。 | 现有导出函数。 | 已按 `P14-RESP-001` 拆为 record、IM payload、客服 payload owner，原文件保留 re-export facade。 |
| `src/renderer/data/im-message-normalize.ts` | IM message normalize owner | 消息 body/type/parts/media/url/preview 归一化。 | 文本预览、媒体 URL、消息 parts 仍集中；同属 normalize owner。 | 现有导出函数。 | 允许例外；如新增媒体规则，再抽 `im-message-media-normalize.ts`。 |

---

## 4. P13-GOV-002：职责审计总账

状态：已完成

优先级：P1

目标：对 P12 `data-main-edge-files` 逐个做 owner 审查，按职责混杂程度决定拆分、保留或登记例外。

验收：

1. 每个文件有 owner、职责、混入职责、稳定入口和处理结论。
2. 不直接改运行时代码。
3. 后续 P14/P15 任务已登记。

验证：

```bash
npm run p12:audit
npm run p10:audit
npm run docs:check
git diff --check
```

---

## 5. P13-GOV-003：核心 IM 职责守卫

状态：已完成

优先级：P0

目标：防止消息发送、已读、媒体、菜单、缓存、Gateway 事件回流页面。

当前结论：

1. `MessageCenter.tsx` 已退回页面装配职责。
2. 消息发送在 `useMessageTextSendController` / `useMessageMediaSendController`。
3. 菜单动作在 `useMessageMenuActionController`。
4. 已读命令在 `useImReadCommandExecutor` 与 `im-read` owner。
5. 媒体桌面动作在 `media/runtime` 与 `messages/runtime` owner。
6. Gateway payload 仍在 `gateway-payload-utils.ts` 偏宽，进入 `P14-RESP-001`。

新增机械约束：

1. 页面/feature 不得新增直接导入 `messageCacheMutationModel`。
2. 页面/feature 的直接 `desktopApi` 调用被固定在现有 owner 白名单，新增入口会触发架构边界测试。

---

## 6. P13-GOV-004：客服缓存与状态职责守卫

状态：已完成

优先级：P1

目标：确认客服 thread/message/queue cache adapter、动作权限、状态合并没有继续回流组件。

当前结论：

1. `cs-cache-adapter.ts` 是客服缓存 owner，职责相关但过宽。
2. 现有组件/客服 hooks 对 cache adapter 的使用被记录为兼容白名单。
3. 后续新增直接导入 cache adapter 的页面/feature 文件会触发架构边界测试。
4. `P14-RESP-002` 承接 thread/message/diagnostics helper 拆分。

---

## 7. P13-GOV-005：Electron 边界守卫

状态：已完成

优先级：P0

目标：确认 main/preload 的截图、文件、通知、safeStorage、diagnostics 都走 typed + validated IPC。

当前结论：

1. `preload.cts` 通过 `validateDesktopApiCall` 调用白名单 channel。
2. `screenshot-selector-preload.cts` 只暴露 `screenshotSelector`，且 channel 前缀校验为 `desktop:screenshot-selection:`。
3. `screenshot-selection-window.ts` 已按 `P14-RESP-003` 只保留截图窗口流程编排。
4. 截图窗口配置和 HTML 模板分别由 `screenshot-selection-window-options.ts`、`screenshot-selection-template.ts` 承接，不扩大 renderer 能力。

新增机械约束：

1. preload 暴露名仍限制为 `desktopApi` 和 `screenshotSelector`。
2. renderer 直接调用 `desktopApi` 的文件被固定在当前白名单，新增私有能力入口会触发架构边界测试。

---

## 8. P14/P15/P16 后续任务

| 任务 | 目标 | 状态 |
| --- | --- | --- |
| P14-RESP-001 | 拆 Gateway payload / IM read/message helper 的职责边界，保留原导出兼容。 | 已完成 |
| P14-RESP-002 | 拆客服 cache adapter 的 thread/message/diagnostics helper，保留原导出兼容。 | 已完成 |
| P14-RESP-003 | 拆截图窗口配置和 HTML 模板，不改变 IPC/preload contract。 | 已完成 |
| P14-RESP-004 | 评估 API DTO 类型按领域拆分或登记长期例外。 | 已完成 |
| P15-GUARD-001 | 将职责回流规则接入 `architecture-boundaries.spec.ts`。 | 已完成 |
| P15-GUARD-002 | 将职责例外清单接入结构测试，例外必须有 owner、保留理由、触发条件和验证命令。 | 已完成 |
| P16-RELEASE-001 | Mac 本地发布前验证闭环。 | 已完成 |
| P16-WIN-001 | Windows 实机安装包、运行时、性能采样验证。 | 待处理 |

---

## 9. 职责例外清单

以下文件超过 data/main 审查阈值，但当前结论是不按行数强拆。后续若触发条件出现，才创建最小职责迁移任务。

P18-DATA-001 复审结果：2026-05-30 再次执行 `npm run p12:audit`，CSS 大文件和 700 行以上组件仍为 `none`；data/main 观察项为以下 5 个文件，均保持 owner 单一或入口稳定，继续登记例外，不为行数单独拆分。

| 文件 | owner | 保留理由 | 触发条件 | 验证命令 |
| --- | --- | --- | --- | --- |
| `src/main/main.ts` | Electron main process owner | 主窗口、托盘、IPC、诊断和打包运行时入口仍集中在 main 进程；当前拆分会扩大 IPC owner 变更面。 | 新增独立 IPC 域、窗口域或文件系统策略超过 main 单一入口时，拆到 main runtime owner。 | `npm run check:quick`、`npx vitest run tests/unit/desktop-api-validation.spec.ts` |
| `src/renderer/data/customer-service/cs-cache-adapter.ts` | Customer service cache adapter owner | 客服 thread/message/query cache 合并入口稳定；ledger 已下沉到独立 owner，保留 adapter 作为 cache facade。 | 新增非 cache 规则、Gateway route 规则或 UI 展示规则时，不再写入本文件，迁到对应 owner。 | `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/customer-service-client.spec.ts` |
| `src/renderer/data/workspace-ui/workspace-ui-store.ts` | Workspace UI selector/action facade owner | workspace-ui 选择器和 action facade 是页面使用入口；底层 backing store 已隔离，保留 facade 避免页面直接触碰 store core。 | 新增持久化状态、跨 owner 状态或 facade 继续增长时，拆专用 selector/action owner。 | `npx vitest run tests/unit/workspace-ui-store.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| `src/renderer/data/api/types.ts` | API DTO / contract types | 647 行；DTO wire shape 聚合入口稳定，`api-client.ts` re-export facade 依赖面大；当前强拆会扩大 import churn。 | 新增领域 DTO 时优先落到领域 types；新增非 DTO 转换 helper 时下沉到对应 model；拆分必须保留 re-export facade。 | `npm run p12:audit`、`npm run check:quick`、`npm run docs:check` |
| `src/renderer/data/im-read-model.ts` | IM read domain model | 512 行；类型、reducer、view 派生和 identity helper 都属于 IM read 规则 owner。 | 新增 read 规则导致 reducer/view/identity 任一 owner 再增长时，拆 `im-read-types` / `im-read-reducer` / `im-read-view`。 | `npx vitest run tests/unit/im-read-service.spec.ts` |
| `src/renderer/data/api/customer-service-client.ts` | 客服 API client owner | 508 行；request、response normalize 和错误模型仍围绕同一个客服 API client contract。 | response normalizer 继续增长或被非 client owner 复用时，抽 `customer-service-response-normalizers.ts`。 | `npx vitest run tests/unit/cs-action-service.spec.ts tests/unit/cs-thread-state.spec.ts` |
| `src/renderer/data/workspace-ui/workspace-store-core.ts` | workspace-ui backing store owner | 467 行；兼容 facade 与 UI store core 共存，删除旧核心 store 链路需要单独确认。 | 删除 facade、改持久化 key、改 store owner 或迁移 auth/settings/read/reminder 入口前单独确认。 | `npm run check:quick`、`npx vitest run tests/unit/architecture-boundaries.spec.ts` |
| `src/renderer/data/im-message-normalize.ts` | IM message normalize owner | 462 行；消息 body/type/parts/media/url/preview 均属于 normalize owner，入口稳定。 | 新增媒体规则、文本预览规则或 parts 规则导致 owner 分叉时，再抽专用 normalizer。 | `npx vitest run tests/unit/im-message-contract.spec.ts tests/unit/message-domain.spec.ts` |
| `src/renderer/data/api/messages-client.ts` | IM API client owner | Request, response normalization, and source diagnostics remain attached to the IM API contract entry for now. | If source diagnostics or response normalizers keep growing, move them to a dedicated diagnostics/normalizer owner instead of expanding this client. | `npx vitest run tests/unit/messages-client.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| `src/renderer/data/gateway/message-delivery-service.ts` | Gateway delivery coordination owner | Delivery guard, gap sync trigger, cache-write handoff, and message trace sampling remain one coordination entry across IM and customer-service transport delivery. | Do not add UI presentation, unread/read rules, send runtime rules, or API field compatibility here; if trace/cache-write coordination keeps growing, split `message-delivery-trace.ts`. | `npx vitest run tests/unit/message-delivery-service.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| `src/renderer/data/gateway/gateway-im-side-effects.ts` | Gateway IM side effects owner | Gateway IM event cache writes, local read-state reconciliation, peer receipt updates, and message reminders share one transaction boundary after event routing. | Do not add UI presentation, API DTO compatibility, send runtime, or customer-service thread rules here; if read reconciliation or reminder logic keeps growing, split dedicated IM read/reminder side-effect owners. | `npx vitest run tests/unit/gateway-im-side-effects.spec.ts tests/unit/im-read-service.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| `src/renderer/data/customer-service/cs-conversation-index.ts` | Customer service conversation scope index owner | Customer service conversation/thread scope index, tempSession bridge index, overlay unread, and workbench snapshot reconcile share one owner in M05; keep as exception for now instead of splitting by line count. | Do not add UI presentation, send runtime, or read visibility rules here; if index/reconcile keeps growing, split `cs-conversation-reconcile.ts`. | `npx vitest run tests/unit/customer-service-client.spec.ts tests/unit/customer-service-unread-ledger.spec.ts tests/unit/architecture-boundaries.spec.ts` |
