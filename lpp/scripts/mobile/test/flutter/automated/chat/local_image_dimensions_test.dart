import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/platform/local_image_dimensions.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('reads dimensions from a local poster image', () async {
    final file = await _writePng(width: 320, height: 568);
    addTearDown(() => file.delete());

    final dimensions = await readLocalImageDimensions(file.path);

    expect(dimensions, (320, 568));
  });
}

Future<File> _writePng({required int width, required int height}) async {
  final recorder = ui.PictureRecorder();
  final canvas = ui.Canvas(recorder);
  canvas.drawRect(
    ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
    ui.Paint()..color = const ui.Color(0xFF3366FF),
  );
  final image = await recorder.endRecording().toImage(width, height);
  final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  final file = File('${Directory.systemTemp.path}/lpp_dims_$width-$height.png');
  await file.writeAsBytes(bytes!.buffer.asUint8List(), flush: true);
  return file;
}
