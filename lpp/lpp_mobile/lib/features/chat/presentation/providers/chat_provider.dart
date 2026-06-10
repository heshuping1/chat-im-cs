import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_event_handler.dart';
import 'package:lpp_mobile/features/chat/data/mappers/message_send_failure_mapper.dart';
import 'package:lpp_mobile/features/chat/data/repositories/chat_repository_impl.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/group_entities.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/read_receipt.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_read_receipt_service.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_policy.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/send_message_usecase.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_prefetch_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';

// ---------------------------------------------------------------------------
// Repository Provider (per spaceId)
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
// ChatNotifier — keyed by (spaceId, conversationId)
// ---------------------------------------------------------------------------

class ChatNotifier
    extends FamilyAsyncNotifier<List<Message>, (String, String, bool)> {
  late ChatRepository _repo;
  bool _hasMore = true;
  bool _isLoadingMore = false;
  Timer? _directReadStatusFastTrackTimer;

  @override
  Future<List<Message>> build((String, String, bool) arg) async {
    // keepAlive：退出聊天页不销毁，保持消息缓存（微信做法）
    ref.keepAlive();
    ref.onDispose(() {
      _directReadStatusFastTrackTimer?.cancel();
      _directReadStatusFastTrackTimer = null;
    });
    final (spaceId, _, _) = arg;
    _repo = ref.watch(_chatRepositoryProvider(spaceId));
    return _loadInitial();
  }

  Future<List<Message>> _loadInitial() async {
    final (spaceId, conversationId, argIsGroup) = arg;
    final isGroup = _resolveIsGroup(spaceId, conversationId, argIsGroup);
    final repo = _repo;

    // ── 微信本地优先策略 ──────────────────────────────────────────────────
    // 1. 立即读本地缓存，有数据就先渲染（用户秒看到消息）
    if (repo is ChatRepositoryImpl) {
      final cached = await repo.getCachedMessages(conversationId);
      if (cached != null && cached.isNotEmpty) {
        _hasMore = cached.length >= 50;
        state = AsyncData(cached);
        ref.read(mediaPrefetchControllerProvider(spaceId)).prefetchMessages(
              cached,
            );

        // 2. 后台增量同步：只拉比本地更新的消息
        _syncInBackground(conversationId, isGroup);
        if (!isGroup) {
          _syncDirectPeerReadStatusInBackground(conversationId);
          _startDirectReadStatusFastTrack(conversationId);
        }

        return cached;
      }
    }

    // 3. 无缓存（首次进入）：走网络，显示 loading
    try {
      final messages =
          await _repo.getMessages(conversationId, isGroup: isGroup);
      _hasMore = messages.length >= 50;
      ref.read(mediaPrefetchControllerProvider(spaceId)).prefetchMessages(
            messages,
          );
      final merged = _mergeMessages(state.valueOrNull, messages);
      if (!isGroup) {
        _syncDirectPeerReadStatusInBackground(conversationId);
        _startDirectReadStatusFastTrack(conversationId);
      }
      return merged;
    } catch (e) {
      // 网络失败时返回空列表，不显示错误页
      _hasMore = false;
      final current = state.valueOrNull;
      if (current != null && current.isNotEmpty) return current;
      return [];
    }
  }

  /// 后台增量同步（不阻塞 UI）
  void _syncInBackground(String conversationId, bool isGroup) {
    Future.microtask(() async {
      try {
        final repo = _repo;
        if (repo is! ChatRepositoryImpl) return;

        // syncMessagesFromRemote 内部自动调用 getLocalMaxSeq 获取增量游标
        final newMsgs = await repo.syncMessagesFromRemote(
          conversationId,
          isGroup: isGroup,
        );

        if (newMsgs.isNotEmpty) {
          ref.read(mediaPrefetchControllerProvider(arg.$1)).prefetchMessages(
                newMsgs,
              );
          // 合并新消息到当前状态
          state = state.whenData((list) {
            final map = <String, Message>{};
            for (final m in list) {
              map[m.messageId] = m;
            }
            for (final m in newMsgs) {
              map[m.messageId] = m;
            }
            return map.values.toList()
              ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
          });
          if (!isGroup) {
            _syncDirectPeerReadStatusInBackground(conversationId);
            _startDirectReadStatusFastTrack(conversationId);
          }
        }
      } catch (_) {
        // 后台同步失败静默处理，本地缓存继续展示
      }
    });
  }

  /// 加载更多历史消息（向上翻页）— 优先本地缓存，本地没有才请求网络
  Future<void> loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    final current = state.valueOrNull;
    if (current == null || current.isEmpty) return;

    _isLoadingMore = true;
    try {
      final (spaceId, conversationId, argIsGroup) = arg;
      final isGroup = _resolveIsGroup(spaceId, conversationId, argIsGroup);
      final oldest = current
          .reduce((a, b) => a.conversationSeq < b.conversationSeq ? a : b);
      final beforeSeq = oldest.conversationSeq;

      List<Message> older = [];
      final repo = _repo;

      if (repo is ChatRepositoryImpl) {
        // 优先从本地缓存读历史消息
        older = await repo.getOlderMessagesFromCache(
          conversationId,
          beforeSeq: beforeSeq,
        );

        // 本地没有足够数据才请求网络
        if (older.length < 20) {
          final remote = await repo.getOlderMessagesFromRemote(
            conversationId,
            isGroup: isGroup,
            beforeSeq: beforeSeq,
          );
          // 合并本地和网络数据
          final map = <String, Message>{};
          for (final m in older) {
            map[m.messageId] = m;
          }
          for (final m in remote) {
            map[m.messageId] = m;
          }
          older = map.values.toList()
            ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
        }
      } else {
        older = await _repo.getMessages(
          conversationId,
          isGroup: isGroup,
          beforeSeq: beforeSeq,
        );
      }

      _hasMore = older.length >= 20;
      if (older.isNotEmpty) {
        ref.read(mediaPrefetchControllerProvider(spaceId)).prefetchMessages(
              older,
            );
        state = AsyncData([...older, ...current]);
      }
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> loadAround({required int beforeSeq}) async {
    final (spaceId, conversationId, argIsGroup) = arg;
    final isGroup = _resolveIsGroup(spaceId, conversationId, argIsGroup);
    try {
      final repo = _repo;
      final messages = repo is ChatRepositoryImpl
          ? await repo.getOlderMessagesFromRemote(
              conversationId,
              isGroup: isGroup,
              beforeSeq: beforeSeq,
            )
          : await _repo.getMessages(
              conversationId,
              isGroup: isGroup,
              beforeSeq: beforeSeq,
            );
      if (messages.isEmpty) return;
      ref.read(mediaPrefetchControllerProvider(spaceId)).prefetchMessages(
            messages,
          );
      state = AsyncData(_mergeMessages(state.valueOrNull, messages));
    } catch (_) {
      // 定位补拉失败不影响当前会话展示。
    }
  }

  /// 乐观插入消息（发送中状态）
  void optimisticInsert(Message message) {
    final (spaceId, conversationId, _) = arg;
    state = state.whenData((list) => [...list, message]);
    _persistMessage(spaceId, conversationId, message);
  }

  /// 更新消息状态（通过 clientMsgId 匹配）
  void updateMessage(String clientMsgId, Message updated) {
    final (spaceId, conversationId, argIsGroup) = arg;
    state = state.whenData((list) => list.map((m) {
          if (m.clientMsgId == clientMsgId || m.messageId == clientMsgId) {
            return updated;
          }
          return m;
        }).toList());
    Future.microtask(() async {
      try {
        final local = ChatLocalDataSourceImpl();
        await local.upsertMessage(spaceId, conversationId, updated);
        if (updated.status.isServerUsable) {
          await local.updateConversationSummaryFromMessage(
            spaceId,
            conversationId: conversationId,
            fallbackType:
                argIsGroup ? ConversationType.group : ConversationType.direct,
            message: updated,
            isSelf: true,
          );
          if (!argIsGroup) {
            _syncDirectPeerReadStatusInBackground(conversationId);
            _startDirectReadStatusFastTrack(conversationId);
          }
        }
      } catch (_) {}
    });
  }

  /// 追加新消息（WebSocket 收到时调用）
  void appendMessage(Message message) {
    final (spaceId, conversationId, _) = arg;
    final current = state.valueOrNull;
    if (current == null) {
      state = AsyncData([message]);
      _persistMessage(spaceId, conversationId, message);
      return;
    }
    state = AsyncData(_mergeMessages(current, [message]));
    unawaited(
      ref.read(mediaPrefetchControllerProvider(spaceId)).prefetchMessage(
            message,
          ),
    );
    _persistMessage(spaceId, conversationId, message);
  }

  void _persistMessage(
    String spaceId,
    String conversationId,
    Message message,
  ) {
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl()
            .upsertMessage(spaceId, conversationId, message);
      } catch (_) {}
    });
  }

  List<Message> _mergeMessages(
    List<Message>? existing,
    List<Message> incoming,
  ) {
    final map = <String, Message>{};
    final clientMsgIndex = <String, String>{};

    void add(Message message) {
      final clientMsgId = message.clientMsgId;
      if (clientMsgId != null && clientMsgId.isNotEmpty) {
        final oldMessageId = clientMsgIndex[clientMsgId];
        if (oldMessageId != null && oldMessageId != message.messageId) {
          map.remove(oldMessageId);
        }
        clientMsgIndex[clientMsgId] = message.messageId;
      }
      map[message.messageId] = message;
    }

    for (final message in existing ?? const <Message>[]) {
      add(message);
    }
    for (final message in incoming) {
      add(message);
    }

    return map.values.toList()
      ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
  }

  /// 标记消息为已撤回
  void markRecalled(String messageId) {
    state = state.whenData((list) => list.map((m) {
          if (m.messageId == messageId) {
            return m.copyWith(isRecalled: true);
          }
          return m;
        }).toList());
  }

  /// 本地删除消息（从列表移除，不调服务端）
  void deleteMessageLocally(String messageId) {
    final (spaceId, conversationId, _) = arg;
    state = state.whenData(
      (list) => list
          .where((m) => m.messageId != messageId && m.clientMsgId != messageId)
          .toList(),
    );
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl()
            .deleteMessage(spaceId, conversationId, messageId);
      } catch (_) {}
    });
  }

  /// 对端已读回执：将 seq <= readSeq 且自己发送的消息标记为已读
  void updatePeerReadSeq(String _peerUserId, int readSeq) {
    final myUserId = ref.read(currentSpaceProvider)?.userId ?? '';
    const receiptService = MessageReadReceiptService();
    state = state.whenData(
      (list) => receiptService.applyDirectPeerReadSeq(
        list,
        currentUserId: myUserId,
        readSeq: readSeq,
      ),
    );
    final (spaceId, conversationId, argIsGroup) = arg;
    if (argIsGroup || myUserId.isEmpty || readSeq <= 0) return;
    Future.microtask(() async {
      try {
        await ChatLocalDataSourceImpl().markOwnMessagesReadByPeer(
          spaceId,
          conversationId,
          currentUserId: myUserId,
          readSeq: readSeq,
        );
      } catch (_) {}
    });
  }

  void _syncDirectPeerReadStatusInBackground(String conversationId) {
    Future.microtask(() async {
      try {
        final repository = _repo;
        if (repository is! DirectReadStatusReader) return;
        final reader = repository as DirectReadStatusReader;
        final status = await reader.getDirectReadStatus(conversationId);
        final readSeq = status.peerLastReadSeq;
        if (readSeq <= 0) return;
        final myUserId = ref.read(currentSpaceProvider)?.userId ?? '';
        if (myUserId.isEmpty) return;
        const receiptService = MessageReadReceiptService();
        state = state.whenData(
          (list) => receiptService.applyDirectPeerReadSeq(
            list,
            currentUserId: myUserId,
            readSeq: readSeq,
          ),
        );
        await ChatLocalDataSourceImpl().markOwnMessagesReadByPeer(
          arg.$1,
          conversationId,
          currentUserId: myUserId,
          readSeq: readSeq,
        );
      } catch (_) {
        // read-status 是回执增强能力，失败时保留 Gateway/历史快照状态。
      }
    });
  }

  void _startDirectReadStatusFastTrack(String conversationId) {
    final myUserId = ref.read(currentSpaceProvider)?.userId ?? '';
    if (myUserId.isEmpty || !_hasPendingDirectReadReceipt(myUserId)) return;
    if (_directReadStatusFastTrackTimer?.isActive == true) return;

    final startedAt = DateTime.now();
    _directReadStatusFastTrackTimer =
        Timer.periodic(const Duration(seconds: 5), (timer) {
      if (DateTime.now().difference(startedAt) > const Duration(seconds: 30) ||
          !_hasPendingDirectReadReceipt(myUserId)) {
        timer.cancel();
        if (_directReadStatusFastTrackTimer == timer) {
          _directReadStatusFastTrackTimer = null;
        }
        return;
      }
      _syncDirectPeerReadStatusInBackground(conversationId);
    });
  }

  bool _hasPendingDirectReadReceipt(String myUserId) {
    final messages = state.valueOrNull;
    if (messages == null || messages.isEmpty) return false;
    return const MessageReadReceiptService().hasPendingDirectPeerReadReceipt(
      messages,
      currentUserId: myUserId,
    );
  }

  bool get hasMore => _hasMore;

  bool _resolveIsGroup(
    String spaceId,
    String conversationId,
    bool fallback,
  ) {
    if (fallback) return true;
    final conversation = ref
        .read(conversationsProvider(spaceId))
        .valueOrNull
        ?.where((c) => c.conversationId == conversationId)
        .firstOrNull;
    return conversation?.type == ConversationType.group ||
        conversation?.type == ConversationType.tempSession;
  }
}

/// 以 (spaceId, conversationId, isGroup) 为 key 的消息列表 Provider
final chatProvider = AsyncNotifierProvider.family<ChatNotifier, List<Message>,
    (String, String, bool)>(ChatNotifier.new);

final scheduledMessageRepositoryProvider =
    Provider.family<ChatRepository, String>((ref, spaceId) {
  return ref.watch(_chatRepositoryProvider(spaceId));
});

// ---------------------------------------------------------------------------
// SendMessageUseCase Provider
// ---------------------------------------------------------------------------

final sendMessageUseCaseProvider =
    Provider.family<SendMessageUseCase, (String, String, bool)>((ref, args) {
  final (spaceId, _, _) = args;
  final repo = ref.watch(_chatRepositoryProvider(spaceId));
  final space = ref.watch(currentSpaceProvider);
  final currentUserId = space?.userId ?? '';
  return SendMessageUseCase(
    repository: repo,
    currentUserId: currentUserId,
    failureMapper: mapAppErrorToMessageSendFailure,
    sendPolicy: MessageSendPolicy(
      context: messageSendPolicyContextForSpace(space),
    ),
    onPendingEnqueue: ({
      required clientMsgId,
      required conversationId,
      required isGroup,
      required type,
      required body,
      mentions,
    }) {
      return PendingMessageQueue().enqueue(PendingMessage(
        spaceId: spaceId,
        userId: currentUserId,
        clientMsgId: clientMsgId,
        conversationId: conversationId,
        isGroup: isGroup,
        messageType: GatewayEventHandler.messageTypeToApiString(type),
        body: body.toLocalJson(),
        mentions: mentions,
        createdAt: DateTime.now(),
      ));
    },
  );
});

MessageSendPolicyContext messageSendPolicyContextForSpace(
  SpaceContext? space,
) {
  if (space?.isCustomer == true) {
    return MessageSendPolicyContext.enterpriseCustomer;
  }
  if (space?.isEmployee == true) {
    return MessageSendPolicyContext.enterpriseEmployee;
  }
  return MessageSendPolicyContext.personal;
}

// ---------------------------------------------------------------------------
// Group Providers
// ---------------------------------------------------------------------------

/// 群详情 Provider
final groupDetailEntityProvider =
    FutureProvider.family<GroupDetailEntity, String>((ref, groupId) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) throw Exception('未登录');
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/api/client/v1/groups/$groupId');
  return GroupDetailEntity.fromJson(resp.data['data'] as Map<String, dynamic>);
});

/// 群成员 Provider
final groupMembersEntityProvider =
    FutureProvider.family<List<GroupMemberEntity>, String>(
        (ref, groupId) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) return [];
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/api/client/v1/groups/$groupId/members');
  final list = resp.data['data'] as List<dynamic>;
  return list
      .map((e) => GroupMemberEntity.fromJson(e as Map<String, dynamic>))
      .toList();
});
