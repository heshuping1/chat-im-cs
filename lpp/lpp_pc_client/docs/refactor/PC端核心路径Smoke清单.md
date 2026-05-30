# PC 端核心路径 Smoke 清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 目标

用于每次大改、依赖升级、发布前或 Windows 实机验证时快速确认 PC 客服 IM 客户端核心链路没有断。

Smoke 不替代完整 E2E，但必须覆盖最容易影响用户的主链路。

## 2. 自动验证

先执行：

```bash
npm run check:quick
npm run build
npm audit --audit-level=high
```

涉及核心模型、公共能力或诊断变更时加：

```bash
npm run test:coverage:core
npm run p10:audit
```

## 3. 手工 Smoke 场景

| 场景 | 验证点 | 通过标准 |
| --- | --- | --- |
| 启动 | 应用能打开登录页或主界面。 | 无白屏、无主进程崩溃、无 renderer gone。 |
| 登录态 | 登录、重启、恢复。 | 桌面端使用 secure session，重启后状态符合预期。 |
| 普通 IM 会话列表 | 会话加载、筛选、未读、置顶、搜索。 | 列表渲染稳定，未读和 preview 正确。 |
| 普通 IM 消息列表 | 历史加载、滚动到底、未读跳转、搜索。 | 长列表分段渲染不丢消息。 |
| 普通 IM 发送 | 文本、图片/文件、失败重试、本地回显。 | local echo、发送成功替换、失败状态正确。 |
| 客服线程列表 | 排队、接待中、AI、关闭、筛选。 | 状态和禁用原因正确。 |
| 客服会话 | 接入、发送、关闭、只读、AI 接管。 | action permission 和状态机正确。 |
| 通知提醒 | IM/客服提醒、桌面通知、去重。 | 设置开关生效，无重复刷屏。 |
| 截图 | 选择区域、取消、插入输入框。 | 不泄漏 Node 能力，取消不挂死。 |
| 文件/媒体 | 打开、复制、另存、显示位置、视频预览。 | 只访问允许缓存目录，媒体动作可恢复。 |
| 诊断导出 | 设置页导出 diagnostics。 | 包含 runtime/startup/gateway/api/read/reminder 等，不包含 token。 |

## 4. Windows 专项 Smoke

Windows 环境额外验证：

1. `npm run dist:win` 能生成 NSIS 安装包。
2. 安装包名称、图标、安装目录、桌面快捷方式、开始菜单快捷方式正确。
3. 托盘显示、点击、退出行为正确。
4. `safeStorage` 登录态加密和恢复正常。
5. 多屏截图选区正确。
6. 导出 diagnostics 后运行：

```bash
npm run perf:samples -- <diagnostics.json>
```

## 5. 失败处理

1. 先导出 diagnostics。
2. 记录平台、版本、命令、复现步骤、截图或日志。
3. 如果是 Gateway/API/IPC 边界问题，先查对应 adapter/validation/diagnostics，不直接改页面。
4. 如果是公共能力问题，先查 owner，不新增局部实现。
