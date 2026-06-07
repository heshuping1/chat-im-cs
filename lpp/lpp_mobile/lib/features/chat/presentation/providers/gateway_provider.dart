import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/connectivity_provider.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';
import 'package:lpp_mobile/core/notifications/push_notification_service.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/call/presentation/providers/call_provider.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_event_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_service.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/data/models/conversation_model.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/data/repositories/chat_repository_impl.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/mention_reminder.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/group_detail_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/presence_provider.dart';
import 'package:lpp_mobile/features/contacts/application/friend_acceptance_conversation_service.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/friend_acceptance_conversation_provider.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_chat_repository_adapter.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';

// ---------------------------------------------------------------------------
// GatewayService Provider（单例）
// ---------------------------------------------------------------------------

/// 全局单例 GatewayService Provider
///
/// 监听 [currentSpaceProvider] 变化，自动重连或断开。
/// 重连成功后调用 GET /sync 补齐离线消息。
final gatewayProvider = Provider<GatewayService>((ref) {
  final service = GatewayService();
  final handler = GatewayEventHandler();
  StreamSubscription<GatewayEvent>? subscription;

  void reconnectForCurrentSite() {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    service.connect(space.accessToken, HttpClient.baseUrl).then((_) async {
      final dio = ref.read(dioProvider);
      await _syncMessages(dio, space.spaceId, ref);
      await _flushPendingMessages(dio, space.spaceId, ref);
    }).catchError((Object error) {
      AppDiagnostics.instance.warning(
        'gateway.site_line',
        'site line reconnect failed',
        context: {
          'spaceId': space.spaceId,
          'baseUrl': HttpClient.baseUrl,
          'error': error.toString(),
        },
      );
    });
  }

  SiteLineManager.instance.addListener(reconnectForCurrentSite);

  // 重连成功后调用 /sync 补齐离线消息
  service.onReconnected = () async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    final dio = ref.read(dioProvider);
    await _syncMessages(dio, space.spaceId, ref);
    await _flushPendingMessages(dio, space.spaceId, ref);
  };

  // 监听空间变化
  ref.listen(currentSpaceProvider, (prev, next) {
    if (next != null) {
      // 取消旧事件订阅
      subscription?.cancel();

      // 连接新空间
      service.connect(next.accessToken, HttpClient.baseUrl).then((_) async {
        // 首次连接成功后立即调 /sync 初始化增量游标
        // 如果已有游标则补齐离线消息，如果没有则拿到初始 nextSinceSeq
        final dio = ref.read(dioProvider);
        await _syncMessages(dio, next.spaceId, ref);
        await _flushPendingMessages(dio, next.spaceId, ref);
      });

      // 订阅事件流
      subscription = service.events.listen((event) {
        _handleEvent(event, next.spaceId, handler, ref);
      });
    } else {
      subscription?.cancel();
      subscription = null;
      service.disconnect();
    }
  }, fireImmediately: true);

  // 系统网络恢复时主动拉起 Gateway，避免等 SignalR 下一轮退避。
  ref.listen<AsyncValue<AppConnectivityStatus>>(connectivityStatusProvider,
      (prev, next) {
    if (next.valueOrNull != AppConnectivityStatus.online) return;
    final space = ref.read(currentSpaceProvider);
    if (space == null || service.isConnected) return;
    service.connect(space.accessToken, HttpClient.baseUrl).then((_) async {
      final dio = ref.read(dioProvider);
      await _syncMessages(dio, space.spaceId, ref);
      await _flushPendingMessages(dio, space.spaceId, ref);
    }).catchError((Object error) {
      AppDiagnostics.instance.warning(
        'gateway.connectivity',
        'resume reconnect failed',
        context: {
          'spaceId': space.spaceId,
          'error': error.toString(),
        },
      );
    });
  });

  // Provider 销毁时清理
  ref.onDispose(() {
    SiteLineManager.instance.removeListener(reconnectForCurrentSite);
    subscription?.cancel();
    service.dispose();
  });

  return service;
});

final gatewayConnectionStatusProvider =
    StreamProvider<GatewayConnectionStatus>((ref) async* {
  final service = ref.watch(gatewayProvider);
  yield service.status;
  yield* service.statusStream;
});

// ---------------------------------------------------------------------------
// 事件处理
// ---------------------------------------------------------------------------

void _handleEvent(
  GatewayEvent event,
  String spaceId,
  GatewayEventHandler handler,
  Ref ref,
) {
  if (event is NewMessageEvent) {
    handler.onNewMessage(
      event.data,
      spaceId: spaceId,
      onMessage: (spaceId, conversationId, message) {
        AppDiagnostics.instance.info(
          'gateway.msg',
          'new_message',
          context: {
            'spaceId': spaceId,
            'conversationId': conversationId,
            'messageId': message.messageId,
            'clientMsgId': message.clientMsgId,
            'messageType': message.type.name,
            'conversationSeq': message.conversationSeq,
          },
        );
        final pushedConversationType =
            _conversationTypeFromGatewayData(event.data);
        final fallbackType = pushedConversationType ??
            _resolveConversationType(ref, spaceId, conversationId) ??
            ConversationType.direct;
        final isCustomerServiceConversation =
            _isCustomerServiceConversation(ref, conversationId, fallbackType);
        if (isCustomerServiceConversation) {
          _refreshCustomerServiceWorkbench(ref);
        }
        final currentUserId = ref.read(currentSpaceProvider)?.userId;
        final isSelf =
            _isSelfGatewayMessage(event.data, message, currentUserId);
        if (!isSelf) {
          unawaited(_showGatewayMessageNotificationIfAllowed(
            spaceId: spaceId,
            conversationId: conversationId,
            fallbackType: fallbackType,
            message: message,
            data: event.data,
            currentUserId: currentUserId,
          ));
        }
        // 写入 SQLite 本地事实源，并从同一条消息派生会话摘要（fire-and-forget）。
        unawaited(Future<void>.microtask(() async {
          final local = ChatLocalDataSourceImpl();
          await local.upsertMessage(spaceId, conversationId, message);
          if (isCustomerServiceConversation) {
            await local.deleteConversation(spaceId, conversationId);
          } else {
            await local.updateConversationSummaryFromMessage(
              spaceId,
              conversationId: conversationId,
              fallbackType: fallbackType,
              message: message,
              isSelf: isSelf,
            );
          }
        }));
        _appendMessageToChatIfKnown(
          ref,
          spaceId,
          conversationId,
          message,
          conversationType: pushedConversationType,
        );
        _refreshGroupDetailIfNeeded(
          ref,
          spaceId,
          conversationId,
          message,
          conversationType: pushedConversationType,
        );
      },
      onConversationUpdate: (spaceId, partial) {
        if (_isCustomerServiceConversation(
          ref,
          partial.conversationId,
          partial.type,
        )) {
          _refreshCustomerServiceWorkbench(ref);
          return;
        }
        final currentUserId = ref.read(currentSpaceProvider)?.userId;
        final isSelf = _isSelfGatewayData(event.data, currentUserId) ||
            (partial.lastMessage?.senderUserId != null &&
                partial.lastMessage!.senderUserId == currentUserId);
        final peerUserId = partial.type == ConversationType.direct &&
                !isSelf &&
                partial.peerUserId == null &&
                partial.lastMessage?.senderUserId.isNotEmpty == true
            ? partial.lastMessage!.senderUserId
            : null;
        ref
            .read(conversationsProvider(spaceId).notifier)
            .mergeConversationFromGateway(
              peerUserId == null
                  ? partial
                  : partial.copyWith(peerUserId: peerUserId),
              isSelf: isSelf,
            );
      },
    );
  } else if (event is PresenceChangedEvent) {
    ref.read(presenceProvider.notifier).updatePresence(
          event.userId,
          event.isOnline,
          event.customStatus,
        );
  } else if (event is SpaceNoticeEvent) {
    // 跨空间未读通知：刷新空间列表；如果是当前空间，同时刷新消息会话，
    // 保证空间切换页和消息页用同一套普通 IM 未读口径校正。
    ref.invalidate(spaceUnreadSummaryProvider);
    ref.invalidate(spacesProvider);
    final currentSpace = ref.read(currentSpaceProvider);
    if (currentSpace != null &&
        _spaceNoticeTargetsCurrentSpace(event, currentSpace.spaceId)) {
      ref.invalidate(conversationsProvider(currentSpace.spaceId));
    }
  } else if (event is MessageRecalledEvent) {
    // 消息撤回：更新本地消息状态为已撤回
    _handleMessageRecalled(event, spaceId, ref);
  } else if (event is MessageReadEvent) {
    // 对端已读回执：更新对应会话里自己发的消息的已读状态
    _handleMessageRead(event, spaceId, ref);
  } else if (event is ForceLogoutEvent) {
    // 强制登出：清除 token 并跳转到登录页
    ref.read(authProvider.notifier).logout();
  } else if (event is CustomerServiceAssignedEvent) {
    _handleCustomerServiceAssigned(event, spaceId, ref);
  } else if (event is TempSessionAssignedEvent ||
      event is TempSessionClosedEvent ||
      event is TempSessionRatedEvent) {
    // 客服工作台相关事件：刷新会话列表（客服端）
    ref.invalidate(conversationsProvider(spaceId));
    _refreshCustomerServiceWorkbench(ref);
  } else if (event is TenantJoinRequestReviewedEvent) {
    // 加入申请被拒绝：刷新空间列表（用户可能需要重新申请）
    ref.invalidate(spacesProvider);
  } else if (event is FriendRequestChangedEvent) {
    _handleFriendRequestChanged(event, ref);
  } else if (event is CustomerServiceStatusChangedEvent) {
    _handleCustomerServiceStatusChanged(event, ref);
  } else if (event is CustomerServiceSlaEvent) {
    _handleCustomerServiceSla(event, ref);
  } else if (event is FriendProfileUpdatedEvent) {
    _handleFriendProfileUpdated(event, ref);
  } else if (event is VoiceCallIncomingEvent) {
    unawaited(PushNotificationService.showIncomingCallNotification(
      callId: event.callId,
      callerUserId: event.callerUserId,
      callerDisplayName: event.callerDisplayName,
      relayUrl: event.relayUrl,
      mediaMode: event.mediaMode,
    ));
    ref.read(callProvider.notifier).receiveIncomingCall(
          callId: event.callId,
          callerUserId: event.callerUserId,
          callerDisplayName: event.callerDisplayName,
          relayUrl: event.relayUrl,
          mediaMode: event.mediaMode,
          callerVideoProfile: event.callerVideoProfile,
        );
  }
}

bool _spaceNoticeTargetsCurrentSpace(
  SpaceNoticeEvent event,
  String currentSpaceId,
) {
  final noticeSpaceId =
      event.sourceSpaceType == 1 ? 'personal' : event.sourceTenantId;
  return noticeSpaceId == currentSpaceId;
}

void _handleMessageRead(
  MessageReadEvent event,
  String spaceId,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.msg',
    'read',
    context: {
      'spaceId': spaceId,
      'conversationId': event.conversationId,
      'userId': event.userId,
      'readSeq': event.readSeq,
    },
  );

  final currentUserId = ref.read(currentSpaceProvider)?.userId;
  if (event.userId == currentUserId) {
    ref
        .read(conversationsProvider(spaceId).notifier)
        .applyReadSeqLocally(event.conversationId, event.readSeq);
    return;
  }

  // 对端已读回执：更新对应会话里自己发的消息的已读状态
  _updateChatIfKnown(ref, spaceId, event.conversationId, (notifier) {
    notifier.updatePeerReadSeq(event.userId, event.readSeq);
  });
}

// ---------------------------------------------------------------------------
// 客服归属变更处理
// ---------------------------------------------------------------------------

void _handleCustomerServiceAssigned(
  CustomerServiceAssignedEvent event,
  String spaceId,
  Ref ref,
) {
  // 1. 刷新归属客服信息（客户视角）
  ref.invalidate(assignedStaffProvider);

  // 2. 刷新好友列表（新客服会自动建立好友关系）
  ref.invalidate(friendsProvider);

  // 3. 如果转移了会话（transferConversation=true），刷新会话列表
  if (event.transferConversation) {
    ref.invalidate(conversationsProvider(spaceId));
  }

  _refreshCustomerServiceWorkbench(ref);
}

void _handleFriendRequestChanged(
  FriendRequestChangedEvent event,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.friend',
    'request_changed',
    context: {
      'requestId': event.requestId,
      'status': event.status,
      'eventName': event.eventName,
    },
  );
  ref.invalidate(friendRequestsProvider);
  ref.invalidate(pendingFriendRequestsProvider);
  if (event.status == 'accepted') {
    ref.invalidate(friendsProvider);
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId != null) {
      ref.invalidate(conversationsProvider(spaceId));
    }
    final peerUserId = event.peerUserId?.trim();
    if (peerUserId != null && peerUserId.isNotEmpty) {
      unawaited(
        ensureFriendAcceptanceConversationFromProvider(
          ref,
          FriendAcceptanceConversationDraft(
            requestId: event.requestId,
            peerUserId: peerUserId,
            peerDisplayName: event.peerDisplayName?.trim().isNotEmpty == true
                ? event.peerDisplayName!.trim()
                : '好友',
            peerAvatarUrl: event.peerAvatarUrl?.trim().isNotEmpty == true
                ? event.peerAvatarUrl!.trim()
                : null,
            requestMessage: event.requestMessage,
            acceptedText: '对方通过了你的朋友验证请求，现在我们可以开始聊天了',
          ),
        ).catchError((_) {}),
      );
    }
  }
}

void _handleCustomerServiceStatusChanged(
  CustomerServiceStatusChangedEvent event,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.customer_service',
    'status_changed',
    context: {
      'staffUserId': event.staffUserId,
      'serviceStatus': event.serviceStatus,
      'queueAcceptEnabled': event.queueAcceptEnabled,
      'eventName': event.eventName,
    },
  );
  _refreshCustomerServiceWorkbench(ref);
}

void _handleCustomerServiceSla(
  CustomerServiceSlaEvent event,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.customer_service',
    'sla',
    context: {
      'threadId': event.threadId,
      'riskLevel': event.riskLevel,
      'eventName': event.eventName,
    },
  );
  _refreshCustomerServiceWorkbench(ref);
}

void _handleFriendProfileUpdated(
  FriendProfileUpdatedEvent event,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.friend',
    'profile_updated',
    context: {
      'friendUserId': event.friendUserId,
    },
  );
  ref.invalidate(friendsProvider);
}

void _refreshCustomerServiceWorkbench(Ref ref) {
  final space = ref.read(currentSpaceProvider);
  if (space == null || !space.isEmployee) return;

  if (space.isCustomerService) {
    ref.invalidate(customerServiceReceptionStatusProvider);
    ref.invalidate(customerServiceThreadsProvider);
    ref.invalidate(customerServiceDashboardProvider);
  }

  if (space.isAdminOrAbove) {
    ref.invalidate(adminCustomerServiceDashboardProvider);
    ref.invalidate(adminCustomerServiceStaffStatusesProvider);
    ref.invalidate(adminCustomerServiceThreadsProvider);
    ref.invalidate(adminDirectCustomerThreadsProvider);
    ref.invalidate(adminCustomersProvider);
    ref.invalidate(adminAuditLogsProvider);
  }
}

// ---------------------------------------------------------------------------
// 消息撤回处理
// ---------------------------------------------------------------------------

void _handleMessageRecalled(
  MessageRecalledEvent event,
  String spaceId,
  Ref ref,
) {
  AppDiagnostics.instance.info(
    'gateway.msg',
    'recalled',
    context: {
      'spaceId': spaceId,
      'conversationId': event.conversationId,
      'messageId': event.messageId,
      'conversationSeq': event.conversationSeq,
      'operatorUserId': event.operatorUserId,
    },
  );
  // 更新 chatProvider 内存中的消息状态为已撤回
  final convId = event.conversationId;
  _updateChatIfKnown(ref, spaceId, convId, (notifier) {
    notifier.markRecalled(event.messageId);
  });
  // 同步更新本地 SQLite
  Future.microtask(() async {
    try {
      final local = ChatLocalDataSourceImpl();
      await local.markMessageRecalled(spaceId, convId, event.messageId);
    } catch (_) {}
  });
}

// ---------------------------------------------------------------------------
// /sync 补齐离线消息
// ---------------------------------------------------------------------------

Future<void> _syncMessages(Dio dio, String spaceId, Ref ref) async {
  try {
    final Box<dynamic> cursorsBox = HiveStorage.syncCursorsBox;
    final sinceSeq = cursorsBox.get('sync_cursor_$spaceId') as int?;

    final response = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/sync',
      queryParameters: {
        if (sinceSeq != null) 'sinceSeq': sinceSeq,
        'limit': 200,
      },
    );

    final body = response.data;
    if (body == null) return;

    final data = body['data'] as Map<String, dynamic>?;
    if (data == null) return;

    final nextSinceSeq = data['nextSinceSeq'] as int?;
    final conversations = data['conversations'] as List<dynamic>? ?? [];

    final local = ChatLocalDataSourceImpl();
    var syncedMessageCount = 0;

    for (final convData in conversations) {
      final conv = convData as Map<String, dynamic>;
      final conversationId = conv['conversationId'] as String?;
      if (conversationId == null) continue;

      final messages = (conv['messages'] as List<dynamic>? ?? [])
          .map((m) => MessageModel.fromJson(m as Map<String, dynamic>))
          .toList();

      for (final message in messages) {
        syncedMessageCount++;
        // 写入 SQLite 本地事实源
        await local.upsertMessage(spaceId, conversationId, message);

        // 更新会话列表（直接合并，不调 API）
        // sync 当前文档不保证返回会话类型；如果服务端补了类型则优先使用，
        // 否则从本地缓存继承，最后再按 direct 兼容旧响应。
        final currentUserId = ref.read(currentSpaceProvider)?.userId;
        final isSelf = message.isSelf ||
            _sameIdentity(message.senderUserId, currentUserId);
        final existingConvs =
            ref.read(conversationsProvider(spaceId)).valueOrNull;
        final existingConv = existingConvs
            ?.where((c) => c.conversationId == conversationId)
            .firstOrNull;
        final convType = conv['conversationType'] is String ||
                conv['type'] is String
            ? ConversationModel.parseType(
                conv['conversationType'] as String? ?? conv['type'] as String?,
              )
            : existingConv?.type ?? ConversationType.direct;
        final isCustomerServiceConversation =
            _isCustomerServiceConversation(ref, conversationId, convType);
        if (isCustomerServiceConversation) {
          await local.deleteConversation(spaceId, conversationId);
          _refreshCustomerServiceWorkbench(ref);
          continue;
        }
        await local.updateConversationSummaryFromMessage(
          spaceId,
          conversationId: conversationId,
          fallbackType: convType,
          message: message,
          isSelf: isSelf,
        );
        _appendMessageToChatIfKnown(
          ref,
          spaceId,
          conversationId,
          message,
          conversationType: convType,
        );
        _refreshGroupDetailIfNeeded(
          ref,
          spaceId,
          conversationId,
          message,
          conversationType: convType,
        );
        final partial = Conversation(
          conversationId: conversationId,
          type: convType,
          title: existingConv?.title ?? '',
          peerUserId: existingConv?.peerUserId ??
              (convType == ConversationType.direct &&
                      message.senderUserId != currentUserId
                  ? message.senderUserId
                  : null),
          lastMessage: LastMessage(
            messageId: message.messageId,
            text: message.body.text,
            messageType: GatewayEventHandler.messageTypeToApiString(
              message.type,
            ),
            senderUserId: message.senderUserId,
            sentAt: message.sentAt,
            isSelf: isSelf || message.isSelf,
            direction: isSelf || message.isSelf ? 'out' : null,
            mentions: message.mentions,
          ),
          lastActivityAt: message.sentAt,
          lastMessageSeq: message.conversationSeq,
        );
        ref
            .read(conversationsProvider(spaceId).notifier)
            .mergeConversationFromGateway(partial, isSelf: isSelf);
      }
    }

    // 保存新游标
    if (nextSinceSeq != null) {
      await cursorsBox.put('sync_cursor_$spaceId', nextSinceSeq);
    }
    AppDiagnostics.instance.info(
      'gateway.sync',
      'completed',
      context: {
        'spaceId': spaceId,
        'sinceSeq': sinceSeq,
        'nextSinceSeq': nextSinceSeq,
        'conversationCount': conversations.length,
        'messageCount': syncedMessageCount,
      },
    );
  } catch (error) {
    AppDiagnostics.instance.warning(
      'gateway.sync',
      'failed',
      context: {
        'spaceId': spaceId,
        'error': error.toString(),
      },
    );
    // 同步失败静默处理，下次重连时重试
  }
}

Future<void> _flushPendingMessages(Dio dio, String spaceId, Ref ref) async {
  try {
    final pending = PendingMessageQueue();
    final before = await pending.getAll();
    if (before.isEmpty) return;
    final local = ChatLocalDataSourceImpl();
    final defaultRepository = ChatRepositoryImpl(
      remote: ChatRemoteDataSourceImpl(dio),
      local: local,
      spaceId: spaceId,
    );
    await pending.flushAll(
      defaultRepository,
      repositoryForMessage: (message) {
        final threadType = message.threadType?.trim();
        final threadId = message.threadId?.trim();
        if (threadType != null &&
            threadType.isNotEmpty &&
            threadId != null &&
            threadId.isNotEmpty) {
          return CustomerServiceChatRepositoryAdapter(
            customerServiceRepository:
                ref.read(customerServiceRepositoryProvider),
            mediaRemote: ChatRemoteDataSourceImpl(dio),
            threadType: threadType,
            threadId: threadId,
            senderUserId: ref.read(currentSpaceProvider)?.userId ?? '',
          );
        }
        return defaultRepository;
      },
      onMessageResent: (pendingMessage, sent) async {
        final confirmed = sent.copyWith(
          clientMsgId: pendingMessage.clientMsgId,
          status: MessageStatus.sent,
          clearLocalUploadState: true,
        );
        await local.upsertMessage(
          spaceId,
          pendingMessage.conversationId,
          confirmed,
        );
        _appendMessageToChatIfKnown(
          ref,
          spaceId,
          pendingMessage.conversationId,
          confirmed,
        );
      },
    );
    final after = await pending.getAll();
    AppDiagnostics.instance.info(
      'chat.pending',
      'flushed',
      context: {
        'spaceId': spaceId,
        'before': before.length,
        'after': after.length,
      },
    );
  } catch (error) {
    AppDiagnostics.instance.warning(
      'chat.pending',
      'flush failed',
      context: {
        'spaceId': spaceId,
        'error': error.toString(),
      },
    );
  }
}

void _appendMessageToChatIfKnown(
  Ref ref,
  String spaceId,
  String conversationId,
  Message message, {
  ConversationType? conversationType,
}) {
  final resolvedType = conversationType ??
      _resolveConversationType(ref, spaceId, conversationId);
  if (resolvedType == null) return;

  final isGroup = _isGroupConversationType(resolvedType);
  try {
    ref
        .read(chatProvider((spaceId, conversationId, isGroup)).notifier)
        .appendMessage(message);
  } catch (_) {}
}

ConversationType? _resolveConversationType(
  Ref ref,
  String spaceId,
  String conversationId,
) {
  return ref
      .read(conversationsProvider(spaceId))
      .valueOrNull
      ?.where((c) => c.conversationId == conversationId)
      .firstOrNull
      ?.type;
}

bool _isGroupConversationType(ConversationType type) {
  return type == ConversationType.group || type == ConversationType.tempSession;
}

bool _isCustomerServiceConversation(
  Ref ref,
  String conversationId,
  ConversationType type,
) {
  if (type == ConversationType.tempSession) return true;

  final threads = ref.read(customerServiceThreadsProvider).valueOrNull;
  if (threads == null) return false;

  return threads.queueItems.any((thread) =>
          thread.isTempSession && thread.conversationId == conversationId) ||
      threads.activeItems.any((thread) =>
          thread.isTempSession && thread.conversationId == conversationId);
}

ConversationType? _conversationTypeFromGatewayData(Map<String, dynamic> data) {
  final rawValues = <String?>[
    _gatewayString(data['threadType']),
    _gatewayString(_gatewayMap(data['thread'])?['threadType']),
    _gatewayString(_gatewayMap(data['conversation'])?['threadType']),
    _gatewayString(data['conversationType']),
    _gatewayString(data['type']),
    _gatewayString(_gatewayMap(data['conversation'])?['conversationType']),
  ];
  if (rawValues
      .any((value) => _normalizeGatewayType(value) == 'temp_session')) {
    return ConversationType.tempSession;
  }
  final raw = rawValues.firstWhere(
    (value) => value != null && value.trim().isNotEmpty,
    orElse: () => null,
  );
  if (raw == null || raw.isEmpty) return null;
  return ConversationModel.parseType(raw);
}

String _normalizeGatewayType(String? value) =>
    (value ?? '').trim().toLowerCase().replaceAll('-', '_');

String? _gatewayString(Object? value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

Map<String, dynamic>? _gatewayMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, value) => MapEntry(key.toString(), value));
  }
  return null;
}

String? _gatewayNotificationTitle(Map<String, dynamic> data) {
  for (final key in const [
    'conversationTitle',
    'title',
    'senderDisplayName',
    'senderName',
  ]) {
    final value = data[key]?.toString();
    if (value != null && value.isNotEmpty) return value;
  }
  return null;
}

Future<void> _showGatewayMessageNotificationIfAllowed({
  required String spaceId,
  required String conversationId,
  required ConversationType fallbackType,
  required Message message,
  required Map<String, dynamic> data,
  required String? currentUserId,
}) async {
  if (await _isGatewayConversationMuted(spaceId, conversationId)) return;
  final mentionKind = mentionReminderKindForMessage(
    mentions: message.mentions,
    currentUserId: currentUserId,
    isGroup: fallbackType == ConversationType.group,
    isSelf: false,
  );
  await PushNotificationService.showGatewayMessageNotification(
    conversationId: conversationId,
    isGroup: fallbackType == ConversationType.group,
    messageId: message.messageId,
    messageType: GatewayEventHandler.messageTypeToApiString(message.type),
    title: _gatewayNotificationTitle(data),
    body: message.body.text,
    peerUserId: message.senderUserId,
    mentionKind: switch (mentionKind) {
      MentionReminderKind.me => 'me',
      MentionReminderKind.all => 'all',
      MentionReminderKind.none => null,
    },
    senderDisplayName: _gatewayString(data['senderDisplayName']) ??
        _gatewayString(data['senderName']),
  );
}

Future<bool> _isGatewayConversationMuted(
  String spaceId,
  String conversationId,
) async {
  try {
    final conversations =
        await ChatLocalDataSourceImpl().getConversations(spaceId);
    return conversations
            .where(
                (conversation) => conversation.conversationId == conversationId)
            .firstOrNull
            ?.isMuted ==
        true;
  } catch (_) {
    return false;
  }
}

bool _isSelfGatewayMessage(
  Map<String, dynamic> data,
  Message message,
  String? currentUserId,
) {
  if (message.isSelf) return true;
  if (_sameIdentity(message.senderUserId, currentUserId)) return true;
  return _isSelfGatewayData(data, currentUserId);
}

bool _isSelfGatewayData(Map<String, dynamic> data, String? currentUserId) {
  final message = _gatewayMap(data['message']) ?? _gatewayMap(data['msg']);
  final records = <Map<String, dynamic>>[
    data,
    if (message != null) message,
  ];
  for (final record in records) {
    if (_gatewayBool(record['isSelf']) || _gatewayBool(record['isMine'])) {
      return true;
    }
    final direction =
        _normalizeGatewayType(_gatewayString(record['direction']));
    if (const {'out', 'outgoing', 'sent', 'self'}.contains(direction)) {
      return true;
    }
    for (final key in const [
      'senderUserId',
      'senderId',
      'fromUserId',
      'userId',
      'senderPlatformUserId',
      'platformUserId',
      'senderLppId',
      'lppId',
    ]) {
      if (_sameIdentity(_gatewayString(record[key]), currentUserId)) {
        return true;
      }
    }
  }
  return false;
}

bool _sameIdentity(String? left, String? right) {
  final a = left?.trim().toLowerCase();
  final b = right?.trim().toLowerCase();
  return a != null && a.isNotEmpty && b != null && b.isNotEmpty && a == b;
}

bool _gatewayBool(Object? value) {
  return value == true || value == 'true' || value == 1 || value == '1';
}

void _refreshGroupDetailIfNeeded(
  Ref ref,
  String spaceId,
  String conversationId,
  Message message, {
  ConversationType? conversationType,
}) {
  final resolvedType = conversationType ??
      _resolveConversationType(ref, spaceId, conversationId);
  if (resolvedType != ConversationType.group) return;
  if (message.type != MessageType.event) return;

  unawaited(
    ref.read(groupDetailProvider(conversationId).notifier).refresh(),
  );
}

void _updateChatIfKnown(
  Ref ref,
  String spaceId,
  String conversationId,
  void Function(ChatNotifier notifier) update,
) {
  final type = _resolveConversationType(ref, spaceId, conversationId);
  if (type == null) return;
  final isGroup = _isGroupConversationType(type);
  try {
    update(ref.read(chatProvider((spaceId, conversationId, isGroup)).notifier));
  } catch (_) {}
}
