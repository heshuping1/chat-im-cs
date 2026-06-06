import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:video_thumbnail/video_thumbnail.dart';

import 'local_file.dart';

Future<String?> generateLocalVideoPoster(
  String videoPath, {
  int maxWidth = 440,
  int quality = 75,
}) async {
  final localPath = localPathFromUriOrPath(videoPath);
  final source = File(localPath);
  if (!await source.exists()) return null;

  final root = await getTemporaryDirectory();
  final posterDir = Directory(p.join(root.path, 'lpp_video_posters'));
  if (!await posterDir.exists()) {
    await posterDir.create(recursive: true);
  }

  return VideoThumbnail.thumbnailFile(
    video: localPath,
    thumbnailPath: posterDir.path,
    imageFormat: ImageFormat.JPEG,
    maxWidth: maxWidth,
    quality: quality,
  );
}
