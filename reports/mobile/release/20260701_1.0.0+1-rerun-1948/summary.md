# APP 正式版复测报告

报告编号: APP-REL-RPT-20260701-002

版本/构建: 1.0.0+1

测试类型: 发布问题修复后自动化复测

执行日期: 2026-07-01 19:48:00 CST

执行人: Codex

发布结论: 自动化门禁通过；正式发布仍需 Android/iOS 真机 P0 回归

证据目录: `reports/mobile/release/20260701_1.0.0+1-rerun-1948/logs/`

## 1. 修复范围

| 问题编号 | 处理结果 | 说明 |
| --- | --- | --- |
| APP-REL-20260701-002 | 已验证 | 注册页恢复“微界号”入口，并补充微界号注册页面测试 |
| APP-REL-20260701-003 | 已验证 | 客服自动化测试桩与当前客服中心默认监控页、admin datasource 合同对齐 |
| APP-REL-20260701-004 | 已验证 | 空间未读汇总仅统计普通单聊数字红点；架构边界旧债务登记到守卫清单，继续拦截新增越界 |
| APP-REL-20260701-005 | 已验证 | 发送消息测试桩补齐 `uploadMedia(mediaKind:)`，视频发送用例对齐本地可见和上传进度契约 |
| APP-REL-20260701-006 | 已验证 | 启动首帧放行兼容测试环境未执行 `deferFirstFrame()` 的挂载方式 |
| APP-REL-20260701-001 | 未复测 | 需要 Android 真机服务端注册链路和限流策略验证 |
| APP-REL-20260701-007 | 未关闭 | 本次未执行 Android/iOS 真机 P0 |

## 2. 自动化结果

| 编号 | 命令 | 结果 | 数量 | 日志 |
| --- | --- | --- | --- | --- |
| AUTO-001 | `flutter analyze --no-fatal-infos` | 通过 | 0 error，156 info | `logs/flutter_analyze_no_fatal_infos.log` |
| AUTO-002 | `flutter test test` | 通过 | 78 passed | `logs/flutter_test_test.log` |
| AUTO-003 | `flutter test ../scripts/mobile/test/flutter` | 通过 | 438 passed | `logs/flutter_test_scripts_mobile_flutter.log` |

## 3. 剩余风险

| 风险 | 状态 | 下一步 |
| --- | --- | --- |
| Android 真机注册曾返回 `429 RATE_LIMITED` | 未复测 | 需要服务端确认测试账号白名单/限流策略后跑邮箱注册、微界号注册、邀请码、企业号场景 |
| Android/iOS 正式版真机 P0 | 未执行 | 按 `lpp/lpp_mobile/docs/release/04-正式版测试用例.md` 跑双端真机回归 |
| 普通 `flutter analyze` | 未作为门禁 | 当前仓库既有 156 个 info lint；本次使用 `--no-fatal-infos` 通过 |

## 4. 结论

本次修复后的自动化门禁已通过，APP-REL-20260701-002 至 APP-REL-20260701-006 可进入真机回归。由于 APP-REL-20260701-001 和 APP-REL-20260701-007 仍未关闭，正式发布结论仍为不可发布。
