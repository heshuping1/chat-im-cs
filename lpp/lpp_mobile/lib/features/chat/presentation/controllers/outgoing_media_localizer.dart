import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';

class OutgoingMediaLocalizeResult {
  final String localPath;
  final int sizeBytes;

  const OutgoingMediaLocalizeResult({
    required this.localPath,
    required this.sizeBytes,
  });
}

class OutgoingMediaLocalizer {
  final MediaFileRuntime runtime;

  const OutgoingMediaLocalizer({
    required this.runtime,
  });

  Future<OutgoingMediaLocalizeResult> localize({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaVariant variant,
    required String sourcePath,
    required String fileName,
  }) async {
    final localSourcePath = localPathFromUriOrPath(sourcePath);
    final finalPath = await runtime.finalPath(
      spaceId: spaceId,
      conversationId: conversationId,
      messageId: messageId,
      variant: variant,
      fileName: fileName,
    );
    final copiedPath = await runtime.copyLocalFileToFinalPath(
      sourcePath: localSourcePath,
      finalPath: finalPath,
    );
    return OutgoingMediaLocalizeResult(
      localPath: copiedPath,
      sizeBytes: await runtime.fileLength(copiedPath),
    );
  }
}
