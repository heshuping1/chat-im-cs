import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';
import 'package:lpp_mobile/features/profile/presentation/providers/profile_providers.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class PrivacySettingsPage extends ConsumerStatefulWidget {
  const PrivacySettingsPage({super.key});

  @override
  ConsumerState<PrivacySettingsPage> createState() =>
      _PrivacySettingsPageState();
}

class _PrivacySettingsPageState extends ConsumerState<PrivacySettingsPage> {
  bool _needVerification = true;
  bool _searchByPhone = true;
  bool _searchByLppId = true;
  String _profileVisibility = 'friends';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final settings =
          await ref.read(profileRepositoryProvider).getPrivacySettings();
      if (!mounted) return;
      setState(() {
        _needVerification = settings.allowFriendRequest != 'nobody';
        _searchByPhone = settings.searchableByMobile;
        _searchByLppId = settings.searchableByLppId;
        _profileVisibility = settings.profileVisibility;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final settings = ProfilePrivacySettings(
      searchableByMobile: _searchByPhone,
      searchableByLppId: _searchByLppId,
      allowFriendRequest: _needVerification ? 'everyone' : 'nobody',
      profileVisibility: _profileVisibility,
    );
    try {
      await ref.read(profileRepositoryProvider).updatePrivacySettings(settings);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.privacySaveSuccess)),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.privacySaveFailed)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.privacySettingsTitle),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                const SizedBox(height: 16),
                SettingGroup(
                  children: [
                    SettingSwitchTile(
                      label: l10n.privacyAllowFriendRequest,
                      value: _needVerification,
                      onChanged: (v) {
                        setState(() => _needVerification = v);
                        _save();
                      },
                    ),
                    SettingSwitchTile(
                      label: l10n.privacySearchableByMobile,
                      value: _searchByPhone,
                      onChanged: (v) {
                        setState(() => _searchByPhone = v);
                        _save();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SettingGroup(
                  children: [
                    SettingTile(
                      label: '黑名单',
                      onTap: () => context.push('/blacklist'),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}
