# PC 端代码职责治理规范

状态：有效

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

---

## 1. 治理目标

后续治理不以“单独降低文件大小”为目标，而以“职责边界清晰、修改路径稳定、核心 IM 行为可验证”为目标。

文件大小只作为预警信号：超过阈值后先判断职责是否混杂，再决定拆分、保留或登记例外。

PC 端代码还必须适合 AI 接手：文件不能太大导致上下文难以装入，也不能拆成大量无意义小文件导致阅读路径破碎。正确顺序是：

```text
职责清晰优先；
AI 上下文可读性第二；
文件数量克制第三；
功能稳定和测试可验证兜底。
```

核心原则：

1. 页面做装配。
2. hook/controller 做行为。
3. model 做规则。
4. data 做协议、缓存和状态 owner。
5. main/preload 做 Electron 能力和安全边界。
6. CSS 按 token/base/shell/feature/primitive owner 管理，避免跨 feature 污染。

---

## 2. 职责边界判断

判断一个文件是否健康，优先看四件事。

| 维度 | 判断问题 | 不健康信号 |
| --- | --- | --- |
| 变化原因 | 这个文件是否只因一种需求变化而改。 | 改消息发送、已读、媒体预览、右键菜单、缓存合并都会碰同一文件。 |
| owner | 文件所属业务 owner 是否明确。 | IM、客服、联系人、设置、媒体、网关、主进程能力混在一起。 |
| 层级 | 文件是否只做当前层该做的事。 | UI 解释 raw DTO；model 依赖 React；data 依赖组件；main IPC 泄漏到业务组件。 |
| 接口稳定 | 对外入口、DTO、query key、IPC contract 是否稳定。 | 拆分时顺手改 wire shape、缓存 key、IPC payload 或公共 props。 |

如果一个文件超过阈值但四项都清晰，可以保留并登记例外；如果文件不大但职责混杂，也必须治理。

---

## 3. 文件角色分层

| 文件角色 | 可以做 | 不允许 |
| --- | --- | --- |
| 页面文件 | 页面装配、布局、hook 连接、局部 UI 状态。 | 写发送、已读、权限、缓存合并、协议字段兼容。 |
| 组件文件 | 展示、用户交互、事件抛出、无障碍状态。 | 直接请求 API、直接改 React Query 缓存、解释 raw DTO。 |
| hook/controller | 异步行为、命令编排、mutation、副作用隔离。 | 渲染复杂 JSX、承载协议 DTO 兼容规则。 |
| model | 纯规则、状态派生、格式化前的数据判断。 | 调 React、Zustand、React Query、window、desktopApi。 |
| data/api | DTO、client、contract、错误模型。 | 决定 UI 展示规则、拼页面文案。 |
| data/cache/store | 状态 owner、缓存更新、持久化和迁移。 | 直接依赖页面组件或 UI class。 |
| main/preload | Electron 能力、安全校验、受控 IPC 边界。 | 暴露任意 Node 能力，把业务状态机写进 main。 |
| CSS owner | 当前功能 owner 的布局/视觉/状态样式。 | 把跨模块大段样式塞回全局文件。 |

---

## 4. 文件大小审查规则

文件大小不是验收目标，只是触发审查的硬信号。

| 类型 | 理想范围 | 审查线 | 处理方式 |
| --- | ---: | ---: | --- |
| 页面文件 | 200-450 行 | 600 行 | 页面只做装配；超过后优先迁出 query、mutation、复杂 UI 状态。 |
| 业务组件 | 120-350 行 | 500 行 | 只做展示和交互事件抛出；超过后检查是否混入业务规则。 |
| hook/controller | 120-300 行 | 400 行 | 行为编排可以稍长；超过后检查是否混入纯规则或协议解析。 |
| model/domain | 150-400 行 | 500 行 | 纯规则集合可偏大；超过后按规则域拆。 |
| data/api/cache | 200-450 行 | 550 行 | 协议和 cache owner 可偏大；超过后按 DTO、normalizer、cache action 拆。 |
| main/preload/runtime | 150-400 行 | 500 行 | 系统能力边界要集中但可测；超过后抽 validation、template、window options。 |
| CSS | 300-1200 行 | 1600 行 | 按 token/base/shell/feature/primitive owner 判断；不按行数机械拆。 |
| 纯类型/配置表 | 可偏大 | 700 行 | 允许例外，但必须 owner 单一、无副作用、导出稳定。 |

软信号优先级高于行数：

1. import 来源横跨多个领域。
2. state 数量过多且属于不同业务 owner。
3. switch/if 分支跨多个业务规则。
4. 测试很难定位到单一 owner。
5. 一次需求改动需要同时理解 API、cache、UI、Electron 或 Gateway。

必须拆分的信号：

1. 文件超过审查线，并且职责混杂。
2. AI 或工程师必须滚动很久才能找到修改点。
3. 一个文件同时处理 UI、协议、cache、副作用、平台能力。
4. 删除一个功能时无法判断哪些代码可删。
5. 修改一个功能需要理解多个无关分支。

不需要拆分的信号：

1. 文件偏大但 owner 单一、导出稳定、测试明确。
2. 属于纯类型、配置表、协议聚合、完整 feature 样式。
3. 拆分后只是增加跳转，没有降低复杂度。
4. 强相关逻辑拆散后反而更难读。

需要合并或停止继续拆分的信号：

1. 小文件只是包装一个函数，且没有稳定 owner 或边界价值。
2. facade 隐藏真实 owner，导致 AI 不知道该读哪里。
3. 同一行为被拆成太多微文件，理解一个流程需要频繁跳转。
4. 文件存在只是历史迁移残留。

---

## 5. 单任务职责审查清单

每个后续治理任务开始前，必须先记录以下信息。

```text
任务编号：
文件 owner：
当前文件角色：
当前保留职责：
当前混入的非 owner 职责：
准备迁出的职责：
稳定入口或 re-export：
是否改变 API DTO/wire shape：
是否改变 React Query query key：
是否改变 Zustand/store owner：
是否改变 Gateway 事件边界：
是否改变 Electron IPC/preload 边界：
是否新增依赖：
是否删除核心旧链路：
是否需要负责人确认：
验证命令：
例外登记：
```

执行要求：

1. 只抽一个清晰 owner，不混合多个目标。
2. 保留原入口或 re-export facade，降低 import 改动范围。
3. 同步补验证记录，说明“为什么拆、拆到哪里、什么没改”。
4. 涉及核心 IM、客服缓存或 Electron 边界时必须跑专项测试。

---

## 6. 例外机制

超过阈值但职责单一的文件可以保留，但必须登记。

例外登记模板：

```text
文件：
当前行数：
owner：
文件角色：
保留理由：
无业务副作用证据：
稳定入口：
验证命令：
后续触发条件：
```

允许例外的典型情况：

1. 纯 DTO 聚合或协议类型集合。
2. 稳定协议映射表。
3. 安全边界集中管理文件。
4. 配置表或静态字典。

不允许作为例外的情况：

1. 页面同时承载业务规则和展示。
2. UI 直接解释 raw DTO 或直接改缓存。
3. main/preload 暴露过宽能力。
4. 文件变大是因为无 owner 的临时代码堆积。

---

## 7. 当前优先级

职责混杂优先级高于行数。

| 优先级 | 关注点 | 示例 |
| --- | --- | --- |
| P0 | 核心 IM 职责混杂 | 消息发送、已读、媒体、菜单、缓存、Gateway 事件。 |
| P1 | 客服工作台缓存和状态合并 | thread/message/queue cache adapter、客服动作权限。 |
| P1 | Electron 安全边界 | main/preload、IPC payload、文件/截图/通知能力。 |
| P2 | 偏大的类型、配置、样式文件 | DTO 聚合、normalize helper、CSS owner。 |

---

## 8. 验证命令

默认验证：

```bash
npm run p12:audit
npm run p10:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

核心 IM 相关变更额外执行：

```bash
npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-read-service.spec.ts tests/unit/send-queue.spec.ts
```

客服缓存相关变更额外执行：

```bash
npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
```

Electron/main/preload 相关变更额外执行：

```bash
npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```

---

## 9. 验收口径

一次职责治理任务完成时，必须满足：

1. 职责审查清单已填写。
2. 迁出职责有明确 owner。
3. 原入口、wire shape、query key、IPC/Gateway 边界未被隐式改变。
4. 验证记录可查。
5. 必要测试通过。
6. 如保留大文件，例外登记完整。
