# 验证记录：P2-ST-001E Auth 旧入口兼容策略

日期：2026-05-29

任务编号：P2-ST-001E

## 目标

明确 `auth` 模块迁移后的旧 workspace auth 入口处理方式，避免为了“删旧链路”过早破坏现有运行时，同时给后续任务和 Codex 会话留下可执行约束。

## 决策

| 项 | 决策 |
| --- | --- |
| 是否删除 `store.ts` 中的 auth 字段 | 暂不删除。当前 `auth-store.ts` 仍以 workspace store 作为 backing store，直接删除会扩大风险。 |
| 是否允许新增直接调用 | 不允许。新增代码必须使用 `data/auth/auth-store.ts` 暴露的 selectors/actions。 |
| `AuthSession` 类型兼容导出 | 暂时保留，标记为兼容出口；新代码必须从 `data/auth/auth-session.ts` 导入。 |
| 回滚点 | 如 auth selector 迁移出现异常，可回滚到 `P2-ST-001D` 前的直接 workspace selector；但不建议新代码继续扩散该路径。 |

## 修改范围

- `src/renderer/data/auth/auth-store.ts`
- `src/renderer/data/store.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 实现内容

1. 在 `auth-store.ts` 入口标注：auth 状态仍由 workspace store 暂时承载，新调用方必须依赖 auth-store。
2. 在 `store.ts` 的 `AuthSession` re-export 处标注：仅兼容旧代码，新代码从 `data/auth/auth-session.ts` 导入。
3. 通过 `rg` 验证页面层无直接 `authSession/setAuthSession/clearAuthSession` workspace selector。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts` | 通过 | 3 个测试文件，8 个用例通过，耗时约 142ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg "useWorkspaceStore\\(\\(state\\) => state\\.(authSession\|setAuthSession\|clearAuthSession)" src/renderer -n` | 通过 | 无剩余直接 auth workspace selector。 |

## 结论

P2-ST-001E 已完成。旧 workspace auth 入口采取“底层兼容、禁止新增直接依赖”的策略，符合当前快速重构和降低风险目标。

## 下一步

继续 P2-ST-001F：补 auth 生命周期结构化诊断日志和测试，确保 Codex 可通过日志排查登录态恢复、持久化、清理问题。
