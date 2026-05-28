import 'package:flutter/material.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/providers/locale_provider.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';

class LanguageSettingsPage extends ConsumerWidget {
  const LanguageSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final currentLocale = ref.watch(localeProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.settingsLanguage),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          SettingGroup(
            children: kSupportedLocales.map((lang) {
              final locale = lang.$1;
              final label = lang.$2;
              final isSelected = currentLocale.languageCode == locale.languageCode &&
                  currentLocale.countryCode == locale.countryCode;
              return InkWell(
                onTap: () async {
                  await ref.read(localeProvider.notifier).setLocale(locale);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(label,
                            style: const TextStyle(
                                fontSize: 15, color: Color(0xFF2C2C2C))),
                      ),
                      if (isSelected)
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
