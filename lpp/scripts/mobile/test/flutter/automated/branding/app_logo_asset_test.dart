import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('app logo asset contract', () {
    test('mobile brand logo matches the PC canonical logo source', () {
      final mobileRoot = Directory.current;
      final mobileLogo = File('${mobileRoot.path}/assets/brand/app_icon.png');
      final pcLogo = File(
        '${mobileRoot.path}/../lpp_pc_client/assets/brand/app-icon-source.png',
      );

      expect(pcLogo.existsSync(), isTrue);
      expect(mobileLogo.existsSync(), isTrue);
      expect(_sha256(mobileLogo), _sha256(pcLogo));
    });

    test('pubspec and branded screens use the shared logo asset', () {
      final mobileRoot = Directory.current;
      final pubspec = File(
        '${mobileRoot.path}/pubspec.yaml',
      ).readAsStringSync();
      final loginPage = File(
        '${mobileRoot.path}/lib/features/auth/presentation/pages/login_page.dart',
      ).readAsStringSync();
      final aboutPage = File(
        '${mobileRoot.path}/lib/features/settings/presentation/pages/about_page.dart',
      ).readAsStringSync();

      expect(pubspec, contains('assets/brand/app_icon.png'));
      expect(loginPage, contains('Image.asset'));
      expect(loginPage, contains('AppBrandAssets.appIcon'));
      expect(aboutPage, contains('Image.asset'));
      expect(aboutPage, contains('AppBrandAssets.appIcon'));
    });
  });
}

String _sha256(File file) {
  return sha256.convert(file.readAsBytesSync()).toString();
}
