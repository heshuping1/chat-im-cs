# 验证记录：P2-ST-001A Auth Store 读写点盘点

日期：2026-05-29

任务编号：P2-ST-001A

修改范围：

- `docs/refactor/PC端重构任务矩阵.md`
- `docs/refactor/validation/P2-ST-001A-auth-store-inventory-2026-05-29.md`

## 目标

盘点 `authSession`、token、登录态 action 的所有主要读写点，形成后续 P2-ST-001B 到 P2-ST-001F 的迁移清单。

本任务只做盘点和迁移设计，不改业务代码。

## 当前 Auth Owner

| 项 | 当前位置 | 说明 |
| --- | --- | --- |
| `AuthSession` 类型 | `src/renderer/data/store.ts` | 包含 `apiBaseUrl`、`tenantToken`、`platformToken`、`refreshToken`、租户、用户和展示信息。 |
| 持久化 key | `src/renderer/data/store.ts` | `lpp.pc.authSession`，保存在 renderer `localStorage`。 |
| 初始化读取 | `readStoredAuth()` | 优先读取 `VITE_TENANT_TOKEN`/`VITE_API_BASE_URL`，否则读取 localStorage。 |
| 写入 action | `setAuthSession()` | 写 localStorage，并重载 IM read/peer/readState 本地状态。 |
| 清理 action | `clearAuthSession()` | 删除 localStorage，并清空 auth、active ids、IM read state，activeModule 回到 `messages`。 |

## 写入点

| 文件 | 写入类型 | 说明 |
| --- | --- | --- |
| `src/renderer/components/LoginPage.tsx` | `setAuthSession` | 登录成功后写入租户 token；平台登录选择租户后再次写入。 |
| `src/renderer/components/AccountUtilityPages.tsx` | `setAuthSession` | 切换空间/租户后更新 `tenantToken`、租户信息和用户信息。 |
| `src/renderer/App.tsx` | `clearAuthSession` | React Query 全局 401 后清理登录态并清空 query cache。 |
| `src/renderer/components/GatewayBridge.tsx` | `clearAuthSession` | `auth.force_logout` 等实时事件触发强制退出。 |
| `src/renderer/components/Sidebar.tsx` | `clearAuthSession` | 用户主动退出登录。 |
| `src/renderer/components/MePage.tsx` | `clearAuthSession` | 注销账号申请成功后清理登录态。 |

## 读取点分类

| 类别 | 文件/模块 | 说明 |
| --- | --- | --- |
| 应用入口 | `src/renderer/App.tsx` | 根据 `authSession` 判断展示登录页还是主工作区；401 时从 store 读取并清理。 |
| API 客户端 | `src/renderer/data/runtime.ts`、多个页面 | `createApiClient`/`requireApiClient` 从 `AuthSession` 取 `apiBaseUrl`、`tenantToken`、`platformToken`。 |
| Query key | `src/renderer/data/query-keys.ts`、页面 hooks | 大量 query key 使用 `apiBaseUrl`、`tenantToken` 或 `platformToken` 隔离缓存。 |
| Gateway | `src/renderer/components/GatewayBridge.tsx` | SignalR URL 和 accessToken 使用 `apiBaseUrl`、`tenantToken`；force logout 清理 auth。 |
| 普通 IM | `MessageCenter.tsx`、`messages/hooks/*`、`ContactsPage.tsx` | 会话、消息、联系人、群成员、发送、媒体、已读等均依赖 session。 |
| 在线客服 | `ChatWorkspace.tsx`、`OnlineServicePage.tsx`、`ThreadList.tsx`、`CustomerContextPanel.tsx` | 客服线程、客户资料、消息、媒体下载等依赖 session。 |
| 账号/我 | `Sidebar.tsx`、`MePage.tsx`、`AccountUtilityPages.tsx` | 个人信息、租户信息、隐私、黑名单、空间切换、退出登录。 |
| 公共头像/媒体 | `PcAvatar.tsx`、媒体相关调用 | 头像和媒体请求需要 `tenantToken`。 |
| 本地 read state | `src/renderer/data/store.ts` | read-state 本地存储 key 使用 `apiBaseUrl`、tenant/user 标识和 token 前缀。 |

## 主要读取文件清单

```text
src/renderer/App.tsx
src/renderer/components/AccountUtilityPages.tsx
src/renderer/components/AiAssistantPage.tsx
src/renderer/components/ChatWorkspace.tsx
src/renderer/components/ContactsPage.tsx
src/renderer/components/CustomerContextPanel.tsx
src/renderer/components/GatewayBridge.tsx
src/renderer/components/KnowledgeBasePage.tsx
src/renderer/components/LoginPage.tsx
src/renderer/components/MePage.tsx
src/renderer/components/MessageCenter.tsx
src/renderer/components/OnlineServicePage.tsx
src/renderer/components/PcAvatar.tsx
src/renderer/components/Sidebar.tsx
src/renderer/components/ThreadList.tsx
src/renderer/components/WorkbenchPage.tsx
src/renderer/data/runtime.ts
src/renderer/data/store.ts
src/renderer/messages/hooks/useActiveImConversationQueries.ts
src/renderer/messages/hooks/useGroupAvatarSnapshots.ts
src/renderer/messages/hooks/useMessageContactPickerData.ts
```

## 迁移结论

1. `authSession` 可以拆出独立 auth store/service，但必须保留兼容层，不能一次性替换所有页面。
2. `setAuthSession` 当前还承担 IM read state reload，这不是纯 auth 职责。P2-ST-001B/001C 需要先建立 auth owner，再通过过渡桥触发 workspace/read-state 重载。
3. `clearAuthSession` 当前同时清理登录态、活动页面、active ids、IM read state。拆分时必须明确哪些属于 auth owner，哪些属于 workspace-ui/im-read owner。
4. `localStorage` 保存完整 token 是安全风险，但这是 P8-EL-002 的安全专项，不在 P2 直接替换存储介质。
5. 后续迁移不新增依赖，不替换 Zustand；先使用现有 Zustand 能力和兼容 selector。

## 建议的后续任务入口

| 后续任务 | 建议动作 |
| --- | --- |
| P2-ST-001B | 建立 `auth` store/service 壳，迁出 `AuthSession` 类型、storage key、read/persist 基础函数，保留兼容导出。 |
| P2-ST-001C | 迁移 `readStoredAuth`、`setAuthSession`、`clearAuthSession`，并定义 auth lifecycle bridge。 |
| P2-ST-001D | 按类别逐步替换调用方：App/Gateway/Login/Sidebar 优先，然后页面查询和媒体。 |
| P2-ST-001E | 清理旧 workspace auth 入口或保留临时兼容入口并标注删除条件。 |
| P2-ST-001F | 增加 auth store 测试和诊断日志，覆盖登录恢复、切换租户、401 清理、force logout。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "authSession|setAuthSession|clearAuthSession|readStoredAuth|tenantToken|platformToken|refreshToken|apiBaseUrl" lpp/lpp_pc_client/src/renderer` | 通过 | 盘点主要 auth 读写点。 |
| `rg -n "setAuthSession|clearAuthSession|readStoredAuth|authStorageKey" lpp/lpp_pc_client/src/renderer` | 通过 | 盘点写入、清理和持久化 owner。 |
| `rg -l "authSession|setAuthSession|clearAuthSession" lpp/lpp_pc_client/src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 输出主要依赖文件清单。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务只做盘点，不改运行时链路。 |
| traceId/correlationId | 不适用 |
| 可排查问题 | 后续 Codex 可根据本文档定位 auth owner、写入点、读取点和拆分顺序。 |
| Codex 检索方式 | `rg -n "P2-ST-001A|Auth Store 读写点盘点|setAuthSession|clearAuthSession" lpp/lpp_pc_client/docs/refactor` |
| 敏感信息处理 | 文档只记录字段名，不记录实际 token 值。 |

## 遗留风险

1. `AuthSession` 当前仍保存在 renderer localStorage，安全治理留给 P8-EL-002。
2. `setAuthSession` 与 IM read state 重载耦合，需要 P2-ST-001B/001C 设计过渡桥。
3. 大量页面直接读取 `authSession`，P2-ST-001D 需要分批迁移，避免一次性大改。
