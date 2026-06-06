import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  group('mobile architecture boundaries', () {
    final sourceFiles = _dartFiles(Directory('lib'));

    test('keeps domain and application independent from data and UI', () {
      final violations =
          sourceFiles
              .where(_isDomainOrApplicationFile)
              .where(
                (file) => !_knownDomainApplicationBoundaryDebt.contains(
                  _relative(file.path),
                ),
              )
              .expand(
                (file) => _importsOf(file)
                    .where(_isDomainForbiddenImport)
                    .map(
                      (importPath) =>
                          '${_relative(file.path)} imports $importPath',
                    ),
              )
              .toList()
            ..sort();

      expect(violations, isEmpty);
    });

    test(
      'keeps presentation away from raw network and data implementations',
      () {
        final violations =
            sourceFiles
                .where(_isPresentationFile)
                .where(
                  (file) => !_knownPresentationBoundaryDebt.contains(
                    _relative(file.path),
                  ),
                )
                .expand(
                  (file) => _importsOf(file)
                      .where(_isPresentationForbiddenImport)
                      .map(
                        (importPath) =>
                            '${_relative(file.path)} imports $importPath',
                      ),
                )
                .toList()
              ..sort();

        expect(violations, isEmpty);
      },
    );

    test('keeps core and shared independent from feature modules', () {
      final violations =
          sourceFiles
              .where((file) {
                final path = _relative(file.path);
                return path.startsWith('lib/core/') ||
                    path.startsWith('lib/shared/');
              })
              .where(
                (file) => !_knownCoreSharedBoundaryDebt.contains(
                  _relative(file.path),
                ),
              )
              .expand(
                (file) => _importsOf(file)
                    .where(
                      (importPath) =>
                          importPath.startsWith('package:lpp_mobile/features/'),
                    )
                    .map(
                      (importPath) =>
                          '${_relative(file.path)} imports $importPath',
                    ),
              )
              .toList()
            ..sort();

      expect(violations, isEmpty);
    });
  });
}

const _knownDomainApplicationBoundaryDebt = {
  'lib/features/call/domain/services/webrtc_service.dart',
  'lib/features/chat/domain/services/audio_player_service.dart',
  'lib/features/chat/domain/services/message_send_lifecycle.dart',
};

const _knownPresentationBoundaryDebt = {
  'lib/features/auth/presentation/pages/login_page.dart',
  'lib/features/auth/presentation/pages/register_page.dart',
  'lib/features/auth/presentation/providers/auth_provider.dart',
  'lib/features/call/presentation/providers/call_provider.dart',
  'lib/features/chat/presentation/controllers/conversation_actions_controller.dart',
  'lib/features/chat/presentation/pages/add_friend_page.dart',
  'lib/features/chat/presentation/pages/bulk_send_page.dart',
  'lib/features/chat/presentation/pages/chat_page.dart',
  'lib/features/chat/presentation/pages/chat_settings_page.dart',
  'lib/features/chat/presentation/pages/create_group_page.dart',
  'lib/features/chat/presentation/pages/favorites_page.dart',
  'lib/features/chat/presentation/pages/group_admin_page.dart',
  'lib/features/chat/presentation/pages/group_announcement_page.dart',
  'lib/features/chat/presentation/pages/group_join_requests_page.dart',
  'lib/features/chat/presentation/pages/group_manage_page.dart',
  'lib/features/chat/presentation/pages/group_member_mute_page.dart',
  'lib/features/chat/presentation/pages/group_read_receipts_page.dart',
  'lib/features/chat/presentation/pages/group_settings_page.dart',
  'lib/features/chat/presentation/pages/scan_page.dart',
  'lib/features/chat/presentation/pages/search_page.dart',
  'lib/features/chat/presentation/pages/select_group_member_page.dart',
  'lib/features/chat/presentation/pages/transfer_owner_page.dart',
  'lib/features/chat/presentation/providers/chat_provider.dart',
  'lib/features/chat/presentation/providers/conversations_provider.dart',
  'lib/features/chat/presentation/providers/gateway_provider.dart',
  'lib/features/chat/presentation/providers/group_detail_provider.dart',
  'lib/features/chat/presentation/providers/group_join_requests_provider.dart',
  'lib/features/chat/presentation/providers/presence_provider.dart',
  'lib/features/chat/presentation/widgets/chat_input_toolbar.dart',
  'lib/features/chat/presentation/widgets/message_bubble.dart',
  'lib/features/contacts/presentation/pages/contacts_page.dart',
  'lib/features/contacts/presentation/pages/customer_overview_page.dart',
  'lib/features/contacts/presentation/pages/group_list_page.dart',
  'lib/features/contacts/presentation/pages/invite_friends_page.dart',
  'lib/features/contacts/presentation/pages/new_applications_page.dart',
  'lib/features/contacts/presentation/pages/profile_page.dart',
  'lib/features/contacts/presentation/providers/contacts_provider.dart',
  'lib/features/customer_service/presentation/pages/customer_service_page.dart',
  'lib/features/customer_service/presentation/providers/customer_service_providers.dart',
  'lib/features/notice/presentation/pages/notice_detail_page.dart',
  'lib/features/notice/presentation/pages/notice_list_page.dart',
  'lib/features/organization/presentation/pages/organization_page.dart',
  'lib/features/profile/presentation/pages/my_profile_page.dart',
  'lib/features/profile/presentation/pages/qr_code_page.dart',
  'lib/features/profile/presentation/providers/profile_providers.dart',
  'lib/features/settings/presentation/pages/account_settings_page.dart',
  'lib/features/settings/presentation/pages/blacklist_page.dart',
  'lib/features/settings/presentation/pages/logged_devices_page.dart',
  'lib/features/settings/presentation/pages/network_settings_page.dart',
  'lib/features/settings/presentation/providers/network_provider.dart',
  'lib/features/settings/presentation/providers/settings_providers.dart',
  'lib/features/space/presentation/pages/enterprise_broadcast_page.dart',
  'lib/features/space/presentation/pages/enterprise_info_page.dart',
  'lib/features/space/presentation/pages/enterprise_invite_page.dart',
  'lib/features/space/presentation/pages/enterprise_manage_page.dart',
  'lib/features/space/presentation/pages/enterprise_members_page.dart',
  'lib/features/space/presentation/pages/join_company_page.dart',
  'lib/features/space/presentation/providers/enterprise_join_provider.dart',
  'lib/features/space/presentation/providers/spaces_provider.dart',
  'lib/features/space/presentation/providers/tenant_features_provider.dart',
};

const _knownCoreSharedBoundaryDebt = {
  'lib/core/database/hive_to_sqlite_migration.dart',
  'lib/core/di/injector.dart',
  'lib/core/widgets/network_status_banner.dart',
};

List<File> _dartFiles(Directory root) {
  if (!root.existsSync()) return const [];
  return root.listSync(recursive: true).whereType<File>().where((file) {
    final path = file.path;
    return path.endsWith('.dart') &&
        !path.endsWith('.g.dart') &&
        !path.endsWith('.freezed.dart');
  }).toList()..sort((left, right) => left.path.compareTo(right.path));
}

Iterable<String> _importsOf(File file) sync* {
  final importPattern = RegExp(r"^\s*import\s+'([^']+)';", multiLine: true);
  final source = file.readAsStringSync();
  for (final match in importPattern.allMatches(source)) {
    final importPath = match.group(1);
    if (importPath != null) yield importPath;
  }
}

bool _isDomainOrApplicationFile(File file) {
  final path = _relative(file.path);
  return path.contains('/domain/') || path.contains('/application/');
}

bool _isPresentationFile(File file) {
  return _relative(file.path).contains('/presentation/');
}

bool _isDomainForbiddenImport(String importPath) {
  if (importPath == 'package:dio/dio.dart') return true;
  if (importPath == 'package:flutter_riverpod/flutter_riverpod.dart')
    return true;
  if (importPath == 'package:flutter_webrtc/flutter_webrtc.dart') return true;
  if (importPath == 'package:just_audio/just_audio.dart') return true;
  if (importPath.startsWith('package:lpp_mobile/core/network/')) return true;
  if (importPath.startsWith('package:lpp_mobile/features/') &&
      (importPath.contains('/data/') ||
          importPath.contains('/presentation/'))) {
    return true;
  }
  return false;
}

bool _isPresentationForbiddenImport(String importPath) {
  if (importPath == 'package:dio/dio.dart') return true;
  if (importPath.startsWith('package:lpp_mobile/core/network/')) return true;
  if (importPath.startsWith('package:lpp_mobile/features/') &&
      (importPath.contains('/data/datasources/') ||
          importPath.contains('/data/repositories/'))) {
    return true;
  }
  return false;
}

String _relative(String path) {
  return path.replaceAll('\\', '/').replaceFirst(RegExp(r'^\./'), '');
}
