import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

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

    test('pubspec and branded screens use the final brand logo asset', () {
      final mobileRoot = Directory.current;
      final pubspec = File(
        '${mobileRoot.path}/pubspec.yaml',
      ).readAsStringSync();
      final loginPage = File(
        '${mobileRoot.path}/lib/features/auth/presentation/pages/login_page.dart',
      ).readAsStringSync();
      final brandLogo = File(
        '${mobileRoot.path}/lib/core/branding/startlink_brand_logo.dart',
      ).readAsStringSync();
      final aboutPage = File(
        '${mobileRoot.path}/lib/features/settings/presentation/pages/about_page.dart',
      ).readAsStringSync();

      expect(pubspec, contains('assets/brand/app_icon.png'));
      expect(pubspec, contains('assets/brand/brand_logo_icon.png'));
      expect(loginPage, contains('StartlinkBrandLogo'));
      expect(brandLogo, contains('Image.asset'));
      expect(brandLogo, contains('AppBrandAssets.brandLogoIcon'));
      expect(aboutPage, contains('StartlinkBrandLogo'));
      expect(aboutPage, contains("dimension: 80"));
      expect(aboutPage, isNot(contains('AppBrandAssets.appIcon')));
    });

    test('android launcher icon uses adaptive resources for vendor launchers', () async {
      final mobileRoot = Directory.current;
      final manifest = File(
        '${mobileRoot.path}/android/app/src/main/AndroidManifest.xml',
      ).readAsStringSync();
      final adaptiveIcon = File(
        '${mobileRoot.path}/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      );
      final adaptiveRoundIcon = File(
        '${mobileRoot.path}/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
      );
      final foregroundIcon = File(
        '${mobileRoot.path}/android/app/src/main/res/drawable/ic_launcher_foreground.png',
      );
      final legacyIcon = File(
        '${mobileRoot.path}/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      );
      final legacyRoundIcon = File(
        '${mobileRoot.path}/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
      );

      expect(manifest, contains('android:icon="@mipmap/ic_launcher"'));
      expect(
        manifest,
        contains('android:roundIcon="@mipmap/ic_launcher_round"'),
      );
      expect(adaptiveIcon.existsSync(), isTrue);
      expect(adaptiveIcon.readAsStringSync(), contains('<adaptive-icon'));
      expect(adaptiveRoundIcon.existsSync(), isTrue);
      expect(foregroundIcon.existsSync(), isTrue);
      await expectLater(_hasTransparentPixels(legacyIcon), completion(isFalse));
      await expectLater(
        _hasTransparentPixels(legacyRoundIcon),
        completion(isFalse),
      );
    });

    test('native launcher labels use the public Chinese app name', () {
      final mobileRoot = Directory.current;
      final manifest = File(
        '${mobileRoot.path}/android/app/src/main/AndroidManifest.xml',
      ).readAsStringSync();
      final androidStrings = File(
        '${mobileRoot.path}/android/app/src/main/res/values/strings.xml',
      ).readAsStringSync();
      final iosInfoPlist = File(
        '${mobileRoot.path}/ios/Runner/Info.plist',
      ).readAsStringSync();
      final appSource = File(
        '${mobileRoot.path}/lib/app/app.dart',
      ).readAsStringSync();
      final appBrandSource = File(
        '${mobileRoot.path}/lib/core/branding/app_brand.dart',
      ).readAsStringSync();

      expect(manifest, contains('android:label="@string/app_name"'));
      expect(androidStrings, contains('<string name="app_name">微界</string>'));
      expect(iosInfoPlist, contains('<key>CFBundleDisplayName</key>'));
      expect(iosInfoPlist, contains('<string>微界</string>'));
      expect(appBrandSource, contains("publicName = '微界'"));
      expect(appSource, contains('title: AppBrand.publicName'));
    });

    test('mobile runtime copy does not expose the legacy Chinese brand', () {
      final mobileRoot = Directory.current;
      final legacyChineseBrands = [
        String.fromCharCodes([0x661f, 0x7edc]),
        String.fromCharCodes([0x661f, 0x7d61]),
      ];
      final runtimeRoots = [Directory('${mobileRoot.path}/lib')];
      final offenders = <String>[];

      for (final root in runtimeRoots) {
        for (final entity in root.listSync(recursive: true)) {
          if (entity is! File ||
              (!entity.path.endsWith('.dart') &&
                  !entity.path.endsWith('.arb'))) {
            continue;
          }
          final source = entity.readAsStringSync();
          if (legacyChineseBrands.any(source.contains)) {
            offenders.add(entity.path.replaceFirst('${mobileRoot.path}/', ''));
          }
        }
      }

      expect(offenders, isEmpty);
    });
  });
}

String _sha256(File file) {
  return sha256.convert(file.readAsBytesSync()).toString();
}

Future<bool> _hasTransparentPixels(File file) async {
  final codec = await ui.instantiateImageCodec(file.readAsBytesSync());
  final frame = await codec.getNextFrame();
  final byteData = await frame.image.toByteData(
    format: ui.ImageByteFormat.rawRgba,
  );
  if (byteData == null) return true;
  final bytes = byteData.buffer.asUint8List();
  for (var index = 3; index < bytes.length; index += 4) {
    if (bytes[index] < 255) return true;
  }
  return false;
}
