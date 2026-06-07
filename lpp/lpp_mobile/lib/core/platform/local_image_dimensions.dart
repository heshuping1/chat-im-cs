import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'local_file.dart';

Future<(int, int)?> readLocalImageDimensions(String? path) async {
  final localPath = path?.trim();
  if (localPath == null || localPath.isEmpty) return null;
  try {
    final bytes = Uint8List.fromList(await readLocalFileBytes(localPath));
    final completer = Completer<ui.Image>();
    ui.decodeImageFromList(bytes, completer.complete);
    final image = await completer.future;
    final dimensions = (image.width, image.height);
    image.dispose();
    return dimensions;
  } catch (_) {
    return null;
  }
}
