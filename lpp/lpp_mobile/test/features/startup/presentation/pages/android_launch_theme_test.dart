import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android 12 launch theme does not fall back to the system default splash', () {
    final styleFiles = [
      File('android/app/src/main/res/values-v31/styles.xml'),
      File('android/app/src/main/res/values-night-v31/styles.xml'),
    ];

    for (final styles in styleFiles) {
      expect(styles.existsSync(), isTrue);

      final source = styles.readAsStringSync();
      expect(source, contains('android:windowSplashScreenBackground'));
      expect(source, contains('@color/launch_background'));
      expect(source, contains('android:windowSplashScreenAnimatedIcon'));
      expect(source, contains('@drawable/splash_transparent_icon'));
      expect(source, isNot(contains('postSplashScreenTheme')));
    }
  });
}
