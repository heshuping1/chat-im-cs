import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/branding/startlink_brand_logo.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/login_page.dart';

void main() {
  testWidgets('login brand logo uses a clean vector mark', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: LoginBrandLogo(),
        ),
      ),
    );

    expect(find.byKey(const ValueKey('login-brand-logo-raster')), findsNothing);
    expect(find.byKey(const ValueKey('login-brand-logo-crop')), findsNothing);

    final logo = tester.widget<SizedBox>(
      find.byKey(const ValueKey('login-brand-logo')),
    );
    expect(logo.width, 72);
    expect(logo.height, 72);

    expect(find.byKey(const ValueKey('login-brand-logo-mark')), findsOneWidget);
  });

  test('brand logo uses the final icon design palette', () {
    expect(StartlinkBrandPalette.deepGreen, const Color(0xFF076B4A));
    expect(StartlinkBrandPalette.signalGreen, const Color(0xFF00E676));
    expect(StartlinkBrandPalette.mintGlow, const Color(0xFFA8FFD1));
    expect(StartlinkBrandPalette.ivoryWhite, const Color(0xFFF5F7EB));
    expect(StartlinkBrandPalette.goldEdge, const Color(0xFFE6C97A));
  });
}
