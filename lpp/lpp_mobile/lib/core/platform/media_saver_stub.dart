class SavedMediaResult {
  const SavedMediaResult({
    required this.message,
    this.path,
  });

  final String message;
  final String? path;
}

class PlatformMediaSaver {
  const PlatformMediaSaver();

  Future<SavedMediaResult> saveMedia({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
    required bool isVideo,
  }) async {
    throw UnsupportedError('当前平台暂不支持保存媒体');
  }
}
