import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class AutoTranslatePage extends StatefulWidget {
  const AutoTranslatePage({super.key});

  @override
  State<AutoTranslatePage> createState() => _AutoTranslatePageState();
}

class _AutoTranslatePageState extends State<AutoTranslatePage> {
  bool _enabled = false;
  String _targetLang = 'zh-CN';

  final _languages = const [
    ('zh-CN', '简体中文'),
    ('zh-TW', '繁體中文'),
    ('en', 'English'),
    ('ja', '日本語'),
    ('ko', '한국어'),
    ('es', 'Español'),
    ('fr', 'Français'),
    ('de', 'Deutsch'),
    ('ru', 'Русский'),
    ('ar', 'العربية'),
  ];

  String get _targetLabel =>
      _languages.firstWhere((l) => l.$1 == _targetLang).$2;

  String get _translatedExample {
    switch (_targetLang) {
      case 'zh-CN':
        return '你好，你好吗？';
      case 'zh-TW':
        return '你好，你好嗎？';
      case 'en':
        return 'Hello, how are you?';
      case 'ja':
        return 'こんにちは、お元気ですか？';
      case 'ko':
        return '안녕하세요, 어떻게 지내세요?';
      case 'es':
        return '¡Hola, cómo estás?';
      case 'fr':
        return 'Bonjour, comment allez-vous ?';
      case 'de':
        return 'Hallo, wie geht es dir?';
      case 'ru':
        return 'Привет, как дела?';
      case 'ar':
        return 'مرحبا، كيف حالك؟';
      default:
        return '你好，你好吗？';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.autoTranslateTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingSwitchTile(
                label: l10n.autoTranslateEnabled,
                description: _enabled
                    ? '${l10n.autoTranslateLanguage}：$_targetLabel（默认跟随系统语言）'
                    : null,
                value: _enabled,
                onChanged: (v) => setState(() => _enabled = v),
              ),
            ],
          ),
          if (_enabled) ...[
            const SizedBox(height: 16),
            // Example
            Container(
              color: Theme.of(context).colorScheme.surface,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('翻译示例',
                      style: TextStyle(
                          fontSize: 12,
                          color:
                              colorScheme.onSurface.withValues(alpha: 0.55))),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('原文（英语）',
                            style: TextStyle(
                                fontSize: 11,
                                color: colorScheme.onSurface
                                    .withValues(alpha: 0.55))),
                        const SizedBox(height: 4),
                        Text('Hello, how are you?',
                            style: TextStyle(
                                fontSize: 14, color: colorScheme.onSurface)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00B27A).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('译文（$_targetLabel）',
                            style: const TextStyle(
                                fontSize: 11, color: Color(0xFF00B27A))),
                        const SizedBox(height: 4),
                        Text(_translatedExample,
                            style: TextStyle(
                                fontSize: 14, color: colorScheme.onSurface)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              child: Text('目标语言',
                  style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurface.withValues(alpha: 0.55))),
            ),
            SettingGroup(
              children: _languages.map((lang) {
                return InkWell(
                  onTap: () => setState(() => _targetLang = lang.$1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 13),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(lang.$2,
                              style: TextStyle(
                                  fontSize: 15, color: colorScheme.onSurface)),
                        ),
                        if (_targetLang == lang.$1)
                          const Icon(Icons.check,
                              color: Color(0xFF00B27A), size: 20),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              '提示：\n• 自动翻译功能由 AI 提供支持\n• 翻译结果仅供参考，可能存在误差\n• 原文和译文都会显示在聊天界面中\n• 可在聊天界面长按消息选择"显示原文"',
              style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.55),
                  height: 1.6),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
