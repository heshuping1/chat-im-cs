# PC 端质量、安全、性能与诊断参考

状态：冷参考

来源：从 `PC端核心架构技术方案.md` 拆出，供 L2/L3 的测试、性能、安全、诊断和验收任务按需读取。

适用范围：性能预算、测试矩阵、Electron 安全威胁、诊断与 Definition of Done。

---

## 12. 性能方案

### 12.1 必须优化的场景

| 场景 | 风险 | 方案 |
| --- | --- | --- |
| 单会话 1000/10000 消息 | 全量 DOM 渲染卡顿。 | 虚拟列表。 |
| 多图片/视频聊天 | 解码、缓存、网络并发过高。 | 懒加载、预取限流、本地缓存。 |
| 会话列表 500/2000 项 | 排序/筛选重算和 DOM 过多。 | memoized selector + virtualization。 |
| 客服队列高频刷新 | 轮询和 Gateway 重复 invalidation。 | 事件合并、cache adapter 精准更新。 |
| CSS 单文件过大 | 样式串扰和维护困难。 | feature CSS 分割、设计 token。 |
| Vite chunk 不受控 | 首屏 bundle 过大。 | manualChunks + bundle analyzer。 |

### 12.2 消息虚拟列表

目标：

- `ChatTimeline` 使用虚拟列表。
- 支持新消息追加到底部。
- 支持跳转未读/搜索结果。
- 支持图片加载后高度变化。
- 支持粘底策略。

推荐库：`@tanstack/react-virtual`。

迁移顺序：

1. 先抽 `ChatTimeline`，保持普通 map 渲染。
2. 加入稳定 row key 和估算高度。
3. 开启 virtualization。
4. 加搜索跳转和新消息跳转适配。

### 12.3 网络与缓存

原则：

- Gateway 能精确更新就不全量 invalidation。
- mutation 成功后优先局部合并，再按需后台 refetch。
- 高频查询设置合理 `staleTime` 和 `refetchInterval`。
- 当前窗口不可见时降低轮询频率。

### 12.4 Bundle 策略

建议 Vite 配置：

- React 基础包独立 chunk。
- Lexical 编辑器独立 chunk。
- SignalR 独立 chunk。
- 二维码、AI、知识库、数据中心等低频模块 lazy chunk。
- 增加 bundle 分析脚本。

---

---

## 13. 工程质量方案

### 13.1 必备脚本

`package.json` 应补齐：

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:coverage": "vitest run tests/unit --coverage",
    "audit": "npm audit --audit-level=moderate",
    "analyze": "vite build --mode analyze"
  }
}
```

实际引入 ESLint、Prettier、coverage 和 analyzer 时，应单独提交，避免和业务重构混在一起。

### 13.2 测试分层

| 测试类型 | 覆盖对象 | 示例 |
| --- | --- | --- |
| Unit | domain reducer、adapter、normalize、selectors。 | read model、customer service core、media state。 |
| Integration | application service + cache adapter。 | Gateway event 更新 query cache。 |
| Browser E2E | 关键用户路径。 | 登录后消息、发送、未读、客服接入。 |
| Electron E2E/人工 | 桌面能力。 | 文件打开、系统通知、托盘、截图。 |
| Contract | API 字段和错误码。 | Gateway payload、thread detail、message body。 |

### 13.3 重构验收规则

每个重构切片必须满足：

1. 行为不变或变更明确记录。
2. 有新增或调整的单元测试。
3. 相关 browser test 通过。
4. 不引入无关功能。
5. 不扩大组件职责。
6. 不把服务端缺口用前端假逻辑掩盖。

### 13.4 代码审查红线

禁止合入：

- 新增 500 行以上页面组件且无拆分计划。
- 在组件中新增协议字段兼容逻辑。
- 在组件中直接 `setQueriesData` 写复杂业务合并。
- 在多个位置重复判断客服终态或接待动作。
- 在 renderer 直接写敏感 token 到 localStorage。
- 新增 Electron IPC 但无 payload 校验。
- Gateway 新事件只在 UI 里临时处理，无 adapter 测试。

---

---

## 17. 最终验收标准

PC 重构完成不是看目录是否漂亮，而是看以下结果：

1. `MessageCenter` 和 `ChatWorkspace` 退回页面装配职责。
2. `GatewayBridge` 只负责连接生命周期和事件分发装配。
3. 普通 IM 和在线客服都有独立 domain/application。
4. React Query cache 更新集中在 cache adapter。
5. Zustand 不再承载后端事实数据和复杂业务状态机。
6. Electron IPC 有类型和校验，危险能力不暴露给 renderer。
7. token 不再以长期明文方式保存在 renderer localStorage。
8. 消息列表支持大数据场景。
9. Gateway、消息发送、已读、客服状态机有稳定单测。
10. 后续新增功能能清楚落到某一层，而不是继续堆进大组件。

---

---

## 18. 审查清单

每次重构 PR 或 agent 任务完成后，用以下清单自查：

- 是否保持业务行为不变？
- 是否新增或更新测试？
- 是否把业务规则从 UI 下沉到 domain/application？
- 是否避免把普通 IM 和在线客服状态混用？
- 是否避免在组件里直接解析 Gateway 原始 payload？
- 是否避免在组件里直接写复杂 React Query cache merge？
- 是否按空间/token 维度隔离 query key 和本地缓存？
- 是否没有新增敏感信息落 localStorage、日志或诊断包？
- 是否没有新增无校验 IPC？
- 是否没有用假数据掩盖服务端缺口？
- 是否更新了对应文档？

---

---

## 24. 测试矩阵与验收门禁

### 24.1 必跑命令分层

| 场景 | 命令 | 什么时候跑 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | 每次代码改动。 |
| 单元测试 | `npm run test:unit` | domain/application/infrastructure 改动。 |
| 构建 | `npm run build` | 合并前、发布前。 |
| 浏览器 E2E | `npm run test:browser` 或定向 Playwright | UI、流程、缓存改动。 |
| Electron 人工/E2E | 启动 Electron dev 或打包态 | IPC、文件、通知、截图、托盘。 |
| 安全检查 | `npm audit`、IPC 清单审查 | 依赖或 Electron 能力改动。 |

### 24.2 核心链路测试矩阵

| 链路 | Unit | Integration | Browser | Electron/Manual |
| --- | --- | --- | --- | --- |
| 登录/空间 | session storage、token 域 | QueryClient clear | 登录进入主界面 | 安全存储 |
| 普通 IM 发送文本 | send use case | cache merge | UI 发送和回显 | 系统通知点击 |
| 普通 IM 发送媒体 | upload state | media + message send | 选择/粘贴/拖拽 | 文件选择、打开目录 |
| IM 已读未读 | read reducer | markRead command | 红点、跳转提示 | 双端真实确认 |
| Gateway 新消息 | adapter | cache update | mock push 后 UI 更新 | 真实 SignalR |
| 客服接入 | thread reducer | action API result | queued -> active | 多客服并发 |
| 客服关闭 | thread reducer | 终态 cache merge | 输入区只读 | 真实终态 |
| 诊断导出 | redaction unit | payload builder | 设置页导出 | 文件保存 |

### 24.3 发布阻断门禁

以下任一情况未关闭，不允许宣布 PC 核心链路完成：

- 普通 IM 误清未读。
- 当前用户自己发送消息产生未读。
- Gateway echo 造成重复消息。
- `temp_session` 出现在普通消息列表。
- 终态客服会话仍能发送。
- queued/AI 状态下输入区可发送。
- token 出现在诊断包、日志、URL 或 localStorage 长期持久化中。
- Renderer 可以打开任意本地路径。
- 1000 条消息滚动出现明显卡顿且无虚拟化方案。
- 服务端字段缺失被前端假数据掩盖。

---

---

## 25. 性能预算与压测方案

### 25.1 性能预算

以下是 PC 客户端重构后的目标预算。具体数值可在真实设备基线后调整，但必须有预算意识。

| 指标 | 目标 | 说明 |
| --- | --- | --- |
| 应用冷启动到登录页 | 2s 内 | 开发机和普通办公 Windows 设备。 |
| 登录后主界面可交互 | 3s 内 | 不等待所有低频模块加载。 |
| 会话列表首屏 | 1s 内 | 100 会话。 |
| 会话切换到首屏消息 | 1s 内 | 1000 历史消息中加载最后页。 |
| 消息发送本地回显 | 100ms 内 | 不含网络往返。 |
| 文本发送服务端确认 | 2s 内 | 正常网络。 |
| 图片/文件上传进度出现 | 300ms 内 | 选择文件后。 |
| 1000 条消息滚动 | 无明显掉帧 | 必须虚拟化或分段渲染。 |
| 500 会话筛选 | 300ms 内 | 输入防抖后。 |
| Renderer 初始 JS | 可解释并分包 | 不把低频模块全部进首屏。 |

### 25.2 数据规模

| 数据 | 中规模 | 大规模 | 压测重点 |
| --- | --- | --- | --- |
| 会话数 | 500 | 2000 | 筛选、排序、未读红点。 |
| 单会话消息 | 1000 | 10000 | 渲染、跳转、图片高度变化。 |
| 图片消息 | 200 | 1000 | 缓存、懒加载、内存。 |
| 客服队列 | 200 | 1000 | 刷新、提醒、筛选。 |
| 联系人/客户 | 1000 | 10000 | 搜索、分组、虚拟列表。 |

### 25.3 压测方法

1. 建立本地 mock 数据生成器或 Playwright route mock。
2. 用 browser performance API 记录：
   - first render
   - conversation switch
   - scroll FPS
   - memory snapshot
   - diagnostics 导出后使用 `npm run perf:samples -- <diagnostics.json>` 计算 P50/P75/P95。
3. Electron 打包态补人工压测：
   - 长时间在线 2 小时
   - 多会话切换 100 次
   - 图片/文件连续发送
   - Gateway 断线重连

### 25.4 性能红线

- 冷启动到首个可交互界面 P75 目标不超过 2500ms；超过预算必须进入 `window.__lppStartupDiagnostics` 并能随诊断包导出。
- renderer entry 预算目标不超过 800ms；超过预算优先检查首屏同步 chunk、阻塞初始化和主进程启动等待。
- 禁止在消息区一次性渲染 1000+ 复杂消息 DOM。
- 禁止搜索输入每个字符都触发重查询和重排序。
- 禁止 Gateway 高频事件每条都全量 invalidate 所有消息 query。
- 禁止图片预取无并发限制。
- 禁止低频模块进入首屏同步 chunk。

---

---

## 26. Electron 安全威胁模型

### 26.1 威胁清单

| 威胁 | 风险 | 防线 |
| --- | --- | --- |
| XSS 读取 token | 攻击者通过消息内容或富文本执行脚本。 | 不使用危险 HTML；token 不长期在 renderer；CSP。 |
| IPC 滥用 | Renderer 调用主进程打开任意文件或 URL。 | 白名单 API、payload 校验、路径限制。 |
| 任意文件打开 | 消息体携带本地路径诱导打开。 | 只允许受控缓存和用户选择路径。 |
| 媒体 URL SSRF/滥用 | 下载任意 URL 到本地。 | 协议、host、size、content-type 校验。 |
| token 泄露到日志 | 诊断包、错误日志含 Authorization。 | redaction 统一处理。 |
| 不安全外链 | 打开 `file:`、`javascript:` 等危险协议。 | 只允许 http/https/mailto/tel，必要时 host allowlist。 |
| 截图窗口 Node 暴露 | overlay 开启 nodeIntegration。 | 独立 preload，禁用 nodeIntegration。 |
| 依赖漏洞 | Electron/前端依赖存在已知 CVE。 | audit、定期升级、最小依赖。 |

### 26.2 安全设计要求

1. 所有 IPC handler 必须有：
   - channel 常量
   - TypeScript payload 类型
   - runtime validator
   - 错误脱敏
   - 测试或人工验证记录

2. 所有来自消息体的数据默认不可信：
   - URL 不可信
   - 文件名不可信
   - mimeType 不可信
   - markdown 文本不可信
   - profile/card 字段不可信

3. 所有日志默认脱敏：
   - `Authorization`
   - `token`
   - `refreshToken`
   - `password`
   - `captcha`
   - `cookie`
   - 手机号、邮箱按场景脱敏

### 26.3 安全验收

安全专项完成前必须确认：

- `BrowserWindow` 主窗口 `nodeIntegration=false`、`contextIsolation=true`。
- screenshot overlay 同样满足隔离要求。
- preload 不暴露 `ipcRenderer` 原始对象。
- renderer 不调用 Node API。
- 诊断导出包搜索不到 token。
- 外链打开函数拒绝危险协议。
- 媒体下载拒绝非 allowlist URL。

---

---

## 27. 诊断与可观测性方案

### 27.1 诊断目标

PC 客户端要能回答这些问题：

- 这条消息为什么没发出去？
- 这条消息为什么重复了？
- 这个会话为什么未读数不对？
- 客服为什么不能回复？
- Gateway 是否连上？是否重连过？
- 服务端返回了哪个 requestId？
- 当前用户、空间、会话、线程上下文是什么？

### 27.2 Trace 上下文

所有核心请求和事件应携带或关联：

```ts
interface PcTraceContext {
  sessionId: string;
  traceId: string;
  requestId?: string;
  apiBaseUrl: string;
  tenantId?: string;
  userId?: string;
  activeModule?: string;
  conversationId?: string;
  conversationType?: string;
  threadId?: string;
  threadType?: string;
}
```

### 27.3 Breadcrumbs

至少记录以下事件：

| 事件 | 字段 |
| --- | --- |
| `app.login_succeeded` | tenantId、userId |
| `gateway.connected` | connectionId 可选 |
| `gateway.reconnecting` | reason |
| `gateway.event_received` | eventName、domain |
| `message.send_started` | conversationId、localId、type |
| `message.send_succeeded` | messageId、requestId |
| `message.send_failed` | code、requestId |
| `im.mark_read_started` | conversationId、readSeq |
| `im.mark_read_failed` | code、requestId |
| `cs.thread_action_started` | threadId、action |
| `cs.thread_action_failed` | code、requestId |
| `desktop.ipc_failed` | channel、safeCode |

### 27.4 诊断包内容

诊断包应包含：

- app version
- platform
- sessionId
- traceId
- active module
- recent breadcrumbs
- recent safe errors
- recent API requestId
- Gateway connection state
- feature diagnostics

诊断包不包含：

- token
- refreshToken
- password
- captcha
- full Authorization header
- 原始大消息 body
- 未脱敏客户敏感字段

### 27.5 告警级别

| 级别 | 示例 | 处理 |
| --- | --- | --- |
| blocking | 关键字段缺失导致无法判断状态。 | UI 保守禁用写操作，提示刷新。 |
| error | API 写失败、Gateway 断线超过阈值。 | 用户可见错误 + 诊断。 |
| warning | 字段降级、旧快照覆盖被拒绝。 | 不打扰用户，记录诊断。 |
| info | 连接成功、普通 refetch。 | 仅开发/诊断记录。 |

---

---

## 28. Definition of Done

### 28.1 单个重构任务 DoD

一个重构任务完成必须满足：

1. 改动范围和阶段目标一致。
2. 没有混入无关功能。
3. 关键逻辑有单元测试。
4. 相关 UI 有 browser smoke 或人工验证说明。
5. `npm run typecheck` 通过。
6. 相关测试通过。
7. 没有新增安全红线。
8. 没有新增服务端假数据。
9. 文档或注释更新到位。
10. 遗留风险明确记录。

### 28.2 一个阶段 DoD

一个迁移阶段完成必须满足：

- 阶段目标文件完成迁移。
- 旧路径没有继续新增同类复杂逻辑。
- 测试矩阵中对应行通过。
- 代码审查清单无阻断项。
- 性能或安全相关阶段有专项验证记录。

### 28.3 整体 PC 架构重构 DoD

整体重构完成必须满足：

1. 普通 IM 主链路稳定：
   - 文本、图片、文件发送闭环。
   - local echo/server echo/Gateway echo 不重复。
   - 未读已读规则一致。
   - 当前会话、非当前会话、自己消息行为正确。

2. 在线客服主链路稳定：
   - queued/AI/active/closed 状态正确。
   - 接入、接管、关闭可测。
   - 终态只读。
   - 客服消息和客户上下文一致。

3. Gateway 主链路稳定：
   - adapter 覆盖主事件。
   - 断线重连可降级。
   - 强制退出安全清理。

4. 桌面能力安全：
   - IPC 有校验。
   - token 安全策略落地。
   - 截图、媒体、本地文件能力受控。

5. 工程可持续：
   - 新增功能能按 feature/layer 落位。
   - 巨型组件不再继续增长。
   - 质量脚本和测试成为合并门禁。
   - 文档和 ADR 记录重大决策。

### 28.4 不算完成的情况

以下情况不能宣称完成：

- 只是移动了文件，但业务规则仍在 UI 中。
- 只是增加了目录，但 Gateway 仍由组件直接处理。
- 只是 mock 通过，但真实 API/Gateway 链路未验证。
- 只是浏览器通过，但 Electron IPC/文件/通知未验证。
- 只是没有报错，但缺字段时靠前端假数据展示。
- 只是当前账号可用，但多账号、多空间、权限边界未验证。

---
