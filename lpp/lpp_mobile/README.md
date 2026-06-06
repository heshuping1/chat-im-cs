# LPP Mobile

LPP Flutter 移动端 App 工程。当前本地开发和验证优先 Android 真机。

项目总入口见 [../README.md](../README.md)，跨端交付总账见 [../docs/README.md](../docs/README.md)。

App 专属文档入口见 [docs/README.md](docs/README.md)。后续移动端需求、设计、实现、测试和风险判断优先阅读该目录；新需求准入、DDD 分层和测试验收规则分别见 [docs/constraints](docs/constraints)。

## 工程结构

- `lib/app`：应用启动、路由、主题。
- `lib/core`：网络、存储、数据库、空间、认证基础设施。
- `lib/features`：认证、聊天、通话、通讯录、客服、工作台等业务模块。
- `lib/shared`：共享组件和工具。
- `lib/l10n`：多语言文案。
- `assets`：图片、音频等静态资源。
- `android`、`ios`：移动端平台壳工程。
- `../scripts/mobile`：移动端本地开发、测试数据、自动化辅助脚本。

## Android 运行

```bash
flutter pub get
adb devices
flutter devices
flutter run
```

指定设备时：

```bash
flutter devices
flutter run -d <deviceId>
```

## 构建

```bash
flutter build apk --debug
```

## 验证

```bash
flutter analyze
flutter test ../scripts/mobile/test/flutter
```

项目级检查脚本：

```bash
../scripts/test/run-flutter-checks.sh
```

移动端专项脚本：

```bash
../scripts/mobile/test/run_automated_tests.sh
../scripts/mobile/test/run_android_tests.sh
```

Android SDK 或设备环境变化时：

```bash
flutter doctor -v
```

## 本地生成目录

以下目录或文件由 Flutter、Gradle、CocoaPods 或 IDE 生成，不作为源码交付对象：

- `.dart_tool/`
- `build/`
- `.flutter-plugins-dependencies`
- `android/.gradle/`
- `ios/Pods/`
- `macos/Pods/`
- `.idea/`
- `*.iml`
