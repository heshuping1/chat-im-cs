import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';

class StartupBrandLoadingView extends StatelessWidget {
  const StartupBrandLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF020B0A),
      body: StartupBrandLoadingSurface(),
    );
  }
}

class StartupBrandLoadingSurface extends StatelessWidget {
  const StartupBrandLoadingSurface({super.key});

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
      child: ColoredBox(
        color: const Color(0xFF020B0A),
        child: Image.asset(
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

class StartupHandoffOverlay extends StatefulWidget {
  const StartupHandoffOverlay({
    required this.onDismissed,
    super.key,
  });

  final VoidCallback onDismissed;

  @override
  State<StartupHandoffOverlay> createState() => _StartupHandoffOverlayState();
}

class _StartupHandoffOverlayState extends State<StartupHandoffOverlay> {
  @override
  void initState() {
    super.initState();
    unawaited(SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: const [],
    ));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onDismissed();
    });
  }

  @override
  Widget build(BuildContext context) {
    return const IgnorePointer(
      child: StartupBrandLoadingSurface(),
    );
  }
}
