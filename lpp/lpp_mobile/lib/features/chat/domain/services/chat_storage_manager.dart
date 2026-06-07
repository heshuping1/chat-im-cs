import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_local_store.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';

class ChatStorageUsage {
  final int totalBytes;
  final Map<MediaKind, int> byKind;

  const ChatStorageUsage({
    required this.totalBytes,
    required this.byKind,
  });
}

class ChatStorageManager {
  final MediaLocalStore store;
  final MediaFileRuntime runtime;

  const ChatStorageManager({
    required this.store,
    required this.runtime,
  });

  Future<ChatStorageUsage> usageForSpace(String spaceId) async {
    return _usage(await store.getAll(spaceId));
  }

  Future<ChatStorageUsage> usageForConversation({
    required String spaceId,
    required String conversationId,
  }) async {
    return _usage(await store.getForConversation(
      spaceId: spaceId,
      conversationId: conversationId,
    ));
  }

  Future<void> clearConversationMedia({
    required String spaceId,
    required String conversationId,
  }) async {
    final files = await store.getForConversation(
      spaceId: spaceId,
      conversationId: conversationId,
    );
    for (final file in files) {
      final path = file.localPath;
      if (path != null && path.isNotEmpty) {
        await runtime.deleteFileIfExists(path);
        await runtime.deleteFileIfExists(runtime.partPathFor(path));
      }
      await store.markMissing(spaceId, file);
    }
  }

  Future<ChatStorageUsage> _usage(List<MediaLocalFile> files) async {
    final byKind = <MediaKind, int>{
      for (final kind in MediaKind.values) kind: 0,
    };
    var total = 0;
    for (final file in files) {
      if (file.status != MediaLocalStatus.downloaded) continue;
      final length = await runtime.fileLength(file.localPath);
      total += length;
      byKind[file.mediaKind] = (byKind[file.mediaKind] ?? 0) + length;
    }
    return ChatStorageUsage(totalBytes: total, byKind: byKind);
  }
}
