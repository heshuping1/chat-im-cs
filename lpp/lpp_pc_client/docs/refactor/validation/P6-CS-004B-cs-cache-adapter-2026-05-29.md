# P6-CS-004B CS Cache Adapter

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-cache-adapter.ts`：

- `invalidateCustomerServiceQueries`
- `mergeSentCustomerServiceMessage`
- `appendCustomerServiceLocalMessage`
- `patchCustomerServiceLocalMessage`
- `removeCustomerServiceLocalMessage`
- `mergeLoadedCustomerServiceThreadDetail`
- `markCustomerServiceThreadReadInCache`
- `markCustomerServiceThreadClosed`
- `applyCustomerServiceGatewayMessageCache`
- `customerServiceMessageFromSendResult`
- `latestCustomerServiceMessage`
- `customerServiceMessageIdentity`
- `previewFromCustomerServiceMessage`

## 首批迁移

- `ChatWorkspace.tsx` 不再直接调用 `setQueryData/setQueriesData`。
- `GatewayBridge.tsx` 不再直接调用 `setQueryData/setQueriesData` 更新客服 cache。
- 旧行为保持：发送成功、本地媒体上传状态、Gateway 新消息、详情加载、关闭、已读仍更新原有 cache。

## 设计边界

Adapter 只维护 TanStack Query cache 结构和 cache 诊断，不负责：

- API 调用。
- Toast 文案。
- 桌面提醒。
- 状态机判断。
