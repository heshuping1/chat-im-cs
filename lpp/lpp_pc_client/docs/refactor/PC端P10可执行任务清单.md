# PC 端 P10 可执行任务清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 执行入口

新会话继续 P10 时，直接按这个顺序读：

1. `AGENTS.md`
2. `docs/refactor/README.md`
3. `docs/refactor/PC端重构后收尾治理计划.md`
4. 本文件
5. 当前任务涉及的代码和验证记录

启动指令建议：

```text
按照 lpp/lpp_pc_client/AGENTS.md 和 docs/refactor/PC端P10可执行任务清单.md 继续 P10。
Windows 实机验证先跳过。按任务清单顺序，从最高优先级待处理任务开始。
无需确认的直接执行；涉及新增依赖、技术替换、安全边界、删除核心旧链路、扩大公共抽象时再确认。
完成后更新本清单、任务矩阵和验证记录。
```

## 2. 排序规则

本清单按以下优先级执行：

1. 启动和白屏稳定性
2. 大文件优化
3. 功能复用和机械约束
4. 优先清理无用代码
5. 其他发布和 Windows 验证

如果同一优先级内有多个任务，优先做风险更小、验证更快、收益更明确的任务。

## 3. 通用完成标准

每个任务完成后至少执行：

```bash
npm run check:quick
npm run p10:audit
npm run docs:check
git diff --check
```

涉及核心模型、diagnostics、Gateway、API、IM、客服、Electron 边界时追加：

```bash
npm run test:coverage:core
```

每个任务必须产出：

1. 代码变更或明确的保留理由。
2. `docs/refactor/validation/P10-...md` 验证记录。
3. 更新 `docs/refactor/PC端重构任务矩阵.md`。
4. 如影响本清单，更新本文件状态和下一步。

## 3.1 单任务执行命令模板

每个任务开始前先在 `lpp/lpp_pc_client` 目录执行：

```bash
pwd
git status --short
```

如果任务涉及已修改文件，先查看用户或前序 agent 的改动，不覆盖无关变更：

```bash
git diff -- <任务涉及文件>
```

任务完成后按任务自己的“执行命令说明”运行专项命令，再运行第 3 节通用命令。验证记录必须写明每条命令的结果；未执行的命令必须写明原因。

---

## 3.2 启动稳定性任务

### P10-STABILITY-001：PC 端白屏可见化和首屏兜底

状态：已完成

优先级：P0

目标：PC 端启动后不能出现无内容白屏；渲染异常必须显示可见错误并写入现有 runtime diagnostics，异常模块值必须回落到稳定首屏。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 新增 | `src/renderer/components/AppErrorBoundary.tsx` |
| 修改 | `src/renderer/App.tsx` |
| 修改 | `src/renderer/styles/app.css` |
| 验证 | `docs/refactor/validation/P10-STABILITY-001-renderer-startup-2026-05-30.md` |

执行命令说明：

```bash
rg -n "AppErrorBoundary|ActiveModulePage|normalizeActiveModule|app-error-fallback" src/renderer/App.tsx src/renderer/components/AppErrorBoundary.tsx src/renderer/styles/app.css
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/runtime-error-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts
npm run check:quick
npm run build
npm run p10:audit
npm run docs:check
git diff --check
npm run dev
```

验收：

1. React render/lazy/module 异常不再导致无提示白屏。
2. Error Boundary 复用 `runtime-error-diagnostics`，诊断包可继续收集渲染错误。
3. 非法 `activeModule` 运行期值自动回退到 `messages`。
4. Mac 开发态 Vite + Electron 能启动；Windows 实机验证仍归 `P10-OTHER-002`。

执行记录：

- 2026-05-30：已新增顶层 `AppErrorBoundary`、首屏模块 switch 和模块值兜底；`npm run check:quick` 通过，开发态已启动到 `http://127.0.0.1:5173/`，见验证记录。

---

## 4. 大文件优化任务

### P10-LARGE-001：拆分 main 进程截图选择窗口

状态：已完成

优先级：P0

目标：把 `src/main/main.ts` 中截图选择窗口创建、动态 channel、ready/cancel/resolve 逻辑迁出，降低 main 进程临界体积，并让截图安全边界更清晰。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 拆出 | `src/main/screenshot-selection-window.ts` |
| 修改 | `src/main/main.ts` |
| 复用 | `src/preload/screenshot-selector-preload.cts` |
| 验证 | `docs/refactor/validation/P10-LARGE-001-main-screenshot-window-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "selectScreenshotRegion|desktop:screenshot-selection|screenshot-selector-preload|BrowserWindow" src/main/main.ts src/preload/screenshot-selector-preload.cts
sed -n '300,430p' src/main/main.ts
wc -l src/main/main.ts
npm run check:quick
npm run build
```

执行步骤：

1. 从 `main.ts` 找到 `selectScreenshotRegion` 和截图 overlay `BrowserWindow` 相关逻辑。
2. 新建 `src/main/screenshot-selection-window.ts`，导出 `selectScreenshotRegion(payload)`。
3. 保持 channel 命名、preload 路径、`contextIsolation: true`、`nodeIntegration: false`、`sandbox: false` 行为不变。
4. `main.ts` 只保留截图调用编排，不再包含 overlay 细节。
5. 不改变截图业务行为，不新增依赖。

验收：

```bash
npm run check:quick
npm run build
```

完成标准：

1. `main.ts` 行数低于 850。
2. 截图窗口配置仍可在新模块集中审查。
3. 文档记录 Mac 未实机截图或已实机截图结果。

完成记录：

- 2026-05-30：已迁出到 `src/main/screenshot-selection-window.ts`，`main.ts` 降至 395 行；Mac/Windows 实机截图先跳过，见 `validation/P10-LARGE-001-main-screenshot-window-2026-05-30.md`。

### P10-LARGE-002：拆分 main 进程桌面通知能力

状态：已完成

优先级：P1

目标：把 Electron `Notification` 创建、点击回调、窗口聚焦和通知 payload 处理迁出 `main.ts`。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 拆出 | `src/main/desktop-notification.ts` |
| 修改 | `src/main/main.ts` |
| 验证 | `docs/refactor/validation/P10-LARGE-002-main-notification-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "Notification|notify|desktop:notification-clicked|show\\(|focus\\(" src/main/main.ts src/main
sed -n '1,180p' src/main/main.ts
wc -l src/main/main.ts
npm run check:quick
npm run build
```

执行步骤：

1. 找到 `Notification` import 和 `notify` handler 逻辑。
2. 新模块只负责 `showDesktopNotification({ mainWindow, payload })`。
3. 保留 `Notification.isSupported()`、点击聚焦、`desktop:notification-clicked` 行为。
4. `main.ts` handler 调用新模块，不直接创建通知。

验收：

```bash
npm run check:quick
npm run build
```

完成标准：

1. 通知逻辑 owner 清晰。
2. main 文件继续下降。
3. 不新增业务页面通知实现。

### P10-LARGE-003：拆分 main 进程文件/媒体 IPC handler

状态：已完成

优先级：P1

目标：把文件打开、媒体缓存、复制、另存、显示位置等 desktop IPC handler 从 `main.ts` 迁出到独立模块。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 拆出 | `src/main/desktop-file-handlers.ts` |
| 修改 | `src/main/main.ts` |
| 复用 | `src/main/media-storage.ts` |
| 复用 | `src/shared/desktop-api-validation.ts` |
| 验证 | `docs/refactor/validation/P10-LARGE-003-main-file-handlers-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "openFile|openMediaFile|copyMediaFile|saveMediaAs|revealMediaInFolder|cacheMediaFile|copyFilePath|openDownloadedFile|saveFile" src/main/main.ts src/main/media-storage.ts src/shared/desktop-api-validation.ts
sed -n '120,320p' src/main/main.ts
rg -n "assertAllowedLocalMediaFilePath|ensureLocalMediaFile|handleDesktopIpc" src/main src/shared
wc -l src/main/main.ts
npm run check:quick
npm run build
npm run test:coverage:core
```

执行步骤：

1. 盘点 `openFile`、`openMediaFile`、`copyMediaFile`、`saveMediaAs`、`revealMediaInFolder`、`cacheMediaFile` 等 handler。
2. 抽出注册函数 `registerDesktopFileHandlers(register)`，通过现有 `handleDesktopIpc` 注册。
3. 保持所有 path policy 和 allowed userData cache 策略不变。
4. 不改变 shared desktop API 类型。

验收：

```bash
npm run check:quick
npm run build
npm run test:coverage:core
```

完成标准：

1. `main.ts` 只负责 app/window/bootstrap 和 handler 注册。
2. 文件路径策略仍集中可查。
3. 诊断记录说明 Windows 文件动作仍待实机验证。

### P10-LARGE-004：MePage 设置页继续拆分

状态：已完成

优先级：P1

目标：降低 `src/renderer/components/MePage.tsx` 体积，把诊断、账号安全、聊天记录工具等低耦合区块拆成子组件。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 拆出 | `src/renderer/settings/components/DiagnosticsSettingsSection.tsx` |
| 拆出 | `src/renderer/settings/components/AccountSecuritySection.tsx` |
| 拆出 | `src/renderer/settings/components/ChatArchiveSection.tsx` |
| 修改 | `src/renderer/components/MePage.tsx` |
| 验证 | `docs/refactor/validation/P10-LARGE-004-me-page-sections-YYYY-MM-DD.md` |

执行命令说明：

```bash
wc -l src/renderer/components/MePage.tsx
rg -n "diagnostic|Diagnostics|security|Security|archive|Archive|chat record|聊天|账号|安全" src/renderer/components/MePage.tsx src/renderer/settings
sed -n '1,260p' src/renderer/components/MePage.tsx
npm run check:quick
npm run build
npm run p10:audit
```

执行步骤：

1. 只搬 JSX 和局部 props，不改变设置行为。
2. 子组件不直接访问 backing store；由 `MePage` 或 settings owner 传入 props/actions。
3. 保留 diagnostics 导出入口行为。
4. 不做 UI 重设计。

验收：

```bash
npm run check:quick
npm run build
```

完成标准：

1. `MePage.tsx` 低于 800 行。
2. settings 子组件边界清晰。
3. `p10:audit` 大文件列表减少。

### P10-LARGE-005：MessageBodyView 媒体渲染拆分

状态：已完成

优先级：P1

目标：把 `MessageBodyView.tsx` 中图片、视频、文件、联系人卡片、未知消息渲染拆成 message content 子组件，降低媒体动作重复风险。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 拆出 | `src/renderer/messages/components/message-content/ImageMessageContent.tsx` |
| 拆出 | `src/renderer/messages/components/message-content/VideoMessageContent.tsx` |
| 拆出 | `src/renderer/messages/components/message-content/FileMessageContent.tsx` |
| 修改 | `src/renderer/components/MessageBodyView.tsx` |
| 验证 | `docs/refactor/validation/P10-LARGE-005-message-body-content-YYYY-MM-DD.md` |

执行命令说明：

```bash
wc -l src/renderer/components/MessageBodyView.tsx
rg -n "image|video|file|contact|unknown|desktopApi|normalizeMessageParts|poster|prefetch" src/renderer/components/MessageBodyView.tsx src/renderer/media src/renderer/messages
sed -n '1,260p' src/renderer/components/MessageBodyView.tsx
npm run check:quick
npm run test:coverage:core
npm run p10:audit
```

执行步骤：

1. 先拆纯 presentation，不改变 `normalizeMessageParts`。
2. 保持 `media/runtime` owner，不在子组件新增桌面 IPC wrapper。
3. 保持上传状态、poster、预取逻辑行为不变。
4. 如果拆分过大，先只拆文件消息和视频消息。

验收：

```bash
npm run check:quick
npm run test:coverage:core
```

完成标准：

1. `MessageBodyView.tsx` 低于 750 行。
2. `p10:audit` 不新增直接媒体 IPC 信号。

---

## 5. 功能复用和机械约束任务

### P10-REUSE-001：媒体动作 capability helper 收敛

状态：已完成

优先级：P0

目标：把 UI 中对 `window.desktopApi?.copyMediaFile/cacheMediaFile/openMediaFile` 的能力判断收敛到 helper，后续才能建立 hard gate。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 创建 | `src/renderer/messages/runtime/mediaActionCapabilities.ts` |
| 修改 | `src/renderer/customer-service/components/ServiceMessageContextMenu.tsx` |
| 修改 | `src/renderer/messages/components/MessageOverlayLayer.tsx` |
| 可能修改 | `src/renderer/components/MessageBodyView.tsx` |
| 测试 | `tests/unit/media-action-capabilities.spec.ts` |
| 验证 | `docs/refactor/validation/P10-REUSE-001-media-action-capabilities-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "copyMediaFile|cacheMediaFile|openMediaFile|saveMediaAs|revealMediaInFolder|editMediaFile|window\\.desktopApi" src/renderer/components/MessageBodyView.tsx src/renderer/customer-service/components/ServiceMessageContextMenu.tsx src/renderer/messages/components/MessageOverlayLayer.tsx src/renderer/messages/runtime tests/unit
npx vitest run tests/unit/media-action-capabilities.spec.ts
npm run check:quick
npm run p10:audit
```

执行步骤：

1. 新建 helper，导出 `getMediaActionCapabilities(desktopApi)`。
2. 返回 `canCopyMediaFile`、`canOpenMediaFile`、`canSaveMediaAs`、`canRevealInFolder` 等布尔值。
3. UI 只消费 capability，不直接拼 `window.desktopApi` 判断。
4. 补单测覆盖有/无 desktop API、只有 cache fallback 的情况。

验收：

```bash
npm run check:quick
npx vitest run tests/unit/media-action-capabilities.spec.ts
```

完成标准：

1. 菜单组件不直接写 `copyMediaFile || cacheMediaFile`。
2. 为后续 hard gate 提供稳定 owner。

### P10-REUSE-002：桌面媒体 IPC 直接调用 hard gate

状态：已完成

优先级：P1

目标：在 `architecture-boundaries` 中禁止 UI/feature presentation 直接调用桌面媒体 IPC，允许 runtime/helper owner。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 修改 | `tests/unit/architecture-boundaries.spec.ts` |
| 修改 | `docs/refactor/PC端公共能力复用与技术选型约束.md` |
| 验证 | `docs/refactor/validation/P10-REUSE-002-media-ipc-boundary-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "copyMediaFile|cacheMediaFile|openMediaFile|saveMediaAs|revealMediaInFolder|editMediaFile|window\\.desktopApi" src/renderer tests/unit/architecture-boundaries.spec.ts docs/refactor/PC端公共能力复用与技术选型约束.md
npx vitest run tests/unit/architecture-boundaries.spec.ts
npm run check:quick
npm run p10:audit
```

执行步骤：

1. 等 P10-REUSE-001 完成后再执行。
2. 在测试中扫描 `window.desktopApi?.(copyMediaFile|saveMediaAs|openMediaFile|revealMediaInFolder|editMediaFile|cacheMediaFile)`。
3. allowlist 仅允许 `media/runtime/*`、`messages/runtime/*`、capability helper 和必要 main/preload 类型。
4. 确保 `npm run check:quick` 通过。

验收：

```bash
npm run check:quick
```

完成标准：

1. 新增媒体能力不会回填页面组件。
2. `p10:audit` 对媒体动作信号显著减少或只剩 allowlist owner。

### P10-REUSE-003：时间/日期格式化重复实现边界

状态：已完成

优先级：P2

目标：禁止页面直接做展示型 `new Date(...).toLocale*` 格式化，统一走 `src/renderer/lib/format.ts` 或 domain model。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 修改 | `scripts/report-p10-code-health.mjs` |
| 可能修改 | `tests/unit/architecture-boundaries.spec.ts` |
| 验证 | `docs/refactor/validation/P10-REUSE-003-date-format-boundary-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "new Date\\(|toLocale(Date|Time|String)|Intl\\.DateTimeFormat" src/renderer scripts/report-p10-code-health.mjs tests/unit/architecture-boundaries.spec.ts
npm run p10:audit
npm run check:quick
```

执行步骤：

1. 先让 `p10:audit` 报告页面层 `new Date(` 和 `.toLocale`。
2. 人工区分排序/时间计算和展示格式化。
3. 高置信后再升级 hard gate。

验收：

```bash
npm run p10:audit
npm run check:quick
```

完成标准：

1. 展示型时间格式化 owner 可查。
2. 页面新增时间展示优先复用 helper。

---

## 6. 优先清理无用代码任务

### P10-CLEAN-002：确认 MessageComposer 是否仍为生产入口

状态：已完成

优先级：P0

目标：判断 `MessageComposer.tsx` 是否仍被生产路径使用；若是，建立保留理由和瘦身任务；若否，删除旧 composer。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 检查 | `src/renderer/components/MessageComposer.tsx` |
| 检查 | `src/renderer/components/LexicalChatInput.tsx` |
| 检查 | `src/renderer/messages/components/MessageComposerSurface.tsx` |
| 验证 | `docs/refactor/validation/P10-CLEAN-002-message-composer-entry-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "MessageComposer|LexicalChatInput|MessageComposerSurface" src tests
rg -n "from ['\\\"].*(MessageComposer|LexicalChatInput|MessageComposerSurface)" src tests
wc -l src/renderer/components/MessageComposer.tsx src/renderer/components/LexicalChatInput.tsx src/renderer/messages/components/MessageComposerSurface.tsx
npm run check:quick
npm run p10:audit
```

执行步骤：

1. 运行 `rg -n "MessageComposer|LexicalChatInput|MessageComposerSurface" src tests`。
2. 绘制当前 composer 入口关系。
3. 如果 `MessageComposer.tsx` 无生产引用，删除文件和相关样式/测试引用。
4. 如果仍有生产引用，记录 owner 和后续拆分任务。

验收：

```bash
npm run check:quick
npm run p10:audit
```

完成标准：

1. 不再存在“旧 composer 是否还在用”的疑问。
2. 如果删除，`p10:audit` 大文件列表减少。

### P10-CLEAN-003：处理 im-command-executor 测试孤儿

状态：已完成

优先级：P1

目标：判断 `src/renderer/data/im-command-executor.ts` 是否只是旧测试兼容入口；如是，迁移测试到真实 owner 后删除。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 检查 | `src/renderer/data/im-command-executor.ts` |
| 修改 | `tests/unit/im-core.spec.ts` |
| 可能删除 | `src/renderer/data/im-command-executor.ts` |
| 验证 | `docs/refactor/validation/P10-CLEAN-003-im-command-executor-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "im-command-executor|markConversationRead|read model|readModel|unread" src/renderer/data tests/unit/im-core.spec.ts tests/unit
sed -n '1,220p' tests/unit/im-core.spec.ts
sed -n '1,220p' src/renderer/data/im-command-executor.ts
npx vitest run tests/unit/im-core.spec.ts
npm run check:quick
npm run p10:audit
```

执行步骤：

1. 查看 `tests/unit/im-core.spec.ts` 中引用的函数和行为。
2. 若只是代理 `im-read-model`，把测试 import 改到真实 owner。
3. 删除 `im-command-executor.ts`。
4. 保持测试行为不变。

验收：

```bash
npx vitest run tests/unit/im-core.spec.ts
npm run check:quick
npm run p10:audit
```

完成标准：

1. `p10:audit` orphan-source-candidates 不再出现 `im-command-executor.ts`。

### P10-CLEAN-004：让 perf:samples 复用 performance-samples 模型或记录保留理由

状态：已完成

优先级：P2

目标：解决 `scripts/report-performance-samples.mjs` 和 `src/renderer/data/performance/performance-samples.ts` 的重复统计逻辑。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 检查 | `scripts/report-performance-samples.mjs` |
| 检查 | `src/renderer/data/performance/performance-samples.ts` |
| 可能修改 | `scripts/report-performance-samples.mjs` |
| 验证 | `docs/refactor/validation/P10-CLEAN-004-performance-samples-reuse-YYYY-MM-DD.md` |

执行命令说明：

```bash
rg -n "performance sample|durationMs|p50|p75|p95|percentile|perf:samples" scripts/report-performance-samples.mjs src/renderer/data/performance tests/unit/performance-samples.spec.ts package.json
sed -n '1,260p' scripts/report-performance-samples.mjs
sed -n '1,240p' src/renderer/data/performance/performance-samples.ts
npm run perf:samples -- <临时 diagnostics.json>
npx vitest run tests/unit/performance-samples.spec.ts
npm run check:quick
```

执行步骤：

1. 判断 Node CLI 是否能直接复用 TS 模型。
2. 若不能无新增依赖复用，记录 Node-only 保留理由。
3. 若能复用，抽共享纯 JS/TS module，保持现有 CSV 输出。
4. 补或更新 `tests/unit/performance-samples.spec.ts`。

验收：

```bash
npm run perf:samples -- <临时 diagnostics.json>
npx vitest run tests/unit/performance-samples.spec.ts
npm run check:quick
```

完成标准：

1. 重复逻辑被消除或有明确保留理由。

---

## 7. 其他任务

### P10-OTHER-001：CSS owner 清单和 app.css 迁移队列

状态：已完成

优先级：P1

目标：`app.css` 仍有 12597 行，需要建立 selector owner 清单和迁移队列，避免继续膨胀。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 创建 | `docs/refactor/PC端CSSOwner清单.md` |
| 检查 | `src/renderer/styles/app.css` |
| 检查 | `src/renderer/styles/messages/message-center.css` |
| 验证 | `docs/refactor/validation/P10-OTHER-001-css-owner-inventory-YYYY-MM-DD.md` |

执行命令说明：

```bash
wc -l src/renderer/styles/app.css src/renderer/styles/messages/message-center.css
rg -n "^/\\*|^\\.([a-zA-Z0-9_-]+)|message-|cs-|customer-|settings-|contact-|account-|workbench-|sidebar-|panel-" src/renderer/styles/app.css src/renderer/styles/messages/message-center.css
npm run p10:audit
npm run docs:check
```

执行步骤：

1. 按注释/selector 前缀将 `app.css` 分组。
2. 标记 owner：shared、messages、customer-service、settings、contacts、account、legacy。
3. 选出第一批可迁移 CSS，不直接大搬。
4. 后续每批迁移都必须视觉 smoke。

验收：

```bash
npm run p10:audit
npm run docs:check
```

完成标准：

1. CSS 迁移不靠猜，有 owner 清单。

### P10-OTHER-002：Windows 实机验证

状态：待处理

优先级：Windows 环境可用后 P0

目标：最终用户是 Windows PC 端，必须补 Windows dist、运行和性能采样证据。

文件范围：

| 类型 | 路径 |
| --- | --- |
| 参考 | `docs/refactor/PC端核心路径Smoke清单.md` |
| 参考 | `docs/refactor/PC端发布检查清单.md` |
| 验证 | `docs/refactor/validation/P10-WIN-001-windows-verification-YYYY-MM-DD.md` |

执行命令说明：

```bash
npm install
npm run check:quick
npm run build
npm run dist:win
npm run perf:samples -- <diagnostics.json>
```

实机 smoke 必须按 `docs/refactor/PC端核心路径Smoke清单.md` 和 `docs/refactor/PC端发布检查清单.md` 逐项记录。非 Windows 环境不要伪造结果，只把任务保持待处理并记录无法执行原因。

验收：

```bash
npm install
npm run check:quick
npm run build
npm run dist:win
npm run perf:samples -- <diagnostics.json>
```

完成标准：

1. Windows 安装包可构建、可安装、可启动。
2. 托盘、截图、文件打开、视频预览、safeStorage、diagnostics 通过 smoke。
3. 回填 P75/P95。

## 8. 当前推荐执行顺序

1. P10-STABILITY-001
2. P10-LARGE-001
3. P10-LARGE-002
4. P10-LARGE-003
5. P10-REUSE-001
6. P10-REUSE-002
7. P10-CLEAN-002
8. P10-CLEAN-003
9. P10-OTHER-001
10. P10-LARGE-004
11. P10-LARGE-005
12. P10-CLEAN-004
13. P10-REUSE-003
14. P10-OTHER-002

执行过程中如果发现任务过大，先拆出子任务并更新本文件，不直接扩大改动范围。
