# P7-SHARED-001B Avatar Identity Model

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-identity-view-model.ts`：

- `CustomerServiceIdentityViewModel`
- `createCustomerServiceIdentityViewModel`

## 模型职责

- 统一客服身份展示名优先级：
  `profile.displayName/customerDisplayName/customerName/nickname -> thread.title -> fallback -> 默认值`
- 统一头像 URL 优先级：
  `profile.avatarUrl -> thread.customerAvatarUrl -> thread.avatarUrl`
- 统一 VIP 色调：
  `avatarTone: gold | indigo`
- 过滤无意义名称：
  空字符串和 `历史会话...` 不作为真实展示名。

## 边界

- 不替换 `PcAvatar`。
- 不把 unread badge 放进 avatar identity，badge 归 P7-SHARED-003。
- 不抽全局 `shared/ui` 包；当前先在客服域内落地，降低公共抽象风险。
