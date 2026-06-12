import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';

class StartupBrandLoadingView extends StatelessWidget {
  const StartupBrandLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.light,
        systemNavigationBarContrastEnforced: false,
      ),
      child: Scaffold(
        backgroundColor: _StartupBrandColors.background,
        body: _StartupBrandLoadingBody(),
      ),
    );
  }
}

class _StartupBrandLoadingBody extends StatelessWidget {
  const _StartupBrandLoadingBody();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const CustomPaint(
          key: ValueKey('startup-starfield-background'),
          painter: _StartupStarfieldPainter(),
        ),
        SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 224,
                    height: 224,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        const CustomPaint(
                          key: ValueKey('startup-network-ring'),
                          size: Size.square(224),
                          painter: _StartupNetworkRingPainter(),
                        ),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(27),
                            boxShadow: [
                              BoxShadow(
                                color: _StartupBrandColors.glow
                                    .withValues(alpha: 0.48),
                                blurRadius: 38,
                                spreadRadius: 2,
                              ),
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.38),
                                blurRadius: 44,
                                offset: const Offset(0, 18),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(27),
                            child: Image.asset(
                              AppBrandAssets.appIcon,
                              key: const ValueKey('startup-brand-logo'),
                              width: 116,
                              height: 116,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'StartLink',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _StartupBrandColors.primaryText,
                      fontSize: 25,
                      fontWeight: FontWeight.w700,
                      height: 1.12,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'secure service connection',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _StartupBrandColors.secondaryText,
                      fontSize: 12,
                      height: 1.25,
                      letterSpacing: 0,
                      decoration: TextDecoration.none,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    key: const ValueKey('startup-progress-indicator'),
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _StartupBrandColors.glow,
                      backgroundColor:
                          _StartupBrandColors.glow.withValues(alpha: 0.12),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StartupBrandColors {
  const _StartupBrandColors._();

  static const background = Color(0xFF020B0A);
  static const glow = Color(0xFF2FF1AE);
  static const primaryText = Color(0xFFF0FFF9);
  static const secondaryText = Color(0x99BCE5D6);
}

class _StartupStarfieldPainter extends CustomPainter {
  const _StartupStarfieldPainter();

  static const _stars = <Offset>[
    Offset(0.18, 0.18),
    Offset(0.31, 0.26),
    Offset(0.72, 0.20),
    Offset(0.82, 0.31),
    Offset(0.16, 0.66),
    Offset(0.37, 0.71),
    Offset(0.66, 0.66),
    Offset(0.84, 0.77),
    Offset(0.26, 0.84),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final background = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFF021411),
          Color(0xFF041B16),
          Color(0xFF020B0A),
        ],
        stops: [0, 0.56, 1],
      ).createShader(rect);
    canvas.drawRect(rect, background);

    final centerGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          _StartupBrandColors.glow.withValues(alpha: 0.24),
          _StartupBrandColors.glow.withValues(alpha: 0),
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * 0.5, size.height * 0.36),
          radius: size.shortestSide * 0.38,
        ),
      );
    canvas.drawCircle(
      Offset(size.width * 0.5, size.height * 0.36),
      size.shortestSide * 0.38,
      centerGlow,
    );

    final lowerGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF094335).withValues(alpha: 0.62),
          const Color(0xFF094335).withValues(alpha: 0),
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * 0.5, size.height * 1.02),
          radius: size.shortestSide * 0.48,
        ),
      );
    canvas.drawCircle(
      Offset(size.width * 0.5, size.height * 1.02),
      size.shortestSide * 0.48,
      lowerGlow,
    );

    final starPaint = Paint()..color = Colors.white.withValues(alpha: 0.78);
    final accentStarPaint = Paint()
      ..color = const Color(0xFF91FFD9).withValues(alpha: 0.78);
    for (var index = 0; index < _stars.length; index += 1) {
      final star = _stars[index];
      final position = Offset(star.dx * size.width, star.dy * size.height);
      final radius = index.isEven ? 1.2 : 1.6;
      canvas.drawCircle(
        position,
        radius,
        index.isEven ? starPaint : accentStarPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _StartupStarfieldPainter oldDelegate) => false;
}

class _StartupNetworkRingPainter extends CustomPainter {
  const _StartupNetworkRingPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide * 0.43;
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = _StartupBrandColors.primaryText.withValues(alpha: 0.24);
    canvas.drawCircle(center, radius, ringPaint);

    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round
      ..color = _StartupBrandColors.primaryText.withValues(alpha: 0.30);
    final nodePaint = Paint()
      ..color = _StartupBrandColors.primaryText.withValues(alpha: 0.92);
    final accentNodePaint = Paint()
      ..color = const Color(0xFFB7FFE6)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final nodes = <Offset>[
      _pointOnCircle(center, radius, -90),
      _pointOnCircle(center, radius, -26),
      _pointOnCircle(center, radius, 42),
      _pointOnCircle(center, radius, 92),
      _pointOnCircle(center, radius, 154),
      _pointOnCircle(center, radius, 216),
    ];
    final innerNodes = <Offset>[
      Offset(center.dx - 42, center.dy - 16),
      Offset(center.dx, center.dy - 28),
      Offset(center.dx + 42, center.dy - 16),
      Offset(center.dx - 30, center.dy + 44),
      Offset(center.dx + 32, center.dy + 43),
    ];

    for (final node in nodes) {
      for (final inner in innerNodes) {
        if ((node - inner).distance < radius * 0.84) {
          canvas.drawLine(node, inner, linePaint);
        }
      }
    }

    for (final lineAngle in [-24.0, 22.0]) {
      final start = _pointOnCircle(center, radius * 0.18, lineAngle + 180);
      final end = _pointOnCircle(center, radius * 1.08, lineAngle);
      canvas.drawLine(start, end, linePaint);
    }

    for (final node in nodes) {
      canvas.drawCircle(node, 7.5, accentNodePaint);
      canvas.drawCircle(node, 4.2, nodePaint);
    }
    for (final node in innerNodes) {
      canvas.drawCircle(node, 3.2, nodePaint);
    }
  }

  Offset _pointOnCircle(Offset center, double radius, double degrees) {
    final radians = degrees * math.pi / 180;
    return Offset(
      center.dx + math.cos(radians) * radius,
      center.dy + math.sin(radians) * radius,
    );
  }

  @override
  bool shouldRepaint(covariant _StartupNetworkRingPainter oldDelegate) => false;
}
