import 'package:flutter/widgets.dart';

Future<bool> localFileExists(String path) async => false;

Future<int> localFileLength(String path) async => 0;

Future<List<int>> readLocalFileBytes(String path) async {
  throw UnsupportedError('当前平台暂不支持读取本地文件');
}

Future<String> cacheBytesToLocalFile({
  required List<int> bytes,
  required String directoryName,
  required String fileName,
}) async {
  throw UnsupportedError('当前平台暂不支持本地文件缓存');
}

String localPathFromUriOrPath(String path) => path;

Widget localImageWidget(
  String path, {
  BoxFit? fit,
  double? width,
  double? height,
}) {
  return const SizedBox.shrink();
}
