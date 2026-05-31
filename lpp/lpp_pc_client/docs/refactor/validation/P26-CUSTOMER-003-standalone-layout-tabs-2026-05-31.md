# P26-CUSTOMER-003 Standalone Layout Tabs

日期：2026-05-31

## 目标

修复普通 IM 独立客户信息页底部空白和 tab 稳态问题。客户信息打开时不再保留聊天输入框预留行，短内容 tab 使用完整详情区承载空态，更多分类不再展开成额外 tab 行。

## 修改范围

- `MessageCenterConversationStage`：`profileStandaloneOpen` 时给 `e-chat-panel` 增加 `profile-standalone-open` 状态 class。
- `CustomerProfileWorkspace`：主 tab 保留 `总览 / 交易记录 / 资金流水 / 会话 / 工单`，次级分类改为 overflow menu。
- `message-center.css`：独立客户信息状态改为两行 grid，并隐藏独立页内重复的客户信息标题。
- `customer-service.css`：短内容 tab 填满剩余详情区，单 block 空态居中。

## 风险边界

- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key。
- 不新增依赖。
- 不删除旧链路。

## 登录后 DOM 验证

普通 IM 会话 `测试客户A`，进入客户信息并切换 `工单` tab：

- `e-chat-panel` class：`e-chat-panel profile-standalone-open`
- `e-chat-panel` grid：`72px 924px`，不再是 `72px 704px 220px`
- `message-info-standalone` 高度：`924px`
- 页面底部间隙：`1px`
- `customer-profile-content` 高度：`371px`
- `工单摘要` block 高度：`371px`
- `暂无工单` 空态高度：`316px`，居中显示
- 内部重复 `客户信息`标题：隐藏
- 更多分类菜单：3 项；切换 `KYC/合规` 后菜单关闭，`更多分类`按钮显示并进入 active 态，内容切到 `KYC/AML`

## 验证命令

- `npx vitest run tests/unit/customer-profile-workspace.spec.ts tests/unit/message-lookup-ui.spec.ts`
- `npx tsc --noEmit --pretty false --skipLibCheck`
- `npm run check:quick`
- `git diff --check`

## 结果

- 独立客户信息页可用高度已完整利用。
- 短内容 tab 不再悬在上半屏，空态有稳定承载区域。
- 更多分类不会因为展开/收起造成布局跳动。
- 在线客服右侧资料栏继续复用同一 tab 结构，不套用独立页移除 composer 行的规则。
