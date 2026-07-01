# APP 正式版测试报告

报告编号: APP-REL-RPT-20260701-001

版本/构建: 1.0.0+1

测试类型: 候选正式版回归

执行日期: 2026-07-01 18:05:32 CST

执行人: Codex

代码分支: branch-tree-20260605

提交版本: fe7c239

服务端环境: 未执行真机服务端联调

发布范围: Android / iOS 自动化与构建检查

发布结论: 不可发布

风险接受人: 未指定

证据目录: `reports/mobile/release/20260701_1.0.0+1/logs/`

## 1. 构建信息

| 平台 | 包类型 | 包路径或下载地址 | 构建命令 | 构建结果 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Android | APK | `lpp/lpp_mobile/build/app/outputs/flutter-apk/app-release.apk` | `flutter build apk --release` | 通过 | 产物 132.6MB；日志 `logs/flutter_build_apk_release.log` |
| iOS | Runner.app | `lpp/lpp_mobile/build/ios/iphoneos/Runner.app` | `flutter build ios --release --no-codesign` | 通过 | 产物 65.2MB；未做正式签名；日志 `logs/flutter_build_ios_release_no_codesign.log` |

## 2. 设备和账号

本次按用户指令“跑一次”执行自动化与构建检查，未执行 Android/iOS 真机人工 P0 回归。

| 平台 | 设备 | 系统版本 | App 版本 | 网络 | 账号 | 角色 | 空间 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Android | 未执行真机 | 未验证 | 1.0.0+1 | 未验证 | 未验证 | 未验证 | 未验证 | 构建通过，真机 P0 未跑 |
| iOS | 未执行真机 | 未验证 | 1.0.0+1 | 未验证 | 未验证 | 未验证 | 未验证 | 无签名构建通过，真机 P0 未跑 |

## 3. 自动化结果

| 编号 | 命令 | 平台 | 结果 | 失败数 | 日志路径 | 问题编号 |
| --- | --- | --- | --- | --- | --- | --- |
| AUTO-001 | `flutter analyze --no-fatal-infos` | Android / iOS | 通过 | 0 error，156 info | `logs/flutter_analyze.log` | 观察项，无问题编号 |
| AUTO-002 | `flutter test test` | Android / iOS | 失败 | 1 | `logs/flutter_test_test.log` | APP-REL-20260701-002 |
| AUTO-003 | `flutter test ../scripts/mobile/test/flutter` | Android / iOS | 失败 | 10 | `logs/flutter_test_scripts_mobile_flutter.log` | APP-REL-20260701-003 / 004 / 005 / 006 / 007 |
| AUTO-004 | `flutter build apk --release` | Android | 通过 | 0 | `logs/flutter_build_apk_release.log` |  |
| AUTO-005 | `flutter build ios --release --no-codesign` | iOS | 通过 | 0 | `logs/flutter_build_ios_release_no_codesign.log` |  |

## 4. 用例执行汇总

| 平台 | P0 总数 | P0 通过 | P0 失败 | P0 阻塞 | P1 总数 | P1 通过 | P1 失败 | P1 阻塞 | 不适用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Android | 未完整执行 | 0 | 0 | 未执行真机 P0 | 未完整执行 | 0 | 0 | 未执行真机专项 | 自动化和构建已跑 |
| iOS | 未完整执行 | 0 | 0 | 未执行真机 P0 | 未完整执行 | 0 | 0 | 未执行真机专项 | 自动化和无签名构建已跑 |

## 5. P0 用例结果

| 用例编号 | 平台 | 场景 | 结果 | 证据 | requestId/traceId | 问题编号 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BOOT-001 | Android | 覆盖安装和启动 | 阻塞 | 未执行真机 |  |  | 本次只做构建和自动化 |
| BOOT-002 | iOS | 安装和启动 | 阻塞 | 未执行真机 |  |  | iOS 未做签名安装 |
| AUTH-002 | Android / iOS | 微界号登录/注册入口文案 | 失败 | `logs/flutter_test_test.log` |  | APP-REL-20260701-002 | 注册页微界号入口缺失导致回归失败 |
| AUTH-003 | Android / iOS | 邮箱注册，不输入企业码和邀请码 | 阻塞 | 未执行真机 |  | APP-REL-20260701-001 | 既有 Android 注册 429 问题仍未复测关闭 |
| AUTH-005 | Android / iOS | 邮箱注册，输入邀请码 | 阻塞 | 未执行真机 |  | APP-REL-20260701-001 | 既有 Android 注册 429 问题仍未复测关闭 |
| MSG-001 | Android / iOS | 文本消息收发 | 阻塞 | 未执行真机 |  |  | 自动化集合失败，真机未跑 |
| CS-001 | Android / iOS | 客服接入 | 失败 | `logs/flutter_test_scripts_mobile_flutter.log` |  | APP-REL-20260701-003 | 客服相关自动化编译/断言失败 |
| SET-001 | Android / iOS | 设置和关于品牌检查 | 阻塞 | 未执行真机 |  |  | 自动化品牌检查部分通过，人工设置页未跑 |

## 6. 问题清单

| 问题编号 | 严重级别 | 平台 | 首次发现版本 | 关联用例 | 问题标题 | 复现步骤 | 实际结果 | 预期结果 | 影响范围 | 当前状态 | 负责人 | 证据 | 回归结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| APP-REL-20260701-001 | S2 | Android | 2026-07-01 调试验证 | AUTH-003 / AUTH-005 | 注册接口返回 `429 RATE_LIMITED` 阻断真机注册闭环 | Android 真机注册新邮箱并提交 | 服务端返回 429 | 注册成功或提供可恢复限流提示/白名单 | 注册和邀请码入企真机闭环 | 新增 | 服务端/客户端联合确认 | requestId `0HNMN9FHCS0NB:00000001` | 本次未复测，仍未关闭 |
| APP-REL-20260701-002 | S1 | Android / iOS | 1.0.0+1 | AUTH-002 / AUTH-006 | 注册页微界号注册入口缺失 | 执行 `flutter test test` | `register page labels lpp id registration as weijie id` 失败，源码中 `_buildIdModeTabs()` 未包含 `_idTab('微界号', _IdMode.loginName)` | 注册页应显示微界号入口并可切换到微界号注册 | 注册页微界号注册入口 | 新增 | 客户端 | `logs/flutter_test_test.log` | 阻断发布 |
| APP-REL-20260701-003 | S1 | Android / iOS | 1.0.0+1 | CS-001 / CS-003 | 客服自动化测试接口和断言失败 | 执行 `flutter test ../scripts/mobile/test/flutter` | `management_workbench_role_test` 编译失败；`admin_customer_service_datasource_test` 3 个用例 `Too many elements` | 客服管理自动化应全部通过 | 客服管理工作台和 admin datasource 回归 | 新增 | 客户端 | `logs/flutter_test_scripts_mobile_flutter.log` | 阻断发布 |
| APP-REL-20260701-004 | S1 | Android / iOS | 1.0.0+1 | MSG-001 / MSG-002 / 架构边界 | 架构边界和空间未读自动化失败 | 执行 `flutter test ../scripts/mobile/test/flutter` | 架构边界 3 项失败；`space_unread_summary_test` 期望 1 实际 3 | DDD 边界和未读规则应符合自动化约束 | 消息、空间未读和架构边界 | 新增 | 客户端 | `logs/flutter_test_scripts_mobile_flutter.log` | 阻断发布 |
| APP-REL-20260701-005 | S1 | Android / iOS | 1.0.0+1 | MSG-003 | 发送消息用例测试桩与 `uploadMedia` 接口失配 | 执行 `flutter test ../scripts/mobile/test/flutter` | `_FakeChatRepository.uploadMedia` 缺少 `mediaKind` 命名参数导致编译失败 | 测试桩应匹配 `ChatRepository.uploadMedia` 接口 | 媒体消息发送自动化 | 新增 | 客户端 | `logs/flutter_test_scripts_mobile_flutter.log` | 阻断发布 |
| APP-REL-20260701-006 | S1 | Android / iOS | 1.0.0+1 | BOOT-003 | App 启动 smoke test 触发首帧断言 | 执行 `flutter test ../scripts/mobile/test/flutter` | `widget_test.dart` 触发 `_firstFrameDeferredCount > 0` 断言失败 | 启动 smoke test 应稳定通过 | 启动页和首帧测试稳定性 | 新增 | 客户端 | `logs/flutter_test_scripts_mobile_flutter.log` | 阻断发布 |
| APP-REL-20260701-007 | S1 | Android / iOS | 1.0.0+1 | BOOT / AUTH / MSG / CS | Android/iOS 真机 P0 未执行 | 本次只执行自动化和构建 | 未覆盖正式版要求的 Android+iOS 真机主链路 | 正式版必须双端真机 P0 通过并出证据 | 正式版发布门禁 | 新增 | 测试/客户端 | 本报告 | 阻断发布 |

## 7. 未验证项和不适用项

| 用例编号 | 平台 | 类型 | 原因 | 风险 | 补测计划 | 责任人 |
| --- | --- | --- | --- | --- | --- | --- |
| BOOT / AUTH / MSG / CS / CONTACT / GROUP / SET / NET | Android / iOS | 未验证 | 本次按命令只跑自动化和构建，未做真机人工 P0 | 不能证明正式版真实可用 | 修复自动化失败后，按 `04-正式版测试用例.md` 跑双端真机回归 | 测试/客户端 |
| AUTO-005 正式签名 | iOS | 未验证 | 使用 `--no-codesign` 构建 | 不能证明 TestFlight/正式签名可发布 | 使用正式证书执行 archive/TestFlight 构建 | iOS 发布负责人 |

## 8. 发布判断

| 检查项 | 结论 | 说明 |
| --- | --- | --- |
| Android P0 是否全部通过 | 否 | 未执行 Android 真机 P0 |
| iOS P0 是否全部通过 | 否 | 未执行 iOS 真机 P0 |
| 是否存在未关闭 S0 | 否 | 本次未发现 S0 |
| 是否存在未关闭 S1 | 是 | APP-REL-20260701-002 至 APP-REL-20260701-007 |
| 失败和阻塞项是否已登记问题编号 | 是 | 见问题清单 |
| 问题是否已同步到发布问题跟踪台账 | 是 | 见 `lpp/lpp_mobile/docs/release/06-发布问题跟踪台账.md` |
| 是否具备回滚方案 | 否 | 未提供正式发布回滚方案 |
| 最终结论 | 不可发布 | 自动化失败，且 Android/iOS 真机 P0 未执行 |

## 9. 证据索引

| 类型 | 路径或链接 | 说明 |
| --- | --- | --- |
| 静态检查 | `logs/flutter_analyze.log` | 退出码 0，156 info |
| 本地 test 目录自动化 | `logs/flutter_test_test.log` | 失败 1 项 |
| scripts/mobile 自动化 | `logs/flutter_test_scripts_mobile_flutter.log` | 失败 10 项 |
| Android 构建日志 | `logs/flutter_build_apk_release.log` | 构建通过 |
| iOS 构建日志 | `logs/flutter_build_ios_release_no_codesign.log` | 无签名构建通过 |
| Android 产物 | `lpp/lpp_mobile/build/app/outputs/flutter-apk/app-release.apk` | 132.6MB |
| iOS 产物 | `lpp/lpp_mobile/build/ios/iphoneos/Runner.app` | 65.2MB，未正式签名 |

## 10. 复测记录

| 日期 | 问题编号 | 平台 | 修复版本 | 复测人 | 复测结果 | 证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-01 | APP-REL-20260701-001 | Android | 1.0.0+1 | Codex | 阻塞 | 本报告 | 未执行真机复测 |
| 2026-07-01 | APP-REL-20260701-002 | Android / iOS | 1.0.0+1 | Codex | 失败 | `logs/flutter_test_test.log` | 微界号入口缺失 |
| 2026-07-01 | APP-REL-20260701-003 | Android / iOS | 1.0.0+1 | Codex | 失败 | `logs/flutter_test_scripts_mobile_flutter.log` | 客服自动化失败 |
| 2026-07-01 | APP-REL-20260701-004 | Android / iOS | 1.0.0+1 | Codex | 失败 | `logs/flutter_test_scripts_mobile_flutter.log` | 架构/未读自动化失败 |
| 2026-07-01 | APP-REL-20260701-005 | Android / iOS | 1.0.0+1 | Codex | 失败 | `logs/flutter_test_scripts_mobile_flutter.log` | 媒体发送测试桩失配 |
| 2026-07-01 | APP-REL-20260701-006 | Android / iOS | 1.0.0+1 | Codex | 失败 | `logs/flutter_test_scripts_mobile_flutter.log` | 启动 smoke test 失败 |
| 2026-07-01 | APP-REL-20260701-007 | Android / iOS | 1.0.0+1 | Codex | 阻塞 | 本报告 | 真机 P0 未执行 |
