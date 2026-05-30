# P10-LARGE-003 main file handlers 验证记录

日期：2026-05-30

任务编号：P10-LARGE-003

## 变更

- 新增 `src/main/desktop-file-handlers.ts`。
- 文件、媒体缓存、复制、另存、显示位置、视频播放器和 `saveFile` handler 通过 `registerDesktopFileHandlers` 注册。
- 继续复用 `handleDesktopIpc`、`validateDesktopApiCall`、`assertAllowedLocalMediaFilePath` 和 `ensureLocalMediaFile`。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 |
| `npm run p10:audit` | 通过，`main.ts` 降至 214 行 |

## 遗留风险

1. Windows 文件打开、复制、另存、显示位置仍需 P10-WIN-001 实机验证。
