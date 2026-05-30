# P8-EL-006B Diagnostics Package Collector

日期：2026-05-29

## 修改范围

- 新增 `src/renderer/data/diagnostics/diagnostics-package.ts`。
- 扩展 `DiagnosticsPayload`，支持 `generatedAt` 和按模块归档的 `diagnostics` 快照。
- 设置页导出按钮改为调用统一诊断包收集器。

## 设计约束

- 页面组件只触发导出，不拼接诊断结构。
- 每个模块最多导出 200 条最近记录，并标记 `truncated`。
- 运行时上下文只包含 userAgent、platform、language、online、pathname、generatedAt，不导出 token 和完整业务实体。
- collector 和 IPC validation 双层脱敏：敏感 key 匹配 `token/password/authorization/secret/credential` 时输出 `[redacted]`，字符串中的 Bearer header 输出 `Bearer ***`。

## 可排查问题

- Gateway/合同/发送/客服状态链路是否有 failed 或 degraded 记录。
- API 请求失败是否可从 `api-error` 记录反查 traceId、phase、message。
- 用户反馈问题时可通过导出的 `traceId`、`module`、`phase`、`result` 还原最近运行状态。
