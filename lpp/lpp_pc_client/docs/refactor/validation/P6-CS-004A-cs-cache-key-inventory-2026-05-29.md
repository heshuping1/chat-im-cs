# P6-CS-004A CS Cache Key Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/data/query-keys.ts`
- `src/renderer/data/customer-service/cs-cache-adapter.ts`

## Query / Cache Key

| 缓存 | key | 读写场景 |
| --- | --- | --- |
| 客服线程列表 | `pc-cs-workbench-threads` | `OnlineServicePage`、`ChatWorkspace`、Gateway 消息/排队事件、发送成功、已读、详情合并 |
| 客服详情 | `pc-cs-thread-detail` | `ChatWorkspace` 加载消息、发送本地回显、上传状态 patch、Gateway 新消息、关闭状态 patch |
| 客服资料 | `pc-cs-thread-profile` | `ChatWorkspace` 资料卡加载，Gateway 状态/消息事件触发 invalidate |
| 接待状态 | `pc-cs-reception-status` | `OnlineServicePage`、Gateway staff status 事件 invalidate |
| 服务历史 | `pc-cs-staff-service-history` | 历史会话列表，发送/关闭后 invalidate |

## 发现的问题

1. `ChatWorkspace.tsx` 原来直接持有多个 `setQueriesData`，覆盖发送、上传、详情合并、关闭、已读。
2. `GatewayBridge.tsx` 原来直接更新客服详情和线程列表 preview/unread。
3. 页面和 Gateway 都知道 `pc-cs-thread-detail` / `pc-cs-workbench-threads` 的内部结构。

## 结论

客服 cache 需要独立 owner。页面、Gateway 只传递线程、消息和动作结果，不直接操作 query cache 结构。
