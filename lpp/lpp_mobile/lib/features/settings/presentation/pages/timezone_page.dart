import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';
import 'package:lpp_mobile/features/settings/presentation/utils/settings_i18n.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class TimezonePage extends ConsumerWidget {
  const TimezonePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOffset = ref.watch(timezoneOffsetProvider);
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        title: Text(l10n.timezoneTitle,
            style: TextStyle(fontSize: 17, color: colorScheme.onSurface)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 18, color: colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        itemCount: kTimezones.length,
        itemBuilder: (_, i) {
          final tz = kTimezones[i];
          final isSelected = tz.offset == currentOffset;
          return Column(
            children: [
              InkWell(
                onTap: () {
                  ref
                      .read(timezoneOffsetProvider.notifier)
                      .setOffset(tz.offset);
                  Navigator.pop(context);
                },
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          localizedTimezoneLabel(l10n, tz.offset),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 15,
                            color: isSelected
                                ? const Color(0xFF07C160)
                                : colorScheme.onSurface,
                          ),
                        ),
                      ),
                      if (isSelected)
                        const Icon(Icons.check,
                            size: 18, color: Color(0xFF07C160)),
                    ],
                  ),
                ),
              ),
              Container(
                height: 0.5,
                margin: const EdgeInsets.only(left: 16),
                color: Theme.of(context).dividerColor,
              ),
            ],
          );
        },
      ),
    );
  }
}
