# P8-EL-006A Diagnostics Export Inventory

日期：2026-05-29

## 盘点结论

- 诊断缓冲已分散在 `window.__lpp*Diagnostics`，覆盖 Gateway、Auth、Settings、IM Read、Reminder、API Contract、API Error、Send、MessageCenter、客服状态与客服缓存。
- 设置页原 `exportDiagnostics` 只导出固定 breadcrumbs 和空 errors，无法定位真实核心链路问题。
- Electron `desktop:export-diagnostics` 已经具备保存 JSON 文件能力，缺口在 renderer 侧统一收集、裁剪、脱敏和结构封装。

## 风险

- 诊断包可能携带 token、Authorization header、本地路径等敏感内容。
- 各模块诊断记录结构不完全一致，导出层不能强依赖单一字段模型。
- 诊断记录过多会导致 IPC payload 过大，需要按模块裁剪。
