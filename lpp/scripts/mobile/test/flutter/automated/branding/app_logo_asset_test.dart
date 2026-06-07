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
