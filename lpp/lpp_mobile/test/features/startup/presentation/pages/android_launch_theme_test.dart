import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android launcher hands off through the native full-screen loading page',
      () {
    final manifest = File('android/app/src/main/AndroidManifest.xml');
    final splashActivity = File(
      'android/app/src/main/kotlin/com/startlink/lite/SplashActivity.kt',
    );

    expect(manifest.existsSync(), isTrue);
    expect(splashActivity.existsSync(), isTrue);

    final manifestSource = manifest.readAsStringSync();
    final splashSource = splashActivity.readAsStringSync();

    expect(manifestSource, contains('android:name=".SplashActivity"'));
    expect(manifestSource, contains('android:theme="@style/LaunchTheme"'));
    expect(manifestSource, contains('android:name=".MainActivity"'));
    expect(
        manifestSource, contains('android:theme="@style/FlutterLaunchTheme"'));

    final splashBlock = _activityBlock(manifestSource, '.SplashActivity');
    final mainBlock = _activityBlock(manifestSource, '.MainActivity');

    expect(splashBlock, contains('android.intent.action.MAIN'));
    expect(splashBlock, contains('android.intent.category.LAUNCHER'));
    expect(mainBlock, isNot(contains('android.intent.action.MAIN')));
    expect(mainBlock, isNot(contains('android.intent.category.LAUNCHER')));

    expect(splashSource, contains('R.drawable.startlink_loading'));
    expect(splashSource, contains('ImageView.ScaleType.CENTER_CROP'));
    expect(
      splashSource.indexOf('prepareFullScreenWindow(window)'),
      lessThan(splashSource.indexOf('setContentView(loadingView)')),
    );
    expect(
      splashSource.indexOf('setContentView(loadingView)'),
      lessThan(splashSource.indexOf('hideSystemBars(window)')),
    );
    expect(splashSource, contains('Intent(this, MainActivity::class.java)'));
    expect(splashSource, contains('overridePendingTransition(0, 0)'));
    expect(
      splashSource,
      isNot(contains('\n        finish()\n')),
    );
    expect(splashBlock, contains('android:noHistory="true"'));
  });

  test('Android 12 system splash is neutral before native loading takes over',
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
      expect(source, contains('@drawable/splash_transparent_icon'));
      expect(source, isNot(contains('@drawable/ic_launcher_foreground')));
      expect(source, contains('FlutterLaunchTheme'));
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
      final flutterLaunchTheme = _styleBlock(source, 'FlutterLaunchTheme');
      expect(flutterLaunchTheme, contains('android:windowDisablePreview'));
      expect(flutterLaunchTheme, contains('true'));
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
      for (final styleName in ['LaunchTheme', 'FlutterLaunchTheme']) {
        final theme = _styleBlock(source, styleName);
        expect(theme, contains('android:windowFullscreen'));
        expect(theme, contains('android:windowNoTitle'));
        expect(theme, contains('android:windowActionBar'));
      }
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
