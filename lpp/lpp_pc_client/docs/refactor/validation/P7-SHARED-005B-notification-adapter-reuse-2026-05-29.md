# P7-SHARED-005B Notification Adapter 复用

日期：2026-05-29

## 结论

通知触发 adapter 已由 P2 reminder owner 承担，本阶段复用现有实现，不重复造轮子。

## 已满足项

- 设置策略统一由 `ReminderPolicySettings` 和 `shouldPushRealtimeReminder/shouldShowDesktopNotification` 判断。
- 桌面通知统一由 `notifyDesktopOrBrowser` 处理 Electron/browser fallback。
- 诊断日志统一进入 `window.__lppReminderDiagnostics`。
- Store 读写通过 `reminder-store` selectors/hooks。

## 后续

- P8 处理 `desktopApi.notify` 的 typed boundary、payload 校验和 preload 安全。
- 如未来要统一页面 toast，应单独建立 toast model，不混入跨模块 reminder。
