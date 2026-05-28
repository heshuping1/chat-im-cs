import 'dart:io';

import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class SavedMediaResult {
  const SavedMediaResult({
    required this.message,
    this.path,
  });

  final String message;
  final String? path;
}

class PlatformMediaSaver {
  static const MethodChannel _galleryChannel = MethodChannel(
    'lpp_mobile/gallery',
  );

  const PlatformMediaSaver();

  Future<SavedMediaResult> saveMedia({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
    required bool isVideo,
  }) async {
    final file = await _writeLocalCopy(bytes: bytes, fileName: fileName);
    if (PlatformCapabilities.supportsSystemGallerySave) {
      await _galleryChannel.invokeMethod<void>('saveMedia', {
        'path': file.path,
        'fileName': fileName,
        'mimeType': mimeType,
        'isVideo': isVideo,
      });
      return const SavedMediaResult(message: '已保存到相册');
    }

    return SavedMediaResult(message: '已保存到本地文件', path: file.path);
  }

  Future<File> _writeLocalCopy({
    required List<int> bytes,
    required String fileName,
  }) async {
    final root = PlatformCapabilities.isDesktop
        ? await getApplicationDocumentsDirectory()
        : await getTemporaryDirectory();
    final directory = Directory(p.join(root.path, 'lpp_media'));
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    final file = File(p.join(directory.path, fileName));
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }
}
