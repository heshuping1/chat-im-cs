# 验证记录：P3-API-005A API Error 路径盘点

日期：2026-05-29

任务编号：P3-API-005A

## 盘点范围

- `src/renderer/data/api/base.ts`
- `src/renderer/lib/format.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/ThreadList.tsx`
- `src/renderer/components/LoginPage.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/MePage.tsx`
- `src/renderer/components/ContactsPage.tsx`
- `src/renderer/components/WorkbenchPage.tsx`

## 当前错误模型

| 位置 | 当前行为 |
| --- | --- |
| `ApiError` | 保存 `message/code/requestId/status`。 |
| `ApiBaseClient.executeRequest` | `fetch` 非 2xx 或 envelope code 非 OK/SUCCESS 时抛 `ApiError`。 |
| `uploadFormData` | XHR 网络错误、非 2xx、envelope 错误时抛 `ApiError`；abort 抛 `DOMException`。 |
| `formatError` | 直接返回 `Error.message`，没有统一 code/status 映射。 |
| `App.tsx` | React Query 默认对 401 不重试，并通过 `handleUnauthorizedError` 清登录态。 |

## 主要 UI 处理路径

| 页面/模块 | 当前行为 | 风险 |
| --- | --- | --- |
| `MessageCenter` | 大量 mutation `onError` 直接 `formatError(error)` 写 toast。 | 用户文案直接暴露后端 message/requestId。 |
| `ChatWorkspace` | 终态写错误有特殊判断，其余直接 `formatError`。 | 终态、权限、网络错误映射不统一。 |
| `ThreadList` | mutation 抛 Error，部分无 onError 展示。 | 有静默失败风险。 |
| `Sidebar` | 二维码失败写 account notice。 | 文案仍直接透出。 |
| `MePage/Contacts/Workbench/AiAssistant` | query/mutation error 多数直接 `formatError`。 | 缺统一用户可见错误模型。 |
| `GatewayBridge` | 部分 `.catch(() => undefined)` 静默处理。 | Gateway 是加速链路，静默可接受，但需诊断日志覆盖。 |
| media/avatar cache | 多处 `.catch(() => undefined)` 或本地错误。 | 属于局部降级，不应全部 toast，但需要后续媒体诊断。 |

## 当前重试与跳登录

| 位置 | 当前行为 |
| --- | --- |
| `App.tsx` `QueryClient` | query/mutation 默认遇到 `ApiError.status === 401` 不重试；其他错误最多重试 1 次。 |
| `App.tsx` `handleUnauthorizedError` | 401 后清理 auth session。 |
| `GatewayBridge` force logout events | 收到 auth 事件后清 query cache 并清理 auth session。 |

## 主要问题

| 问题 | 影响 | 后续处理 |
| --- | --- | --- |
| `formatError` 过于底层 | 后端 message、requestId、HTTP path 可能直接展示给用户。 | P3-API-005B 建立 user-facing error mapping。 |
| 缺 API error 诊断日志 | 很难知道哪个接口失败、status/code/requestId/duration。 | P3-API-005C 接入日志。 |
| 静默 catch 没有统一 reason | Codex 排查时只能看代码，缺运行时证据。 | P3-API-005C 先覆盖 API client 层。 |
| onError 散落 | 页面每个 mutation 自己拼文案。 | 后续页面瘦身时迁到 use case/view model。 |

## 推荐 P3-API-005B/C 最小切入

1. 新增 `data/api/api-error-model.ts`。
2. 提供 `normalizeApiError`、`toUserFacingApiError`、`formatApiErrorForUser`。
3. 更新 `formatError` 优先使用统一错误映射，保持调用方不大改。
4. 新增 `data/api/api-error-diagnostics.ts`。
5. 在 `ApiBaseClient` 对 request/upload failed 统一记录 status、code、requestId、duration、method、path。
6. 日志不记录 token、Authorization、body、完整 query string。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `sed -n '1,240p' src/renderer/data/api/base.ts` | 通过 | 确认 ApiError 和 request/upload 错误路径。 |
| `sed -n '1,220p' src/renderer/lib/format.ts` | 通过 | 确认当前 `formatError` 直接透出 Error.message。 |
| `rg -n "ApiError|formatError|onError|catch\\(|throw new Error|clearAuthSession|401|..." src/renderer -g '*.ts' -g '*.tsx'` | 通过 | 检索错误处理与静默 catch。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为盘点。 |
| 日志入口 | P3-API-005C 新增 API error diagnostics。 |
| traceId/correlationId | 后续沿用 `api-error-<phase>-<timestamp>-<random>`。 |
| 可用于排查的问题 | API 失败接口、status/code/requestId/duration 会在后续接入。 |
| 敏感信息处理 | 本任务只列路径和字段，不记录 token、body、用户隐私。 |

## 结论

P3-API-005A 已完成。当前错误处理可用但分散，下一步应以不大改页面的方式先统一错误模型和 `formatError`。
