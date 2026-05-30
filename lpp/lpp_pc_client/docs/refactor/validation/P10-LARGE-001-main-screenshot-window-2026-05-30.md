# P10-LARGE-001 main screenshot window 验证记录

日期：2026-05-30

任务编号：P10-LARGE-001

修改范围：

- `src/main/main.ts`
- `src/main/screenshot-selection-window.ts`
- `docs/refactor/PC端P10可执行任务清单.md`
- `docs/refactor/PC端重构任务矩阵.md`
- `docs/refactor/validation/P10-LARGE-001-main-screenshot-window-2026-05-30.md`

## 变更

- 将截图选择 overlay `BrowserWindow` 创建、动态 channel、ready/result/cancel/closed 清理逻辑迁出 `main.ts`。
- 新增 `src/main/screenshot-selection-window.ts` 作为截图选择窗口 owner。
- `main.ts` 保留屏幕源捕获和 `selectScreenshotRegion` 调用编排。
- 保持 channel 前缀、preload 路径、`contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`、`setAlwaysOnTop(true, 'screen-saver')` 不变。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 | Electron main/preload/shared 类型检查通过。 |
| `npm run check:quick` | 通过 | 类型、Electron 类型、核心 lint、architecture boundary、desktop API validation、docs、shape gate 通过。 |
| `npm run p10:audit` | 通过 | `main.ts` 不再出现在 large-files；仍报告后续任务中的 MePage/MessageCenter/MessageComposer/MessageBodyView 等已登记信号。 |
| `npm run docs:check` | 通过 | refactor docs 校验通过。 |
| `npm run build` | 通过 | renderer production build 与 Electron TS 编译通过；Rollup 仅提示 SignalR PURE 注释位置警告。 |
| `git diff --check` | 通过 | 无 whitespace error。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| Mac 实机截图选择 | 未执行 | 当前任务按静态与构建验证收尾，未启动 Electron 实机截图。 |
| Windows 实机截图选择 | 跳过 | 用户明确要求 Windows 实机验证先跳过；保留到 P10-WIN-001。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 不涉及新增诊断入口；本任务只迁移截图选择窗口 owner。 |
| traceId/correlationId | 不涉及。 |
| 可排查问题 | 截图窗口配置现在可通过 `rg "desktop:screenshot-selection|screenshot-selector-preload|setAlwaysOnTop" src/main/screenshot-selection-window.ts` 集中审查。 |
| Codex 检索方式 | `rg "selectScreenshotRegion|desktop:screenshot-selection|screenshot-selector-preload" src/main` |
| 敏感信息处理 | 不新增日志，不输出截图 data URL 或 raw payload。 |

## 完成标准

| 标准 | 结果 |
| --- | --- |
| `main.ts` 行数低于 850 | 通过，当前 395 行。 |
| 截图窗口配置集中审查 | 通过，集中到 `src/main/screenshot-selection-window.ts`。 |
| 不新增依赖 | 通过。 |
| 不改变截图业务行为 | 仅做 owner 迁移；待后续实机 smoke 补证据。 |

## 遗留风险

1. 未执行 Mac/Windows 实机截图 smoke；Windows 验证仍归入 P10-WIN-001。

## 下一步

1. 继续 P10 推荐顺序中的 P10-LARGE-002。
