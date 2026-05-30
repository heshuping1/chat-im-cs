# P14-RESP-002 客服 Cache 职责迁移验证

日期：2026-05-30

## 职责审查

任务编号：P14-RESP-002

文件 owner：Customer Service React Query cache owner

当前文件角色：`cs-cache-adapter.ts` 原本同时承载 thread/detail/list cache 更新、本地消息合并、消息构造/预览/identity 和 cache diagnostics。

当前保留职责：thread/detail/list cache 更新与 React Query 写入。

当前混入的非 owner 职责：客服消息构造/预览/identity、cache diagnostics。

准备迁出的职责：

- `cs-cache-message-model.ts`：客服消息构造、latest message、message identity、preview。
- `cs-cache-diagnostics.ts`：cache diagnostic record、内存记录、console 输出策略。

稳定入口或 re-export：`cs-cache-adapter.ts` 保留原导出兼容。

是否改变 API DTO/wire shape：否。

是否改变 React Query query key：否。

是否改变 Zustand/store owner：否。

是否改变 Gateway 事件边界：否。

是否改变 Electron IPC/preload 边界：否。

是否新增依赖：否。

是否删除核心旧链路：否。

是否需要负责人确认：否。

例外登记：无。`cs-cache-adapter.ts` 已降至 450 行以下。

## 变更

- 新增 `src/renderer/data/customer-service/cs-cache-message-model.ts`。
- 新增 `src/renderer/data/customer-service/cs-cache-diagnostics.ts`。
- `cs-cache-adapter.ts` 从 600 行降至 446 行。

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
npm run p12:audit
npm run p10:audit
npm run check:quick
```

## 结果

- 原导入路径保持可用。
- React Query key 和 cache 写入语义未改变。
- P12 `data-main-edge-files` 中 `cs-cache-adapter.ts` 不再是大文件观察项。
