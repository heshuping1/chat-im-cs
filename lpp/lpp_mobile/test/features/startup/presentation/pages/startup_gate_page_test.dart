import 'dart:io';

import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';
import 'package:lpp_mobile/features/startup/presentation/widgets/startup_brand_loading_view.dart';

void main() {
  testWidgets('startup loading view presents the public brand loading artwork',
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

  test('startup loading artwork is no longer the legacy StarLink bitmap', () {
    final loadingAsset = File(AppBrandAssets.loadingPage);

    expect(
      sha256.convert(loadingAsset.readAsBytesSync()).toString(),
      isNot(
        '2b4fbfee57a561a9fe261221b164ff0106c2c4a2b821c1c7b685d3f38e8b1cb8',
      ),
    );
  });

  test('Android native launch artwork matches the Flutter loading artwork', () {
    final loadingAssetHash = sha256
        .convert(File(AppBrandAssets.loadingPage).readAsBytesSync())
        .toString();
    final androidLaunchAssetHash = sha256
        .convert(
          File('android/app/src/main/res/drawable-nodpi/startlink_loading.png')
              .readAsBytesSync(),
        )
        .toString();

    expect(androidLaunchAssetHash, loadingAssetHash);
  });
}
