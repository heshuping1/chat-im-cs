import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
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
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset(
                    AppBrandAssets.appIcon,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 16),
                const Text('绿泡泡',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D2129))),
                const SizedBox(height: 4),
                Text('${l10n.aboutVersion} 1.0.0',
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFF8E8E93))),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.aboutCheckUpdate,
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.aboutLatestVersion))),
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
                Text('© 2026 绿泡泡科技有限公司',
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
