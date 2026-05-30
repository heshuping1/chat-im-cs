# P7-SHARED-001C Avatar Identity 首批迁移

日期：2026-05-29

## 已迁移调用点

1. `ChatWorkspace.tsx`
   - 客服头部头像 URL 改为 `workspaceViewModel.identity.avatarUrl`。
   - VIP/普通客户展示改为 `workspaceViewModel.identity.isVip`。
   - `PcAvatar.name` 改为 `workspaceViewModel.identity.avatarName`。
2. `ThreadList.tsx`
   - 客服线程列表头像 URL、头像色调、展示名、aria name 改为 `createCustomerServiceIdentityViewModel`。

## 行为保持

- `PcAvatar` 的缓存、失败 fallback、blob/data URL 处理不变。
- 未读 badge DOM 仍由列表原位置渲染。
- 消息气泡头像暂不迁移，当前已有 message view model，后续只补齐 identity 规则即可。
