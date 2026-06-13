import 'package:flutter/material.dart';

import 'app_brand_assets.dart';

class StartlinkBrandPalette {
  static const deepGreen = Color(0xFF076B4A);
  static const signalGreen = Color(0xFF00E676);
  static const mintGlow = Color(0xFFA8FFD1);
  static const ivoryWhite = Color(0xFFF5F7EB);
  static const goldEdge = Color(0xFFE6C97A);

  const StartlinkBrandPalette._();
}

class StartlinkBrandLogo extends StatelessWidget {
  final double dimension;
  final Key? containerKey;
  final Key? clipKey;
  final Key? markKey;

  const StartlinkBrandLogo({
    super.key,
    this.dimension = 72,
    this.containerKey,
    this.clipKey,
    this.markKey,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      key: containerKey,
      dimension: dimension,
      child: ClipRRect(
        key: clipKey,
        borderRadius: BorderRadius.circular(dimension * 0.245),
        clipBehavior: Clip.antiAlias,
        child: Image.asset(
          AppBrandAssets.brandLogoIcon,
          key: markKey,
          width: dimension,
          height: dimension,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.high,
        ),
      ),
    );
  }
}
