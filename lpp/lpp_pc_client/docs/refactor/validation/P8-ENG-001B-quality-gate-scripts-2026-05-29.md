# P8-ENG-001B Quality Gate Scripts

日期：2026-05-29

## 新增脚本

| 脚本 | 内容 |
| --- | --- |
| `npm run lint:boundaries` | 运行架构边界结构测试。 |
| `npm run check:quick` | 运行 renderer typecheck、Electron typecheck、架构边界测试和 desktopApi validation 测试。 |

## 覆盖范围

- TypeScript strict 类型错误。
- Electron main/preload/shared 类型错误。
- renderer/main/preload/shared 依赖方向。
- desktopApi IPC payload validation 和 channel whitelist。

## 后续

如果引入 ESLint/Prettier，需要先确认依赖、规则集、历史格式化范围和 CI 执行策略。
