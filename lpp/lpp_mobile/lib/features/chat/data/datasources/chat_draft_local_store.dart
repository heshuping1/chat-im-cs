import 'package:lpp_mobile/core/storage/hive_storage.dart';

class ChatDraftLocalStore {
  const ChatDraftLocalStore();

  Future<void> saveDraft({
    required String spaceId,
    required String userId,
    required String conversationId,
    required String text,
  }) async {
    final box = await HiveStorage.draftsBox(spaceId);
    final key = _key(userId: userId, conversationId: conversationId);
    final normalized = text.trim();
    if (normalized.isEmpty) {
      await box.delete(key);
      return;
    }
    await box.put(
      key,
      {
        'conversationId': conversationId,
        'userId': userId,
        'draftText': text,
        'updatedAt': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<String?> readDraft({
    required String spaceId,
    required String userId,
    required String conversationId,
  }) async {
    final box = await HiveStorage.draftsBox(spaceId);
    final raw = box.get(_key(userId: userId, conversationId: conversationId));
    if (raw is Map) {
      final text = raw['draftText']?.toString();
      return text == null || text.trim().isEmpty ? null : text;
    }
    if (raw is String && raw.trim().isNotEmpty) return raw;
    return null;
  }

  static String _key({
    required String userId,
    required String conversationId,
  }) {
    return '$userId:$conversationId';
  }
}
