import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/app/system_ui.dart';

void main() {
  test('appEdgeToEdgeOverlayStyle matches WeChat-like light pages', () {
    expect(appEdgeToEdgeOverlayStyle.statusBarColor, Colors.transparent);
    expect(appEdgeToEdgeOverlayStyle.statusBarIconBrightness, Brightness.dark);
    expect(appEdgeToEdgeOverlayStyle.statusBarBrightness, Brightness.light);
    expect(
      appEdgeToEdgeOverlayStyle.systemNavigationBarColor,
      Colors.transparent,
    );
    expect(
      appEdgeToEdgeOverlayStyle.systemNavigationBarIconBrightness,
      Brightness.dark,
    );
    expect(
      appEdgeToEdgeOverlayStyle.systemNavigationBarContrastEnforced,
      isFalse,
    );
  });
}
