# P8-PERF-003D Message List Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/message-list-windowing.spec.ts tests/unit/message-center-diagnostics.spec.ts tests/unit/message-list-model.spec.ts` | 通过 | 验证窗口模型、消息中心诊断和消息列表模型。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | renderer/shared 类型检查。 |
| `tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 | Electron 类型检查。 |

## 遗留风险

1. 这是分段渲染，不是真正虚拟列表；极端 10000+ 消息、用户持续展开全部时仍会回到大量 DOM。
2. 客服 `ChatWorkspace` 仍存在独立消息 `map`，后续需要在客服列表复用同一窗口模型。
