# 验证记录：P2-ST-002C Settings Selector 迁移

日期：2026-05-29

任务编号：P2-ST-002C

## 修改范围

- `src/renderer/App.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/components/MePage.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/data/settings/settings-store.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

替换页面和核心运行时中对 `pcSettings/updatePcSetting` 的 workspace 直接读取，统一走 settings selectors/actions。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `usePcSettings()` | App、Sidebar、MessageCenter、ChatWorkspace、MePage 改走 settings hook。 |
| `useUpdatePcSetting()` | MePage 设置写入改走 settings action hook。 |
| `getPcSettingsSnapshot()` | Gateway 非 React 函数读取 settings 改走 settings snapshot。 |
| `PcSettings` 类型 | MePage、App 从 `data/settings/pc-settings.ts` 导入类型。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/pc-settings.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-diagnostics.spec.ts` | 通过 | 5 个测试文件，15 个用例通过，耗时约 162ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg -n "useWorkspaceStore\\(\\(state\\) => state\\.(pcSettings\|updatePcSetting)" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 无剩余页面直接 settings selector。 |
| `rg -n "state\\.pcSettings\|\\.pcSettings" src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 只剩 `store.ts` backing store 和 `settings-store.ts` selector 内部读取。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务迁移 selector/action；P2-ST-002D 补设置变更诊断日志。 |
| 可排查问题 | Codex 可通过 `usePcSettings/useUpdatePcSetting/getPcSettingsSnapshot` 定位 settings 调用方。 |
| Codex 检索方式 | `rg -n "usePcSettings|useUpdatePcSetting|getPcSettingsSnapshot" src/renderer` |
| 敏感信息处理 | 未新增日志；settings 不包含 token。 |

## 结论

P2-ST-002C 已完成。页面层和 Gateway 非 React 逻辑已统一通过 settings 模块访问 PC 设置。

## 下一步

1. P2-ST-002D：补 settings 测试和设置变更诊断日志。
