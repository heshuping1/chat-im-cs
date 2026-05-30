# 验证记录：P2-ST-001D Auth Selector 迁移第二批

日期：2026-05-29

任务编号：P2-ST-001D

## 目标

完成 auth selector/action 调用方迁移，降低页面和工具模块对 `store.ts` 认证字段的直接依赖。

## 修改范围

- `src/renderer/data/runtime.ts`
- `src/renderer/data/static-config.ts`
- `src/renderer/data/store.ts`
- `src/renderer/data/auth/auth-session.ts`
- `src/renderer/messages/hooks/useActiveImConversationQueries.ts`
- `src/renderer/messages/hooks/useGroupAvatarSnapshots.ts`
- `src/renderer/messages/hooks/useMessageContactPickerData.ts`
- `src/renderer/components/AccountUtilityPages.tsx`
- `src/renderer/components/AiAssistantPage.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/ContactsPage.tsx`
- `src/renderer/components/CustomerContextPanel.tsx`
- `src/renderer/components/KnowledgeBasePage.tsx`
- `src/renderer/components/MePage.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/OnlineServicePage.tsx`
- `src/renderer/components/PcAvatar.tsx`
- `src/renderer/components/ThreadList.tsx`
- `src/renderer/components/WorkbenchPage.tsx`

## 实现内容

| 项 | 说明 |
| --- | --- |
| AuthSession 类型归属 | `runtime.ts`、`static-config.ts`、消息 hooks、复杂页面中的 `AuthSession` 类型改从 `data/auth/auth-session.ts` 导入。 |
| 页面认证读取 | 页面和公共头像组件中的 `authSession` 读取改走 `useAuthSession()`。 |
| 页面认证写入 | 空间切换页的 `setAuthSession` 改走 `useSetAuthSession()`。 |
| 退出动作 | 设置页退出动作改走 `useClearAuthSession()`。 |
| 存储兼容 | `store.ts`、`auth-session.ts` 的浏览器存储访问改为安全访问，避免 Node/测试环境直接触发 `localStorage`。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts` | 通过 | 3 个测试文件，8 个用例通过，耗时约 139ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg "useWorkspaceStore\\(\\(state\\) => state\\.(authSession\|setAuthSession\|clearAuthSession)" src/renderer -n` | 通过 | 无剩余直接读取/写入 auth 入口。 |
| `rg "type AuthSession" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | `AuthSession` 类型只在 `store.ts` 内部兼容导入。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断与排查

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本批次只迁移调用入口和修复存储安全访问，不新增日志。 |
| 可排查问题 | Codex 可通过 `rg -n "useAuthSession|useSetAuthSession|useClearAuthSession" src/renderer` 查看 auth 调用方。 |
| 敏感信息处理 | 未新增 token、refreshToken、authorization 等日志输出。 |

## 结论

P2-ST-001D 已完成。页面层不再直接通过 `useWorkspaceStore((state) => state.authSession/setAuthSession/clearAuthSession)` 访问认证状态和认证动作。

## 遗留风险

1. `store.ts` 仍保留 `AuthSession` 兼容导出和底层 owner 字段，P2-ST-001E 需要明确兼容策略和禁止新增直接依赖的规则。
2. auth 生命周期尚未接入结构化诊断日志，P2-ST-001F 继续处理。
