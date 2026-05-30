# PC 端 P12 持续瘦身任务清单

状态：执行中

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

---

## 1. P12 目标

P12 不扩大技术栈、不引入新依赖、不重开核心链路重构。目标是在 P11 已清零硬门禁后，继续处理“未阻断但仍偏大”的文件，让 PC 端长期保持可读、可改、可验证。

优先级：

1. CSS 大文件继续按 owner 拆分。
2. 700 行以上组件继续瘦身。
3. 为 P12 建立独立尺寸审计，不影响 P10/P11 已清零门禁。
4. 每批改动必须可运行、可回滚、可验证。

---

## 2. 当前尺寸基线

执行命令：

```bash
npm run p12:audit
find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -not -path '*/node_modules/*' -print0 | xargs -0 wc -l | sort -nr | sed -n '1,40p'
```

当前优先候选：

| 文件 | 当前行数 | 处理策略 |
| --- | ---: | --- |
| `src/renderer/styles/shared/porcelain-shell.css` | 3015 | 拆出 app shell / sidebar / customer-service / composer / page skin owner。 |
| `src/renderer/styles/messages/message-shared.css` | 2917 | 拆出 composer、message bubble、attachment、conversation shared owner。 |
| `src/renderer/styles/messages/message-center.css` | 1828 | 保持低于 2000；继续迁移明确 owner。 |
| `src/renderer/styles/customer-service/customer-service.css` | 1268 | 继续按客服列表、会话、资料、状态条拆分。 |
| `src/renderer/components/CustomerProfileWorkspace.tsx` | 792 | 抽 profile section/view model，保持页面装配。 |
| `src/renderer/components/MessageCenter.tsx` | 785 | 继续抽 dialogs/side effects/command wiring。 |
| `src/renderer/components/MessageComposer.tsx` | 779 | 继续抽 attachment list / screenshot action / draft translation。 |
| `src/renderer/components/ContactsPage.tsx` | 777 | 抽 list/detail/empty state 装配。 |
| `src/renderer/components/LexicalChatInput.tsx` | 759 | 抽 plugin wiring 和 attachment node bridge。 |

最新结果：CSS 大文件与 700 行以上组件均已清零；`data-main-edge-files` 保留为后续 P12+ 观察项。

---

## 3. P12-AUDIT-001：建立 P12 尺寸审计

状态：已完成

优先级：P0

目标：新增 P12 专用尺寸审计命令，列出 CSS 大文件、700 行以上组件、450 行以上 data/main 候选；不改变 `p10:audit` 的已清零结果。

涉及文件：

| 类型 | 文件 |
| --- | --- |
| 新增 | `scripts/report-p12-size-health.mjs` |
| 修改 | `package.json` |
| 验证 | `docs/refactor/validation/P12-AUDIT-001-size-baseline-2026-05-30.md` |

执行命令说明：

```bash
npm run p12:audit
npm run p10:audit
npm run docs:check
git diff --check
```

验收：

1. `npm run p12:audit` 能稳定输出 P12 候选。
2. `npm run p10:audit` 仍全部为 `none`。
3. 文档校验和 diff 校验通过。

---

## 4. P12-CSS-001：拆分 porcelain-shell.css

状态：已完成

优先级：P1

目标：把 `porcelain-shell.css` 从 3000 行级降到 2000 行以下，按 owner 拆出明确样式文件，并保持 `App.tsx` 原有级联顺序。

涉及文件：

| 类型 | 文件 |
| --- | --- |
| 修改 | `src/renderer/styles/shared/porcelain-shell.css` |
| 新增候选 | `src/renderer/styles/shared/porcelain-app-shell.css` |
| 新增候选 | `src/renderer/styles/customer-service/customer-service-skin.css` |
| 新增候选 | `src/renderer/styles/messages/composer-rich-input.css` |
| 修改 | `src/renderer/App.tsx` |
| 验证 | `docs/refactor/validation/P12-CSS-001-porcelain-split-YYYY-MM-DD.md` |

执行命令说明：

```bash
wc -l src/renderer/styles/shared/porcelain-shell.css src/renderer/styles/customer-service/customer-service.css src/renderer/styles/messages/message-shared.css
rg -n "^/\\*|^\\.[a-zA-Z0-9_-]+" src/renderer/styles/shared/porcelain-shell.css
npm run p12:audit
npm run check:quick
npm run build
```

验收：

1. `porcelain-shell.css` 低于 2000 行。
2. 新 CSS 文件 owner 明确，不出现重复 selector 大段复制。
3. `check:quick` 和 `build` 通过。

执行记录：

- 2026-05-30：将客服 H skin、composer rich input、底部 presence footer 从 `porcelain-shell.css` 拆入 owner 文件；`porcelain-shell.css` 从 3015 行降至 1842 行，见 `docs/refactor/validation/P12-CSS-001-porcelain-split-2026-05-30.md`。

---

## 5. P12-CSS-002：拆分 message-shared.css

状态：已完成

优先级：P1

目标：把 `message-shared.css` 从 2900 行级降到 2000 行以下，优先拆出 composer rich input、attachment card、message shared primitives。

执行命令说明：

```bash
wc -l src/renderer/styles/messages/message-shared.css
rg -n "^/\\*|^\\.[a-zA-Z0-9_-]+" src/renderer/styles/messages/message-shared.css
npm run p12:audit
npm run check:quick
npm run build
```

验收：message shared owner 拆分后级联顺序明确，消息发送、附件预览、富文本输入样式不漂移。

执行记录：

- 2026-05-30：将消息媒体/文件/视频/联系人卡片样式拆到 `message-media-content.css`，将 composer shell/附件/emoji/发送按钮样式拆到 `composer-shell.css`；`message-shared.css` 从 2917 行降至 1400 行，`p12:audit` 的 `css-large-files` 清零，见 `docs/refactor/validation/P12-CSS-002-message-shared-split-2026-05-30.md`。

---

## 6. P12-LARGE-001：继续瘦身 MessageComposer

状态：已完成

优先级：P2

目标：将 `MessageComposer.tsx` 稳定降到 700 行以下，优先抽出 attachment list 和 screenshot action，不改变对外 props。

执行命令说明：

```bash
wc -l src/renderer/components/MessageComposer.tsx
rg -n "function|const .* =|attachment|screenshot|translation" src/renderer/components/MessageComposer.tsx
npx vitest run tests/unit/message-composer-model.spec.ts tests/unit/send-queue.spec.ts
npm run check:quick
```

验收：对外 API 不变；附件、截图、翻译草稿路径仍通过现有单测和类型检查。

执行记录：

- 2026-05-30：抽出 `MessageComposerAttachments.tsx` 承载附件列表、附件预览和隐藏文件输入；`MessageComposer.tsx` 从 779 行降至 695 行，见 `docs/refactor/validation/P12-LARGE-001-message-composer-2026-05-30.md`。

---

## 7. P12-LARGE-002：继续瘦身 CustomerProfileWorkspace

状态：已完成

优先级：P2

目标：将 `CustomerProfileWorkspace.tsx` 稳定降到 700 行以下，优先抽资料 section 和空态/错误态装配。

执行命令说明：

```bash
wc -l src/renderer/components/CustomerProfileWorkspace.tsx
rg -n "function|const .* =|section|empty|error|profile" src/renderer/components/CustomerProfileWorkspace.tsx
npm run check:quick
npm run build
```

验收：页面只保留装配和事件绑定，公共空态/资料 section 可复用。

执行记录：

- 2026-05-30：抽出 `CustomerProfileModel.ts` 承载资料兼容模型、字段映射、外部 section 分类和 tab 计数；`CustomerProfileWorkspace.tsx` 从 792 行降至 435 行，见 `docs/refactor/validation/P12-LARGE-002-customer-profile-workspace-2026-05-30.md`。

---

## 8. P12-LARGE-003：继续瘦身 MessageCenter

状态：已完成

优先级：P2

目标：将 `MessageCenter.tsx` 稳定降到 700 行以下，优先抽纯装配层、dialog layer 或页面 chrome，不改变消息业务 hooks。

执行命令说明：

```bash
wc -l src/renderer/components/MessageCenter.tsx
rg -n "function|const .* =|Dialog|Layer|return" src/renderer/components/MessageCenter.tsx
npm run check:quick
npm run build
```

验收：对外入口不变，消息查询、发送、菜单、弹窗装配仍通过 quick/build。

执行记录：

- 2026-05-30：抽出 `MessageCenterConversationStage.tsx` 承载消息中心聊天区、资料 dock、消息列表、composer、overlay 和 dialogs 的纯展示装配；`MessageCenter.tsx` 从 785 行降至 621 行，`p12:audit` 的 `component-edge-files` 清零，见 `docs/refactor/validation/P12-LARGE-003-message-center-2026-05-30.md`。

---

## 9. P12-LARGE-004：继续瘦身 ContactsPage

状态：已完成

优先级：P2

目标：将 `ContactsPage.tsx` 稳定降到 700 行以下，优先抽联系人列表/详情/空态装配。

执行命令说明：

```bash
wc -l src/renderer/components/ContactsPage.tsx
rg -n "function|const .* =|empty|detail|list" src/renderer/components/ContactsPage.tsx
npm run check:quick
```

验收：联系人页面入口不变，列表、详情、建聊入口行为不变。

执行记录：

- 2026-05-30：抽出 `ContactDetailViews.tsx` 承载客户/好友/员工/群聊详情视图；`ContactsPage.tsx` 从 777 行降至 627 行，见 `docs/refactor/validation/P12-LARGE-004-contacts-page-2026-05-30.md`。

---

## 10. P12-LARGE-005：继续瘦身 LexicalChatInput

状态：已完成

优先级：P2

目标：将 `LexicalChatInput.tsx` 稳定降到 700 行以下，优先抽 plugin wiring、attachment node bridge 或命令注册。

执行命令说明：

```bash
wc -l src/renderer/components/LexicalChatInput.tsx
rg -n "function|const .* =|Plugin|Attachment|Command|Node" src/renderer/components/LexicalChatInput.tsx
npm run check:quick
```

验收：富文本输入、附件节点、发送快捷键和 draft editor state 仍通过类型检查和 quick。

执行记录：

- 2026-05-30：抽出 `LexicalAttachmentNode.tsx` 承载 Lexical 自定义附件节点、序列化和创建 helper；`LexicalChatInput.tsx` 从 759 行降至 657 行，见 `docs/refactor/validation/P12-LARGE-005-lexical-chat-input-2026-05-30.md`。

---

## 11. P12-LARGE-006：继续瘦身 MessageBodyView

状态：已完成

优先级：P2

目标：将 `MessageBodyView.tsx` 稳定降到 700 行以下，优先抽消息内容分发或媒体 fallback 纯展示。

执行命令说明：

```bash
wc -l src/renderer/components/MessageBodyView.tsx
rg -n "function|const .* =|return|media|file|video|image" src/renderer/components/MessageBodyView.tsx
npm run check:quick
```

验收：消息内容展示入口不变，图片/视频/文件/联系人卡片渲染通过类型检查。

执行记录：

- 2026-05-30：抽出 `MessageNonMediaParts.tsx` 承载位置、联系人名片和通话记录展示；`MessageBodyView.tsx` 从 734 行降至 576 行，见 `docs/refactor/validation/P12-LARGE-006-message-body-view-2026-05-30.md`。

---

## 12. P12-LARGE-007：继续瘦身 Sidebar

状态：已完成

优先级：P2

目标：将 `Sidebar.tsx` 稳定降到 700 行以下，优先抽导航配置、底部在线状态和账号弹层。

执行命令说明：

```bash
wc -l src/renderer/components/Sidebar.tsx
rg -n "function|const .* =|nav|footer|account|status" src/renderer/components/Sidebar.tsx
npm run check:quick
```

验收：模块切换、未读 badge、在线状态和账号菜单行为不变。

执行记录：

- 2026-05-30：抽出 `SidebarAccountPanels.tsx` 承载账号入口、二维码详情面板和复制 helper；`Sidebar.tsx` 从 732 行降至 604 行，见 `docs/refactor/validation/P12-LARGE-007-sidebar-2026-05-30.md`。

---

## 13. P12-LARGE-008：继续瘦身 MePage

状态：已完成

优先级：P2

目标：将 `MePage.tsx` 稳定降到 700 行以下，优先抽朋友权限、黑名单和隐私值映射。

执行命令说明：

```bash
wc -l src/renderer/components/MePage.tsx
rg -n "function|const .* =|privacy|Blacklist|profileVisibility|friendRequest" src/renderer/components/MePage.tsx
npm run check:quick
```

验收：系统设置入口不变，朋友权限和黑名单接口调用 owner 明确，页面主文件低于 700 行。

执行记录：

- 2026-05-30：抽出 `MePrivacySections.tsx` 承载朋友权限、黑名单和隐私值映射；`MePage.tsx` 从 736 行降至 541 行，见 `docs/refactor/validation/P12-LARGE-008-me-page-2026-05-30.md`。

---

## 14. P12-WIN-001：承接 Windows 实机验证

状态：待处理

优先级：P0

目标：继续承接 `P11-WIN-001`，在 Windows 环境验证安装包、启动、托盘、截图、文件、视频、safeStorage、diagnostics 和性能采样。

执行命令说明：

```bash
npm run dist:win
npm run perf:samples -- <diagnostics.json>
```

验收：Windows 验证记录回填到 `docs/refactor/validation/`。
