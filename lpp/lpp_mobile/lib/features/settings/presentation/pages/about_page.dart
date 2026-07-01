import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/branding/startlink_brand_logo.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:lpp_mobile/features/app_update/presentation/app_update_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:package_info_plus/package_info_plus.dart';

class AboutPage extends ConsumerStatefulWidget {
  const AboutPage({super.key});

  @override
  ConsumerState<AboutPage> createState() => _AboutPageState();
}

class _AboutPageState extends ConsumerState<AboutPage> {
  late final Future<PackageInfo> _packageInfo = PackageInfo.fromPlatform();

  Future<void> _checkUpdate(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final latestVersionText = AppLocalizations.of(context).aboutLatestVersion;
    try {
      final update = await ref
          .read(appUpdateControllerProvider.notifier)
          .checkForUpdates();
      if (!mounted || update == null) return;
      if (update.status == AppUpdateStatus.none) {
        messenger.showSnackBar(SnackBar(content: Text(latestVersionText)));
        return;
      }
      messenger.showSnackBar(
        SnackBar(
            content: Text(
                '发现新版本 ${update.latestVersion ?? update.latestVersionCode ?? ''}')),
      );
    } catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text('检查更新失败：$error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final updateState = ref.watch(appUpdateControllerProvider);
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.aboutTitle),
      body: ListView(
        children: [
          // Logo & Version
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 48),
            child: Column(
              children: [
                const StartlinkBrandLogo(dimension: 80),
                const SizedBox(height: 16),
                const Text('微界',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D2129))),
                const SizedBox(height: 4),
                FutureBuilder<PackageInfo>(
                  future: _packageInfo,
                  builder: (context, snapshot) {
                    final version = snapshot.data?.version ?? '1.0.0';
                    return Text('${l10n.aboutVersion} $version',
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFF8E8E93)));
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.aboutCheckUpdate,
                value: updateState.isChecking ? '检查中' : null,
                onTap:
                    updateState.isChecking ? null : () => _checkUpdate(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.aboutTerms,
                onTap: () => context.push('/terms'),
              ),
              SettingTile(
                label: l10n.aboutPrivacy,
                onTap: () => context.push('/privacy'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.feedbackTitle,
                onTap: () => context.push('/feedback'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          const Center(
            child: Column(
              children: [
                Text('© 2026 微界科技有限公司',
                    style: TextStyle(fontSize: 12, color: Color(0xFFAEAEB2))),
                SizedBox(height: 4),
                Text('保留所有权利',
                    style: TextStyle(fontSize: 12, color: Color(0xFFAEAEB2))),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
