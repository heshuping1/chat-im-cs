import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('quick login account rows render image avatars before account text', () {
    final mobileRoot = Directory.current;
    final source = File(
      '${mobileRoot.path}/lib/features/auth/presentation/pages/login_page.dart',
    ).readAsStringSync();
    final buttonSource = source.substring(
      source.indexOf('class _QuickLoginAccountButton'),
    );
    final avatarSource = source.substring(
      source.indexOf('class _QuickLoginAvatar'),
    );
    final pubspec = File('${mobileRoot.path}/pubspec.yaml').readAsStringSync();

    expect(
      source,
      contains("import 'package:lpp_mobile/core/widgets/user_avatar.dart';"),
    );
    expect(source, contains('final String? avatarAssetPath;'));
    expect(
      source,
      contains("avatarAssetPath: 'assets/auth/quick_login_owner.png'"),
    );
    expect(
      source,
      contains("avatarAssetPath: 'assets/auth/quick_login_service.png'"),
    );
    expect(
      source,
      contains("avatarAssetPath: 'assets/auth/quick_login_doc_user.png'"),
    );
    expect(pubspec, contains('    - assets/auth/'));
    expect(buttonSource, contains('_QuickLoginAvatar(account: account)'));
    expect(avatarSource, contains('Image.asset('));
    expect(avatarSource, contains('UserAvatar('));
    expect(
      buttonSource.indexOf('_QuickLoginAvatar(account: account)'),
      lessThan(buttonSource.indexOf('Expanded(')),
    );
  });
}
