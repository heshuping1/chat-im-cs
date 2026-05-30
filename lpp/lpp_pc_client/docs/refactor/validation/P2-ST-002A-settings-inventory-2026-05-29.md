# 验证记录：P2-ST-002A Settings 读写点盘点

日期：2026-05-29

任务编号：P2-ST-002A

## 目标

盘点 PC settings、窗口偏好、通知偏好的读写点和持久化位置，为后续建立 settings owner/service 提供迁移清单。

## 当前状态

| 类别 | 当前实现 | 风险 |
| --- | --- | --- |
| 类型与默认值 | `src/renderer/data/store.ts` 内定义 `PcSettings`、`defaultPcSettings`。 | settings 与 auth、IM read、UI layout 混在一个 workspace store。 |
| 持久化 | `store.ts` 通过 `lpp.pc.settings` 写入 `window.localStorage`。 | 无版本号、无迁移策略、无诊断日志。 |
| 更新入口 | `updatePcSetting(key, value)` 在 `store.ts` 内直接持久化整份 settings。 | 任意字段更新都触发整包覆盖；缺少字段级变更日志。 |
| 设置页面 | `MePage.tsx` 读取 `pcSettings` 并调用 `updatePcSetting`。 | UI 表单、远端隐私设置、本地偏好混在同一页面。 |
| 外观应用 | `App.tsx` 根据 `theme/skin/fontSize/reduceMotion/highDensityContext/highContrastBoundary` 设置 DOM dataset/class。 | 外观副作用散在 App，后续主题切换应收敛到 settings/application 层。 |
| 通知判断 | `Sidebar.tsx`、`GatewayBridge.tsx`、`ChatWorkspace.tsx` 读取通知开关。 | 通知策略散落，容易重复触发或漏过滤。 |
| IM 输入偏好 | `MessageCenter.tsx` 将 `screenshotShortcut` 传给 `MessageComposer`。 | 可迁移到 settings selector，避免整份 settings 订阅。 |
| 清理本地缓存 | `MePage.tsx` 直接 `localStorage.removeItem("lpp.pc.message-cache")`。 | 存储 key 散落在页面，后续应收敛到 repository/service。 |
| Electron 主进程 | `src/main/main.ts` 管理窗口、托盘、系统通知；当前未读取 `PcSettings`。 | `minimizeToTray/launchAtStartup` 等设置尚未真正桥接到主进程。 |

## 读写点清单

| 文件 | 读/写字段 | 用途 | 迁移建议 |
| --- | --- | --- | --- |
| `src/renderer/data/store.ts` | 全部 `PcSettings` | 类型、默认值、持久化、更新 action。 | P2-ST-002B 建立 `data/settings/settings-session.ts` 或 `settings-store.ts` owner 壳。 |
| `src/renderer/App.tsx` | `theme/skin/fontSize/reduceMotion/highDensityContext/highContrastBoundary` | 应用全局外观。 | 提供 `usePcSettings()` 或更细 `useAppearanceSettingsState()`。 |
| `src/renderer/components/MePage.tsx` | 全部设置项，写入 `updatePcSetting`。 | 设置表单。 | 改用 settings selectors/actions；远端隐私设置与本地设置分层。 |
| `src/renderer/components/Sidebar.tsx` | `serviceQueueNotifications/desktopNotifications` | 客服队列提醒和桌面通知。 | 通知策略迁至 reminder/notification service，settings 只提供开关。 |
| `src/renderer/components/GatewayBridge.tsx` | `serviceQueueNotifications/desktopNotifications` | Gateway 推送触发提醒。 | 与 Sidebar/ChatWorkspace 去重，避免三处各自判断。 |
| `src/renderer/components/ChatWorkspace.tsx` | `serviceQueueNotifications/desktopNotifications` | 客服消息提醒。 | 改用 notification policy。 |
| `src/renderer/components/MessageCenter.tsx` | `screenshotShortcut` | 传入消息输入框截图快捷键。 | 改为细粒度 selector，避免订阅整份 settings。 |
| `src/renderer/components/MessageComposer.tsx` | `screenshotShortcut` props | 快捷键判断。 | 保持 props 或后续由 composer settings hook 注入。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "pcSettings\|updatePcSetting\|PcSettings" src/renderer src/main src/shared -g "*.ts" -g "*.tsx"` | 通过 | 识别 settings 类型、读写入口和调用方。 |
| `rg -n "BrowserWindow\|tray\|Tray\|Notification\|setLoginItemSettings\|localStorage\|lpp\\.pc\\.settings" src/main src/renderer -g "*.ts" -g "*.tsx"` | 通过 | 识别窗口、托盘、通知、本地存储相关点。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务为盘点，不改运行时。 |
| 可排查问题 | 后续 Codex 可根据本清单定位 settings owner 拆分范围。 |
| Codex 检索方式 | `rg -n "pcSettings|updatePcSetting|PcSettings" lpp/lpp_pc_client/src/renderer` |
| 敏感信息处理 | 未输出用户数据。 |

## 结论

P2-ST-002A 已完成。settings 的主要问题不是字段本身，而是 owner、持久化、外观副作用、通知策略仍混在 workspace/page 中。

## 下一步

1. P2-ST-002B：建立 settings owner/service 壳，先迁出类型、默认值、读取、持久化，不立即重写所有调用方。
2. P2-ST-002C：迁移 `pcSettings`、`updatePcSetting` 调用方，优先 App、MePage、MessageCenter。
3. P2-ST-002D：补 settings 测试和设置变更诊断日志。
