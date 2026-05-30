# ADR-0002: Diagnostics Package Export

## Status

Accepted

## Date

2026-05-29

## Related Tasks

- P1-OBS-001
- P8-EL-006
- P8-PERF-001

## Context

项目已经在 Gateway、Auth、Settings、API、Send、MessageCenter、客服状态等模块建立了结构化诊断缓冲，但设置页导出的诊断包只包含固定 breadcrumbs，无法支撑 Codex 或工程师定位偶发问题。

## Decision

- 诊断包由 renderer 统一 collector 生成，页面只触发导出。
- 每个模块按最近记录裁剪，避免 IPC payload 过大。
- collector 和 shared validation 双层脱敏敏感字段。
- startup 性能诊断也进入同一诊断包。

## Alternatives Considered

### 每个页面自行拼诊断包

- 优点：实现快。
- 缺点：日志散落，格式不一致，敏感信息风险更高。
- 结论：不接受。

### 引入外部日志 SDK

- 优点：功能完整。
- 缺点：需要服务端、隐私、采样和成本决策，不适合当前重构阶段。
- 结论：登记为后续可选项，不在本阶段引入。

## Consequences

- 正面影响：用户可主动导出可脱敏、可定位的诊断包。
- 代价：需要维护 `window.__lpp*Diagnostics` 到诊断包模块映射。
- 风险：crash 自动采集尚未接入。
- 回滚方式：设置页恢复为固定 payload 导出。

## Validation

- `vitest run tests/unit/diagnostics-package.spec.ts tests/unit/desktop-api-validation.spec.ts`
- `tsc --noEmit --pretty false --skipLibCheck`
