import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/providers/font_size_provider.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class FontSizePage extends ConsumerWidget {
  const FontSizePage({super.key});

  static const _sizes = [
    ('small', 14.0, 0.90),
    ('standard', 16.0, 1.00),
    ('large', 18.0, 1.10),
    ('extra-large', 20.0, 1.18),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scale = ref.watch(fontSizeScaleProvider);
    final current = _sizes.reduce((a, b) {
      return (a.$3 - scale).abs() <= (b.$3 - scale).abs() ? a : b;
    });
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.fontSizeTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('预览效果',
                    style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.55))),
                const SizedBox(height: 8),
                Text(
                  '这是一段示例文字，用于预览字体大小效果。您可以选择适合自己的字体大小，让聊天更加舒适。',
                  style: TextStyle(
                    fontSize: current.$2,
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: _sizes.map((s) {
              final selected = s.$1 == current.$1;
              return InkWell(
                onTap: () =>
                    ref.read(fontSizeScaleProvider.notifier).setScale(s.$3),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 48,
                        child: Text(_fontSizeLabel(l10n, s.$1),
                            style: TextStyle(
                                fontSize: 15, color: colorScheme.onSurface)),
                      ),
                      Text('${s.$2.toInt()}px',
                          style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurface
                                  .withValues(alpha: 0.55))),
                      const Spacer(),
                      if (selected)
                        const Icon(Icons.check,
                            color: Color(0xFF00B27A), size: 20),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

String _fontSizeLabel(AppLocalizations l10n, String key) {
  switch (key) {
    case 'small':
      return l10n.fontSizeSmall;
    case 'large':
      return l10n.fontSizeLarge;
    case 'extra-large':
      return l10n.fontSizeExtraLarge;
    case 'standard':
    default:
      return l10n.fontSizeNormal;
  }
}
