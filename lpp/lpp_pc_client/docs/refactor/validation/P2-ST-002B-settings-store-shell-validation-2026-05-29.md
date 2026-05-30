# 验证记录：P2-ST-002B Settings Owner 壳

日期：2026-05-29

任务编号：P2-ST-002B

## 修改范围

- `src/renderer/data/settings/pc-settings.ts`
- `src/renderer/data/settings/settings-store.ts`
- `src/renderer/data/store.ts`
- `tests/unit/pc-settings.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 settings owner/service 壳，先迁出 `PcSettings` 类型、默认值、读取、持久化和 selectors/actions，降低 `store.ts` 继续膨胀的风险。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `pc-settings.ts` | 承载 `PcSettings`、`defaultPcSettings`、`pcSettingsStorageKey`、读取/解析/合并/持久化函数。 |
| `settings-store.ts` | 提供 `usePcSettings()`、`useUpdatePcSetting()` 以及可测试 selectors。 |
| `store.ts` | 继续作为临时 backing store，但 settings 类型和持久化逻辑不再定义在大 Store 内。 |
| 兼容出口 | `store.ts` 暂时 re-export `PcSettings`，并标注新代码应从 `data/settings/pc-settings.ts` 导入。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/pc-settings.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-diagnostics.spec.ts` | 通过 | 5 个测试文件，15 个用例通过，耗时约 168ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `rg -n "interface PcSettings\|defaultPcSettings\|pcSettingsStorageKey\|readStoredPcSettings\|persistPcSettings" src/renderer/data src/renderer/components -g "*.ts" -g "*.tsx"` | 通过 | settings owner 已迁到 `data/settings`，`store.ts` 只保留调用。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务只建立 settings 壳；P2-ST-002D 再补设置变更诊断日志。 |
| 可排查问题 | Codex 可通过 `settings-store.ts` 定位新 settings 入口。 |
| Codex 检索方式 | `rg -n "usePcSettings|useUpdatePcSetting|readStoredPcSettings|persistPcSettings" src/renderer` |
| 敏感信息处理 | settings 不包含 token；未新增敏感日志。 |

## 结论

P2-ST-002B 已完成。settings 的 owner 壳已建立，后续调用方可以逐步迁移到 settings selectors/actions。

## 下一步

1. P2-ST-002C：迁移 `pcSettings`、`updatePcSetting` 调用方，优先 App、MePage、MessageCenter、通知判断入口。
