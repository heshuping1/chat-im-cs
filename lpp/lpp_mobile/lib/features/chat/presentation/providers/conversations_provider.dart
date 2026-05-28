import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/mappers/group_member_payload_mapper.dart';
import 'package:lpp_mobile/features/chat/data/repositories/chat_repository_impl.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/filter_conversations.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/sort_conversations.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

// ---------------------------------------------------------------------------
// Repository Provider
// ---------------------------------------------------------------------------

final _chatRepositoryProvider =
    Provider.family<ChatRepository, String>((ref, spaceId) {
  final dio = ref.watch(dioProvider);
  return ChatRepositoryImpl(
    remote: ChatRemoteDataSourceImpl(dio),
    local: ChatLocalDataSourceImpl(),
    spaceId: spaceId,
  );
});

// ---------------------------------------------------------------------------
// Conversations Notifier
// ---------------------------------------------------------------------------

/// 设计原则（本地优先，参考微信）：
/// - 冷启动/切换空间：先读本地缓存立即渲染，后台静默拉取服务端最新数据
/// - 本地缓存按 spaceId 隔离，切换空间/账号时 provider 被 invalidate 重建
/// - 网络失败时继续显示本地缓存，不清空列表
class ConversationsNotifier
    extends FamilyAsyncNotifier<List<Conversation>, String> {
  ChatRepository get _repo => ref.read(_chatRepositoryProvider(arg));

  String? _nextCursor;
  bool _isLoadingMore = false;
  bool _hasLoadError = false;

  String? get nextCursor => _nextCursor;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasLoadError => _hasLoadError;

  String get _hiddenKey => 'hidden_conversations_$arg';

  @override
  Future<List<Conversation>> build(String arg) async {
    // keepAlive：切换 tab 不销毁，保持内存缓存
    ref.keepAlive();

    // 监听当前空间，确保 token 已就绪再发请求
    final space = ref.watch(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty || space.spaceId != arg) {
      return [];
    }

    final repo = _repo;

    // ── 本地优先策略（微信做法）──────────────────────────────────────────
    // 1. 先读本地缓存，立即渲染（用户秒看到列表）
    if (repo is ChatRepositoryImpl) {
      final cached = await repo.getCachedConversations();
      if (cached != null && cached.isNotEmpty) {
        final result = await _prepareVisibleConversations(cached);
        // 先设置缓存数据，让 UI 立即显示；头像预热放到后台，避免首屏被磁盘/网络拖慢。
        state = AsyncData(result);
        Future.microtask(() => _prefetchAvatars(result));
        // 2. 后台静默拉取最新数据，不阻塞 UI
        _syncFromRemote(repo);
        return result;
      }
    }

    // 3. 无缓存（首次）：走网络，显示 loading
    try {
      final page = await repo.getConversations();
      _nextCursor = page.nextCursor;
      _isLoadingMore = false;
      _hasLoadError = false;
      final fresh = await _prepareVisibleConversations(page.items);
      Future.microtask(() => _prefetchAvatars(fresh));
      return fresh;
    } catch (_) {
      _hasLoadError = true;
      rethrow;
    }
  }

  /// 后台静默同步（不阻塞 UI，不显示 loading）
  void _syncFromRemote(ChatRepositoryImpl repo) {
    Future.microtask(() async {
      try {
        final fresh = await repo.syncConversationsFromRemote();
        // 竞态守卫：确保当前 spaceId 没有变化
        final currentSpaceId = ref.read(currentSpaceProvider)?.spaceId;
        if (currentSpaceId != arg) return;
        final result =
            await _prepareVisibleConversations(_keepNewerLocalPreviews(fresh));
        state = AsyncData(result);
        Future.microtask(() => _prefetchAvatars(result));
      } catch (_) {
        // 后台同步失败静默处理，继续显示本地缓存
      }
    });
  }

  /// 过滤掉自己发的最后一条消息的会话的未读数
  List<Conversation> _clearSelfSentUnread(List<Conversation> list) {
    final myUserId = ref.read(currentSpaceProvider)?.userId;
    if (myUserId == null) return list;
    return list.map((c) {
      final lastMsg = c.lastMessage;
      if (lastMsg == null || c.unreadCount == 0) return c;
      if (lastMsg.messageType == 'event') return c.copyWith(unreadCount: 0);
      final direction =
          (lastMsg.direction ?? '').trim().toLowerCase().replaceAll('-', '_');
      if (lastMsg.isSelf ||
          const {'out', 'outgoing', 'sent', 'self'}.contains(direction) ||
          _sameIdentity(lastMsg.senderUserId, myUserId)) {
        return c.copyWith(unreadCount: 0);
      }
      if (c.lastMessageSeq > 0 && c.lastReadSeq >= c.lastMessageSeq) {
        return c.copyWith(unreadCount: 0);
      }
      return c;
    }).toList();
  }

  bool _sameIdentity(String? left, String? right) {
    final a = left?.trim().toLowerCase();
    final b = right?.trim().toLowerCase();
    return a != null && a.isNotEmpty && b != null && b.isNotEmpty && a == b;
  }

  Future<List<Conversation>> _prepareVisibleConversations(
    List<Conversation> list,
  ) async {
    final customerServiceConversationIds =
        await _customerServiceConversationIds();
    await _removeCustomerServiceConversationsFromLocalCache(
      list,
      customerServiceConversationIds,
    );
    final homeConversations = filterHomeConversations(
      list,
      customerServiceConversationIds: customerServiceConversationIds,
    );
    final visible = await _filterHiddenConversations(homeConversations);
    return _clearSelfSentUnread(visible);
  }

  Future<Set<String>> _customerServiceConversationIds() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null || !AppPermissions.canUseCustomerWorkbench(space)) {
      return const <String>{};
    }
    try {
      final cached = ref.read(customerServiceThreadsProvider).valueOrNull;
      final data = cached ??
          await ref
              .read(customerServiceThreadsProvider.future)
              .timeout(const Duration(seconds: 5));
      return {
        for (final thread in [...data.queueItems, ...data.activeItems])
          if (thread.isTempSession && thread.conversationId.isNotEmpty)
            thread.conversationId,
      };
    } catch (_) {
      return const <String>{};
    }
  }

  Future<void> _removeCustomerServiceConversationsFromLocalCache(
    List<Conversation> list,
    Set<String> customerServiceConversationIds,
  ) async {
    final customerServiceConversations = list.where(
      (c) =>
          c.type == ConversationType.tempSession ||
          customerServiceConversationIds.contains(c.conversationId),
    );
    for (final conversation in customerServiceConversations) {
      try {
        await ChatLocalDataSourceImpl()
            .deleteConversation(arg, conversation.conversationId);
      } catch (_) {}
    }
  }

  Future<List<Conversation>> _filterHiddenConversations(
    List<Conversation> list,
  ) async {
    final hidden = _readHiddenConversations();
    if (hidden.isEmpty) return list;

    var changed = false;
    final visible = <Conversation>[];
    for (final conversation in list) {
      final hiddenSeq = hidden[conversation.conversationId];
      if (hiddenSeq == null) {
        visible.add(conversation);
        continue;
      }
      if (conversation.lastMessageSeq > hiddenSeq) {
        hidden.remove(conversation.conversationId);
        visible.add(conversation);
        changed = true;
      }
    }
    if (changed) await _writeHiddenConversations(hidden);
    return visible;
  }

  Map<String, int> _readHiddenConversations() {
    try {
      final raw = Hive.box<String>('app_settings').get(_hiddenKey);
      if (raw == null || raw.isEmpty) return <String, int>{};
      final entries = raw.split('|');
      return {
        for (final entry in entries)
          if (entry.contains(':'))
            entry.split(':').first: int.tryParse(entry.split(':').last) ?? 0,
      };
    } catch (_) {
      return <String, int>{};
    }
  }

  Future<void> _writeHiddenConversations(Map<String, int> hidden) async {
    try {
      final value = hidden.entries.map((e) => '${e.key}:${e.value}').join('|');
      await Hive.box<String>('app_settings').put(_hiddenKey, value);
    } catch (_) {}
  }

  Future<void> _prefetchAvatars(List<Conversation> list) async {
    await prefetchAvatarUrls(
      [
        for (final conversation in list) conversation.avatarUrl,
        for (final conversation in list)
          ...(conversation.memberAvatarUrls ?? const <String?>[]).take(9),
      ],
      accessToken: ref.read(currentSpaceProvider)?.accessToken,
    );
  }

  List<Conversation> _keepNewerLocalPreviews(List<Conversation> fresh) {
    final current = state.valueOrNull;
    if (current == null || current.isEmpty) return fresh;
    final currentById = {
      for (final conversation in current)
        conversation.conversationId: conversation,
    };
    return fresh.map((remote) {
      final local = currentById[remote.conversationId];
      final localAt = local?.lastActivityAt;
      final remoteAt = remote.lastActivityAt;
      if (local == null) return remote;
      if (_isLocalSelfLastMessageSameAsRemote(local, remote)) {
        final lastSeq = local.lastMessageSeq > remote.lastMessageSeq
            ? local.lastMessageSeq
            : remote.lastMessageSeq;
        final readSeq =
            remote.lastReadSeq > lastSeq ? remote.lastReadSeq : lastSeq;
        return remote.copyWith(
          lastMessage: local.lastMessage,
          lastMessageSeq: lastSeq,
          lastReadSeq: readSeq,
          unreadCount: 0,
        );
      }
      final readState = _mergeReadState(local: local, remote: remote);
      if (local.lastMessageSeq > 0 &&
          remote.lastMessageSeq > 0 &&
          local.lastMessageSeq > remote.lastMessageSeq) {
        return remote.copyWith(
          lastMessage: local.lastMessage,
          lastActivityAt: local.lastActivityAt,
          lastMessageSeq: local.lastMessageSeq,
          lastReadSeq: readState.lastReadSeq,
          unreadCount: readState.unreadCount,
        );
      }
      if (localAt == null || remoteAt == null) return remote;
      if (!localAt.isAfter(remoteAt)) return remote;
      return remote.copyWith(
        lastMessage: local.lastMessage,
        lastActivityAt: localAt,
        lastMessageSeq: local.lastMessageSeq > remote.lastMessageSeq
            ? local.lastMessageSeq
            : remote.lastMessageSeq,
        lastReadSeq: readState.lastReadSeq,
        unreadCount: readState.unreadCount,
      );
    }).toList();
  }

  bool _isLocalSelfLastMessageSameAsRemote(
    Conversation local,
    Conversation remote,
  ) {
    if (remote.unreadCount <= 0) return false;
    final localLast = local.lastMessage;
    final remoteLast = remote.lastMessage;
    if (localLast == null || remoteLast == null) return false;
    final direction =
        (localLast.direction ?? '').trim().toLowerCase().replaceAll('-', '_');
    final isSelfLast = localLast.isSelf ||
        const {'out', 'outgoing', 'sent', 'self'}.contains(direction);
    if (!isSelfLast) return false;
    if (localLast.messageId.isNotEmpty &&
        remoteLast.messageId.isNotEmpty &&
        localLast.messageId == remoteLast.messageId) {
      return true;
    }
    return local.lastMessageSeq > 0 &&
        remote.lastMessageSeq > 0 &&
        local.lastMessageSeq == remote.lastMessageSeq;
  }

  ({int lastReadSeq, int unreadCount}) _mergeReadState({
    required Conversation local,
    required Conversation remote,
  }) {
    final lastReadSeq = local.lastReadSeq > remote.lastReadSeq
        ? local.lastReadSeq
        : remote.lastReadSeq;
    final lastMessageSeq = local.lastMessageSeq > remote.lastMessageSeq
        ? local.lastMessageSeq
        : remote.lastMessageSeq;
    if (lastReadSeq >= lastMessageSeq) {
      return (lastReadSeq: lastReadSeq, unreadCount: 0);
    }
    if (remote.lastMessageSeq >= local.lastMessageSeq) {
      return (lastReadSeq: lastReadSeq, unreadCount: remote.unreadCount);
    }
    return (lastReadSeq: lastReadSeq, unreadCount: local.unreadCount);
  }

  /// 刷新：重新从服务端拉取，以服务端为准
  Future<void> refresh() async {
    try {
      final repo = _repo;
      final page = await repo.getConversations();
      _nextCursor = page.nextCursor;
      _isLoadingMore = false;
      _hasLoadError = false;
      final fresh = await _prepareVisibleConversations(
          _keepNewerLocalPreviews(page.items));
      await _prefetchAvatars(fresh);
      state = AsyncData(fresh);
    } catch (e, st) {
      _hasLoadError = true;
      // 刷新失败时保留当前数据，不清空
      if (state.valueOrNull == null) {
        state = AsyncError(e, st);
      }
    }
  }

  /// 加载下一页
  Future<void> loadMore() async {
    if (_isLoadingMore || _nextCursor == null) return;
    _isLoadingMore = true;
    _hasLoadError = false;
    try {
      final page = await _repo.getConversations(cursor: _nextCursor);
      _nextCursor = page.nextCursor;
      final nextItems = await _prepareVisibleConversations(page.items);
      state = state.whenData((list) => [...list, ...nextItems]);
    } catch (_) {
      _hasLoadError = true;
    } finally {
      _isLoadingMore = false;
    }
  }

  /// 标记已读
  Future<void> markRead(
      String conversationId, bool isGroup, int readSeq) async {
    markReadLocally(conversationId);
    try {
      await _repo.markRead(conversationId, isGroup, readSeq);
    } catch (_) {}
  }

  /// 本地标记已读 + 持久化到 SQLite
  void markReadLocally(String conversationId) {
    var localReadSeq = 0;
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId) {
            localReadSeq = c.lastMessageSeq > c.lastReadSeq
                ? c.lastMessageSeq
                : c.lastReadSeq;
            return c.copyWith(unreadCount: 0, lastReadSeq: localReadSeq);
          }
          return c;
        }).toList());
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl().updateConversationReadState(
          arg,
          conversationId,
          readSeq: localReadSeq,
          unreadCount: 0,
        );
      } catch (_) {}
    });
  }

  void applyReadSeqLocally(String conversationId, int readSeq) {
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId) {
            final nextReadSeq =
                readSeq > c.lastReadSeq ? readSeq : c.lastReadSeq;
            return c.copyWith(unreadCount: 0, lastReadSeq: nextReadSeq);
          }
          return c;
        }).toList());
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl().updateConversationReadState(
          arg,
          conversationId,
          readSeq: readSeq,
          unreadCount: 0,
        );
      } catch (_) {}
    });
  }

  void markUnreadLocally(String conversationId) {
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId && c.unreadCount == 0) {
            return c.copyWith(unreadCount: 1);
          }
          return c;
        }).toList());
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl()
            .updateConversationUnreadCount(arg, conversationId, 1);
      } catch (_) {}
    });
  }

  Future<void> updateConversationTitle(
      String conversationId, String newTitle) async {
    Conversation? updatedConversation;
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId) {
            updatedConversation = c.copyWith(title: newTitle);
            return updatedConversation!;
          }
          return c;
        }).toList());
    if (updatedConversation != null) {
      await _persistConversation(updatedConversation!);
    }
  }

  Future<void> togglePin(String conversationId, bool pinned) async {
    final conversations = state.valueOrNull ?? [];
    final conv = conversations.firstWhere(
      (c) => c.conversationId == conversationId,
      orElse: () => throw StateError('Conversation not found'),
    );
    final prev = conversations;
    final updatedConv = conv.copyWith(isPinned: pinned);
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId) {
            return updatedConv;
          }
          return c;
        }).toList());
    await _persistConversation(updatedConv);
    try {
      final repo = _repo;
      if (repo is ChatRepositoryImpl) {
        await repo.pinConversationByType(
          conversationId,
          pinned,
          conv.type == ConversationType.group ||
              conv.type == ConversationType.tempSession,
        );
      } else {
        await repo.pinConversation(conversationId, pinned);
      }
    } catch (_) {
      state = AsyncData(prev);
      await _persistConversation(conv);
      rethrow;
    }
  }

  Future<void> toggleMute(String conversationId, bool muted) async {
    final conversations = state.valueOrNull ?? [];
    final conv = conversations.firstWhere(
      (c) => c.conversationId == conversationId,
      orElse: () => throw StateError('Conversation not found'),
    );
    final prev = conversations;
    final updatedConv = conv.copyWith(isMuted: muted);
    state = state.whenData((list) => list.map((c) {
          if (c.conversationId == conversationId) {
            return updatedConv;
          }
          return c;
        }).toList());
    await _persistConversation(updatedConv);
    try {
      final repo = _repo;
      if (repo is ChatRepositoryImpl) {
        await repo.muteConversationByType(
          conversationId,
          muted,
          conv.type == ConversationType.group ||
              conv.type == ConversationType.tempSession,
        );
      } else {
        await repo.muteConversation(conversationId, muted);
      }
    } catch (_) {
      state = AsyncData(prev);
      await _persistConversation(conv);
      rethrow;
    }
  }

  Future<void> _persistConversation(Conversation conversation) async {
    try {
      await ChatLocalDataSourceImpl().upsertConversation(arg, conversation);
    } catch (_) {}
  }

  Future<void> hideConversationLocally(String conversationId) async {
    final conversations = state.valueOrNull ?? [];
    final conversation = conversations
        .where(
          (c) => c.conversationId == conversationId,
        )
        .firstOrNull;
    final hidden = _readHiddenConversations();
    hidden[conversationId] = conversation?.lastMessageSeq ?? 0;
    await _writeHiddenConversations(hidden);
    state = AsyncData(
      conversations.where((c) => c.conversationId != conversationId).toList(),
    );
    await ChatLocalDataSourceImpl().deleteConversation(arg, conversationId);
  }

  /// Gateway 推送新消息时更新会话
  void mergeConversationFromGateway(Conversation partial,
      {bool isSelf = false}) {
    if (partial.type == ConversationType.tempSession ||
        _isKnownCustomerServiceConversation(partial.conversationId)) {
      Future.microtask(() async {
        try {
          await ChatLocalDataSourceImpl()
              .deleteConversation(arg, partial.conversationId);
        } catch (_) {}
      });
      return;
    }
    final hidden = _readHiddenConversations();
    final hiddenSeq = hidden[partial.conversationId];
    if (hiddenSeq != null && partial.lastMessageSeq <= hiddenSeq) {
      return;
    }
    if (hiddenSeq != null) {
      hidden.remove(partial.conversationId);
      _writeHiddenConversations(hidden);
    }
    state = state.whenData((list) {
      final idx =
          list.indexWhere((c) => c.conversationId == partial.conversationId);
      if (idx < 0) {
        final isEvent = partial.lastMessage?.messageType == 'event';
        return [
          ...list,
          partial.copyWith(
            unreadCount: isSelf || isEvent
                ? 0
                : partial.unreadCount > 0
                    ? partial.unreadCount
                    : 1,
          ),
        ];
      }
      final existing = list[idx];
      final isEvent = partial.lastMessage?.messageType == 'event';
      final isDuplicateLastMessage = _isSameLastMessage(existing, partial);
      final keepExistingLast =
          !isSelf && _isExistingLastMessageNewer(existing, partial);
      final updated = existing.copyWith(
        type: _shouldKeepExistingType(existing, partial)
            ? existing.type
            : partial.type,
        title: partial.title.isEmpty ? existing.title : partial.title,
        avatarUrl: existing.avatarUrl ?? partial.avatarUrl,
        peerUserId: existing.peerUserId ?? partial.peerUserId,
        peerUserType: existing.peerUserType ?? partial.peerUserType,
        lastMessage: keepExistingLast
            ? existing.lastMessage
            : partial.lastMessage ?? existing.lastMessage,
        lastActivityAt: keepExistingLast
            ? existing.lastActivityAt
            : partial.lastActivityAt ?? existing.lastActivityAt,
        lastMessageSeq: partial.lastMessageSeq > existing.lastMessageSeq
            ? partial.lastMessageSeq
            : existing.lastMessageSeq,
        unreadCount: isSelf
            ? 0
            : isEvent || isDuplicateLastMessage
                ? existing.unreadCount
                : existing.unreadCount + 1,
      );
      final newList = List<Conversation>.from(list);
      newList[idx] = updated;
      _persistConversation(updated);
      return newList;
    });
  }

  bool _isKnownCustomerServiceConversation(String conversationId) {
    final space = ref.read(currentSpaceProvider);
    if (space == null || !AppPermissions.canUseCustomerWorkbench(space)) {
      return false;
    }
    final data = ref.read(customerServiceThreadsProvider).valueOrNull;
    if (data == null) return false;
    return [...data.queueItems, ...data.activeItems].any((thread) =>
        thread.isTempSession && thread.conversationId == conversationId);
  }

  bool _isExistingLastMessageNewer(
    Conversation existing,
    Conversation incoming,
  ) {
    if (existing.lastMessage == null || incoming.lastMessage == null) {
      return false;
    }
    if (existing.lastMessageSeq > 0 &&
        incoming.lastMessageSeq > 0 &&
        existing.lastMessageSeq > incoming.lastMessageSeq) {
      return true;
    }
    final existingAt = existing.lastActivityAt;
    final incomingAt = incoming.lastActivityAt;
    return existingAt != null &&
        incomingAt != null &&
        existingAt.isAfter(incomingAt);
  }

  bool _isSameLastMessage(
    Conversation existing,
    Conversation incoming,
  ) {
    final existingLast = existing.lastMessage;
    final incomingLast = incoming.lastMessage;
    if (existingLast == null || incomingLast == null) return false;
    if (existingLast.messageId.isNotEmpty &&
        incomingLast.messageId.isNotEmpty &&
        existingLast.messageId == incomingLast.messageId) {
      return true;
    }
    return existing.lastMessageSeq > 0 &&
        incoming.lastMessageSeq > 0 &&
        existing.lastMessageSeq == incoming.lastMessageSeq;
  }

  bool _shouldKeepExistingType(Conversation existing, Conversation incoming) {
    return existing.type != ConversationType.direct &&
        incoming.type == ConversationType.direct &&
        incoming.title.isEmpty;
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final conversationsProvider = AsyncNotifierProvider.family<
    ConversationsNotifier, List<Conversation>, String>(
  ConversationsNotifier.new,
);

final conversationSearchProvider =
    StateProvider.family<String, String>((ref, spaceId) => '');

class GroupAvatarMember {
  final String displayName;
  final String? avatarUrl;

  const GroupAvatarMember({
    required this.displayName,
    this.avatarUrl,
  });
}

class UserAvatarPreview {
  final String displayName;
  final String? avatarUrl;

  const UserAvatarPreview({
    required this.displayName,
    this.avatarUrl,
  });
}

final userAvatarPreviewProvider =
    FutureProvider.family<UserAvatarPreview?, String>((ref, userId) async {
  ref.keepAlive();
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty || userId.isEmpty) {
    return null;
  }

  final tenantContacts = ref.watch(tenantMembersProvider).valueOrNull ?? [];
  final friendContacts = ref.watch(friendsProvider).valueOrNull ?? [];
  final contacts = [...tenantContacts, ...friendContacts];
  final contact = contacts.where((c) => c.userId == userId).firstOrNull;
  if (contact?.avatarUrl?.isNotEmpty == true) {
    return UserAvatarPreview(
      displayName: contact!.displayName,
      avatarUrl: contact.avatarUrl,
    );
  }

  final cached = await _loadUserAvatarPreviewFromCache(space.spaceId, userId);
  if (cached?.avatarUrl?.isNotEmpty == true) {
    return cached;
  }

  try {
    final dio = ref.watch(dioProvider);
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/users/$userId/profile',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    final avatarUrl = _avatarUrlFromJson(data);
    final displayName = data['displayName'] as String? ??
        data['name'] as String? ??
        cached?.displayName ??
        contact?.displayName ??
        '';
    if (avatarUrl?.isNotEmpty == true) {
      await prefetchAvatarUrls([avatarUrl], accessToken: space.accessToken);
      await _saveUserAvatarPreviewToCache(
        space.spaceId,
        userId,
        displayName,
        avatarUrl!,
      );
    }
    return UserAvatarPreview(
      displayName: displayName,
      avatarUrl: avatarUrl,
    );
  } catch (_) {
    if (cached != null) return cached;
    if (contact == null) return null;
    return UserAvatarPreview(
      displayName: contact.displayName,
      avatarUrl: contact.avatarUrl,
    );
  }
});

const _kUserProfileCachePrefix = 'user_profile_';

Future<UserAvatarPreview?> _loadUserAvatarPreviewFromCache(
  String spaceId,
  String userId,
) async {
  try {
    final box = await HiveStorage.profileBox(spaceId);
    final raw = box.get('$_kUserProfileCachePrefix$userId');
    if (raw == null) return null;
    final data = jsonDecode(raw as String) as Map<String, dynamic>;
    return UserAvatarPreview(
      displayName: data['name'] as String? ??
          data['displayName'] as String? ??
          data['remarkName'] as String? ??
          '',
      avatarUrl: _avatarUrlFromJson(data),
    );
  } catch (_) {
    return null;
  }
}

Future<void> _saveUserAvatarPreviewToCache(
  String spaceId,
  String userId,
  String displayName,
  String avatarUrl,
) async {
  try {
    final box = await HiveStorage.profileBox(spaceId);
    final key = '$_kUserProfileCachePrefix$userId';
    final current = box.get(key);
    final data = current is String && current.isNotEmpty
        ? jsonDecode(current) as Map<String, dynamic>
        : <String, dynamic>{};
    data['userId'] = data['userId'] ?? userId;
    if (displayName.isNotEmpty) data['name'] = displayName;
    data['avatarUrl'] = avatarUrl;
    await box.put(key, jsonEncode(data));
  } catch (_) {}
}

String? _avatarUrlFromJson(Map<String, dynamic> json) {
  final raw = json['avatarUrl'] ??
      json['avatar_url'] ??
      json['avatar'] ??
      json['headImageUrl'] ??
      json['profileAvatarUrl'];
  final value = raw?.toString().trim();
  return value == null || value.isEmpty ? null : value;
}

final groupAvatarMembersProvider =
    FutureProvider.family<List<GroupAvatarMember>, String>(
        (ref, groupId) async {
  ref.keepAlive();
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty || groupId.isEmpty) {
    return const [];
  }

  try {
    final tenantContacts = ref.watch(tenantMembersProvider).valueOrNull ?? [];
    final friendContacts = ref.watch(friendsProvider).valueOrNull ?? [];
    final avatarByUserId = <String, String>{
      for (final contact in [...tenantContacts, ...friendContacts])
        if (contact.avatarUrl?.isNotEmpty == true)
          contact.userId: contact.avatarUrl!,
    };
    final nameByUserId = <String, String>{
      for (final contact in [...tenantContacts, ...friendContacts])
        if (contact.displayName.isNotEmpty) contact.userId: contact.displayName,
    };
    final dio = ref.watch(dioProvider);
    final resp = await dio
        .get<Map<String, dynamic>>('/api/client/v1/groups/$groupId/members');
    final raw = resp.data?['data'];
    final rawMembers = extractGroupMemberPayloadList(raw);
    if (rawMembers.isEmpty) return const [];
    final members = <GroupAvatarMember>[];
    for (final m in rawMembers.take(9)) {
      final parsed = parseGroupMemberPayload(m);
      final preview = parsed.avatarUrl?.isNotEmpty == true
          ? null
          : await ref.read(userAvatarPreviewProvider(parsed.userId).future);
      members.add(
        GroupAvatarMember(
          displayName: parsed.displayName.isNotEmpty
              ? parsed.displayName
              : nameByUserId[parsed.userId] ?? preview?.displayName ?? '',
          avatarUrl: parsed.avatarUrl?.isNotEmpty == true
              ? parsed.avatarUrl
              : avatarByUserId[parsed.userId] ?? preview?.avatarUrl,
        ),
      );
    }
    await prefetchAvatarUrls(
      members.map((m) => m.avatarUrl).toList(),
      accessToken: space.accessToken,
    );
    return members;
  } catch (_) {
    return const [];
  }
});

final filteredConversationsProvider =
    Provider.family<AsyncValue<List<Conversation>>, String>((ref, spaceId) {
  final conversations = ref.watch(conversationsProvider(spaceId));
  final keyword = ref.watch(conversationSearchProvider(spaceId));
  return conversations.whenData(
    (list) => sortConversations(filterConversations(list, keyword)),
  );
});

class ConversationSections {
  final List<Conversation> pinned;
  final List<Conversation> normal;

  const ConversationSections({required this.pinned, required this.normal});
}

final sectionedConversationsProvider =
    Provider.family<AsyncValue<ConversationSections>, String>((ref, spaceId) {
  final filtered = ref.watch(filteredConversationsProvider(spaceId));
  return filtered.whenData((list) => ConversationSections(
        pinned: list.where((c) => c.isPinned).toList(),
        normal: list.where((c) => !c.isPinned).toList(),
      ));
});
