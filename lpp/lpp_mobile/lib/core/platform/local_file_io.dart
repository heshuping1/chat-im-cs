import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

Future<bool> localFileExists(String path) async => File(path).exists();

Future<int> localFileLength(String path) async => File(path).length();

Future<List<int>> readLocalFileBytes(String path) async =>
    File(path).readAsBytes();

Future<String> cacheBytesToLocalFile({
  required List<int> bytes,
  required String directoryName,
  required String fileName,
}) async {
  final root = await getTemporaryDirectory();
  final directory = Directory(p.join(root.path, directoryName));
  if (!await directory.exists()) {
    await directory.create(recursive: true);
  }
  final file = File(p.join(directory.path, fileName));
  if (await file.exists() && await file.length() > 0) return file.path;
  await file.writeAsBytes(bytes, flush: true);
  return file.path;
}

String localPathFromUriOrPath(String path) {
  final uri = Uri.tryParse(path);
  return uri != null && uri.scheme == 'file' ? uri.toFilePath() : path;
}

Widget localImageWidget(
  String path, {
  BoxFit? fit,
  double? width,
  double? height,
}) {
  return Image.file(
    File(path),
    fit: fit,
    width: width,
    height: height,
    gaplessPlayback: true,
  );
}
