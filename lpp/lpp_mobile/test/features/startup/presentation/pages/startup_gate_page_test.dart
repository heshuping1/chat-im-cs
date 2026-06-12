import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';
import 'package:lpp_mobile/features/startup/presentation/widgets/startup_brand_loading_view.dart';

void main() {
  testWidgets('startup loading view presents StartLink starfield branding',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: StartupBrandLoadingView(),
      ),
    );

    expect(find.text('StartLink'), findsOneWidget);
    expect(find.byKey(const ValueKey('startup-starfield-background')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('startup-network-ring')), findsOneWidget);
    expect(find.byKey(const ValueKey('startup-progress-indicator')),
        findsOneWidget);

    final logo = tester.widget<Image>(
      find.byKey(const ValueKey('startup-brand-logo')),
    );
    expect(logo.image, isA<AssetImage>());
    expect((logo.image as AssetImage).assetName, AppBrandAssets.appIcon);
  });
}
