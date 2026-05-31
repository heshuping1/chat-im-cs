# P25-LOOKUP-001 聊天查找入口合并验证记录

日期：2026-05-31

## 范围

将普通 IM 聊天 header 中相邻的搜索与历史记录入口合并为单一“查找聊天内容”入口。点击后关闭客户信息独立面板，回到消息列表，并展示统一的搜索输入、历史分类、加载范围和匹配结果。

## 风险边界

- 不新增 API DTO。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖，不替换技术栈。

## 修改范围

- `MessageChatHeader`：移除独立历史按钮，只保留单一查找按钮。
- `MessageCenterConversationStage`：查找入口统一开关搜索和历史状态，并在打开时关闭客户信息独立面板。
- `MessageListPanel`：合并搜索输入与历史分类为一个查找面板，补关闭入口和 Escape 关闭。
- `message-center.css`：补统一查找面板布局。
- `message-lookup-ui.spec.ts`：锁定单入口、资料页切回聊天和统一面板结构。

## 验证命令

- `npx vitest run tests/unit/message-lookup-ui.spec.ts tests/unit/message-list-model.spec.ts tests/unit/message-center-view-model.spec.ts`：通过，3 个文件 9 条测试通过。
- `npm run check:quick`：通过。
- 浏览器 DOM 验证：header 中只剩 `查找聊天内容` 和 `客户信息` 两个操作按钮；当前 in-app browser 自动点击未触发任何 header 按钮事件，客户信息按钮同样无响应，因此不作为产品回归证据。

## 手工验收建议

1. 打开普通 IM 会话，点击客户信息进入独立资料页。
2. 点击 header 的“查找聊天内容”，应切回消息列表并显示查找面板。
3. 输入关键词后显示匹配条数，点击结果应滚动到对应消息。
4. 点击关闭查找或按 Escape，应关闭查找面板且不切换会话。
