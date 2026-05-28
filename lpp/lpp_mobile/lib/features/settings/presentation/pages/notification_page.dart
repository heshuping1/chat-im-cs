import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/settings_providers.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class NotificationPage extends ConsumerWidget {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final settingsAsync = ref.watch(notificationSettingsProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.notificationTitle),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: TextButton(
            onPressed: () => ref.read(notificationSettingsProvider.notifier).load(),
            child: const Text('加载失败，点击重试'),
          ),
        ),
        data: (settings) => ListView(
          children: [
            const SizedBox(height: 16),
            SettingGroup(
              children: [
                SettingSwitchTile(
                  label: l10n.notificationGlobalMute,
                  value: settings.globalMute,
                  onChanged: (v) => ref
                      .read(notificationSettingsProvider.notifier)
                      .patch((s) => s.copyWith(globalMute: v)),
                ),
                SettingSwitchTile(
                  label: l10n.notificationPreview,
                  value: settings.previewEnabled,
                  onChanged: (v) => ref
                      .read(notificationSettingsProvider.notifier)
                      .patch((s) => s.copyWith(previewEnabled: v)),
                ),
                SettingSwitchTile(
                  label: l10n.notificationSound,
                  value: settings.soundEnabled,
                  onChanged: (v) => ref
                      .read(notificationSettingsProvider.notifier)
                      .patch((s) => s.copyWith(soundEnabled: v)),
                ),
                SettingSwitchTile(
                  label: l10n.notificationVibration,
                  value: settings.vibrationEnabled,
                  onChanged: (v) => ref
                      .read(notificationSettingsProvider.notifier)
                      .patch((s) => s.copyWith(vibrationEnabled: v)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // 免打扰时段
            SettingGroup(
              children: [
                SettingTile(
                  label: '免打扰时段',
                  value: settings.dndStartTime != null && settings.dndEndTime != null
                      ? '${settings.dndStartTime} - ${settings.dndEndTime}'
                      : '未设置',
                  onTap: () => _showDndPicker(context, ref, settings),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDndPicker(BuildContext context, WidgetRef ref, dynamic settings) {
    // 简单实现：弹出时间选择
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            const Text('免打扰时段',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ListTile(
              title: const Text('22:00 - 08:00（夜间）'),
              onTap: () {
                Navigator.pop(ctx);
                ref.read(notificationSettingsProvider.notifier).patch(
                    (s) => s.copyWith(dndStartTime: '22:00', dndEndTime: '08:00'));
              },
            ),
            ListTile(
              title: const Text('关闭免打扰'),
              onTap: () {
                Navigator.pop(ctx);
                ref.read(notificationSettingsProvider.notifier).patch(
                    (s) => s.copyWith(dndStartTime: null, dndEndTime: null));
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
