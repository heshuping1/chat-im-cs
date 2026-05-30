# P6-CS-006A CS Empty/Error 盘点

日期：2026-05-29

## ChatWorkspace 现有状态入口

| 场景 | 原位置 | 当前处理 |
| --- | --- | --- |
| 未选择客服会话 | `ChatWorkspace.tsx` render branch | `createCustomerServiceNoThreadState` |
| 会话详情加载中 | message stage | `createCustomerServiceMessageStageState` |
| 会话详情加载失败 | message stage | `createCustomerServiceMessageStageState` |
| 会话无消息 | message stage | `createCustomerServiceMessageStageState` |
| 历史/终态会话 | reception strip/composer | `createCustomerServiceWorkspaceViewModel` |
| 排队未接入 | reception strip/composer | `createCustomerServiceWorkspaceViewModel` |
| AI 接待未接管 | reception strip/composer | `createCustomerServiceWorkspaceViewModel` |

## 不在本阶段处理

- `ThreadList.tsx` 的列表空态和列表错误态仍由列表组件处理，后续进入 P7 统一 Empty/Error 公共组件。
- 发送失败、媒体上传失败属于消息发送状态机，不混入客服 workspace 空态。
- API 安全错误文案仍由 `formatError` 和 API error model 负责，workspace 只消费已格式化文案。
