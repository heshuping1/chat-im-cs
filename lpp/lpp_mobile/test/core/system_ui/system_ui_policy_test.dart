import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normal app mode keeps Android navigation bar outside Flutter content',
      () {
    final systemUiSource = File('lib/app/system_ui.dart').readAsStringSync();
    final mainActivitySource = File(
      'android/app/src/main/kotlin/com/startlink/lite/MainActivity.kt',
    ).readAsStringSync();
    final imageViewerSource = File(
      'lib/features/chat/presentation/pages/image_viewer_page.dart',
    ).readAsStringSync();
    final appOverlayStyleSource = RegExp(
      r'const SystemUiOverlayStyle appSystemUiOverlayStyle = SystemUiOverlayStyle\([\s\S]*?\n\);',
    ).stringMatch(systemUiSource);

    expect(systemUiSource, contains('SystemUiMode.manual'));
    expect(systemUiSource, contains('SystemUiOverlay.top'));
    expect(systemUiSource, contains('SystemUiOverlay.bottom'));
    expect(systemUiSource, isNot(contains('SystemUiMode.edgeToEdge')));
    expect(appOverlayStyleSource, isNotNull);
    expect(appOverlayStyleSource,
        isNot(contains('systemNavigationBarColor: Colors.transparent')));

    expect(mainActivitySource, isNot(contains('hideSystemBars(window)')));
    expect(mainActivitySource,
        isNot(contains('setDecorFitsSystemWindows(false)')));
    expect(
        mainActivitySource, isNot(contains('SYSTEM_UI_FLAG_HIDE_NAVIGATION')));
    expect(mainActivitySource,
        isNot(contains('SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION')));
    expect(mainActivitySource,
        isNot(contains('WindowInsets.Type.navigationBars()')));

    expect(imageViewerSource, contains('configureAppSystemUi()'));
    expect(imageViewerSource, isNot(contains('SystemUiMode.edgeToEdge')));
  });
}
