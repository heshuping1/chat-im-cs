# P8-EL-004A Screenshot Window 盘点

日期：2026-05-29

## 旧状态

截图选择窗口在 `src/main/main.ts` 内创建：

- `contextIsolation: false`
- `nodeIntegration: true`
- inline HTML 直接 `require('electron')`
- 通过动态 `desktop:screenshot-selection:*` channel 回传结果

## 风险

- 截图窗口虽然加载本地 data URL，但仍不应让页面脚本直接拥有 Node/Electron 能力。
- 动态 channel 需要限制在 main 创建的 channel 上，不能让页面任意指定。

## 本轮目标

- 保留截图交互行为。
- 移除截图页面脚本中的 `require('electron')`。
- 使用独立 preload 暴露最小截图 API。
