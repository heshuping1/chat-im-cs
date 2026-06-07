import 'dart:io';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:video_thumbnail/video_thumbnail.dart';

import 'local_file.dart';

Future<Directory> localVideoPosterDirectory() async {
  final root = await getApplicationSupportDirectory();
  final posterDir = Directory(p.join(root.path, 'lpp_video_posters'));
  if (!await posterDir.exists()) {
    await posterDir.create(recursive: true);
  }
  return posterDir;
}

String localVideoPosterFileName(
  String videoPath, {
  String? cacheKey,
  int maxWidth = 440,
  int quality = 75,
}) {
  final key = cacheKey ?? localPathFromUriOrPath(videoPath);
  final digest = sha1.convert(utf8.encode('$key|$maxWidth|$quality'));
  return 'video_poster_$digest.jpg';
}

Future<String?> cachedLocalVideoPosterPath(
  String videoKey, {
  int maxWidth = 440,
  int quality = 75,
}) async {
  final posterDir = await localVideoPosterDirectory();
  final path = p.join(
    posterDir.path,
    localVideoPosterFileName(
      videoKey,
      maxWidth: maxWidth,
      quality: quality,
    ),
  );
  final file = File(path);
  if (await file.exists() && await file.length() > 0) return file.path;
  return null;
}

Future<String?> generateLocalVideoPoster(
  String videoPath, {
  String? cacheKey,
  int maxWidth = 440,
  int quality = 75,
}) async {
  final localPath = localPathFromUriOrPath(videoPath);
  final posterDir = await localVideoPosterDirectory();
  final targetPath = p.join(
    posterDir.path,
    localVideoPosterFileName(
      localPath,
      cacheKey: cacheKey,
      maxWidth: maxWidth,
      quality: quality,
    ),
  );
  final target = File(targetPath);
  if (await target.exists() && await target.length() > 0) {
    return target.path;
  }

  final source = File(localPath);
  if (!await source.exists()) return null;

  final generatedPath = await VideoThumbnail.thumbnailFile(
    video: localPath,
    thumbnailPath: posterDir.path,
    imageFormat: ImageFormat.JPEG,
    maxWidth: maxWidth,
    quality: quality,
  );
  if (generatedPath == null || generatedPath.trim().isEmpty) return null;
  if (generatedPath == targetPath) return targetPath;

  final generated = File(generatedPath);
  if (!await generated.exists() || await generated.length() == 0) return null;
  await generated.copy(targetPath);
  try {
    await generated.delete();
  } catch (_) {}
  return targetPath;
}
