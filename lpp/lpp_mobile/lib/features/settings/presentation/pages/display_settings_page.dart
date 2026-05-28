import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/providers/font_size_provider.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/providers/theme_provider.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class DisplaySettingsPage extends ConsumerWidget {
  const DisplaySettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final themeMode = ref.watch(themeModeProvider);
    final fontSizeScale = ref.watch(fontSizeScaleProvider);

    String themeModeLabel;
    switch (themeMode) {
      case ThemeMode.dark:
        themeModeLabel = l10n.displayDarkModeOn;
      case ThemeMode.light:
        themeModeLabel = l10n.displayDarkModeOff;
      case ThemeMode.system:
        themeModeLabel = l10n.displayDarkModeSystem;
    }

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      appBar: buildSettingsAppBar(context, l10n.displayTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.displayFontSize,
                value: _fontSizeLabel(l10n, fontSizeScale),
                onTap: () => context.push('/font-size'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.displayDarkMode,
                value: themeModeLabel,
                onTap: () => _showThemePicker(context, ref, themeMode, l10n),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showThemePicker(
    BuildContext context,
    WidgetRef ref,
    ThemeMode current,
    AppLocalizations l10n,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  children: [
                    _ThemeOption(
                      label: l10n.displayDarkModeSystem,
                      subtitle: l10n.displayDarkModeSystemHint,
                      isSelected: current == ThemeMode.system,
                      onTap: () {
                        ref
                            .read(themeModeProvider.notifier)
                            .setThemeMode(ThemeMode.system);
                        Navigator.pop(context);
                      },
                    ),
                    Divider(height: 1, color: Theme.of(context).dividerColor),
                    _ThemeOption(
                      label: l10n.displayDarkModeOff,
                      subtitle: l10n.displayDarkModeOffHint,
                      isSelected: current == ThemeMode.light,
                      onTap: () {
                        ref
                            .read(themeModeProvider.notifier)
                            .setThemeMode(ThemeMode.light);
                        Navigator.pop(context);
                      },
                    ),
                    Divider(height: 1, color: Theme.of(context).dividerColor),
                    _ThemeOption(
                      label: l10n.displayDarkModeOn,
                      subtitle: l10n.displayDarkModeOnHint,
                      isSelected: current == ThemeMode.dark,
                      onTap: () {
                        ref
                            .read(themeModeProvider.notifier)
                            .setThemeMode(ThemeMode.dark);
                        Navigator.pop(context);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: ListTile(
                  title: Text(
                    l10n.commonCancel,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  onTap: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _fontSizeLabel(AppLocalizations l10n, double scale) {
  if (scale < 0.96) return l10n.fontSizeSmall;
  if (scale < 1.06) return l10n.fontSizeNormal;
  if (scale < 1.14) return l10n.fontSizeLarge;
  return l10n.fontSizeExtraLarge;
}

class _ThemeOption extends StatelessWidget {
  final String label;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeOption({
    required this.label,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(label, style: const TextStyle(fontSize: 16)),
      subtitle: Text(subtitle,
          style: TextStyle(
              fontSize: 13,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.5))),
      trailing: isSelected
          ? const Icon(Icons.check, color: Color(0xFF07C160), size: 20)
          : null,
      onTap: onTap,
    );
  }
}
