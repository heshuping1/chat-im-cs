# PC 端 P11 深度清理任务清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 目标

P11 的目标不是“大面积重写”，而是把 P10 后剩余的可维护性信号逐项清零或登记保留理由，让 PC 端保持干净、稳定、可继续演进。

完成定义：

1. 测试产物、构建产物不再进入 git 跟踪。
2. `p10:audit` 中每一类信号都有明确任务、owner、验证命令和保留理由。
3. 高置信废弃文件直接删除；中低置信项先补引用证据和验证记录，不做冒险删除。
4. 每批清理后 PC 端仍能 `check:quick`、`build`，开发态能启动。

## 2. 通用命令

每个 P11 任务开始前执行：

```bash
pwd
git status --short
npm run p10:audit
```

每个 P11 任务完成后执行：

```bash
npm run check:quick
npm run build
npm run p10:audit
npm run docs:check
git diff --check
```

如果涉及核心消息、客服、Gateway、Electron、diagnostics，追加：

```bash
npm run test:coverage:core
```

## 3. 任务清单

### P11-CLEAN-001：清理测试和构建产物跟踪

状态：已完成

优先级：P0

目标：删除已被 git 跟踪的 Playwright 报告和 test-results 状态文件，并把目录加入 `.gitignore`。

执行命令说明：

```bash
git ls-files playwright-report test-results dist
git check-ignore -v playwright-report test-results dist
npm run p10:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

验收：

1. `playwright-report/index.html` 和 `test-results/.last-run.json` 从仓库删除。
2. `.gitignore` 忽略 `playwright-report/`、`test-results/`。
3. `npm run p10:audit` 的 `tracked-generated-artifacts` 不再报告测试产物。

验证记录：`docs/refactor/validation/P11-CLEAN-001-generated-artifacts-2026-05-30.md`

### P11-LARGE-001：MessageCenter 剩余瘦身

状态：已完成

优先级：P1

目标：把 `MessageCenter.tsx` 低于 800 行，保持页面只负责装配。

执行命令说明：

```bash
wc -l src/renderer/components/MessageCenter.tsx
rg -n "useMessage|Message.*Panel|return \\(" src/renderer/components/MessageCenter.tsx src/renderer/messages
npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/message-conversation-list-model.spec.ts
npm run check:quick
```

验收：行数低于 800；不新增页面层 raw DTO 解释；消息核心单测通过。

执行记录：

- 2026-05-30：抽出 `MessageConversationSidebar`、`MessageComposerDock` 和 `messageComposerLayoutModel`，`MessageCenter.tsx` 降至 785 行；验证见 `docs/refactor/validation/P11-LARGE-001-message-center-slimming-2026-05-30.md`。

### P11-LARGE-002：MessageComposer / LexicalChatInput 职责拆分

状态：已完成

优先级：P1

目标：保留生产入口，继续拆出 toolbar、editor plugins、attachment adapter，让两个文件都低于 800 行。

执行命令说明：

```bash
wc -l src/renderer/components/MessageComposer.tsx src/renderer/components/LexicalChatInput.tsx
rg -n "MessageComposer|LexicalChatInput" src/renderer tests/unit
npx vitest run tests/unit/message-composer-model.spec.ts tests/unit/composer-attachment-presentation.spec.ts tests/unit/composer-document.spec.ts tests/unit/composer-screenshot.spec.ts
npm run check:quick
```

验收：生产入口不删除；拆分后 composer 相关单测通过；无新增公共 editor 依赖。

执行记录：

- 2026-05-30：抽出 `MessageComposerEmojiPanel` 和 `LexicalAttachmentNodeView`，保留 `MessageComposer.tsx` / `LexicalChatInput.tsx` 生产入口；两个文件分别降至 779 / 759 行，见 `docs/refactor/validation/P11-LARGE-002-composer-slimming-2026-05-30.md`。

### P11-LARGE-003：ContactsPage / CustomerProfileWorkspace 瘦身

状态：已完成

优先级：P1

目标：把通讯录和客户资料中可复用的空态、字段组、详情 section 下沉到局部组件或现有共享能力。

执行命令说明：

```bash
wc -l src/renderer/components/ContactsPage.tsx src/renderer/components/CustomerProfileWorkspace.tsx
rg -n "PanelState|ExternalSection|ItemList|contacts-empty|profile" src/renderer/components/ContactsPage.tsx src/renderer/components/CustomerProfileWorkspace.tsx src/renderer/components
npx vitest run tests/unit/cs-identity-view-model.spec.ts tests/unit/cs-workspace-view-model.spec.ts
npm run check:quick
```

验收：两个文件低于 800 行；共享空态继续复用 `PanelState`；客服 view model 单测通过。

执行记录：

- 2026-05-30：抽出 `ContactSidePanel` 和 `CustomerProfileBits`，保留通讯录与客户资料生产入口；`ContactsPage.tsx` / `CustomerProfileWorkspace.tsx` 分别降至 777 / 796 行，见 `docs/refactor/validation/P11-LARGE-003-contacts-profile-slimming-2026-05-30.md`。

### P11-REUSE-001：头像 fallback 重复实现收敛

状态：已完成

优先级：P1

目标：把 `p10:audit` 中 manual avatar initial 信号收敛到 `PcAvatar` 或消息 view model owner。

执行命令说明：

```bash
npm run p10:audit
rg -n "avatarInitial|initials|fallback.*avatar|avatar.*fallback" src/renderer
npx vitest run tests/unit/message-view-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/cs-identity-view-model.spec.ts
npm run check:quick
```

验收：页面/feature 层不再手写 avatar fallback；`p10:audit` 对应信号下降或有逐项保留理由。

执行记录：

- 2026-05-30：页面层不再调用 `avatarInitial` 预计算头像首字母，`ChatMessageBubble` / `ServiceMessageBubble` 改传 fallback name，由 `PcAvatar` 统一生成头像 fallback；同时收窄 `p10:audit` 的 `initials` 单词边界，避免误报 `initialStatus`，见 `docs/refactor/validation/P11-REUSE-001-avatar-fallback-2026-05-30.md`。

### P11-REUSE-002：展示时间格式化收敛

状态：已完成

优先级：P1

目标：把页面和消息模型中的展示型日期格式化收敛到 `src/renderer/lib/format.ts` 或更明确的领域 helper。

执行命令说明：

```bash
npm run p10:audit
rg -n "new Date\\(|toLocale(Date|Time|String)|Intl\\.DateTimeFormat" src/renderer/components src/renderer/messages src/renderer/customer-service
npx vitest run tests/unit/format.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-context-menu-model.spec.ts
npm run check:quick
```

验收：新增格式化只走 owner；`date-format-signals` 降低；格式化单测覆盖边界值。

执行记录：

- 2026-05-30：复用 `formatShortDate`，新增 `timestampFromDateValue` / `currentIsoTimestamp` 作为时间 owner，替换页面、消息模型和发送控制器中的散落 `new Date`；`date-format-signals` 清零，见 `docs/refactor/validation/P11-REUSE-002-date-format-owner-2026-05-30.md`。

### P11-CSS-001：app.css 分区迁移

状态：已完成

优先级：P2

目标：按 `PC端CSSOwner清单.md` 分批迁移 `app.css`，先迁移 messages、settings、contacts 中边界清晰的 selector。

执行命令说明：

```bash
wc -l src/renderer/styles/app.css src/renderer/styles/messages/message-center.css
rg -n "CSS Owner|app.css|message-center.css" docs/refactor/PC端CSSOwner清单.md src/renderer/styles
npm run check:quick
npm run build
```

验收：每批迁移有 owner；无全局 selector 行为漂移；构建通过。

执行记录：

- 2026-05-30：第一批迁出 `contacts-b-layout` / 联系人列表 / 联系人详情 / 联系人空态 selector 到 `src/renderer/styles/contacts/contacts.css`，并在 `App.tsx` 中按原级联顺序接入；`app.css` 从 12645 行降至 11818 行，见 `docs/refactor/validation/P11-CSS-001-contacts-owner-2026-05-30.md`。后续继续迁移 messages/settings/customer-service 其余 owner。
- 2026-05-30：继续拆出 `account/auth.css`、`shared/app-shell.css`、`messages/message-shared.css`、`pages/product-pages.css`、`shared/porcelain-shell.css`、`pages/workbench-knowledge.css`、`shared/scrollbar-theme-bridge.css`、`settings/settings.css`、`customer-service/customer-service.css`，`app.css` 降至 108 行；`global-css-signals` 清零，见 `docs/refactor/validation/P11-CSS-001-full-owner-split-2026-05-30.md`。

### P11-BOUNDARY-001：type escape 和 owner facade 收窄

状态：已完成

优先级：P2

目标：处理 `as any` 和 `: any` 信号，评估 `store.ts` owner facade 是否还能继续收窄。

执行命令说明：

```bash
npm run p10:audit
rg -n "\\bas any\\b|:\\s*any\\b|from ['\\\"]\\.\\./store|from ['\\\"].*data/store" src tests
npm run check:quick
```

验收：不扩大公共抽象；确实不能删的兼容层记录 owner 和保留理由。

执行记录：

- 2026-05-30：Electron IPC register handler 从 `any[]` 收窄为泛型 `unknown[]` 参数，并补齐 `cacheMediaPoster` / `openVideoPlayer` payload 类型；`type-escape-signals` 清零。auth/settings/workspace-ui/im-read/reminder facade 仍保留为 owner facade，见 `docs/refactor/validation/P11-BOUNDARY-001-type-escape-2026-05-30.md`。
- 2026-05-30：用户确认删除核心旧链路后，将 `src/renderer/data/store.ts` 迁移为 `src/renderer/data/workspace-ui/workspace-store-core.ts` 并删除旧入口；auth/settings/workspace-ui/im-read/reminder facade 改读新 core，`compat-store-imports` 清零；同时登记桌面媒体/通知 main owner allowlist，`public-ability-signals` 清零，见 `docs/refactor/validation/P11-BOUNDARY-001-store-core-removal-2026-05-30.md`。

### P11-AUDIT-001：p10:audit 剩余信号清零

状态：已完成

优先级：P1

目标：让 `npm run p10:audit` 中除 Windows 实机验证外的代码健康信号全部为 `none`。

执行命令说明：

```bash
npm run p10:audit
npx vitest run tests/unit/diagnostics-package.spec.ts tests/unit/performance-samples.spec.ts tests/unit/startup-performance.spec.ts
npm run check:quick
npm run build
```

验收：`orphan-source-candidates`、`compat-store-imports`、`public-ability-signals`、`date-format-signals`、`type-escape-signals`、`global-css-signals`、`tracked-generated-artifacts` 均为 `none`。

执行记录：

- 2026-05-30：将 `performance-samples` 接入 diagnostics export 的 performance summary，消除孤儿源码信号；`p10:audit` 所有代码健康信号清零，见 `docs/refactor/validation/P11-AUDIT-001-p10-audit-clean-2026-05-30.md`。
- 2026-05-30：复查残留命名，清理 `legacy-message.css` 文件名、Composer 默认附件 UI 模式名、read seq 合并变量和 contract 中间变量；生产残留精确扫描无命中，见 `docs/refactor/validation/P11-FINAL-local-acceptance-2026-05-30.md`。

### P11-WIN-001：Windows 实机验证

状态：待处理

优先级：P0

目标：在 Windows 环境验证安装包、启动、托盘、截图、文件打开、视频预览、safeStorage、diagnostics 和性能采样。

执行命令说明：

```bash
npm run dist:win
npm run perf:samples -- <diagnostics.json>
```

验收：按 `PC端核心路径Smoke清单.md` 和 `PC端发布检查清单.md` 逐项记录。非 Windows 环境不要伪造结果。
