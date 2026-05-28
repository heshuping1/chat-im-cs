# LPP 项目

LPP 是一个集成企业 IM、好友社交、在线客服、客户经营和企业管理的项目。当前仓库主要包含 Flutter 移动端 App、交付文档、自动化脚本和服务端接口合同目录。

## 目录结构

| 目录 | 用途 |
| --- | --- |
| `docs/` | 项目交付文档中心，包含需求、功能矩阵、技术方案、测试验收、发布风险和接口依赖。 |
| `docs/api-contracts/` | 服务端正式接口合同目录。当前只有入口说明，后续放服务端原始接口文档。 |
| `lpp_mobile/` | Flutter 移动端 App 工程根目录。执行 `flutter run`、`flutter build` 时进入这里。 |
| `scripts/` | 项目级脚本目录。文档检查、发布报告、移动端测试脚本都放这里。 |
| `scripts/mobile/` | 移动端专项脚本，包括自动化测试、真机测试、测试数据和接口调试辅助脚本。 |

## 文档入口

项目文档以 [docs/README.md](docs/README.md) 为准。

核心交付文档：

- [需求规格说明书](docs/01-需求规格说明书.md)
- [功能矩阵和实现情况](docs/02-功能矩阵和实现情况.md)
- [技术方案](docs/03-技术方案.md)
- [测试验收方案](docs/04-测试验收方案.md)
- [接口与服务端依赖](docs/05-接口与服务端依赖.md)
- [发布风险与检查清单](docs/06-发布风险与检查清单.md)

## Flutter 移动端

移动端工程在 [lpp_mobile](lpp_mobile)。

常用命令：

```bash
cd lpp/lpp_mobile
flutter pub get
flutter run
```

Android debug 构建：

```bash
cd lpp/lpp_mobile
flutter build apk --debug
```

测试和静态分析：

```bash
cd lpp/lpp_mobile
flutter analyze
flutter test ../scripts/mobile/test/flutter
```

项目级 Flutter 检查入口：

```bash
lpp/scripts/test/run-flutter-checks.sh
```

## ECC 工作流

非简单工程改动必须按 [ECC 工作流](docs/00-ECC工作流.md) 执行：

1. 明确需求。
2. 更新功能矩阵。
3. 明确技术方案。
4. 再进入代码实现。
5. 执行测试和验收。
6. 更新发布风险和交付报告。

如果用户明确要求先讨论方案，必须先给方案并等待确认后再改代码。

## 提交边界

应提交：

- `docs/`
- `lpp_mobile/lib/`
- `lpp_mobile/assets/`
- `lpp_mobile/android/`、`ios/`、`macos/`、`web/`、`windows/` 中的工程配置和源码
- `lpp_mobile/pubspec.yaml`
- `lpp_mobile/pubspec.lock`
- `lpp_mobile/analysis_options.yaml`
- `lpp_mobile/l10n.yaml`
- `scripts/` 中可提交的项目脚本

不应提交：

- `build/`
- `.dart_tool/`
- `.flutter-plugins-dependencies`
- `.idea/`
- `*.iml`
- `Pods/`
- `.gradle/`
- `.DS_Store`
- 本地测试账号、密码、token、签名密钥和真实环境调试脚本

## 当前质量状态

当前文档记录的项目状态不是“已可正式交付”。已知情况包括：

- Flutter 自动化测试存在 admin token 相关失败。
- Android 真机 P0 尚未形成完整验收报告。
- 接口联调、性能基线、权限安全专项仍需继续补齐。

具体状态以 [功能矩阵和实现情况](docs/02-功能矩阵和实现情况.md)、[项目现状与缺口清单](docs/11-项目现状与缺口清单.md) 和 [版本交付报告](docs/12-版本交付报告.md) 为准。
