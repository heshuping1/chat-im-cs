---
name: codex-plusplus
scope: project-local
---

# Codex PlusPlus Usage

用途：强化 Codex 在本项目中的可视化反馈、差异检查和执行闭环。

LPP 项目使用方式：

- 改动前先读项目规则和相关代码。
- 使用 `apply_patch` 做人工编辑。
- 改动后检查实际文件内容。
- 能运行验证时运行 `dart analyze`、`flutter analyze`、`flutter build apk --debug` 或真机命令。
- UI 或浏览器可见内容需要截图/交互验证时，使用可用的浏览器或真机验证能力。

约束：

- 不依赖某个外部 UI 插件才能工作。
- 不把“看起来改了”当作完成，必须以文件和命令结果为准。
