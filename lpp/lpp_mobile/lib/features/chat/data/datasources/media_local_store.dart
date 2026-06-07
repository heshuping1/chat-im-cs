import 'package:lpp_mobile/core/database/app_database.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:sqflite/sqflite.dart';

class MediaLocalStore {
  const MediaLocalStore();

  Future<MediaLocalFile?> get({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaKind mediaKind,
    required MediaVariant variant,
  }) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTable(db);
    final rows = await db.query(
      'media_local_files',
      where:
          'space_id = ? AND conversation_id = ? AND message_id = ? AND media_kind = ? AND variant = ?',
      whereArgs: [
        spaceId,
        conversationId,
        messageId,
        mediaKind.wireName,
        variant.wireName,
      ],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return MediaLocalFile.fromRow(rows.first);
  }

  Future<MediaLocalFile> upsertMissing({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaKind mediaKind,
    required MediaVariant variant,
    required String remoteUrl,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
  }) async {
    final existing = await get(
      spaceId: spaceId,
      conversationId: conversationId,
      messageId: messageId,
      mediaKind: mediaKind,
      variant: variant,
    );
    final now = DateTime.now();
    final file = MediaLocalFile(
      id: existing?.id ??
          mediaLocalFileId(
            spaceId: spaceId,
            conversationId: conversationId,
            messageId: messageId,
            mediaKind: mediaKind,
            variant: variant,
          ),
      spaceId: spaceId,
      conversationId: conversationId,
      messageId: messageId,
      mediaKind: mediaKind,
      variant: variant,
      remoteUrl: remoteUrl,
      localPath: existing?.localPath,
      fileName: fileName ?? existing?.fileName,
      mimeType: mimeType ?? existing?.mimeType,
      sizeBytes: sizeBytes ?? existing?.sizeBytes,
      status: existing?.status ?? MediaLocalStatus.missing,
      failureReason: existing?.failureReason,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastAccessedAt: existing?.lastAccessedAt,
    );
    await _upsert(spaceId, file);
    return file;
  }

  Future<MediaLocalFile> markDownloading(
    String spaceId,
    MediaLocalFile file, {
    required String localPath,
  }) async {
    final updated = file.copyWith(
      localPath: localPath,
      status: MediaLocalStatus.downloading,
      updatedAt: DateTime.now(),
      clearFailureReason: true,
    );
    await _upsert(spaceId, updated);
    return updated;
  }

  Future<MediaLocalFile> markDownloaded(
    String spaceId,
    MediaLocalFile file, {
    required String localPath,
    int? sizeBytes,
  }) async {
    final now = DateTime.now();
    final updated = file.copyWith(
      localPath: localPath,
      sizeBytes: sizeBytes,
      status: MediaLocalStatus.downloaded,
      updatedAt: now,
      lastAccessedAt: now,
      clearFailureReason: true,
    );
    await _upsert(spaceId, updated);
    return updated;
  }

  Future<MediaLocalFile> markMissing(
    String spaceId,
    MediaLocalFile file,
  ) async {
    final updated = file.copyWith(
      status: MediaLocalStatus.missing,
      updatedAt: DateTime.now(),
      clearFailureReason: true,
      clearLastAccessedAt: true,
    );
    await _upsert(spaceId, updated);
    return updated;
  }

  Future<MediaLocalFile> markFailed(
    String spaceId,
    MediaLocalFile file, {
    required String reason,
  }) async {
    final updated = file.copyWith(
      status: MediaLocalStatus.failed,
      failureReason: reason,
      updatedAt: DateTime.now(),
    );
    await _upsert(spaceId, updated);
    return updated;
  }

  Future<MediaLocalFile> touch(String spaceId, MediaLocalFile file) async {
    final updated = file.copyWith(
      lastAccessedAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    await _upsert(spaceId, updated);
    return updated;
  }

  Future<List<MediaLocalFile>> getDownloading(String spaceId) async {
    return getByStatus(spaceId, MediaLocalStatus.downloading);
  }

  Future<List<MediaLocalFile>> getByStatus(
    String spaceId,
    MediaLocalStatus status,
  ) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTable(db);
    final rows = await db.query(
      'media_local_files',
      where: 'space_id = ? AND status = ?',
      whereArgs: [spaceId, status.wireName],
    );
    return rows.map(MediaLocalFile.fromRow).toList();
  }

  Future<List<MediaLocalFile>> getForConversation({
    required String spaceId,
    required String conversationId,
  }) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTable(db);
    final rows = await db.query(
      'media_local_files',
      where: 'space_id = ? AND conversation_id = ?',
      whereArgs: [spaceId, conversationId],
    );
    return rows.map(MediaLocalFile.fromRow).toList();
  }

  Future<List<MediaLocalFile>> getAll(String spaceId) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTable(db);
    final rows = await db.query(
      'media_local_files',
      where: 'space_id = ?',
      whereArgs: [spaceId],
    );
    return rows.map(MediaLocalFile.fromRow).toList();
  }

  Future<void> _upsert(String spaceId, MediaLocalFile file) async {
    final db = await AppDatabase.of(spaceId);
    await _ensureTable(db);
    await db.insert(
      'media_local_files',
      file.toRow(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> _ensureTable(Database db) async {
    await db.execute(AppDatabase.createMediaLocalFilesTable);
    for (final script in AppDatabase.createMediaLocalFilesIndexes) {
      await db.execute(script);
    }
  }
}
