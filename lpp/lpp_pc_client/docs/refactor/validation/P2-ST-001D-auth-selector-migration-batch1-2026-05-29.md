# 验证记录：P2-ST-001D Auth Selector 迁移第一批

日期：2026-05-29

任务编号：P2-ST-001D

修改范围：

- `src/renderer/data/auth/auth-store.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/LoginPage.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/components/Sidebar.tsx`
- `tests/unit/auth-store.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 auth selectors/actions 适配层，并优先替换核心入口调用方：

1. App 登录态判断。
2. React Query 全局 401 清理。
3. Login 写入登录态。
4. Gateway 连接和 force logout 清理。
5. Sidebar 手动退出登录。

本批次不迁移所有页面读取，避免一次性改动过大。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `auth-store.ts` | 新增 `useAuthSession`、`useSetAuthSession`、`useClearAuthSession`、snapshot/action getter。 |
| `App.tsx` | 登录态读取和 401 清理改走 auth selector/action。 |
| `LoginPage.tsx` | 登录成功写入改走 `useSetAuthSession`。 |
| `GatewayBridge.tsx` | Gateway session 和 force logout 清理改走 auth selector/action。 |
| `Sidebar.tsx` | 用户信息 session 和退出登录改走 auth selector/action。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts` | 通过 | 3 个测试文件，8 个用例通过，耗时约 137ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check -- ...auth... App.tsx LoginPage.tsx GatewayBridge.tsx Sidebar.tsx` | 通过 | 检查 diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| auth selector | 通过 | `auth-store.spec.ts` 覆盖 `selectAuthSession`、`selectSetAuthSession`、`selectClearAuthSession`。 |
| 登录态写入入口 | 静态验证通过 | `LoginPage.tsx` 使用 `useSetAuthSession`。 |
| 401 清理入口 | 静态验证通过 | `App.tsx` 使用 `getAuthSessionSnapshot` 和 `getClearAuthSessionAction`。 |
| Gateway session/清理入口 | 静态验证通过 | `GatewayBridge.tsx` 使用 `useAuthSession` 和 `useClearAuthSession`。 |
| 手动退出入口 | 静态验证通过 | `Sidebar.tsx` 使用 `useAuthSession` 和 `useClearAuthSession`。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本批次只替换 selector/action 入口，不新增日志。 |
| traceId/correlationId | 不适用 |
| 可排查问题 | 后续 Codex 可通过 auth selector 定位核心登录态入口。 |
| Codex 检索方式 | `rg -n "useAuthSession|useSetAuthSession|useClearAuthSession|getAuthSessionSnapshot" lpp/lpp_pc_client/src/renderer` |
| 敏感信息处理 | 未新增 token 日志或真实 token 数据。 |

## 遗留风险

1. 仍有多个页面直接读取 `useWorkspaceStore((state) => state.authSession)`，需继续 P2-ST-001D 后续批次。
2. `AuthSession` 类型仍通过 `store.ts` 兼容导出，P2-ST-001E 再处理。
3. API `runtime.ts` 仍从 `store.ts` 导入 `AuthSession` 类型，后续批次迁移到 `auth-session.ts`。

## 下一步

1. 继续 P2-ST-001D 第二批：迁移 `data/runtime.ts`、`static-config.ts`、消息 hooks 中的 `AuthSession` type import 和页面轻量 session 读取。
