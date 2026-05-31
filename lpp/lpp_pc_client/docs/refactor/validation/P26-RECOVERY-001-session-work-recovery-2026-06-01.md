# P26-RECOVERY-001 会话改动找回与重建闭环

## 背景

2026-06-01 检查发现 `main` 未完整体现本会话后半段 P26 改动。恢复时未整包 cherry-pick 旧分支，先从当前 `main` 切出恢复分支并盘点 `stash`、`reflog`、本地分支和关键源码符号。

## 恢复结论

- 已找到证据：`codex/fix-mobile-video-flicker` 中存在 P26 客户信息、联系人入口、好友申请提醒、设置页和验证文档残留。
- 未采用整包恢复：旧分支同时包含视频、登录、截图、自动化脚本删除等非本轮内容，整包合入会扩大风险。
- 已选择性找回：P26 验证文档、`settingsCatalog`、添加好友弹窗/controller、好友申请提醒模型/controller。
- 已按当前 `main` 重建/校正：客户信息 `profile-extra` 接入、普通 IM profile-card 降级策略、header 真实渠道口径、独立客户信息页高度和 tab overflow、消息页添加好友入口、好友申请 badge/提醒、设置页去标签化展示。

## 边界说明

- 新增了 `GET /friends/{friendUserId}/profile-extra` 和 `searchUsers` client 方法，用于已确认的好友资料/加好友能力。
- 复用既有 `pc-friend-requests`、`pc-friends`、`pc-im-conversations`、`customerServiceThreadProfile` owner；好友申请提醒只基于查询数据 diff，不解析 Gateway payload。
- 未改 Gateway event、Electron IPC/preload/main、Zustand persist key；未新增依赖；未做技术栈替换。

## 验证命令

```bash
npx vitest run tests/unit/friend-request-reminder.spec.ts tests/unit/settings-catalog.spec.ts
npx vitest run tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/customer-profile-workspace.spec.ts tests/unit/customer-profile-model.spec.ts tests/unit/friend-request-reminder.spec.ts tests/unit/settings-catalog.spec.ts
npx vitest run tests/unit/settings-catalog.spec.ts tests/unit/pc-settings.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts
npm run check:quick
git diff --check
```

## 结果

- 以上命令均已通过。
- `P26-RECOVERY-001` 已在任务矩阵中标记为已完成。
- 如要合入 `main`，应以当前恢复分支为准，避免合并旧分支的非目标改动。
