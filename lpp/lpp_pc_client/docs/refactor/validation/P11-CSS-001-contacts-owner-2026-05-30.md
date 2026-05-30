# P11-CSS-001 Contacts CSS Owner 迁移验证记录

日期：2026-05-30

范围：

- `src/renderer/styles/app.css`
- `src/renderer/styles/contacts/contacts.css`
- `src/renderer/App.tsx`

## 变更摘要

1. 将 `contacts-b-layout`、联系人列表、联系人详情、联系人空态相关 selector 从 `app.css` 迁移到 `styles/contacts/contacts.css`。
2. `App.tsx` 在 `app.css` 后、messages 样式前引入 contacts owner 文件，保持原有样式值不变。
3. 本批不删除无法证明无引用的 legacy selector，不调整视觉值。

## 行数结果

```text
11817 src/renderer/styles/app.css
  826 src/renderer/styles/contacts/contacts.css
 1259 src/renderer/styles/messages/message-center.css
```

## 验证命令

```bash
wc -l src/renderer/styles/app.css src/renderer/styles/contacts/contacts.css src/renderer/styles/messages/message-center.css
npm run check:quick
npm run build
npm run p10:audit
node - <<'NODE'
const { chromium } = require('playwright');
// open http://127.0.0.1:5173/ for a lightweight visual smoke
NODE
```

## 验证结果

- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。
- `npm run p10:audit`：通过；`app.css` 行数降至 11818，`global-css-signals` 仍保留，后续继续按 owner 分批迁移。
- Playwright visual smoke：未执行成功，本机缺少 Playwright Chromium 可执行文件；按约束未新增下载浏览器依赖。开发态 HTTP smoke 由最终 PC 启动验证覆盖。

## 遗留事项

- `P11-CSS-001` 仍处于进行中：messages/settings/customer-service CSS owner 需要后续批次继续迁移。
- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
