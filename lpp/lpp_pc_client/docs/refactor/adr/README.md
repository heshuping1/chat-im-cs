# PC 端 ADR 记录

ADR 用于记录重要技术决策的原因、备选方案、结果和代价。不要用 ADR 记录普通实现细节。

---

## 什么时候必须写 ADR

1. 新增或替换运行时依赖。
2. 改变 Gateway、Store、API、消息底座、Electron IPC 的职责边界。
3. 选择安全、性能、日志、测试等长期方案。
4. 删除或替换核心链路旧实现。
5. 某个决定未来逆转成本较高。

---

## 命名规则

```text
ADR-0001-gateway-event-layering.md
ADR-0002-auth-token-storage.md
ADR-0003-message-entity-model.md
```

编号递增。旧 ADR 不删除；如果被替代，写新 ADR 并在旧 ADR 标注 superseded。

---

## 模板

```markdown
# ADR-000X: 标题

## Status

Proposed | Accepted | Superseded | Deprecated

## Date

YYYY-MM-DD

## Related Tasks

- P*-***

## Context

为什么需要做这个决策？当前代码、产品、接口、性能或安全约束是什么？

## Decision

最终决定是什么？

## Alternatives Considered

### 方案 A

- 优点：
- 缺点：
- 结论：

### 方案 B

- 优点：
- 缺点：
- 结论：

## Consequences

- 正面影响：
- 代价：
- 风险：
- 回滚方式：

## Validation

- 类型检查：
- 单测：
- 手工验证：
- 诊断日志：
```
