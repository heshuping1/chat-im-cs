# 验证记录：P3-API-004C CS Normalizer Fixtures/Tests

日期：2026-05-29

任务编号：P3-API-004C

## 修改范围

- `tests/unit/cs-contract.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

补齐客服 normalizer fixtures/tests，覆盖 queued/serving/ai/closed/rated 中本阶段最关键的 queued、closed、缺字段、profile 降级等场景。

## 覆盖场景

| 场景 | 覆盖方式 | 期望 |
| --- | --- | --- |
| queued temp session | `normalizes a complete queued temp session thread` | `temp-session -> temp_session`，`isTerminal=false`。 |
| closed 兼容字段 | `accepts compatible fields and maps back to CustomerServiceThread` | `closed-by-staff` 归一为终态。 |
| 缺 thread id | `marks missing thread id as invalid...` | `status=invalid`，issue `cs.thread.missing_id`。 |
| 缺 status/title | 同上 | `status=degraded`，fallback `访客`。 |
| 完整 profile | `normalizes customer profile without exposing sensitive fields in issues` | profile 正常归一，issues 不包含敏感值。 |
| 缺 profile 展示名 | `degrades profile display name fallback` | fallback `访客`，issue `cs.profile.missing_display_name`。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/cs-contract.spec.ts tests/unit/contract-diagnostics.spec.ts tests/unit/im-message-contract.spec.ts` | 通过 | 3 个测试文件，11 个用例通过，耗时约 143ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 与 P3-API-004B 同轮类型检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为测试覆盖登记。 |
| 日志入口 | P3-API-004B 已接入 `logApiContractDiagnostic`。 |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>`。 |
| 可用于排查的问题 | 测试覆盖客服 thread/profile 的 ok/degraded/invalid 场景。 |
| 敏感信息处理 | fixtures 使用虚拟 ID/URL，不使用真实手机号、邮箱、交易、风险明细。 |

## 结论

P3-API-004C 已完成。客服 normalizer 具备最小单测保护。
