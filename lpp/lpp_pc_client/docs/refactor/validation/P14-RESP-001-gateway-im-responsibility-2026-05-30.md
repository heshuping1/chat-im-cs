# P14-RESP-001 Gateway / IM 职责迁移验证

日期：2026-05-30

## 职责审查

任务编号：P14-RESP-001

文件 owner：Gateway payload adapter / IM payload / CS payload

当前文件角色：`gateway-payload-utils.ts` 原本同时承载 Gateway raw payload shape 兼容、IM event 构造、read receipt helper、客服 payload 判断和自发消息判断。

当前保留职责：`gateway-payload-utils.ts` 仅保留兼容 re-export facade。

当前混入的非 owner 职责：IM payload、客服 payload、record 读取工具混在同一文件。

准备迁出的职责：

- `gateway-record-utils.ts`：record 读取、字段转换、通用 payload 提取。
- `gateway-im-payload-utils.ts`：IM conversation/message/read receipt payload 归一与 IM core event 构造。
- `gateway-cs-payload-utils.ts`：客服 payload 判断、thread type、客服自发消息判断。

稳定入口或 re-export：`src/renderer/data/gateway/gateway-payload-utils.ts` 保留原导出兼容。

是否改变 API DTO/wire shape：否。

是否改变 React Query query key：否。

是否改变 Zustand/store owner：否。

是否改变 Gateway 事件边界：否。

是否改变 Electron IPC/preload 边界：否。

是否新增依赖：否。

是否删除核心旧链路：否。

是否需要负责人确认：否。

例外登记：`im-read-model.ts` 仍按 P13 审计记录保留为 IM read domain 例外，本任务不拆 read reducer。

## 变更

- 新增 `src/renderer/data/gateway/gateway-record-utils.ts`。
- 新增 `src/renderer/data/gateway/gateway-im-payload-utils.ts`。
- 新增 `src/renderer/data/gateway/gateway-cs-payload-utils.ts`。
- `gateway-payload-utils.ts` 改为 27 行兼容 facade。

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/gateway-event-adapter.spec.ts tests/unit/im-read-service.spec.ts tests/unit/im-message-contract.spec.ts tests/unit/im-core.spec.ts
npm run p12:audit
npm run p10:audit
npm run check:quick
```

## 结果

- 原导入路径保持可用。
- Gateway event、DTO wire shape、query key、store owner 均未改变。
- P12 `data-main-edge-files` 中 `gateway-payload-utils.ts` 不再是大文件观察项。
