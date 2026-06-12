import 'package:flutter/material.dart';

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
  final Key? markKey;

  const StartlinkBrandLogo({
    super.key,
    this.dimension = 72,
    this.containerKey,
    this.markKey,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      key: containerKey,
      dimension: dimension,
      child: CustomPaint(
        key: markKey,
        painter: const StartlinkBrandLogoPainter(),
      ),
    );
  }
}

class StartlinkBrandLogoPainter extends CustomPainter {
  const StartlinkBrandLogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radius = size.width * 0.245;
    final card = RRect.fromRectAndRadius(rect, Radius.circular(radius));
    final basePaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          StartlinkBrandPalette.signalGreen,
          StartlinkBrandPalette.deepGreen,
          StartlinkBrandPalette.deepGreen,
        ],
        stops: [0, 0.56, 1],
      ).createShader(rect);
    canvas.drawRRect(card, basePaint);

    final topGlow = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.54, -0.72),
        radius: 0.95,
        colors: [
          StartlinkBrandPalette.mintGlow.withValues(alpha: 0.82),
          StartlinkBrandPalette.signalGreen.withValues(alpha: 0.18),
          StartlinkBrandPalette.deepGreen.withValues(alpha: 0),
        ],
        stops: const [0, 0.48, 1],
      ).createShader(rect);
    canvas.drawRRect(card, topGlow);

    final bottomShade = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          StartlinkBrandPalette.deepGreen.withValues(alpha: 0),
          StartlinkBrandPalette.deepGreen.withValues(alpha: 0.58),
        ],
      ).createShader(rect);
    canvas.drawRRect(card, bottomShade);

    final goldStroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.018
      ..color = StartlinkBrandPalette.goldEdge.withValues(alpha: 0.72);
    canvas.drawRRect(card.deflate(size.width * 0.014), goldStroke);

    final mintStroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.02
      ..color = StartlinkBrandPalette.mintGlow.withValues(alpha: 0.62);
    canvas.drawRRect(card.deflate(size.width * 0.032), mintStroke);

    final markPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.074
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = StartlinkBrandPalette.ivoryWhite;
    final mark = Path()
      ..moveTo(size.width * 0.69, size.height * 0.32)
      ..cubicTo(
        size.width * 0.86,
        size.height * 0.55,
        size.width * 0.66,
        size.height * 0.82,
        size.width * 0.38,
        size.height * 0.75,
      )
      ..lineTo(size.width * 0.22, size.height * 0.80)
      ..lineTo(size.width * 0.26, size.height * 0.62)
      ..cubicTo(
        size.width * 0.10,
        size.height * 0.36,
        size.width * 0.39,
        size.height * 0.18,
        size.width * 0.61,
        size.height * 0.24,
      );
    canvas.drawPath(mark, markPaint);

    _drawSpark(
      canvas,
      Offset(size.width * 0.50, size.height * 0.50),
      size.width * 0.17,
    );
    _drawSpark(
      canvas,
      Offset(size.width * 0.70, size.height * 0.28),
      size.width * 0.075,
    );
  }

  void _drawSpark(Canvas canvas, Offset center, double radius) {
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..color = StartlinkBrandPalette.ivoryWhite;
    final path = Path()
      ..moveTo(center.dx, center.dy - radius)
      ..cubicTo(
        center.dx + radius * 0.25,
        center.dy - radius * 0.25,
        center.dx + radius * 0.25,
        center.dy - radius * 0.25,
        center.dx + radius,
        center.dy,
      )
      ..cubicTo(
        center.dx + radius * 0.25,
        center.dy + radius * 0.25,
        center.dx + radius * 0.25,
        center.dy + radius * 0.25,
        center.dx,
        center.dy + radius,
      )
      ..cubicTo(
        center.dx - radius * 0.25,
        center.dy + radius * 0.25,
        center.dx - radius * 0.25,
        center.dy + radius * 0.25,
        center.dx - radius,
        center.dy,
      )
      ..cubicTo(
        center.dx - radius * 0.25,
        center.dy - radius * 0.25,
        center.dx - radius * 0.25,
        center.dy - radius * 0.25,
        center.dx,
        center.dy - radius,
      )
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant StartlinkBrandLogoPainter oldDelegate) => false;
}
