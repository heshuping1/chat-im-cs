# P14-RESP-004 API DTO Responsibility Decision 验证记录

日期：2026-05-30

任务：P14-RESP-004

范围：

1. `src/renderer/data/api/types.ts`
2. `docs/refactor/PC端P13职责审计任务清单.md`
3. `docs/refactor/PC端重构任务矩阵.md`

## 职责结论

`src/renderer/data/api/types.ts` 暂不按行数强拆，登记为长期例外。

原因：

1. 当前文件主要是 API DTO / contract types 聚合。
2. `src/renderer/data/api-client.ts` re-export facade 依赖面大，强拆会扩大 import 改动范围。
3. 拆分 DTO 容易误伤后端 wire shape、客服历史记录转换和现有调用点。

后续触发条件：

1. 新增领域 DTO 时优先落到领域 types 文件，再由 facade re-export。
2. 新增非 DTO 转换 helper 时下沉到对应 model，不继续堆到 `api/types.ts`。
3. 拆分前必须确认不改变 API DTO wire shape、不改变 `api-client.ts` re-export facade。

## 验证

```bash
npm run p12:audit
npm run docs:check
```

结果：

1. `api/types.ts` 仍作为 `data-main-edge-files` 观察项存在。
2. 职责例外清单已登记 owner、保留理由、触发条件和验证命令。

## 遗留风险

后续若继续向 `api/types.ts` 增加转换 helper，会让 DTO 聚合入口再次混入 model 职责；由 `P15-GUARD-002` 的例外门禁持续提醒。
