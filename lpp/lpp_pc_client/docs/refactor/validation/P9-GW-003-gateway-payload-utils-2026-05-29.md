# P9-GW-003 Gateway payload utils 验证记录

日期：2026-05-29

## 目标

- 将 `GatewayBridge.tsx` 中的 raw payload 字段提取、消息归一化、客服线程识别、自发消息判断抽到 Gateway 数据层。
- 让 React bridge 回到连接、订阅、调度职责，避免页面层继续解释 raw Gateway payload。
- 将 `GatewayBridge.tsx` 移出大文件 allowlist，形成可持续约束。

## 变更

- 新增 `src/renderer/data/gateway/gateway-payload-utils.ts`。
- `GatewayBridge.tsx` 改为复用 payload utils，文件从 1028 行降到 583 行。
- `tests/unit/im-core.spec.ts` 改为从 Gateway 数据层导入 IM core Gateway 测试入口。
- `scripts/check-code-shape.mjs` 移除 `GatewayBridge.tsx` allowlist。

## 验证

- `vitest run tests/unit/im-core.spec.ts tests/unit/gateway-event-registry.spec.ts tests/unit/gateway-query-invalidation.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/cs-gateway-event-adapter.spec.ts tests/unit/gateway-dispatcher.spec.ts tests/unit/gateway-diagnostics.spec.ts`
  - 结果：通过，7 个测试文件，92 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npm run lint:shape`
  - 结果：通过，`GatewayBridge.tsx` 不再出现在 allowlist warning 中。

## 结论

P9-GW-003 已完成。Gateway 领域已从历史大文件风险收敛到可测试、可约束的数据层 helper + bridge 调度结构，后续新增 Gateway 事件必须沿 adapter/handler/diagnostics/test 扩展。
