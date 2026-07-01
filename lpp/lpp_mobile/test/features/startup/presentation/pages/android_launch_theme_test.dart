import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android launcher uses MainActivity as the single native startup layer',
      () {
    final manifest = File('android/app/src/main/AndroidManifest.xml');
    final mainActivity =
        File('android/app/src/main/kotlin/com/startlink/lite/MainActivity.kt');
    final splashActivity = File(
        'android/app/src/main/kotlin/com/startlink/lite/SplashActivity.kt');

    expect(manifest.existsSync(), isTrue);
    expect(mainActivity.existsSync(), isTrue);
    expect(splashActivity.existsSync(), isFalse);

    final manifestSource = manifest.readAsStringSync();
    final mainSource = mainActivity.readAsStringSync();

    expect(manifestSource, isNot(contains('android:name=".SplashActivity"')));
    expect(manifestSource, contains('android:name=".MainActivity"'));
    expect(manifestSource, contains('android:theme="@style/LaunchTheme"'));

    final mainBlock = _activityBlock(manifestSource, '.MainActivity');

    expect(mainBlock, contains('android.intent.action.MAIN'));
    expect(mainBlock, contains('android.intent.category.LAUNCHER'));
    expect(mainBlock, contains('android:exported="true"'));
    expect(mainSource, contains('prepareFullScreenWindow(window)'));
    expect(mainSource, contains('hideSystemBars(window)'));
    expect(mainSource, isNot(contains('startActivity(')));
  });

  test('Android 12 system splash shows a visible brand icon before loading',
      () {
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
      expect(source, contains('@drawable/ic_launcher_foreground'));
      expect(source, isNot(contains('@drawable/splash_transparent_icon')));
      expect(source, contains('android:windowDisablePreview'));
      expect(source, contains('@drawable/launch_background'));
      expect(source, isNot(contains('postSplashScreenTheme')));
    }
  });

  test('Android Flutter launch theme does not draw a second preview layer', () {
    final styleFiles = [
      File('android/app/src/main/res/values/styles.xml'),
      File('android/app/src/main/res/values-night/styles.xml'),
      File('android/app/src/main/res/values-v31/styles.xml'),
      File('android/app/src/main/res/values-night-v31/styles.xml'),
    ];

    for (final styles in styleFiles) {
      expect(styles.existsSync(), isTrue);

      final source = styles.readAsStringSync();
      final launchTheme = _styleBlock(source, 'LaunchTheme');
      expect(launchTheme, contains('android:windowDisablePreview'));
      expect(launchTheme, contains('true'));
    }
  });

  test('Android normal theme keeps the native loading artwork before Flutter',
      () {
    final styleFiles = [
      File('android/app/src/main/res/values/styles.xml'),
      File('android/app/src/main/res/values-night/styles.xml'),
      File('android/app/src/main/res/values-v31/styles.xml'),
      File('android/app/src/main/res/values-night-v31/styles.xml'),
    ];

    for (final styles in styleFiles) {
      expect(styles.existsSync(), isTrue);

      final source = styles.readAsStringSync();
      final normalTheme = _styleBlock(source, 'NormalTheme');
      expect(normalTheme, contains('@drawable/launch_background'));
      expect(normalTheme, isNot(contains('?android:colorBackground')));
    }
  });

  test('Android launch themes stay fullscreen during startup handoff', () {
    final styleFiles = [
      File('android/app/src/main/res/values/styles.xml'),
      File('android/app/src/main/res/values-night/styles.xml'),
      File('android/app/src/main/res/values-v31/styles.xml'),
      File('android/app/src/main/res/values-night-v31/styles.xml'),
    ];

    for (final styles in styleFiles) {
      expect(styles.existsSync(), isTrue);

      final source = styles.readAsStringSync();
      final theme = _styleBlock(source, 'LaunchTheme');
      expect(theme, contains('android:windowFullscreen'));
      expect(theme, contains('android:windowNoTitle'));
      expect(theme, contains('android:windowActionBar'));
    }
  });
}

String _activityBlock(String source, String activityName) {
  final start = source.indexOf('android:name="$activityName"');
  expect(start, isNonNegative);

  final activityStart = source.lastIndexOf('<activity', start);
  final nextActivity = source.indexOf('<activity', start + activityName.length);
  final activityEnd =
      nextActivity == -1 ? source.indexOf('</activity>', start) : nextActivity;

  if (activityEnd == -1) {
    return source.substring(activityStart);
  }

  final closingEnd = source.indexOf('</activity>', activityEnd);
  if (closingEnd != -1 && closingEnd < nextActivity) {
    return source.substring(activityStart, closingEnd + '</activity>'.length);
  }

  return source.substring(activityStart, activityEnd);
}

String _styleBlock(String source, String styleName) {
  final start = source.indexOf('name="$styleName"');
  expect(start, isNonNegative);

  final styleStart = source.lastIndexOf('<style', start);
  final styleEnd = source.indexOf('</style>', start);
  expect(styleStart, isNonNegative);
  expect(styleEnd, isNonNegative);

  return source.substring(styleStart, styleEnd + '</style>'.length);
}
