import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';
import 'package:lpp_mobile/features/startup/presentation/widgets/startup_brand_loading_view.dart';

void main() {
  testWidgets('startup loading view presents the StartLink loading artwork',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: StartupBrandLoadingView(),
      ),
    );

    final loading = tester.widget<Image>(
      find.byKey(const ValueKey('startup-brand-loading-image')),
    );
    expect(loading.image, isA<AssetImage>());
    expect(
      (loading.image as AssetImage).assetName,
      AppBrandAssets.loadingPage,
    );
    expect(loading.fit, BoxFit.cover);
  });
}
