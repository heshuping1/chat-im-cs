import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android launcher badge bridge supports Oplus com.android.launcher', () {
    final source = File(
      'android/app/src/main/kotlin/com/startlink/lite/AndroidLauncherBadgeBridge.kt',
    ).readAsStringSync();

    expect(source, contains('lpp_mobile/launcher_badge'));
    expect(source, contains('content://com.android.badge/badge'));
    expect(source, contains('setAppBadgeCount'));
    expect(source, contains('app_badge_packageName'));
    expect(source, contains('com.android.launcher'));
    expect(source, contains('Build.MANUFACTURER'));
    expect(source, contains('setShowBadge(true)'));
    expect(source, contains('setNumber(count)'));
  });
}
