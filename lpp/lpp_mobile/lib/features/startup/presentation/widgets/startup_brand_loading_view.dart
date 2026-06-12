import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';

class StartupBrandLoadingView extends StatelessWidget {
  const StartupBrandLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.light,
        systemNavigationBarContrastEnforced: false,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFF020B0A),
        body: Image.asset(
          AppBrandAssets.loadingPage,
          key: const ValueKey('startup-brand-loading-image'),
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          alignment: Alignment.center,
        ),
      ),
    );
  }
}
