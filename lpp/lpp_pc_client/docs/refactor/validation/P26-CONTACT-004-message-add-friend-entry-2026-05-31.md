# P26-CONTACT-004 Message Add Friend Entry

日期：2026-05-31

## 目标

修复消息页 `+` 菜单缺少主动添加好友入口的问题。`好友申请`保留为处理收到申请，新增 `添加好友`作为主动搜索和发送申请入口，并且不离开当前聊天上下文。

## 修改范围

- `MessagePlusMenu`：增加 `添加好友`，菜单顺序为 `发起聊天 / 发起群聊 / 添加好友 / 好友申请 / 我的二维码`。
- `MessageConversationSidebar`：新增 `addFriend` action，点击后关闭菜单并打开消息页内添加好友弹窗。
- `MessageCenter`：接入 `ContactAddFriendDialog`，弹窗内 `收到的申请`仍跳转到通讯录申请页。
- `contacts/hooks/useContactAddFriendController`：沉淀添加好友控制 owner，供通讯录和消息页共用真实搜索、申请、二维码和关系判断。

## 风险边界

- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key。
- 不新增依赖。
- 不删除旧链路。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx vitest run tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts` | 通过 | 先红后绿，验证菜单入口和共享 hook。 |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 | 验证抽 hook 后类型闭环。 |
| `npx vitest run tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts tests/unit/contact-card-api.spec.ts` | 通过 | 覆盖消息入口、通讯录和好友接口合同回归。 |
| `npm run check:quick` | 通过 | 类型检查、核心 lint、hooks lint、架构边界、docs、P19 审计和 shape 均通过。 |
| `git diff --check` | 通过 | 未发现空白错误或冲突标记。 |

## 手工验证

- 当前账号无建群权限时，消息页 `+` 菜单为 `发起聊天 / 添加好友 / 好友申请 / 我的二维码`；`添加好友`可见且为一级入口。
- 有建群权限时，菜单顺序由代码固定为 `发起聊天 / 发起群聊 / 添加好友 / 好友申请 / 我的二维码`。
- 点击 `添加好友` 后，菜单关闭，当前仍在消息页，打开 `添加联系人`弹窗。
- 弹窗输入框自动聚焦，placeholder 为 `输入星络号、手机号或邮箱`。
- 关闭弹窗后仍停留在消息页。

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 原因 | 本轮为 UI 入口和控制 hook 复用，不新增异常链路或后台事件。 |
| Codex 检索方式 | 检索 `MessagePlusAction`、`addFriendDialogOpen`、`useContactAddFriendController`。 |
| 敏感信息处理 | 未新增日志，无新增敏感信息输出。 |

## 遗留风险

1. 搜索能力仍是服务端精准搜索，不做模糊搜人。
2. 消息页和通讯录共用同一套 React Query key，后续若服务端返回申请方向不一致，需要单独修正申请 badge 计数口径。
