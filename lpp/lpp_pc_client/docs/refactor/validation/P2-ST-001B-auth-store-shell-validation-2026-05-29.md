# 验证记录：P2-ST-001B Auth Store/Service 壳

日期：2026-05-29

任务编号：P2-ST-001B

修改范围：

- `src/renderer/data/auth/auth-session.ts`
- `src/renderer/data/store.ts`
- `tests/unit/auth-session.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 auth owner 壳，先迁出 `AuthSession` 类型和 auth session storage/service 函数。旧 `useWorkspaceStore` 继续保留 `authSession`、`setAuthSession`、`clearAuthSession` 兼容出口，不改变页面行为。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `AuthSession` 类型 | 从 `store.ts` 移到 `data/auth/auth-session.ts`，`store.ts` 继续 re-export，保持旧 import 兼容。 |
| `authStorageKey` | 收敛到 auth 模块：`lpp.pc.authSession`。 |
| `readStoredAuthSession` | 统一读取 env token 和 localStorage。env token 优先级保持不变。 |
| `persistAuthSession` | 统一写入 auth session。 |
| `clearStoredAuthSession` | 统一清理 auth session。 |
| workspace 兼容 | `store.ts` 内部改为调用 auth service，外部 API 暂不变。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts` | 通过 | 1 个测试文件，5 个用例通过，耗时约 110ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check -- lpp/lpp_pc_client/src/renderer/data/auth lpp/lpp_pc_client/src/renderer/data/store.ts lpp/lpp_pc_client/tests/unit/auth-session.spec.ts` | 通过 | 检查 diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| env token 登录态读取 | 通过 | `createConfiguredAuthSession` 和 `readStoredAuthSession` 测试覆盖。 |
| localStorage 登录态读取 | 通过 | `readStoredAuthSession` 测试覆盖。 |
| malformed storage 降级 | 通过 | malformed JSON 返回 `null`。 |
| auth 持久化和清理 | 通过 | `persistAuthSession`、`clearStoredAuthSession` 测试覆盖。 |
| 旧 store 兼容 | 通过 | `store.ts` re-export `AuthSession`，`setAuthSession`/`clearAuthSession` 外部签名不变。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务只建立 auth service 壳，不改变运行时日志链路。 |
| traceId/correlationId | 不适用 |
| 可排查问题 | 后续 Codex 可定位 auth session owner、storage key、读写函数和兼容出口。 |
| Codex 检索方式 | `rg -n "readStoredAuthSession|persistAuthSession|clearStoredAuthSession|authStorageKey" lpp/lpp_pc_client/src/renderer/data` |
| 敏感信息处理 | 测试使用假 token；代码不新增日志输出 token。 |

## 遗留风险

1. `useWorkspaceStore` 仍持有 `authSession` 兼容字段，调用方尚未迁移到 auth selectors。
2. `setAuthSession` 仍触发 IM read state 重载，P2-ST-001C 需要定义 auth lifecycle bridge。
3. localStorage 存完整 token 的安全问题仍留给 P8-EL-002。

## 下一步

1. 执行 P2-ST-001C：迁移 `readStoredAuth`、`setAuthSession`、`clearAuthSession` 到 auth owner，并定义兼容桥。
