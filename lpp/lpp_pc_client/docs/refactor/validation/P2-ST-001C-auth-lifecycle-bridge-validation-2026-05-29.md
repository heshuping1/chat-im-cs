# 验证记录：P2-ST-001C Auth Lifecycle Bridge

日期：2026-05-29

任务编号：P2-ST-001C

修改范围：

- `src/renderer/data/auth/auth-workspace-bridge.ts`
- `src/renderer/data/auth/auth-session.ts`
- `src/renderer/data/store.ts`
- `tests/unit/auth-workspace-bridge.spec.ts`
- `tests/unit/auth-session.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

迁移 `readStoredAuth`、`setAuthSession`、`clearAuthSession` 的核心 owner 到 auth 模块，并把 workspace 兼容副作用收敛为可测试的 lifecycle bridge。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `readStoredAuth` | `store.ts` 内部已代理到 `readStoredAuthSession()`。 |
| `setAuthSession` | `store.ts` 保留旧 API，但持久化由 `persistAuthSession()` 负责。 |
| auth applied bridge | `createAuthSessionAppliedState()` 显式返回 authSession 和 IM read state reload 结果。 |
| `clearAuthSession` | `store.ts` 保留旧 API，但 storage 清理由 `clearStoredAuthSession()` 负责。 |
| auth cleared bridge | `createAuthSessionClearedState()` 显式返回清理后的 workspace 兼容状态。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts` | 通过 | 2 个测试文件，7 个用例通过，耗时约 119ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check -- lpp/lpp_pc_client/src/renderer/data/auth lpp/lpp_pc_client/src/renderer/data/store.ts lpp/lpp_pc_client/tests/unit/auth-session.spec.ts lpp/lpp_pc_client/tests/unit/auth-workspace-bridge.spec.ts` | 通过 | 检查 diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 登录态读取 owner | 通过 | `readStoredAuthSession` 测试覆盖 env/localStorage/malformed。 |
| 登录态应用副作用 | 通过 | `createAuthSessionAppliedState` 测试确认 read-state reloaders 被调用。 |
| 登录态清理副作用 | 通过 | `createAuthSessionClearedState` 测试确认 active ids/read state 被清空。 |
| 旧 API 兼容 | 通过 | `store.ts` 仍暴露 `authSession`、`setAuthSession`、`clearAuthSession`。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务抽取 lifecycle bridge，不新增运行时日志。 |
| traceId/correlationId | 不适用 |
| 可排查问题 | 后续 Codex 可定位 auth apply/clear 对 workspace 的兼容副作用。 |
| Codex 检索方式 | `rg -n "createAuthSessionAppliedState|createAuthSessionClearedState|readStoredAuthSession" lpp/lpp_pc_client/src/renderer/data` |
| 敏感信息处理 | 未记录真实 token；测试使用假 token。 |

## 遗留风险

1. 页面和功能模块仍直接从 `useWorkspaceStore` 读取 `authSession`，P2-ST-001D 需要分批替换。
2. `AuthSession` 仍通过 `store.ts` re-export 兼容旧 import，P2-ST-001E 再决定删除或保留兼容期。
3. localStorage token 安全问题仍留给 P8-EL-002。

## 下一步

1. 执行 P2-ST-001D：替换登录、Gateway、API 初始化等调用方使用 auth selectors/actions。
