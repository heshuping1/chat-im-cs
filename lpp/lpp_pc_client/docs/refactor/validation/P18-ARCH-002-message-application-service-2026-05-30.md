# P18-ARCH-002 Message Application Service 验证记录

日期：2026-05-30

范围：消息 cache mutation model 中发送成功后的 IM read 副作用下沉。

## 修改范围

1. 新增 `data/im-read/im-send-succeeded-service.ts`，承接发送成功后的 read reducer、local read、pending read clear 和 mark-read API 命令。
2. `messageCacheMutationModel.ts` 保留 cache 写入 facade，不再直接导入 API runtime client。
3. `architecture-boundaries.spec.ts` 新增 messages model 不得导入 API runtime client 的结构测试。

## 边界确认

不改变消息发送返回结构、React Query query key、IM read reducer 输入输出和 API wire shape。

## 验证结果

1. `npx vitest run tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-read-service.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

`messageCacheMutationModel.ts` 仍偏大，但职责已继续收窄；后续如继续增长，再拆纯 cache write helper。
