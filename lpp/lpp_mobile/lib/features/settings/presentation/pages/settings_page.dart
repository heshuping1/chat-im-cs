import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/providers/font_size_provider.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final fontSizeScale = ref.watch(fontSizeScaleProvider);
    final space = ref.watch(currentSpaceProvider);
    final isCompanySpace = space != null &&
        (space.type == SpaceType.employee ||
            space.type == SpaceType.customerSocial ||
            space.type == SpaceType.customerRestricted);

    // 企业名称（用于企业信息条目显示）
    final spacesAsync = ref.watch(spacesProvider);
    final companyName = isCompanySpace
        ? spacesAsync.valueOrNull
            ?.where((s) => s.spaceId == space.spaceId)
            .map((s) => s.name)
            .firstOrNull
        : null;

    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.settingsTitle),
      body: ListView(
        children: [
          if (isCompanySpace) ...[
            SettingSectionHeader(label: l10n.settingsSectionEnterprise),
            SettingGroup(
              children: [
                SettingTile(
                  label: l10n.settingsEnterpriseInfo,
                  value: companyName,
                  onTap: () => context.push('/enterprise/info'),
                ),
              ],
            ),
          ],
          SettingSectionHeader(label: l10n.settingsSectionAccount),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.settingsProfile,
                onTap: () => context.push('/my-profile'),
              ),
              SettingTile(
                label: l10n.settingsAccountSecurity,
                onTap: () => context.push('/settings/account'),
              ),
            ],
          ),
          SettingSectionHeader(label: l10n.settingsSectionGeneral),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.settingsNotification,
                onTap: () => context.push('/notification'),
              ),
              SettingTile(
                label: l10n.settingsDisplay,
                onTap: () => context.push('/display'),
              ),
              SettingTile(
                label: l10n.displayFontSize,
                value: _fontSizeLabel(l10n, fontSizeScale),
                onTap: () => context.push('/font-size'),
              ),
              SettingTile(
                label: l10n.settingsFriendPrivacy,
                onTap: () => context.push('/settings/privacy'),
              ),
            ],
          ),
          SettingSectionHeader(label: l10n.settingsSectionFeatures),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.settingsChat,
                onTap: () => context.push('/chat-settings-general'),
              ),
              SettingTile(
                label: l10n.settingsChatHistory,
                onTap: () => context.push('/chat-history-management'),
              ),
            ],
          ),
          SettingSectionHeader(label: l10n.settingsSectionAbout),
          SettingGroup(
            children: [
              SettingTile(
                label: l10n.settingsAbout,
                onTap: () => context.push('/settings/about'),
              ),
              if (kDebugMode)
                SettingTile(
                  label: '开发诊断',
                  onTap: () => context.push('/settings/diagnostics'),
                ),
            ],
          ),
          const SizedBox(height: 32),
        ],
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
