# ADR-0005: PC Local Data SQLite Plane

## Status

Accepted

## Date

2026-06-07

## Related Tasks

- P28-LD-001
- P28-LD-002
- P28-LD-003
- P28-LD-005

## Context

P27 已把普通 IM 成功消息落到 renderer IndexedDB，但媒体索引仍在 renderer localStorage，媒体文件在 Electron main 文件系统。这个 owner 分裂会导致聊天首屏、提醒、搜索、清理和诊断长期不一致。

PC 端要达到顶级 IM 本地体验，需要一个 main 侧本地数据平面，统一承载消息、会话投影、媒体索引、发送箱、搜索、清理和诊断。当前服务端 API 不提供精确 gap sync，也不做跨设备全量历史搜索，所以 P28 的本地数据平面只承诺本机已见事实。

## Decision

采用 `better-sqlite3` 作为 P28 SQLite driver，数据库位于：

```text
{app.getPath("userData")}/LPP Local Data/profiles/{profileId}/lpp-local-v1.sqlite
```

LocalDataService 通过 typed desktop IPC 暴露给 renderer。Renderer 不接触 SQL、DB 连接或真实本地路径；现有 `ImMessageStore` owner 优先使用 desktop LocalDataService，浏览器环境和回滚场景保留 IndexedDB / memory fallback。

## Alternatives Considered

### 继续扩展 IndexedDB

- 优点：无需 native 依赖，当前 P27 已可用。
- 缺点：renderer owner、安全边界、搜索、清理、媒体引用和事务一致性都不适合 PC 端长期本地数据平面。
- 结论：仅保留为迁移 fallback。

### JSON 文件持久化

- 优点：实现简单，适合早期 driver 抽象和测试。
- 缺点：查询、FTS、迁移、事务和并发能力不足。
- 结论：可作为测试/回滚辅助，不作为 P28 主方案。

### `better-sqlite3`

- 优点：SQLite/WAL/FTS5 能力完整，事务清晰，适合本机数据平面。
- 缺点：native dependency 需要 Electron 打包和 Windows 实机验证。
- 结论：作为 P28 主 driver；发布前 Windows packaged smoke 是阻塞项。

## Consequences

- 正面影响：消息、搜索和后续媒体索引可以进入统一 main 侧事实源。
- 代价：新增 native dependency 和打包验证成本。
- 风险：Windows packaged app 可能出现 native module 加载或 rebuild 问题。
- 回滚方式：关闭 LocalDataService SQLite driver，回退到 P27 IndexedDB read model；不删除已生成 SQLite 文件。

## Validation

- 类型检查：`npm run typecheck -- --pretty false`
- 单测：`tests/unit/local-data-sqlite-driver.spec.ts`
- 手工验证：P28-LD-015 发布前执行 Mac/Windows packaged smoke。
- 诊断日志：后续 P28-LD-003 补齐 migration/write/gap/media/cleanup diagnostics。
