# P24-AUTH-001 注册功能与登录体验治理验证记录

日期：2026-05-31

## 风险边界

- 涉及：API DTO/API client、renderer 登录/注册 UI、登录态写入流程、认证样式、单测和文档。
- 不涉及：React Query key 形状、Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖、技术替换、删除旧链路。

## 实现摘要

1. 新增 `/api/platform/v1/auth/register` 平台注册 endpoint、注册 DTO 和 `AuthApiClient.platformRegister()`，字段按服务端回归脚本契约建模。
2. 抽出 `auth-flow-model` 承接登录类型识别、注册表单校验、空间选择、角色文案和认证错误产品文案，展示部件收敛到 `components/auth/AuthPageParts.tsx`，避免继续把规则和 UI 全堆在页面 JSX。
3. 登录页改为「登录 / 注册」同一 Auth Shell，服务地址和 `tenantId` 移入高级设置；注册成功后自动复用登录与空间选择链路。
4. 多企业账号进入轻量空间选择页，单企业自动进入；无企业时尝试个人空间，失败时给出清晰中文引导。

## 验证命令

```bash
npx vitest run tests/unit/auth-api.spec.ts tests/unit/auth-flow-model.spec.ts tests/unit/auth-page.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/pc-regression-automation.spec.ts
npm run check:quick
npm run docs:check
git diff --check
```

结果：通过。局部认证回归 6 个文件共 23 个用例通过；`check:quick`、`docs:check` 和 diff 空白检查通过。Playwright 本地烟测确认登录/注册切换可见、注册主按钮可见，服务地址默认收进高级设置。

## 手工验收要点

- 登录页默认只展示账号和密码，服务地址与 tenantId 在高级设置里。
- 点击「注册」可填写昵称、邮箱/手机号、密码和确认密码。
- 注册成功后自动进入账号；多企业账号先选择空间，单企业账号直接进入。
- Captcha、重复注册、密码错误等认证失败使用中文产品文案，不暴露 raw code。
