import 'dart:convert';
import 'dart:html' as html;

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
    final encoded = base64Encode(bytes);
    final anchor = html.AnchorElement(
      href: 'data:$mimeType;base64,$encoded',
    )
      ..download = fileName
      ..style.display = 'none';
    html.document.body?.append(anchor);
    anchor.click();
    anchor.remove();
    return const SavedMediaResult(message: '已下载到浏览器');
  }
}
