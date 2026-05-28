import 'package:hive_flutter/hive_flutter.dart';

/// Hive 本地存储管理
///
/// 负责初始化 Hive 并按空间/会话隔离管理各 Box。
class HiveStorage {
  static const String _messagesBoxPrefix = 'messages';
  static const String _conversationsBoxPrefix = 'conversations';
  static const String _pendingMessagesBox = 'pending_messages';
  static const String _syncCursorsBox = 'sync_cursors';
  static const String _draftsBoxPrefix = 'drafts';

  /// 初始化 Hive（在 main() 中调用）
  static Future<void> init() async {
    await Hive.initFlutter();
    // 注册 Adapter（后续任务添加具体 Adapter）
    // 打开常驻 Box
    await Hive.openBox<String>('app_settings');
    await Hive.openBox<dynamic>(_pendingMessagesBox);
    await Hive.openBox<dynamic>(_syncCursorsBox);
  }

  /// 获取消息 Box（按 spaceId + conversationId 隔离）
  static Future<Box<dynamic>> messagesBox(
      String spaceId, String conversationId) async {
    final boxName = '${_messagesBoxPrefix}_${spaceId}_$conversationId';
    if (Hive.isBoxOpen(boxName)) return Hive.box(boxName);
    return Hive.openBox<dynamic>(boxName);
  }

  /// 获取会话 Box（按 spaceId 隔离）
  static Future<Box<dynamic>> conversationsBox(String spaceId) async {
    final boxName = '${_conversationsBoxPrefix}_$spaceId';
    if (Hive.isBoxOpen(boxName)) return Hive.box(boxName);
    return Hive.openBox<dynamic>(boxName);
  }

  /// 获取待发消息 Box
  static Box<dynamic> get pendingMessagesBox => Hive.box(_pendingMessagesBox);

  /// 获取同步游标 Box
  static Box<dynamic> get syncCursorsBox => Hive.box(_syncCursorsBox);

  static const String _profileBoxName = 'user_profiles';

  /// 获取用户 profile Box（按 spaceId 隔离）
  static Future<Box<dynamic>> profileBox(String spaceId) async {
    final boxName = '${_profileBoxName}_$spaceId';
    if (Hive.isBoxOpen(boxName)) return Hive.box(boxName);
    return Hive.openBox<dynamic>(boxName);
  }

  static Future<Box<dynamic>> draftsBox(String spaceId) async {
    final boxName = '${_draftsBoxPrefix}_$spaceId';
    if (Hive.isBoxOpen(boxName)) return Hive.box(boxName);
    return Hive.openBox<dynamic>(boxName);
  }

  /// 关闭指定空间的所有 Box（切换空间时调用）
  static Future<void> closeSpaceBoxes(String spaceId) async {
    final conversationsBoxName = '${_conversationsBoxPrefix}_$spaceId';
    final draftsBoxName = '${_draftsBoxPrefix}_$spaceId';
    if (Hive.isBoxOpen(conversationsBoxName)) {
      await Hive.box(conversationsBoxName).close();
    }
    if (Hive.isBoxOpen(draftsBoxName)) {
      await Hive.box(draftsBoxName).close();
    }
  }
}
