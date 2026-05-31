# P24-CONTACT-005 客户端通讯录体验与客服端设计对齐验证记录

## 风险边界

- 涉及：Contacts renderer UI、本地通讯录展示模型、contacts CSS、单测和文档。
- 不涉及：API DTO、React Query key、Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖和服务端接口。

## 变更摘要

1. 新增通讯录本地 view mode：`staff` / `customer`，由现有 `deriveContactDirectoryAccess` 派生，不写入持久化状态。
2. 客户身份下旧 `customer` / `organization` 筛选运行时归一到 `all`，左侧入口只展示「新的朋友 / 全部联系人 / 好友 / 群聊」。
3. 客户身份下 `/friends` 返回的 `userType=1` 联系人按好友展示，避免客户自己看到“客户通讯录”和客户画像侧栏。
4. 客服/员工身份继续保留客户、好友、组织、群聊闭环，组织入口仍受权限模型控制。
5. 通讯录左侧从横向 tabs 改为固定入口列表，样式落在 contacts owner 内。

## 验证

- `npx vitest run tests/unit/contact-directory.spec.ts`：通过，覆盖 13 个通讯录模型与静态断言。
- `npx vitest run tests/unit/contact-directory.spec.ts tests/unit/contact-card-model.spec.ts tests/unit/contact-card-api.spec.ts`：通过，19 个测试通过。
- `npx tsc --noEmit --pretty false --skipLibCheck`：当前被无关工作区改动阻断，剩余错误为 `src/renderer/App.tsx` 向页面传入不存在的 `dataCenterView` prop；本轮 Contacts 相关类型错误已修复。

## 手工验收点

1. 客户账号打开通讯录时，不再看到「客户」「组织」入口。
2. 客户账号可看到「新的朋友」「全部联系人」「好友」「群聊」，搜索提示为「搜索好友、群聊」。
3. 客户账号下好友列表中的客户型用户按好友展示，不打开客户画像。
4. 客服/员工账号仍可看到客户、好友、组织、群聊，并能查看客户画像与组织成员角色。
