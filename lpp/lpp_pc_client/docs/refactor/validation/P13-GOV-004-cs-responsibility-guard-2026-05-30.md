# P13-GOV-004 客服缓存职责守卫验证

日期：2026-05-30

## 变更

- 在 P13 职责审计清单中记录客服 cache adapter 的 owner 和过宽职责。
- 将 thread/message/diagnostics helper 拆分登记为 `P14-RESP-002`。
- 扩展架构边界测试，固定当前允许直接导入 `cs-cache-adapter` 的 owner 白名单，禁止新增散落入口。

## 验证命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
```

## 结果

- 客服缓存仍由 `cs-cache-adapter.ts` 统一承载。
- 新增直接依赖 cache adapter 的页面/feature 文件会被测试拦截。

## 遗留

- `cs-cache-adapter.ts` 仍偏宽，后续按 `P14-RESP-002` 做最小职责迁移。
