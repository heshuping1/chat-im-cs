# P13-GOV-003 核心 IM 职责守卫验证

日期：2026-05-30

## 变更

- 在 P13 职责审计清单中记录 IM 页面、hook/controller、model、data/Gateway 边界。
- 将 Gateway payload 偏宽问题登记为 `P14-RESP-001`。
- 扩展架构边界测试，防止页面/feature 新增直接依赖消息缓存 mutation owner 或新增散落 desktopApi 入口。

## 验证命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-read-service.spec.ts tests/unit/send-queue.spec.ts
```

## 结果

- 核心 IM 职责保持在既有 owner 内。
- 新增职责回流会由架构边界测试拦截。

## 遗留

- `gateway-payload-utils.ts` 后续按 `P14-RESP-001` 做最小职责迁移。
