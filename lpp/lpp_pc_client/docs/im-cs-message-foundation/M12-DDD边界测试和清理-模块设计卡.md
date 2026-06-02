模块编号：M12

模块名称：DDD 边界测试和清理

模块职责：
- 用 `architecture-boundaries.spec.ts` 固化前序模块边界，防止回退到跨模块读写。
- 清理或约束旧入口、重复逻辑和直接写 cache/store/outbox 的路径。
- 为 M13 全体验收提供边界测试基线。

边界规则：
- IM 不能 import 客服 unread ledger/badge/read visibility。
- 客服 unread/badge/read visibility 不能 import IM read view。
- Gateway router 只路由到 delivery service 或 query invalidation，不直接写 IM/CS cache。
- Send runtime 不清未读、不发提醒、不导入 delivery/read/UI。
- 页面组件不直接写 read state、ledger 或 outbox。
- API payload 只进入防腐层，UI 和领域模块不读取 legacy alias。

当前保留入口：
- IM read command executor 作为 IM read use case，可调用 read store action 和 IM cache mutation。
- 客服 lifecycle/send controller 作为客服 use case，可调用客服 cache adapter 和 send runtime。
- 媒体上传 hook 可操作 send outbox 进度记录；底层 identity/scope/blob/upsert 已经通过 ChatSendRuntime。

不做：
- 不重写已有 use case hooks。
- 不删除与本模块无关的用户改动。
- 不做 UI 重构。

测试：
- `tests/unit/architecture-boundaries.spec.ts`
