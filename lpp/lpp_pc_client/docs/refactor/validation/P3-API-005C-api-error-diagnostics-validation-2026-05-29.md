# 验证记录：P3-API-005C API Error Diagnostics

日期：2026-05-29
任务编号：P3-API-005C
状态：已完成

## 目标

补齐 API error 诊断日志，使 Codex 和开发者能通过运行时记录定位接口失败的 code、requestId、duration、失败阶段和降级动作。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/api/api-error-diagnostics.ts` | 新增 API error 诊断记录、脱敏 path、窗口级调试缓冲区。 |
| `src/renderer/data/api/base.ts` | 在 `executeRequest` 和 `uploadFormData` 失败路径记录底层诊断。 |
| `src/renderer/vite-env.d.ts` | 声明 `window.__lppApiErrorDiagnostics`。 |
| `tests/unit/api-error-diagnostics.spec.ts` | 覆盖 request/upload 记录、query 脱敏、abort 分类。 |

## 日志格式

```ts
interface ApiErrorDiagnosticRecord {
  traceId: string;
  module: "api-error";
  taskId: "P3-API-005C";
  phase: "request" | "upload";
  result: "failed";
  timestamp: number;
  method?: string;
  path?: string;
  durationMs?: number;
  error: NormalizedApiError;
}
```

## 诊断入口

- 调试缓冲区：`window.__lppApiErrorDiagnostics`
- 本地打印开关：`localStorage.lpp.apiErrorDiagnostics=1`
- DEV 环境默认打印 `console.info("[lpp:api-error]", record)`

## 安全约束

- `path` 只保留 query 之前的路径。
- 错误 message 进入 `NormalizedApiError` 时会复用统一脱敏逻辑。
- 不记录请求 body、Authorization header、完整 URL query。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/api-error-model.spec.ts tests/unit/api-error-diagnostics.spec.ts tests/unit/contract-result.spec.ts tests/unit/contract-diagnostics.spec.ts` | 通过，4 files / 10 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P3-API-005C 已完成。API client 底层现在具备统一失败诊断能力，页面无需分散添加日志。
