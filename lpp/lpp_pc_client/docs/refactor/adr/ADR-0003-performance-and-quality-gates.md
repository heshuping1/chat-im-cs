# ADR-0003: Performance And Quality Gates

## Status

Accepted

## Date

2026-05-29

## Related Tasks

- P8-PERF-001
- P8-PERF-002
- P8-PERF-003
- P8-PERF-004
- P8-ARCH-001
- P8-ENG-001
- P8-ENG-002
- P8-ENG-003

## Context

PC 客服 IM 客户端需要快速看到重构效果，同时避免新增大量工具链依赖导致配置和历史格式化成本。性能问题需要先有预算和可观测指标，再做 bundle、列表和媒体优化。

## Decision

- 建立启动性能预算：first interactive 2500ms，renderer entry 800ms。
- 首批 bundle 优化使用 Vite manualChunks 和 GatewayBridge 登录后动态加载。
- 长消息列表先用尾部分段渲染，不引入虚拟列表库。
- 视频预览未播放只 preload metadata，播放后再 auto。
- 工程门禁先使用 `check:quick`、`test:core`、架构边界测试和 CI workflow，不新增 ESLint/coverage 依赖。

## Alternatives Considered

### 立即引入完整 ESLint/Prettier/Coverage 阈值

- 优点：规范体系更完整。
- 缺点：规则选择、历史修复和格式化 churn 会拖慢当前重构。
- 结论：后续单独确认依赖和规则集。

### 直接引入虚拟列表库

- 优点：长列表能力更完整。
- 缺点：消息定位、未读跳转、动态高度和媒体加载风险更高。
- 结论：先分段渲染，后续基于数据决定是否引库。

## Consequences

- 正面影响：性能优化有预算、有诊断、有构建数据；工程门禁可快速运行。
- 代价：当前门禁不是完整 lint/coverage 体系。
- 风险：分段渲染不是完整虚拟化，极端长会话仍需后续专项。
- 回滚方式：移除 manualChunks、恢复 GatewayBridge 静态 import、恢复消息全量渲染。

## Validation

- `npm run check:quick`
- `npm run test:core`
- `npm run build`
- `playwright test --list`
