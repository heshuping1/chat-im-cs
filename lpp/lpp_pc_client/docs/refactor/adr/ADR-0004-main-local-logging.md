# ADR-0004: Main Process Local Logging

## Status

Accepted

## Date

2026-06-04

## Related Tasks

- P1-OBS-001
- P8-EL-006

## Context

PC 客户端已经有按模块收敛的 diagnostics 缓冲和 JSONL 诊断文件，能支持设置页导出和问题复盘。但 main 进程缺少成熟本地日志底座，Electron 启动、IPC、崩溃和运行时异常主要依赖自研 JSONL 或诊断包，缺少统一日志级别、文件 transport 和轮转能力。

## Decision

- 引入 `electron-log` 作为 main 进程本地日志底座。
- `electron-log` 只能由 `src/main/app-logging.ts` 直接依赖，业务、renderer、preload 和其它 main 模块必须通过内部 logging facade。
- 现有 diagnostics 缓冲、设置页导出和 JSONL 诊断文件继续保留，不在本阶段替换。
- Electron runtime diagnostics 继续进入 diagnostics export，同时镜像到 main 本地日志文件。
- 生产环境默认 `info` 及以上写文件，开发环境允许 `debug`；敏感字段进入日志前必须脱敏。

## Alternatives Considered

### 只整理自研 diagnostics

- 优点：无新增依赖。
- 缺点：文件 transport、级别、轮转和 Electron 生态适配仍需继续自研。
- 结论：不接受，长期维护成本不划算。

### 使用 winston 或 pino

- 优点：通用能力强，生态成熟。
- 缺点：对 Electron 桌面本地日志不是最小贴合方案，配置和依赖复杂度更高。
- 结论：不作为当前 PC 客户端本地日志首选。

### 直接接远程可观测平台

- 优点：线上定位能力强。
- 缺点：需要服务端、隐私、采样、成本和合规决策。
- 结论：登记为后续阶段，不在本阶段引入。

## Consequences

- 正面影响：main 进程具备成熟本地日志文件、日志级别和基础轮转能力。
- 代价：新增一个运行时依赖，需要持续维护内部 facade 和架构边界测试。
- 风险：Windows 打包态仍需实机验证日志目录、权限和文件轮转行为。
- 回滚方式：移除 `electron-log` 依赖和 `app-logging` facade，runtime diagnostics 保持现有 JSONL 路径可继续工作。

## Validation

- `npx vitest run tests/unit/app-logging.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts`
- `npm run check:quick`
