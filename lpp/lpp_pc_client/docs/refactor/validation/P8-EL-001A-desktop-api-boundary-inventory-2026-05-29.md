# P8-EL-001A Desktop API Boundary 盘点

日期：2026-05-29

## 当前入口

| 层 | 文件 | 现状 |
| --- | --- | --- |
| shared type | `src/shared/desktop-api.ts` | 已定义 `DesktopApi`、media、diagnostics、notification、tray 类型。 |
| preload | `src/preload/preload.cts` | 使用 `contextBridge.exposeInMainWorld('desktopApi', desktopApi)` 暴露方法。 |
| main | `src/main/main.ts` | 注册 `desktop:*` IPC handlers。 |
| media storage | `src/main/media-storage.ts` | 负责远程媒体下载、本地缓存、文件名/路径 segment 基础清理。 |
| renderer | `window.desktopApi` 调用点 | 消息媒体、截图、通知、诊断导出、托盘状态、外链打开。 |

## 风险

- preload 原先只依赖 TypeScript 类型，无运行时入参校验。
- `desktopApi` 方法包含文件、下载、截图、通知、诊断导出等高权限动作。
- main handler 深度白名单、IPC channel ownership、文件系统策略仍需 P8-EL-003/P8-EL-005 继续处理。

## 本任务边界

- 本次只建立 preload typed + validated boundary。
- 不修改 token 存储策略。
- 不删除旧 IPC handler。
- 不修改截图 overlay 的 nodeIntegration 策略，留给 P8-EL-004。
