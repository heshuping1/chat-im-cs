# 验证记录：P3-API-005B API Error Model

日期：2026-05-29
任务编号：P3-API-005B
状态：已完成

## 目标

建立统一 API error model 和用户可见错误映射，避免页面层直接透出后端 message、requestId、HTTP path 等内部细节。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/api/api-error-model.ts` | 新增 `NormalizedApiError`、`ApiErrorKind`、`normalizeApiError`、`formatApiErrorForUser`。 |
| `src/renderer/lib/format.ts` | `formatError` 优先走统一 API error 映射，保留普通本地错误原有行为。 |
| `tests/unit/api-error-model.spec.ts` | 覆盖 401/403/404/429/500、network、abort、脱敏和兼容行为。 |

## 错误映射策略

| 类型 | 用户可见文案 |
| --- | --- |
| `unauthorized` | 登录状态已失效，请重新登录 |
| `forbidden` | 当前账号没有权限执行此操作 |
| `not_found` | 目标内容不存在或已被删除 |
| `rate_limited` | 操作过于频繁，请稍后再试 |
| `server` | 服务暂时不可用，请稍后重试 |
| `network` | 网络连接异常，请检查网络后重试 |
| `aborted` | 操作已取消 |
| `validation/conflict/unknown` | 使用脱敏后的后端 message 或本地错误 message |

## 安全约束

- 用户可见文案会脱敏 `Bearer token`、`requestId=...`、完整 URL。
- `formatError(new Error("本地提示"))` 仍返回原本地提示，避免破坏页面校验体验。
- API error 识别依赖 `status/code/requestId/name/message`，不强绑定 `ApiError` 类，方便后续跨模块复用。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/api-error-model.spec.ts tests/unit/api-error-diagnostics.spec.ts tests/unit/contract-result.spec.ts tests/unit/contract-diagnostics.spec.ts` | 通过，4 files / 10 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P3-API-005B 已完成。页面继续调用 `formatError`，但 API 错误已经统一进入稳定用户文案和脱敏规则。
