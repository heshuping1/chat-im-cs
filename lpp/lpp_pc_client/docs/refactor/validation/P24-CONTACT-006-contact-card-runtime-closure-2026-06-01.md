# P24-CONTACT-006 Contact Card Runtime Closure Repair

## 风险边界

- 涉及：renderer 消息 UI、名片资料 controller、好友关系 mutation、React Query 失效、单测与任务矩阵。
- 不涉及：Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖、技术替换或服务端接口新增。
- API 仅复用既有 `contact_card` 消息、好友申请、通过/拒绝、删除好友、加入黑名单和用户资料接口。

## 修改记录

- 将名片资料查询、好友申请、通过/拒绝、删除好友、拉黑和关系刷新收敛到 `useMessageContactProfileController`，避免 `MessageCenter` 继续堆运行态 mutation。
- 发送名片弹窗接入真实 `sendContactCardPending`，不再硬编码 `pending={false}`；发送失败保留弹窗并显示「发送名片失败」产品文案。
- 名片关系弹窗继续区分本人、好友、非好友、已申请、收到申请，保留危险动作二次确认。
- 补充 `contact-card-runtime.spec.ts`，覆盖弹窗 pending、controller 收敛和关系按钮文案。

## 验证命令

- `npx vitest run tests/unit/contact-card-runtime.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/contact-card-model.spec.ts`：通过。
- `npx vitest run tests/unit/contact-card-model.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/message-display-model.spec.ts tests/unit/media-message.spec.ts tests/unit/contact-card-runtime.spec.ts`：通过，37 tests。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、hooks lint、architecture/desktop API 单测、docs check、P19 audit 和 shape lint。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收点

1. 输入框「更多 > 名片」可选择联系人并发送名片。
2. 发送名片时按钮进入发送中，失败不关闭弹窗。
3. 点击好友名片可发消息、删除好友、加入黑名单。
4. 点击非好友名片可发送好友申请，成功后显示「好友申请已发送」。
5. 收到好友申请的名片可通过或拒绝，处理后关系状态刷新。

## 遗留说明

- 本次不新增好友搜索、推荐联系人或服务端 Gateway 事件。
- 后续人工测试若发现服务端权限/隐私错误码差异，应只补错误文案映射，不改变名片消息 wire shape。
