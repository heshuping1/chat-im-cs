# P10-GOV-001B reuse gate 验证记录

日期：2026-05-30

任务编号：P10-GOV-001B

## 变更

- 在 `architecture-boundaries` 中新增头像 fallback hard gate。
- 禁止 `PcAvatar.tsx` 之外的 renderer 文件重新定义 `avatarInitial`。
- 更新 `PC端公共能力复用与技术选型约束.md`，记录该机械约束。

## 未纳入本批 hard gate 的信号

桌面媒体 IPC 当前仍有多个 UI 触发点直接读取 `window.desktopApi` 能力状态。直接阻断会误伤现有菜单和预览逻辑，因此先保留为 `p10:audit` 报告项。后续应先抽 capability helper，再升级为 hard gate。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/architecture-boundaries.spec.ts` | 通过。 |

## 遗留风险

1. 头像 fallback 已有 hard gate；媒体动作、时间格式化和 CSS owner 仍是后续约束演进项。
