import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';

class AppNetworkImage extends StatelessWidget {
  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final WidgetBuilder? placeholderBuilder;
  final WidgetBuilder? errorBuilder;

  const AppNetworkImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholderBuilder,
    this.errorBuilder,
  });

  @override
  Widget build(BuildContext context) {
    return AuthNetworkImage(
      url: url,
      width: width,
      height: height,
      fit: fit,
      cacheInMemory: false,
      errorBuilder: (ctx, error, stackTrace) {
        if (error == 'loading') {
          return placeholderBuilder?.call(ctx) ??
              _defaultPlaceholder(ctx, Icons.image_outlined);
        }
        return errorBuilder?.call(ctx) ??
            _defaultPlaceholder(ctx, Icons.broken_image_outlined);
      },
    );
  }

  Widget _defaultPlaceholder(BuildContext context, IconData icon) {
    final theme = Theme.of(context);
    return Container(
      width: width,
      height: height,
      color: theme.colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(
        icon,
        size: 36,
        color: theme.colorScheme.onSurface.withValues(alpha: 0.38),
      ),
    );
  }
}
