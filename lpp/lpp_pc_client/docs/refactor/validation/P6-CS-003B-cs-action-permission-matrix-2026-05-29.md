# P6-CS-003B CS Action Permission Matrix

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-action-permissions.ts`：

- `CustomerServiceAction`
- `CustomerServiceActionPermission`
- `getCustomerServiceActionPermission`
- `getCustomerServiceActionPermissions`

## 权限规则

| 状态 | reply/send | claim | takeover | close | transfer/rate |
| --- | --- | --- | --- | --- | --- |
| queued | disabled，reason=`requires_claim` | enabled | hidden | hidden | hidden，reason=`unsupported` |
| ai | disabled，reason=`requires_takeover` | hidden | enabled | hidden | hidden，reason=`unsupported` |
| serving | enabled | hidden | hidden | enabled | hidden，reason=`unsupported` |
| readonly/closed/rated | hidden，reason=`readonly` | hidden | hidden | hidden | hidden，reason=`unsupported` |
| no thread | hidden，reason=`no_thread` | hidden | hidden | hidden | hidden |

## 首批消费点

`ChatWorkspace.ThreadActionButton` 已改为消费权限矩阵，不再自行解析 queue/ai 字符串。
