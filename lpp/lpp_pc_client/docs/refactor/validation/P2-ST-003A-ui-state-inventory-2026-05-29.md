# 验证记录：P2-ST-003A UI 状态盘点

日期：2026-05-29

任务编号：P2-ST-003A

## 目标

盘点 layout、active panel、modal、selection 等纯 UI 状态，明确哪些可以迁入 workspace-ui owner，哪些应留在页面局部状态，避免把业务状态误拆到 UI store。

## Workspace Store 中的 UI 状态

| 字段/action | 类型 | 当前用途 | 迁移判断 |
| --- | --- | --- | --- |
| `activeModule/setActiveModule` | 全局导航 | App、Sidebar、ReminderCenter、Workbench、MessageCenter、ChatWorkspace。 | 迁入 workspace-ui，可作为应用导航状态。 |
| `activeThreadId/setActiveThread` | 在线客服选中线程 | ThreadList、ChatWorkspace、CustomerContextPanel、ReminderCenter、GatewayBridge。 | 业务选择态，迁入 workspace-ui 但命名需体现 CS selection。 |
| `activeImConversationId/setActiveImConversation` | IM 选中会话 | MessageCenter、ReminderCenter、GatewayBridge。 | 业务选择态，迁入 workspace-ui；读模型仍留 IM read owner。 |
| `activeContactId/setActiveContact` | 通讯录选中项 | ContactsPage。 | 页面选择态，可迁入 workspace-ui 或后续局部化；当前先放 workspace-ui 兼容。 |
| `listPaneWidth/profilePaneWidth` | IM 面板布局 | App、MessageCenter、ResizableDivider。 | 纯 UI layout，迁入 workspace-ui。 |
| `serviceListPaneWidth/serviceProfilePaneWidth` | 客服面板布局 | OnlineServicePage。 | 纯 UI layout，迁入 workspace-ui。 |
| `messageProfileVisible/messageLayoutMode` | IM 响应式布局 | App、MessageCenter、useMessageResponsiveLayout。 | 纯 UI layout，迁入 workspace-ui。 |
| `filter/setFilter` | 客服列表筛选 | ThreadList、ReminderCenter。 | UI filter，迁入 workspace-ui；建议后续重命名为 `serviceThreadFilter`。 |
| `messageFilter/setMessageFilter` | IM 会话筛选 | MessageCenter。 | UI filter，迁入 workspace-ui。 |
| `contactFilter/setContactFilter` | 通讯录筛选 | ContactsPage、MessageCenter。 | UI filter，迁入 workspace-ui。 |

## 应保持页面局部的状态

| 文件 | 状态 | 理由 |
| --- | --- | --- |
| `MessageCenter.tsx` | `historyFilter`、`messageMenu`、`conversationMenu`、`composerDialog`、`selectedMessageIds` 等 | 属于单页面临时交互，不应进入全局 store。 |
| `ChatWorkspace.tsx` | `messageMenu` | 在线客服消息右键菜单局部状态。 |
| `MePage.tsx` | `activeSectionId` | 设置页局部 tab/section。 |
| `ContactsPage.tsx` | `selectedRequestId` | 联系人页局部申请选择。 |
| `KnowledgeBasePage.tsx` | `selectedBaseId`、`selection` | 知识库页局部选择。 |
| `WorkbenchPage.tsx` | `selectedShortcutId` | 工作台局部卡片选择。 |
| `MessageStartDialogs.tsx` | `selectedIds` | 弹窗内部选择，不应污染全局。 |

## 主要风险

1. `filter` 命名过泛，容易与 IM、Contacts filter 混淆，后续迁移应在 selector 层提供更明确命名。
2. `activeThreadId` 和 `activeImConversationId` 被 Gateway 判断“当前是否活跃”，迁移时必须提供 snapshot getter，不能只提供 React hook。
3. 面板宽度目前未持久化，属于可接受现状；不要在 P2-ST-003B 顺手引入持久化，避免扩大范围。
4. 局部 modal/menu/selection 不应迁入全局，否则会加重重渲染和状态耦合。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "activeModule\|activeThreadId\|activeImConversationId\|activeContactId\|listPaneWidth\|profilePaneWidth\|serviceListPaneWidth\|serviceProfilePaneWidth\|messageProfileVisible\|messageLayoutMode\|filter\|messageFilter\|contactFilter" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 识别 workspace UI 状态读写点。 |
| `rg -n "useState<.*(Dialog\|Menu\|Panel\|Selection\|Filter\|Mode)\|composerDialog\|messageMenu\|selected.*Id" src/renderer/components src/renderer/messages -g "*.tsx" -g "*.ts"` | 通过 | 识别应保留局部的交互状态。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务为盘点，不改运行时。 |
| 可排查问题 | 后续 Codex 可按本清单判断 UI 状态迁移边界。 |
| Codex 检索方式 | `rg -n "activeModule|activeThreadId|activeImConversationId|messageLayoutMode|messageFilter|contactFilter" src/renderer` |
| 敏感信息处理 | 未输出用户数据。 |

## 结论

P2-ST-003A 已完成。下一步可以建立 workspace-ui owner 壳，但只迁移 workspace store 中已有的导航、选择、布局、筛选状态；页面局部 modal/menu/selection 暂不迁移。

## 下一步

1. P2-ST-003B：建立 workspace-ui store 壳和 selectors/actions。
2. P2-ST-003C：迁移调用方，优先 App、Sidebar、MessageCenter、OnlineServicePage、ThreadList、ContactsPage。
