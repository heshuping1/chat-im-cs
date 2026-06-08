import 'dart:io';

import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class MediaFileRuntime {
  const MediaFileRuntime();

  Future<String> mediaDirectory({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaVariant variant,
  }) async {
    final root = await getApplicationSupportDirectory();
    return p.join(
      root.path,
      'lpp_media',
      _safePathSegment(spaceId),
      _safePathSegment(conversationId),
      _safePathSegment(messageId),
      variant.wireName,
    );
  }

  Future<String> finalPath({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaVariant variant,
    required String fileName,
  }) async {
    final directory = await mediaDirectory(
      spaceId: spaceId,
      conversationId: conversationId,
      messageId: messageId,
      variant: variant,
    );
    return p.join(directory, safeFileName(fileName));
  }

  String partPathFor(String finalPath) => '$finalPath.part';

  Future<void> ensureParentDirectory(String path) async {
    final directory = Directory(p.dirname(path));
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
  }

  Future<bool> fileExists(String? path) async {
    if (path == null || path.trim().isEmpty) return false;
    return File(path).exists();
  }

  Future<int> fileLength(String? path) async {
    if (path == null || path.trim().isEmpty) return 0;
    final file = File(path);
    if (!await file.exists()) return 0;
    return file.length();
  }

  Future<List<int>> readFileBytes(String path) async {
    return File(path).readAsBytes();
  }

  Future<void> promotePartFile({
    required String partPath,
    required String finalPath,
  }) async {
    final part = File(partPath);
    if (!await part.exists()) {
      throw StateError('Downloaded part file is missing');
    }
    await ensureParentDirectory(finalPath);
    final target = File(finalPath);
    if (await target.exists()) {
      await target.delete();
    }
    await part.rename(finalPath);
  }

  Future<String> copyLocalFileToFinalPath({
    required String sourcePath,
    required String finalPath,
  }) async {
    final source = File(sourcePath);
    if (!await source.exists()) {
      throw StateError('Source media file is missing');
    }
    await ensureParentDirectory(finalPath);
    final target = File(finalPath);
    if (await target.exists()) {
      final sourceLength = await source.length();
      final targetLength = await target.length();
      if (sourceLength == targetLength && targetLength > 0) return target.path;
      await target.delete();
    }
    return (await source.copy(finalPath)).path;
  }

  Future<void> deleteFileIfExists(String path) async {
    final file = File(path);
    if (await file.exists()) {
      await file.delete();
    }
  }

  String safeFileName(String rawName) {
    final trimmed = rawName.trim();
    final base = trimmed.isEmpty ? 'media' : p.basename(trimmed);
    final sanitized = base
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1F]'), '_')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return sanitized.isEmpty ? 'media' : sanitized;
  }

  String _safePathSegment(String value) {
    final sanitized = value
        .trim()
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1F]'), '_')
        .replaceAll(RegExp(r'\s+'), '_');
    return sanitized.isEmpty ? '_' : sanitized;
  }
}
