import 'dart:developer';

import 'package:lpp_mobile/core/database/hive_to_sqlite_migration.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

/// 数据库连接管理与 Schema 迁移。
///
/// 每个 [spaceId] 对应独立的 SQLite 文件：`lpp_chat_{spaceId}.db`。
/// 使用单例缓存避免重复打开同一文件。
class AppDatabase {
  AppDatabase._();

  // ── 单例缓存 ──────────────────────────────────────────────────────────────
  static final Map<String, Database> _instances = {};

  // ── 当前 Schema 版本 ──────────────────────────────────────────────────────
  static const int _currentVersion = 3;

  // ── DDL：conversations 表 ─────────────────────────────────────────────────
  static const String _createConversationsTable = '''
    CREATE TABLE conversations (
      conversation_id       TEXT PRIMARY KEY,
      type                  TEXT NOT NULL,
      title                 TEXT NOT NULL DEFAULT '',
      avatar_url            TEXT,
      last_message_id       TEXT,
      last_message_preview  TEXT,
      last_message_type     TEXT,
	      last_message_sender_id TEXT,
	      last_message_mentions TEXT,
	      last_activity_at      INTEGER,
      unread_count          INTEGER NOT NULL DEFAULT 0,
      last_read_seq         INTEGER NOT NULL DEFAULT 0,
      last_message_seq      INTEGER NOT NULL DEFAULT 0,
      is_pinned             INTEGER NOT NULL DEFAULT 0,
      is_muted              INTEGER NOT NULL DEFAULT 0,
      draft                 TEXT,
      peer_user_id          TEXT,
      member_count          INTEGER,
      member_avatar_urls    TEXT,
      member_names          TEXT
    )
  ''';

  static const String _createConversationsIndex = '''
    CREATE INDEX idx_conversations_sort
      ON conversations (is_pinned DESC, last_activity_at DESC)
  ''';

  // ── DDL：migration_flags 表 ───────────────────────────────────────────────
  static const String _createMigrationFlagsTable = '''
    CREATE TABLE migration_flags (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  ''';

  static const String createMediaLocalFilesTable = '''
    CREATE TABLE IF NOT EXISTS media_local_files (
      id               TEXT PRIMARY KEY,
      space_id         TEXT NOT NULL,
      conversation_id  TEXT NOT NULL,
      message_id       TEXT NOT NULL,
      media_kind       TEXT NOT NULL,
      variant          TEXT NOT NULL,
      remote_url       TEXT NOT NULL,
      local_path       TEXT,
      file_name        TEXT,
      mime_type        TEXT,
      size_bytes       INTEGER,
      status           TEXT NOT NULL,
      failure_reason   TEXT,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL,
      last_accessed_at INTEGER,
      UNIQUE(space_id, conversation_id, message_id, media_kind, variant)
    )
  ''';

  static const List<String> createMediaLocalFilesIndexes = [
    '''
    CREATE INDEX IF NOT EXISTS idx_media_local_files_conversation
      ON media_local_files (space_id, conversation_id, updated_at)
    ''',
    '''
    CREATE INDEX IF NOT EXISTS idx_media_local_files_message
      ON media_local_files (space_id, conversation_id, message_id)
    ''',
    '''
    CREATE INDEX IF NOT EXISTS idx_media_local_files_status
      ON media_local_files (space_id, status)
    ''',
  ];

  // ── 版本迁移脚本 map（key = 目标版本号，支持多条语句用 ';' 分隔）──────────
  static const Map<int, List<String>> _migrations = {
    2: [
      'ALTER TABLE conversations ADD COLUMN last_read_seq INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE conversations ADD COLUMN last_message_seq INTEGER NOT NULL DEFAULT 0',
    ],
    3: [
      createMediaLocalFilesTable,
      ...createMediaLocalFilesIndexes,
    ],
  };

  // ── 公开 API ──────────────────────────────────────────────────────────────

  /// 获取（或打开）指定空间的数据库连接。
  static Future<Database> of(String spaceId) async {
    if (_instances.containsKey(spaceId)) {
      return _instances[spaceId]!;
    }
    final db = await _open(spaceId);
    _instances[spaceId] = db;
    // 首次打开时执行 Hive → SQLite 迁移（只执行一次）
    await HiveToSqliteMigration.runIfNeeded(spaceId);
    return db;
  }

  /// 关闭指定空间的数据库连接（切换空间时调用）。
  static Future<void> close(String spaceId) async {
    final db = _instances.remove(spaceId);
    await db?.close();
  }

  /// 删除指定空间的数据库文件（退出登录时调用）。
  static Future<void> delete(String spaceId) async {
    await close(spaceId);
    final path = await _dbPath(spaceId);
    try {
      await deleteDatabase(path);
    } catch (e) {
      log('AppDatabase.delete($spaceId) failed: $e', name: 'AppDatabase');
    }
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  /// 打开数据库，启用 WAL 模式，执行 onCreate / onUpgrade。
  static Future<Database> _open(String spaceId) async {
    final path = await _dbPath(spaceId);
    return openDatabase(
      path,
      version: _currentVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  /// 返回数据库文件的完整路径。
  static Future<String> _dbPath(String spaceId) async {
    final dir = await getApplicationDocumentsDirectory();
    return p.join(dir.path, 'lpp_chat_$spaceId.db');
  }

  /// 首次创建数据库时执行（version 1 初始 Schema）。
  static Future<void> _onCreate(Database db, int version) async {
    await db.execute(_createConversationsTable);
    await db.execute(_createConversationsIndex);
    await db.execute(_createMigrationFlagsTable);
    await db.execute(createMediaLocalFilesTable);
    for (final script in createMediaLocalFilesIndexes) {
      await db.execute(script);
    }
  }

  /// 数据库升级时按序执行迁移脚本。
  static Future<void> _onUpgrade(
    Database db,
    int oldVersion,
    int newVersion,
  ) async {
    for (int v = oldVersion + 1; v <= newVersion; v++) {
      final scripts = _migrations[v];
      if (scripts != null) {
        for (final script in scripts) {
          try {
            await db.execute(script);
          } catch (e) {
            log(
              'AppDatabase migration to v$v failed: $e',
              name: 'AppDatabase',
            );
            rethrow;
          }
        }
      }
    }
  }
}
