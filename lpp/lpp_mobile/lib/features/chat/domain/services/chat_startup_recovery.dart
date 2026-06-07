import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_local_store.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';

class ChatStartupRecovery {
  final MediaLocalStore store;
  final MediaFileRuntime runtime;

  const ChatStartupRecovery({
    required this.store,
    required this.runtime,
  });

  Future<void> recoverSpace(String spaceId) async {
    final downloading = await store.getDownloading(spaceId);
    for (final file in downloading) {
      final path = file.localPath;
      if (path != null && path.isNotEmpty) {
        await runtime.deleteFileIfExists(runtime.partPathFor(path));
      }
      await store.markMissing(spaceId, file);
    }

    final downloaded = await store.getByStatus(
      spaceId,
      MediaLocalStatus.downloaded,
    );
    for (final file in downloaded) {
      if (!await runtime.fileExists(file.localPath)) {
        await store.markMissing(spaceId, file);
      }
    }
  }
}
