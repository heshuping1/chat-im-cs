# 验证记录：P2-ST-003C Workspace UI Selector 迁移

日期：2026-05-29

任务编号：P2-ST-003C

## 修改范围

- `src/renderer/App.tsx`
- `src/renderer/components/AiAssistantPage.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/ContactsPage.tsx`
- `src/renderer/components/CustomerContextPanel.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/OnlineServicePage.tsx`
- `src/renderer/components/ReminderCenter.tsx`
- `src/renderer/components/ResizableDivider.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/ThreadList.tsx`
- `src/renderer/components/WorkbenchPage.tsx`
- `src/renderer/data/workspace-ui/workspace-ui-store.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

迁移页面布局、导航、全局选择态、筛选状态的调用方，避免页面继续直接读取 workspace store 中的 UI 字段。

## 实现内容

| 项 | 说明 |
| --- | --- |
| App Shell | `activeModule`、消息布局宽度、资料栏显示、布局模式改走 workspace-ui hooks。 |
| Sidebar/Workbench/Reminder | 全局导航 action 改走 `useSetActiveModule()` 等 UI actions。 |
| MessageCenter | IM 选中会话、消息筛选、面板宽度、资料栏、布局模式改走 workspace-ui hooks。 |
| OnlineService | 客服列表/资料面板宽度改走 workspace-ui hooks。 |
| ThreadList/Contacts | 客服选中线程、客服筛选、通讯录选中项、通讯录筛选改走 workspace-ui hooks。 |
| Gateway | 非 React active 判断改走 `getWorkspaceUiSnapshot()`，不再直接依赖 UI 字段。 |
| 性能处理 | 补充字段级 selector，避免用对象 selector 造成无意义重渲染。 |
| 局部状态 | `messageMenu`、`composerDialog`、`selectedMessageIds`、`activeSectionId` 等仍保留在页面局部。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/workspace-ui-store.spec.ts tests/unit/pc-settings.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-diagnostics.spec.ts` | 通过 | 7 个测试文件，17 个用例通过，耗时约 163ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg -n "useWorkspaceStore\\(\\(state\\) => state\\.(activeModule\|setActiveModule\|activeThreadId\|setActiveThread\|activeImConversationId\|setActiveImConversation\|activeContactId\|setActiveContact\|listPaneWidth\|profilePaneWidth\|setListPaneWidth\|setProfilePaneWidth\|serviceListPaneWidth\|serviceProfilePaneWidth\|setServiceListPaneWidth\|setServiceProfilePaneWidth\|messageProfileVisible\|setMessageProfileVisible\|messageLayoutMode\|setMessageLayoutMode\|filter\|setFilter\|messageFilter\|setMessageFilter\|contactFilter\|setContactFilter)" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 无剩余直接 UI workspace selector。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务迁移 UI selector/action，不新增日志。 |
| 可排查问题 | Codex 可通过 workspace-ui hooks 定位 UI 状态调用方。 |
| Codex 检索方式 | `rg -n "useActiveModule|useMessageLayoutMode|useServiceThreadFilter|getWorkspaceUiSnapshot" src/renderer` |
| 敏感信息处理 | 未新增日志；UI 状态不包含 token。 |

## 结论

P2-ST-003C 已完成。workspace store 中 UI 状态仍作为 backing store 保留，但页面和 Gateway 不再直接读取这些 UI 字段。

## 下一步

1. 进入 P2-ST-004A：盘点 unread、readSeq、localRead、peerRead、lastReadAt 的读写点。
