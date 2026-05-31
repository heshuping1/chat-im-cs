# P24-CONTACT-002 Contacts Directory And Image Message Closure 验证记录

## 风险边界

- 涉及：Contacts renderer UI、现有 Contacts/Profile API client 调用、现有 React Query invalidation、图片消息展示/动作模型、CSS。
- 不涉及：服务端 API DTO、React Query key 形状、Gateway event、Electron IPC/preload/main contract、Zustand persist key、新依赖、技术替换、旧链路删除、公共抽象扩大。
- 兼容策略：`staff` 仍作为旧筛选值保留，进入 controller 后归一到 `organization`。

## 实现范围

- 通讯录筛选调整为「客户 / 好友 / 组织 / 群聊 / 申请」，移除独立「员工」入口。
- 组织成员继续复用 `/tenant/members`、`/departments`、`/departments/{id}/members`，按部门分组展示，员工姓名同行增加角色标记。
- 客户/好友详情露出「发消息 / 删除好友 / 加入黑名单」，危险动作走二次确认并刷新 friends、friend requests、blocklist、conversations。
- 组织成员详情只保留发消息，不展示删除好友或拉黑动作。
- 添加联系人入口恢复可点击，进入好友申请处理语境，不虚构账号搜索能力。
- 图片消息 viewer 补齐 Esc/背景关闭、复制图片、另存为、显示位置；动作源优先 `localOpenUrl`，再回退远端原图 URL，`blob:` 只作为视觉预览。

## 验证命令

```bash
npx vitest run tests/unit/contact-directory.spec.ts tests/unit/media-message.spec.ts tests/unit/message-context-menu-model.spec.ts tests/unit/message-view-model.spec.ts
npm run check:quick
npm run docs:check
git diff --check
```

## 手工验收要点

- 通讯录只展示「客户 / 好友 / 组织 / 群聊 / 申请」，没有重复「员工」tab。
- 组织成员按部门展示，成员姓名同行有角色标记，第二行展示部门/职位。
- 好友/客户可发消息、删除、拉黑；员工可发消息；申请可通过/拒绝。
- 点击图片打开微信式 viewer，可复制、另存、显示位置，Esc 和点击背景可关闭。
- 本地刚发送图片断网后仍优先从本地缓存查看和操作；远端历史图片仍可下载缓存后操作。

## 遗留说明

- 当前没有明确的“按账号搜索添加好友”服务端 API，本轮不伪造搜索入口。
- 本轮不新增 Electron 图片窗口，图片查看器保持在 renderer 内闭环。
