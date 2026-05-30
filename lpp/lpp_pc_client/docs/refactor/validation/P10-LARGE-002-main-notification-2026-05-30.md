# P10-LARGE-002 main notification 验证记录

日期：2026-05-30

任务编号：P10-LARGE-002

## 变更

- 新增 `src/main/desktop-notification.ts`。
- `main.ts` 的 `notify` handler 改为调用 `showDesktopNotification({ mainWindow, payload })`。
- 保留 `Notification.isSupported()`、点击聚焦和 `desktop:notification-clicked` 行为。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 |
| `npm run p10:audit` | 通过，通知 owner 已迁到 main 专用模块 |

## 遗留风险

1. 未做桌面通知实机点击 smoke；后续可并入发布 smoke。
