import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart' as dio_package;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/network/http_client.dart' as app_http;
import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/platform/local_image_dimensions.dart';
import 'package:lpp_mobile/core/platform/local_video_poster.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/core/platform/media_saver.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/providers/locale_provider.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/call/domain/entities/call_entities.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_event_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/data/mappers/message_send_failure_mapper.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/mention_reminder.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_policy.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/send_message_usecase.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/direct_chat_entry_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/message_translation_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/outgoing_media_localizer.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_draft_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/group_detail_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart'
    show groupMembersProvider;
import 'package:lpp_mobile/features/chat/presentation/pages/favorites_page.dart'
    show favoritesProvider, favoritesSummaryProvider;
import 'package:lpp_mobile/features/chat/presentation/models/chat_picked_media.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_send_interaction_policy.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_context_action_model.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/chat_input_toolbar.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/conversation_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/marketing_toolbar.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/message_bubble.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/profile_page.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_chat_repository_adapter.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/profile/presentation/pages/my_page.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/chat_background_provider.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

class ChatPage extends ConsumerStatefulWidget {
  final String conversationId;
  final bool isGroup;
  final String title;
  final String? avatarUrl;
  final String? peerUserId;
  final bool isMuted;
  final int? memberCount;
  final String? scrollToMessageId;
  final int? scrollBeforeSeq;
  final String? customerServiceThreadType;
  final String? customerServiceThreadId;
  final String? customerServiceCustomerUserId;
  final String? customerServiceVisitorId;
  final String? customerServiceSource;
  final bool customerServiceReadOnly;

  const ChatPage({
    super.key,
    required this.conversationId,
    this.isGroup = false,
    required this.title,
    this.avatarUrl,
    this.peerUserId,
    this.isMuted = false,
    this.memberCount,
    this.scrollToMessageId,
    this.scrollBeforeSeq,
    this.customerServiceThreadType,
    this.customerServiceThreadId,
    this.customerServiceCustomerUserId,
    this.customerServiceVisitorId,
    this.customerServiceSource,
    this.customerServiceReadOnly = false,
  });

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  static const _uuid = Uuid();

  static bool get _locationSendingEnabled => false;
  static const PlatformMediaSaver _mediaSaver = PlatformMediaSaver();

  final _scrollController = ScrollController();
  bool _isSending = false;
  String _spaceId = '';
  Timer? _refreshTimer;
  Timer? _groupDetailRefreshTimer;
  ProviderSubscription<AsyncValue<CsThreadsData>>? _customerServiceThreadsSub;
  bool _requestedScrollTarget = false;
  // 退出时上报已读的 seq（微信做法：进入立即本地清零，退出时才上报服务器）
  int? _pendingReadSeq;
  int? _initialMentionLastReadSeq;
  // 非好友/无权限发消息（MSG_MEMBER_FORBIDDEN）
  bool _notFriend = false;
  bool _customerServiceDetailLoaded = false;
  bool _isQuickTranslating = false;
  bool _isReceptionActionRunning = false;

  // 多选模式
  bool _multiSelectMode = false;
  final Set<String> _selectedMessages = {};

  // 上下文菜单
  String? _selectedMessageId;

  // 回复引用
  ({String id, String text, String sender})? _replyingTo;
  bool _resolvedIsGroup = false;
  String? _createdConversationId;
  String? _externalInsertText;
  int _externalInsertToken = 0;
  CsThreadDetail? _customerServiceDetail;

  bool get _isCustomerServiceThread =>
      widget.customerServiceThreadType != null &&
      widget.customerServiceThreadType!.isNotEmpty &&
      widget.customerServiceThreadId != null &&
      widget.customerServiceThreadId!.isNotEmpty;

  bool get _isReadOnlyConversation => widget.customerServiceReadOnly;

  bool get _customerServiceRequiresManualEntry {
    if (!_isCustomerServiceThread || _customerServiceDetail == null) {
      return false;
    }
    return _customerServiceReplyGate(_customerServiceDetail!) !=
        _CustomerServiceReplyGate.open;
  }

  String get _activeConversationId =>
      _createdConversationId ?? widget.conversationId;

  bool get _isPendingDirectChat =>
      _createdConversationId == null &&
      widget.conversationId.startsWith('pending_direct_') &&
      widget.peerUserId?.isNotEmpty == true;

  bool get _effectiveIsGroup {
    if (widget.isGroup) {
      _resolvedIsGroup = true;
      return true;
    }
    if (_resolvedIsGroup) return true;
    if (_spaceId.isEmpty) return false;
    final conversations = ref.read(conversationsProvider(_spaceId)).valueOrNull;
    final conversation = conversations
        ?.where((c) => c.conversationId == widget.conversationId)
        .firstOrNull;
    final isGroup = conversation?.type == ConversationType.group ||
        conversation?.type == ConversationType.tempSession;
    if (isGroup) {
      _resolvedIsGroup = true;
    }
    return _resolvedIsGroup;
  }

  @override
  void initState() {
    super.initState();
    _resolvedIsGroup = widget.isGroup;
    _scrollController.addListener(_onScroll);
    // 进入聊天页时立即本地清零未读数
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _spaceId.isEmpty) return;
      if (_isPendingDirectChat) return;
      if (_isReadOnlyConversation) return;
      _captureInitialMentionReadSeq();
      ref
          .read(conversationsProvider(_spaceId).notifier)
          .markReadLocally(_activeConversationId);
      // 监听消息加载完成，只有有未读时才上报已读到服务器
      ref.listenManual(
        chatProvider((_spaceId, _activeConversationId, _effectiveIsGroup)),
        (prev, next) {
          next.whenData((msgs) {
            if (msgs.isNotEmpty) {
              final maxSeq = msgs
                  .map((m) => m.conversationSeq)
                  .reduce((a, b) => a > b ? a : b);
              if (_pendingReadSeq != null && maxSeq <= _pendingReadSeq!) {
                return;
              }
              _pendingReadSeq = maxSeq;
              // 进入聊天页后立即上报已读（无论 unreadCount 是否为 0，
              // 确保服务端也清零；后台同步拉到更大 seq 时继续补报）
              ref
                  .read(conversationsProvider(_spaceId).notifier)
                  .markRead(_activeConversationId, _effectiveIsGroup, maxSeq);
            }
          });
        },
        fireImmediately: true,
      );
      if (_isCustomerServiceThread) {
        _customerServiceThreadsSub ??= ref.listenManual(
          customerServiceThreadsProvider,
          (_, next) {
            next.whenData((data) {
              final threadId = widget.customerServiceThreadId;
              if (threadId == null || threadId.isEmpty) return;
              final thread = [
                ...data.queueItems,
                ...data.activeItems,
              ].where((item) => item.threadId == threadId).firstOrNull;
              if (thread?.isTerminal == true) {
                _markCustomerServiceThreadEnded(
                  status: thread!.status,
                  showToast: !_isReadOnlyConversation,
                );
              }
            });
          },
        );
      }
    });
  }

  void _captureInitialMentionReadSeq() {
    if (_initialMentionLastReadSeq != null) return;
    final conversation = ref
        .read(conversationsProvider(_spaceId))
        .valueOrNull
        ?.where((c) => c.conversationId == _activeConversationId)
        .firstOrNull;
    if (conversation == null || conversation.unreadCount <= 0) return;
    _initialMentionLastReadSeq = conversation.lastReadSeq;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final space = ref.read(currentSpaceProvider);
    _spaceId = space?.spaceId ?? '';
    if (_isCustomerServiceThread && !_customerServiceDetailLoaded) {
      _customerServiceDetailLoaded = true;
      unawaited(_syncCustomerServiceThread(showError: false));
    }
    // 启动轮询（只启动一次，作为 WebSocket 兜底；客服会话更短，避免漏推后长时间空白）
    _refreshTimer ??= Timer.periodic(
        _isCustomerServiceThread
            ? const Duration(seconds: 10)
            : const Duration(minutes: 5), (_) {
      if (mounted && _spaceId.isNotEmpty) {
        if (_isCustomerServiceThread && !_customerServiceThreadEnded) {
          unawaited(_syncCustomerServiceThread(showError: false));
        }
        ref.invalidate(conversationsProvider(_spaceId));
      }
    });
  }

  CsThread _customerServiceThread() {
    return CsThread(
      threadType: widget.customerServiceThreadType ?? 'direct_customer',
      threadId: widget.customerServiceThreadId ?? '',
      conversationId: widget.conversationId,
      status: 'active',
      title: widget.title,
      avatarUrl: widget.avatarUrl,
      source: widget.customerServiceSource,
    );
  }

  CsThread _customerServiceThreadForDisplay() {
    final detail = _customerServiceDetail;
    final base = _customerServiceThread();
    return detail == null ? base : base.fromDetail(detail);
  }

  String? _usableCustomerServiceTitle(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty || text.startsWith('历史会话')) {
      return null;
    }
    return text;
  }

  String _customerServiceSubtitle(
    CustomerProfileCard? profile,
    CsThread? thread,
  ) {
    final parts = <String>[
      if (_isReadOnlyConversation) '历史会话',
      if (!_isReadOnlyConversation) '在线客服',
      profile?.identity.source ??
          thread?.source ??
          widget.customerServiceSource ??
          '',
      if (_isReadOnlyConversation) _customerServiceStatusLabel(thread?.status),
    ]
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty && item != '--')
        .toList(growable: false);
    return parts.isEmpty ? '在线客服' : parts.join(' · ');
  }

  String _customerServiceStatusLabel(String? status) {
    final normalized = normalizeCustomerServiceThreadStatus(status);
    return switch (normalized) {
      '5' || 'closed_by_visitor' => '访客关闭',
      '6' || 'closed_by_staff' => '客服关闭',
      '7' || 'closed_timeout' => '超时关闭',
      '8' || 'closed_system' => '系统关闭',
      '9' || 'archived' => '已归档',
      _ when normalized.startsWith('closed') => '已结束',
      _ => '',
    };
  }

  bool get _customerServiceThreadEnded =>
      _isCustomerServiceThread && (_customerServiceDetail?.isTerminal ?? false);

  void _markCustomerServiceThreadEnded({
    String status = 'closed',
    bool showToast = true,
  }) {
    if (!_isCustomerServiceThread) return;
    final current = _customerServiceDetail;
    final base = _customerServiceThread();
    final ended = (current ??
            CsThreadDetail(
              threadType: base.threadType,
              threadId: base.threadId,
              conversationId: base.conversationId,
              status: base.status,
              title: base.title,
              avatarUrl: base.avatarUrl,
              customerUserId: base.customerUserId,
              visitorId: base.visitorId,
              assignedStaffUserId: base.assignedStaffUserId,
              assignedStaffDisplayName: base.assignedStaffDisplayName,
              source: base.source,
              assignedAt: base.assignedAt,
              currentResponderType: base.currentResponderType,
              aiStatus: base.aiStatus,
            ))
        .copyWith(status: status);
    if (!mounted) {
      _customerServiceDetail = ended;
      return;
    }
    final wasEnded = _customerServiceThreadEnded;
    setState(() => _customerServiceDetail = ended);
    if (!wasEnded && showToast) {
      AppToast.info(context, '会话已结束');
    }
  }

  bool _shouldShowReceptionBar(CsThread? thread) {
    if (!_isCustomerServiceThread || _isReadOnlyConversation) return false;
    if (thread == null || thread.isQueued || thread.isTerminal) return false;
    return thread.isAiHandled || thread.isManualHandled;
  }

  Future<void> _syncCustomerServiceThread({required bool showError}) async {
    if (!_isCustomerServiceThread || _spaceId.isEmpty) return;
    try {
      final detail = await ref
          .read(customerServiceRepositoryProvider)
          .getThread(_customerServiceThread());
      final wasEnded = _customerServiceThreadEnded;
      if (mounted) {
        setState(() => _customerServiceDetail = detail);
      }
      if (detail.isTerminal &&
          !wasEnded &&
          mounted &&
          !_isReadOnlyConversation) {
        AppToast.info(context, '会话已结束');
      }
      if (detail.messages.isEmpty) return;

      await ChatLocalDataSourceImpl().upsertMessages(
        _spaceId,
        widget.conversationId,
        detail.messages,
      );

      final notifier = ref.read(
          chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
              .notifier);
      for (final message in detail.messages) {
        notifier.appendMessage(message);
      }
    } catch (_) {
      if (showError && mounted) {
        AppToast.error(context, AppLocalizations.of(context).commonLoadFailed);
      }
    }
  }

  Future<void> _handleCustomerServiceTakeover(CsThread thread) async {
    if (_isReceptionActionRunning) return;
    setState(() => _isReceptionActionRunning = true);
    try {
      final detail = await ref
          .read(customerServiceRepositoryProvider)
          .takeoverThread(thread);
      if (!mounted) return;
      setState(() => _customerServiceDetail = detail);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
      AppToast.success(context, '已人工接管');
      unawaited(_syncCustomerServiceThread(showError: false));
    } catch (_) {
      if (mounted) AppToast.error(context, '接管失败，请重试');
    } finally {
      if (mounted) setState(() => _isReceptionActionRunning = false);
    }
  }

  String? get _customerProfileUserId {
    final direct = widget.customerServiceCustomerUserId?.trim();
    if (direct?.isNotEmpty == true) return direct;
    final detailCustomer = _customerServiceDetail?.customerUserId?.trim();
    if (detailCustomer?.isNotEmpty == true) return detailCustomer;
    final peer = widget.peerUserId?.trim();
    if (widget.customerServiceThreadType == 'direct_customer' &&
        peer?.isNotEmpty == true) {
      return peer;
    }
    return null;
  }

  CustomerProfileCard _fallbackCustomerProfileCard() {
    final isRegistered = _customerProfileUserId != null;
    final visitorId = widget.customerServiceVisitorId?.trim().isNotEmpty == true
        ? widget.customerServiceVisitorId!.trim()
        : _customerServiceDetail?.visitorId;
    return CustomerProfileCard(
      identity: CustomerProfileIdentity(
        customerUserId: _customerProfileUserId,
        displayName: widget.title.isNotEmpty ? widget.title : '客户',
        avatarUrl: widget.avatarUrl,
        registered: isRegistered,
        language: 'zh-CN',
        source: widget.customerServiceThreadType == 'temp_session'
            ? (widget.customerServiceSource ?? '在线客服')
            : (widget.customerServiceSource ?? '客户会话'),
      ),
      visitor: !isRegistered
          ? VisitorProfileSummary(
              visitorId: visitorId,
              locale: 'zh-CN',
            )
          : null,
    );
  }

  void _openCustomerProfileSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CustomerProfileSheet(
        customerUserId: _customerProfileUserId,
        customerServiceThreadType: widget.customerServiceThreadType,
        customerServiceThreadId: widget.customerServiceThreadId,
        fallbackCard: _fallbackCustomerProfileCard(),
      ),
    );
  }

  String? _resolveCallTargetUserId() {
    if (_effectiveIsGroup) return null;
    final currentUserId = ref.read(currentSpaceProvider)?.userId;

    final conversations = ref.read(conversationsProvider(_spaceId)).valueOrNull;
    final conversation = conversations
        ?.where((c) => c.conversationId == widget.conversationId)
        .firstOrNull;
    final freshPeerUserId = conversation?.peerUserId;
    if (freshPeerUserId != null &&
        freshPeerUserId.isNotEmpty &&
        freshPeerUserId != currentUserId) {
      debugPrint(
          '[ChatPage] call target from conversation: $freshPeerUserId, routePeer=${widget.peerUserId}');
      return freshPeerUserId;
    }

    final routePeerUserId = widget.peerUserId;
    if (routePeerUserId != null &&
        routePeerUserId.isNotEmpty &&
        routePeerUserId != currentUserId) {
      debugPrint('[ChatPage] call target from route extra: $routePeerUserId');
      return routePeerUserId;
    }

    debugPrint(
        '[ChatPage] call target unavailable: conversation=${widget.conversationId}, routePeer=${widget.peerUserId}, currentUser=$currentUserId');
    return null;
  }

  void _startCall({required bool isVideo}) {
    final targetUserId = _resolveCallTargetUserId();
    final currentUserId = ref.read(currentSpaceProvider)?.userId;
    if (targetUserId == null ||
        targetUserId.isEmpty ||
        targetUserId == currentUserId) {
      AppToast.error(
          context, AppLocalizations.of(context).commonOperationFailed);
      return;
    }
    context.push('/call/$targetUserId', extra: {
      'isVideo': isVideo,
      'title': widget.title,
      'targetUserId': targetUserId,
      'avatarUrl': widget.avatarUrl,
      'callLogChatId': widget.conversationId,
    });
  }

  void _handleCallLogTap(Message message) {
    final mediaMode = message.body.callLog?.mediaMode ?? 'audio';
    final normalized =
        mediaMode.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
    _startCall(isVideo: normalized == 'audiovideo' || normalized == 'video');
  }

  String? _latestPeerText(List<Message>? messages, String currentUserId) {
    if (messages == null || messages.isEmpty) return null;
    for (final message in messages.reversed) {
      if (message.senderUserId == currentUserId) continue;
      if (message.isRecalled || message.status == MessageStatus.deletedLocal) {
        continue;
      }
      final text = message.body.text?.trim();
      if (text != null && text.isNotEmpty) return text;
    }
    return null;
  }

  /// 发送消息成功后本地更新会话列表，不调服务端接口
  void _updateConversationLocally(Message msg, String preview,
      {String messageType = 'text'}) {
    final partial = Conversation(
      conversationId: widget.conversationId,
      type: _effectiveIsGroup
          ? ConversationType.group
          : widget.customerServiceThreadType == 'temp_session'
              ? ConversationType.tempSession
              : ConversationType.direct,
      title: widget.title,
      avatarUrl: widget.avatarUrl,
      lastMessage: LastMessage(
        messageId: msg.messageId,
        text: preview,
        messageType: messageType,
        senderUserId: msg.senderUserId,
        sentAt: msg.sentAt,
      ),
      lastActivityAt: msg.sentAt,
      lastMessageSeq: msg.conversationSeq,
      unreadCount: 0,
    );
    ref
        .read(conversationsProvider(_spaceId).notifier)
        .mergeConversationFromGateway(partial, isSelf: true);
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _groupDetailRefreshTimer?.cancel();
    _customerServiceThreadsSub?.close();
    _scrollController.dispose();
    // 退出时上报已读（微信做法：退出才调服务器接口）
    // 注意：dispose 里不能用 ref，用 fire-and-forget 方式在 deactivate 里处理
    super.dispose();
  }

  @override
  void deactivate() {
    super.deactivate();
  }

  void _onScroll() {
    // reverse: true 时，滚到 maxScrollExtent 表示到达顶部（历史消息方向）
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 80) {
      final notifier = ref.read(
          chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
              .notifier);
      notifier.loadMore();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(0); // reverse: true 时 0 是底部（最新消息）
      }
    });
  }

  void _ensureScrollTargetLoaded(List<Message> messages) {
    final targetId = widget.scrollToMessageId;
    final beforeSeq = widget.scrollBeforeSeq;
    if (_requestedScrollTarget || targetId == null || beforeSeq == null) {
      return;
    }
    if (messages.any((m) => m.messageId == targetId)) {
      _requestedScrollTarget = true;
      return;
    }
    _requestedScrollTarget = true;
    Future.microtask(() {
      if (!mounted) return;
      ref
          .read(
              chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
                  .notifier)
          .loadAround(beforeSeq: beforeSeq);
    });
  }

  void _handleLongPress(
      BuildContext context, Message message, Offset position) {
    if (_multiSelectMode) return;
    HapticFeedback.mediumImpact();
    final selectedMessageId = message.messageId;
    setState(() {
      _selectedMessageId = selectedMessageId;
    });

    final capabilities = messageContextCapabilities(
      message,
      currentUserId: ref.read(currentSpaceProvider)?.userId ?? '',
    );

    // 构建菜单项列表
    final items = <_WxMenuItem>[
      if (capabilities.canMultiSelect)
        _WxMenuItem('multiselect', Icons.check_box_outlined,
            AppLocalizations.of(context).chatMenuMultiSelect),
      if (capabilities.canReply)
        _WxMenuItem('reply', Icons.reply_outlined,
            AppLocalizations.of(context).chatMenuReply),
      if (capabilities.canAiReply)
        const _WxMenuItem('ai_reply', Icons.auto_awesome_outlined, 'AI回复'),
      if (capabilities.canCopy)
        _WxMenuItem('copy', Icons.copy_outlined,
            AppLocalizations.of(context).chatMenuCopy),
      if (capabilities.canVoiceToText)
        _WxMenuItem('voice_to_text', Icons.text_fields_outlined,
            AppLocalizations.of(context).chatMenuVoiceToText),
      if (capabilities.canTranslate)
        _WxMenuItem('translate', Icons.translate_outlined,
            AppLocalizations.of(context).chatMenuTranslate),
      if (capabilities.canSaveToAlbum)
        const _WxMenuItem('save_album', Icons.save_alt_outlined, '保存到相册'),
      if (capabilities.canForward)
        _WxMenuItem('forward', Icons.forward_outlined,
            AppLocalizations.of(context).chatMenuForward),
      if (capabilities.canFavorite)
        _WxMenuItem('favorite', Icons.star_outline,
            AppLocalizations.of(context).chatMenuFavorite),
      if (capabilities.canRecall)
        _WxMenuItem('recall', Icons.undo_outlined,
            AppLocalizations.of(context).chatMenuRecall,
            danger: true),
      if (capabilities.canDelete)
        _WxMenuItem('delete', Icons.delete_outline,
            AppLocalizations.of(context).chatMenuDelete,
            danger: true),
    ];

    // 微信风格：无暗色遮罩，菜单在长按位置附近弹出。
    showGeneralDialog<String>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 150),
      pageBuilder: (ctx, anim, _) => _WxMessageMenu(
        position: position,
        items: items,
        screenSize: MediaQuery.of(context).size,
      ),
      transitionBuilder: (ctx, anim, _, child) => FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.85, end: 1.0).animate(
            CurvedAnimation(parent: anim, curve: Curves.easeOutBack),
          ),
          child: child,
        ),
      ),
    ).then((value) {
      if (value == null || !mounted) return;
      _selectedMessageId = selectedMessageId;
      final messages = ref
              .read(chatProvider(
                  (_spaceId, widget.conversationId, _effectiveIsGroup)))
              .valueOrNull ??
          [];
      switch (value) {
        case 'multiselect':
          _handleEnterMultiSelect();
          break;
        case 'reply':
          _handleReply(messages);
          break;
        case 'ai_reply':
          unawaited(_handleAiReply(messages));
          break;
        case 'copy':
          unawaited(_handleCopy(messages));
          break;
        case 'translate':
          unawaited(_handleTranslate(messages));
          break;
        case 'forward':
          unawaited(_handleForward());
          break;
        case 'save_album':
          unawaited(_handleSaveToAlbum(messages));
          break;
        case 'recall':
          unawaited(_handleRecall(messages));
          break;
        case 'delete':
          unawaited(_handleDelete(messages));
          break;
        case 'voice_to_text':
          final msg = _findSelectedMessage(messages);
          if (msg != null) unawaited(_handleVoiceToText(msg));
          break;
        case 'favorite':
          unawaited(_handleFavorite(messages));
          break;
      }
    });
  }

  Message? _findSelectedMessage(List<Message> messages) {
    final selectedMessageId = _selectedMessageId;
    if (selectedMessageId == null) return null;
    for (final message in messages) {
      if (message.messageId == selectedMessageId) return message;
    }
    return null;
  }

  Future<void> _handleCopy(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    final text = msg?.body.text;
    if (text == null || text.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    AppToast.success(context, AppLocalizations.of(context).commonCopied);
  }

  Future<void> _handleAiReply(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    final contextText = msg?.body.text?.trim();
    if (contextText == null || contextText.isEmpty) return;
    final selected = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _MessageAiReplySheet(contextText: contextText),
    );
    if (selected == null || !mounted) return;
    setState(() {
      _externalInsertText = selected;
      _externalInsertToken++;
    });
  }

  /// 撤回消息（调用服务端 API，2分钟内有效）
  Future<void> _handleRecall(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    if (msg == null) return;
    final msgId = msg.messageId;
    // 检查是否在 2 分钟内
    final elapsed = DateTime.now().difference(msg.sentAt);
    if (elapsed.inMinutes >= 2) {
      AppToast.info(context, AppLocalizations.of(context).chatRecallTimeout);
      return;
    }
    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);
    try {
      await ref
          .read(conversationActionsControllerProvider)
          .recallMessage(msgId);
      notifier.markRecalled(msgId);
      ref.invalidate(conversationsProvider(_spaceId));
      if (mounted) {
        AppToast.success(
            context, AppLocalizations.of(context).chatRecallSuccess);
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(context, AppLocalizations.of(context).chatRecallFailed);
      }
    }
  }

  Future<void> _handleDelete(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    if (msg == null) return;
    final msgId = msg.messageId;
    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);

    if (!msg.status.isServerUsable) {
      notifier.deleteMessageLocally(msgId);
      return;
    }

    try {
      await ref
          .read(conversationActionsControllerProvider)
          .deleteMessage(msgId);
      notifier.deleteMessageLocally(msgId);
      ref.invalidate(conversationsProvider(_spaceId));
    } catch (_) {
      if (mounted) {
        AppToast.error(
            context, AppLocalizations.of(context).friendDeleteFailed);
      }
    }
  }

  Future<void> _handleFavorite(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    if (msg == null || msg.isRecalled || !msg.status.isServerUsable) {
      return;
    }

    try {
      await ref.read(conversationActionsControllerProvider).addFavorite(
            messageId: msg.messageId,
            conversationId: msg.conversationId.isNotEmpty
                ? msg.conversationId
                : widget.conversationId,
          );
      ref.invalidate(favoritesProvider);
      ref.invalidate(favoritesSummaryProvider);
      if (mounted) {
        AppToast.success(
          context,
          AppLocalizations.of(context).chatFavoriteSuccess,
        );
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(
            context, AppLocalizations.of(context).chatFavoriteFailed);
      }
    }
  }

  Future<void> _handleSaveToAlbum(List<Message> messages) async {
    final msg = _findSelectedMessage(messages);
    if (msg == null || msg.isRecalled || !msg.status.isServerUsable) {
      return;
    }
    final resource = switch (msg.type) {
      MessageType.image => msg.body.image,
      MessageType.video => msg.body.video,
      _ => null,
    };
    if (resource == null || resource.url.trim().isEmpty) return;

    try {
      final fileName = _safeGalleryFileName(resource, msg.type);
      final mimeType = resource.mimeType ?? _defaultMimeType(msg.type);
      final bytes = await _loadMediaBytes(resource);
      final result = await _mediaSaver.saveMedia(
        bytes: bytes,
        fileName: fileName,
        mimeType: mimeType,
        isVideo: msg.type == MessageType.video,
      );
      if (!mounted) return;
      AppToast.success(context, result.message);
    } catch (error) {
      debugPrint('[ChatPage] save media to album failed: $error');
      if (!mounted) return;
      AppToast.error(
        context,
        AppLocalizations.of(context).commonOperationFailed,
      );
    }
  }

  Future<List<int>> _loadMediaBytes(MediaResource resource) async {
    final rawUrl = resource.url.trim();
    if (_isLocalMediaPath(rawUrl)) {
      return readLocalFileBytes(localPathFromUriOrPath(rawUrl));
    }

    final url = _resolveMediaUrl(rawUrl);
    final response = await ref.read(dioProvider).get<List<int>>(
          url,
          options:
              dio_package.Options(responseType: dio_package.ResponseType.bytes),
        );
    final data = response.data;
    if (data == null || data.isEmpty) {
      throw StateError('Media response is empty');
    }
    return data;
  }

  bool _isLocalMediaPath(String url) {
    final uri = Uri.tryParse(url);
    if (uri != null && uri.scheme == 'file') return true;
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      return false;
    }
    return !url.startsWith('/media') &&
        !url.startsWith('/api') &&
        !url.startsWith('/uploads') &&
        !url.startsWith('/files');
  }

  String _resolveMediaUrl(String url) {
    final parsed = Uri.tryParse(url);
    if (parsed != null && parsed.hasScheme) return url;
    return Uri.parse(app_http.HttpClient.baseUrl).resolve(url).toString();
  }

  String _safeGalleryFileName(MediaResource resource, MessageType type) {
    final original = resource.fileName?.trim();
    final fallback =
        type == MessageType.video ? 'lpp_video.mp4' : 'lpp_image.jpg';
    final raw = original?.isNotEmpty == true ? original! : fallback;
    final sanitized = raw.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
    if (p.extension(sanitized).isNotEmpty) return sanitized;
    return '$sanitized${type == MessageType.video ? '.mp4' : '.jpg'}';
  }

  String _defaultMimeType(MessageType type) {
    return type == MessageType.video ? 'video/mp4' : 'image/jpeg';
  }

  void _handleReply(List<Message> messages) {
    final msg = _findSelectedMessage(messages);
    if (msg == null) return;
    final text = _messagePreviewForAction(msg);
    setState(() {
      _replyingTo = (
        id: msg.messageId,
        text: text,
        sender:
            msg.senderUserId == (ref.read(currentSpaceProvider)?.userId ?? '')
                ? AppLocalizations.of(context).chatSelf
                : _displayNameForUser(msg.senderUserId),
      );
    });
  }

  String _displayNameForUser(String userId) {
    if (userId.isEmpty) return widget.title;
    final isGroup = widget.isGroup || _resolvedIsGroup;
    if (isGroup) {
      final groupMembers =
          ref.read(groupMembersProvider(_activeConversationId)).valueOrNull;
      for (final member in groupMembers ?? const []) {
        if (member.userId == userId && member.displayName.trim().isNotEmpty) {
          return member.displayName.trim();
        }
      }
    }
    final contacts = [
      ...?ref.read(tenantMembersProvider).valueOrNull,
      ...?ref.read(friendsProvider).valueOrNull,
    ];
    for (final contact in contacts) {
      if (contact.userId == userId && contact.displayName.trim().isNotEmpty) {
        return contact.displayName.trim();
      }
    }
    return isGroup
        ? AppLocalizations.of(context).groupRoleMember
        : widget.title;
  }

  String? _avatarUrlForUser(String userId) {
    if (userId.isEmpty) return null;
    if (widget.isGroup || _resolvedIsGroup) {
      final groupMembers =
          ref.read(groupMembersProvider(_activeConversationId)).valueOrNull;
      for (final member in groupMembers ?? const []) {
        if (member.userId == userId && member.avatarUrl?.isNotEmpty == true) {
          return member.avatarUrl;
        }
      }
    }
    final contacts = [
      ...?ref.read(tenantMembersProvider).valueOrNull,
      ...?ref.read(friendsProvider).valueOrNull,
    ];
    for (final contact in contacts) {
      if (contact.userId == userId && contact.avatarUrl?.isNotEmpty == true) {
        return contact.avatarUrl;
      }
    }
    return null;
  }

  ({String label, String shortLabel, IdentityBadgeTone tone})? _identityForUser(
      String userId) {
    final space = ref.read(currentSpaceProvider);
    if (space == null || space.isPersonal) return null;
    if (userId.isEmpty) return null;
    final contacts = [
      ...?ref.read(tenantMembersProvider).valueOrNull,
      ...?ref.read(friendsProvider).valueOrNull,
    ];
    for (final contact in contacts) {
      if (contact.userId != userId) continue;
      final identity = identityBadgeFor(
        userType: contact.userType,
        customerTag: contact.customerTag,
      );
      if (identity != null) return identity;
      if (space.isCustomer && contact.userType == 2) {
        return identityBadgeFor(userType: 2, customerTag: '客服');
      }
      return null;
    }
    return null;
  }

  String _messagePreviewForAction(Message msg) {
    final text = msg.body.text?.trim();
    if (text != null && text.isNotEmpty) return text;

    final l10n = AppLocalizations.of(context);
    return switch (msg.type) {
      MessageType.image => l10n.chatImageMessage,
      MessageType.voice => l10n.chatVoiceMessage,
      MessageType.video => l10n.chatVideoMessage,
      MessageType.file => msg.body.file?.fileName?.trim().isNotEmpty == true
          ? msg.body.file!.fileName!.trim()
          : l10n.chatFileMessage,
      MessageType.contactCard =>
        msg.body.contactCard?.displayName.trim().isNotEmpty == true
            ? msg.body.contactCard!.displayName.trim()
            : l10n.chatContactCardMessage,
      MessageType.callLog => _callLogPreview(msg.body.callLog),
      MessageType.location =>
        msg.body.location?.title?.trim().isNotEmpty == true
            ? msg.body.location!.title!.trim()
            : l10n.chatLocationMessage,
      MessageType.event => l10n.chatGenericMessage,
      MessageType.text || MessageType.markdown => l10n.chatGenericMessage,
    };
  }

  String _callLogPreview(CallLogDto? log) {
    if (log == null) return AppLocalizations.of(context).chatCallLogMessage;
    final isVideo = CallDisplay.isVideoMediaMode(log.mediaMode);
    final display = CallDisplay.ended(
      isVideo: isVideo,
      isCaller: log.isCaller,
      durationSeconds: log.durationSeconds,
      endReason: log.endReason,
    );
    final status = log.durationSeconds > 0 && display.detail != null
        ? '${display.status} ${display.detail}'
        : display.status;
    return '${CallDisplay.mediaTitle(isVideo: isVideo)} $status';
  }

  Future<void> _handleTranslate(List<Message> messages) async {
    if (messages.isEmpty || _selectedMessageId == null) return;
    final selectedMessageId = _selectedMessageId!;
    Message? selectedMessage;
    for (final message in messages) {
      if (message.messageId == selectedMessageId) {
        selectedMessage = message;
        break;
      }
    }
    final msg = selectedMessage;
    if (msg == null) return;

    if (msg.translation != null && msg.translation!.isNotEmpty) {
      // 已有翻译，移除
      _updateChatMessage(
        selectedMessageId,
        (current) => current.copyWith(translation: ''),
        fallback: msg,
      );
      return;
    }

    await _translateMessage(msg);
  }

  Future<void> _handleQuickTranslate(
    List<Message> messages,
    String currentUserId,
  ) async {
    if (_isQuickTranslating) return;
    final candidates = messages.reversed
        .where((message) =>
            _canTranslateMessage(message) &&
            message.messageId.isNotEmpty &&
            message.status != MessageStatus.deletedLocal &&
            !message.isRecalled &&
            !message.isTranslating &&
            (message.translation == null || message.translation!.isEmpty) &&
            (currentUserId.isEmpty || message.senderUserId != currentUserId))
        .take(20)
        .toList();

    if (candidates.isEmpty) {
      if (mounted) {
        AppToast.info(context, '暂无对方可翻译的消息');
      }
      return;
    }

    if (mounted) setState(() => _isQuickTranslating = true);
    var translatedCount = 0;
    try {
      for (final message in candidates) {
        if (!mounted) break;
        final translated = await _translateMessage(
          message,
          showToastOnError: false,
        );
        if (translated) translatedCount += 1;
      }
    } finally {
      if (mounted) setState(() => _isQuickTranslating = false);
    }

    if (!mounted) return;
    if (translatedCount > 0) {
      AppToast.success(context, '已翻译 $translatedCount 条消息');
    } else {
      AppToast.error(
        context,
        AppLocalizations.of(context).chatTranslateFailed,
      );
    }
  }

  bool _canTranslateMessage(Message message) =>
      message.type == MessageType.text || message.type == MessageType.markdown;

  void _updateChatMessage(
    String messageId,
    Message Function(Message current) update, {
    required Message fallback,
  }) {
    final notifier = ref.read(
        chatProvider((_spaceId, _activeConversationId, _effectiveIsGroup))
            .notifier);
    final currentMessages = ref
            .read(chatProvider(
                (_spaceId, _activeConversationId, _effectiveIsGroup)))
            .valueOrNull ??
        const <Message>[];
    final current = currentMessages.firstWhere(
      (message) => message.messageId == messageId,
      orElse: () => fallback,
    );
    notifier.updateMessage(messageId, update(current));
  }

  Future<bool> _translateMessage(
    Message msg, {
    bool showToastOnError = true,
  }) async {
    if (!_canTranslateMessage(msg) || msg.isTranslating) return false;

    _updateChatMessage(
      msg.messageId,
      (current) => current.copyWith(isTranslating: true),
      fallback: msg,
    );

    final targetLanguage =
        translationTargetLanguageForLocale(ref.read(localeProvider));
    try {
      final translated =
          await ref.read(messageTranslationControllerProvider).translateMessage(
                messageId: msg.messageId,
                targetLanguage: targetLanguage,
              );
      if (translated == null) {
        _updateChatMessage(
          msg.messageId,
          (current) => current.copyWith(isTranslating: false),
          fallback: msg,
        );
        if (mounted && showToastOnError) {
          AppToast.error(
            context,
            AppLocalizations.of(context).chatTranslateFailed,
          );
        }
        return false;
      }
      _updateChatMessage(
        msg.messageId,
        (current) => current.copyWith(
          translation: translated,
          isTranslating: false,
        ),
        fallback: msg,
      );
      return true;
    } catch (e) {
      _updateChatMessage(
        msg.messageId,
        (current) => current.copyWith(isTranslating: false),
        fallback: msg,
      );
      if (mounted && showToastOnError) {
        // 检查是否是服务端未配置翻译服务
        String errMsg = AppLocalizations.of(context).chatTranslateFailed;
        if (e.toString().contains('TRANSLATE_NOT_CONFIGURED')) {
          errMsg = AppLocalizations.of(context).chatTranslateNotConfigured;
        }
        AppToast.error(context, errMsg);
      }
      return false;
    }
  }

  /// 语音消息转文字
  Future<void> _handleVoiceToText(Message msg) async {
    if (msg.messageId.isEmpty || msg.type != MessageType.voice) {
      if (mounted) {
        AppToast.error(
          context,
          AppLocalizations.of(context).chatVoiceToTextFailed,
        );
      }
      return;
    }

    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);

    Message latestMessage() {
      if (!mounted) return msg;
      final currentMessages = ref
              .read(chatProvider(
                  (_spaceId, widget.conversationId, _effectiveIsGroup)))
              .valueOrNull ??
          const <Message>[];
      for (final message in currentMessages) {
        if (message.messageId == msg.messageId) return message;
      }
      return msg;
    }

    void updateVoiceMessage(Message Function(Message current) update) {
      notifier.updateMessage(msg.messageId, update(latestMessage()));
    }

    if (msg.isTranslating) return;
    updateVoiceMessage((current) => current.copyWith(isTranslating: true));

    try {
      final text = await ref
          .read(conversationActionsControllerProvider)
          .voiceToText(msg.messageId);
      if (text == null) {
        debugPrint('[ChatPage] voice-to-text empty response');
        updateVoiceMessage((current) => current.copyWith(isTranslating: false));
        if (mounted) {
          AppToast.error(
            context,
            AppLocalizations.of(context).chatVoiceToTextFailed,
          );
        }
        return;
      }
      updateVoiceMessage(
        (current) => current.copyWith(
          translation: text,
          isTranslating: false,
        ),
      );
    } catch (error) {
      debugPrint('[ChatPage] voice-to-text failed: $error');
      updateVoiceMessage((current) => current.copyWith(isTranslating: false));
      if (mounted) {
        AppToast.error(
          context,
          AppLocalizations.of(context).chatVoiceToTextFailed,
        );
      }
    }
  }

  Future<Message> _sendChatMessage({
    required MessageType type,
    required MessageBody body,
    String? clientMsgId,
    String? replyToMessageId,
    List<Mention>? mentions,
    required void Function(Message message) onOptimisticInsert,
    required void Function(String clientMsgId, Message updated) onMessageUpdate,
  }) async {
    if (_isReadOnlyConversation) {
      throw const ServerError(
        code: 'CHAT_READ_ONLY',
        message: '当前为会话查看模式，不能发言',
      );
    }
    if (_customerServiceThreadEnded) {
      throw const ServerError(
        code: 'TEMP_SESSION_CLOSED',
        message: '会话已结束，不能继续发送消息',
      );
    }
    if (_customerServiceRequiresManualEntry) {
      throw const ServerError(
        code: 'TEMP_SESSION_NOT_CLAIMED',
        message: '请先接入或人工接管后再回复',
      );
    }
    if (_isCustomerServiceThread) {
      return _sendCustomerServiceMessage(
        type: type,
        body: body,
        clientMsgId: clientMsgId,
        replyToMessageId: replyToMessageId,
        onOptimisticInsert: onOptimisticInsert,
        onMessageUpdate: onMessageUpdate,
      );
    }

    final conversationId = await _ensureDirectConversationForSend();
    final isGroup = _effectiveIsGroup;
    final useCase = ref
        .read(sendMessageUseCaseProvider((_spaceId, conversationId, isGroup)));
    return useCase.execute(
      conversationId: conversationId,
      isGroup: isGroup,
      type: type,
      body: body,
      clientMsgId: clientMsgId,
      replyToMessageId: replyToMessageId,
      mentions: mentions,
      onOptimisticInsert: onOptimisticInsert,
      onMessageUpdate: onMessageUpdate,
    );
  }

  Future<bool> _sendTextMessage({
    required String text,
    String? replyToMessageId,
    List<Mention>? mentions,
    bool clearReplyOnSuccess = false,
  }) async {
    var sent = false;
    try {
      final sendConversationId = await _ensureDirectConversationForSend();
      if (!mounted) return false;
      final notifier = ref.read(
          chatProvider((_spaceId, sendConversationId, _effectiveIsGroup))
              .notifier);
      await _sendChatMessage(
        type: MessageType.text,
        body: MessageBody(text: text),
        replyToMessageId: replyToMessageId,
        mentions: _effectiveIsGroup ? mentions : null,
        onOptimisticInsert: (msg) {
          notifier.optimisticInsert(msg);
          _scrollToBottom();
        },
        onMessageUpdate: (clientMsgId, updated) {
          notifier.updateMessage(clientMsgId, updated);
          if (updated.status.isServerUsable) {
            _updateConversationLocally(updated, text);
          }
        },
      );
      sent = true;
    } catch (e) {
      _handleSendError(e);
    }
    if (sent && clearReplyOnSuccess && mounted) {
      setState(() => _replyingTo = null);
    }
    return sent;
  }

  Future<bool> _scheduleTextMessage(String text, DateTime scheduledAt) async {
    final now = DateTime.now();
    if (!scheduledAt.isAfter(now.add(const Duration(minutes: 1)))) {
      AppToast.error(context, '请选择至少 1 分钟后的时间');
      return false;
    }
    if (scheduledAt.isAfter(now.add(const Duration(days: 14)))) {
      AppToast.error(context, '定时发送最多支持 14 天内');
      return false;
    }
    try {
      await ref
          .read(scheduledMessageRepositoryProvider(_spaceId))
          .createScheduledMessage(
            conversationId: _activeConversationId,
            isGroup: _effectiveIsGroup,
            type: MessageType.text,
            body: MessageBody(text: text),
            scheduledAt: scheduledAt,
            replyToMessageId: _replyingTo?.id,
          );
      if (!mounted) return true;
      AppToast.success(
        context,
        '已设置定时发送：${_formatScheduledMessageTime(scheduledAt)}',
      );
      return true;
    } catch (error) {
      if (!mounted) return false;
      AppToast.error(context, _friendlyErrorMessage(error));
      return false;
    }
  }

  String _friendlyErrorMessage(Object error) {
    if (error is ServerError) return error.message;
    if (error is NetworkError) return error.message;
    if (error is AuthError) return '登录状态已失效，请重新登录';
    return '定时发送设置失败';
  }

  String _formatScheduledMessageTime(DateTime dateTime) {
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    final weekday = weekdays[dateTime.weekday - 1];
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '${dateTime.month}月${dateTime.day}日（$weekday）$hour:$minute';
  }

  Future<String> _ensureDirectConversationForSend() async {
    final chatId =
        await ref.read(directChatEntryControllerProvider).ensureConversationId(
              isPendingDirectChat: _isPendingDirectChat,
              activeConversationId: _activeConversationId,
              peerUserId: widget.peerUserId,
            );
    if (mounted) {
      setState(() => _createdConversationId = chatId);
    } else {
      _createdConversationId = chatId;
    }
    if (_spaceId.isNotEmpty) {
      ref.invalidate(conversationsProvider(_spaceId));
    }
    return chatId;
  }

  void _handleSendError(Object error, {bool showSnack = true}) {
    AppDiagnostics.instance.error('chat.send', 'message send failed', context: {
      'conversationId': widget.conversationId,
      'isGroup': _effectiveIsGroup,
      'error': error.toString(),
      if (error is ServerError) 'code': error.code,
      if (error is ServerError) 'requestId': error.requestId,
    });
    if (!mounted) return;

    final code = error is ServerError
        ? error.code
        : error is MessageSendFailure
            ? error.code ?? error.message
            : error.toString();
    if (code.contains('TEMP_SESSION_CLOSED')) {
      _markCustomerServiceThreadEnded(showToast: false);
      if (showSnack) AppToast.info(context, '会话已结束，不能继续发送消息');
      return;
    }
    if (code.contains('MSG_MEMBER_FORBIDDEN')) {
      setState(() => _notFriend = true);
      return;
    }
    if (!showSnack) return;

    final l10n = AppLocalizations.of(context);
    final message = switch (code) {
      'MSG_GROUP_MUTED' => l10n.chatMutedFullNotice,
      'MSG_MEMBER_MUTED' => '你已被禁言，暂时无法发言',
      'MSG_USER_MUTED' => '当前账号已被禁言，暂时无法发言',
      'DIRECT_MESSAGE_BLOCKED_BY_MODERATION' => '内容不符合规范，已禁止发送',
      'GROUP_MESSAGE_BLOCKED_BY_MODERATION' => '内容不符合规范，已禁止发送',
      'TEMP_SESSION_SENSITIVE_BLOCKED' => '内容不符合规范，已禁止发送',
      'MODERATION_BLOCKED' => '内容不符合规范，已禁止发送',
      'INVALID_OPERATION' when _effectiveIsGroup =>
        '群消息发送失败，请稍后重试（INVALID_OPERATION）',
      _ => l10n.chatSendFailed,
    };

    AppToast.error(context, message);
  }

  Future<Message> _sendCustomerServiceMessage({
    required MessageType type,
    required MessageBody body,
    String? clientMsgId,
    String? replyToMessageId,
    required void Function(Message message) onOptimisticInsert,
    required void Function(String clientMsgId, Message updated) onMessageUpdate,
  }) async {
    if (_customerServiceThreadEnded) {
      throw const ServerError(
        code: 'TEMP_SESSION_CLOSED',
        message: '会话已结束，不能继续发送消息',
      );
    }
    if (_customerServiceRequiresManualEntry) {
      throw const ServerError(
        code: 'TEMP_SESSION_NOT_CLAIMED',
        message: '请先接入或人工接管后再回复',
      );
    }
    final currentUserId = ref.read(currentSpaceProvider)?.userId ?? '';
    final currentSpaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
    final thread = _customerServiceThread();
    final repository = CustomerServiceChatRepositoryAdapter(
      customerServiceRepository: ref.read(customerServiceRepositoryProvider),
      mediaRemote: ChatRemoteDataSourceImpl(ref.read(dioProvider)),
      threadType: thread.threadType,
      threadId: thread.threadId,
      senderUserId: currentUserId,
    );
    final useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: currentUserId,
      failureMapper: mapAppErrorToMessageSendFailure,
      sendPolicy: const MessageSendPolicy(
        context: MessageSendPolicyContext.enterpriseEmployee,
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
          spaceId: currentSpaceId,
          userId: currentUserId,
          clientMsgId: clientMsgId,
          conversationId: conversationId,
          isGroup: false,
          messageType: GatewayEventHandler.messageTypeToApiString(type),
          body: body.toLocalJson(),
          mentions: mentions,
          threadType: thread.threadType,
          threadId: thread.threadId,
          createdAt: DateTime.now(),
        ));
      },
    );

    try {
      final sent = await useCase.execute(
        conversationId: widget.conversationId,
        isGroup: false,
        type: type,
        body: body,
        clientMsgId: clientMsgId,
        replyToMessageId: replyToMessageId,
        onOptimisticInsert: onOptimisticInsert,
        onMessageUpdate: onMessageUpdate,
      );
      await ChatLocalDataSourceImpl().upsertMessage(
        _spaceId,
        widget.conversationId,
        sent,
      );
      return sent;
    } catch (e) {
      if (_isCustomerServiceTerminalWriteError(e)) {
        _markCustomerServiceThreadEnded(showToast: false);
      }
      rethrow;
    }
  }

  bool _isCustomerServiceTerminalWriteError(Object error) {
    if (!_isCustomerServiceThread) return false;
    if (error is dio_package.DioException) {
      final statusCode = error.response?.statusCode;
      final data = error.response?.data;
      final code = data is Map ? data['code']?.toString() : '';
      return statusCode == 401 ||
          code == 'TEMP_SESSION_CLOSED' ||
          code == 'TEMP_SESSION_ENDED' ||
          code == 'TEMP_SESSION_NOT_ACTIVE' ||
          code == 'INVALID_SESSION_STATUS';
    }
    if (error is AuthError) return true;
    if (error is ServerError) {
      return error.statusCode == 401 ||
          {
            'TEMP_SESSION_CLOSED',
            'TEMP_SESSION_ENDED',
            'TEMP_SESSION_NOT_ACTIVE',
            'INVALID_SESSION_STATUS',
          }.contains(error.code);
    }
    return false;
  }

  /// 发送文件消息
  Future<void> _handleSendFile(
      String filePath, String fileName, String mimeType, int sizeBytes) async {
    try {
      final sendConversationId = await _ensureDirectConversationForSend();
      if (!mounted) return;
      final clientMsgId = _uuid.v4();
      final localized = await const OutgoingMediaLocalizer(
        runtime: MediaFileRuntime(),
      ).localize(
        spaceId: _spaceId,
        conversationId: sendConversationId,
        messageId: clientMsgId,
        variant: MediaVariant.attachment,
        sourcePath: filePath,
        fileName: fileName,
      );
      final notifier = ref.read(
          chatProvider((_spaceId, sendConversationId, _effectiveIsGroup))
              .notifier);
      await _sendChatMessage(
        type: MessageType.file,
        clientMsgId: clientMsgId,
        body: MessageBody(
          file: MediaResource(
            url: localized.localPath,
            fileName: fileName,
            mimeType: mimeType,
            sizeBytes:
                localized.sizeBytes > 0 ? localized.sizeBytes : sizeBytes,
            localPreviewUrl: localized.localPath,
          ),
        ),
        onOptimisticInsert: (message) {
          notifier.optimisticInsert(message);
          _scrollToBottom();
        },
        onMessageUpdate: (clientMsgId, updated) {
          notifier.updateMessage(clientMsgId, updated);
          if (updated.status.isServerUsable) {
            _updateConversationLocally(
              updated,
              fileName,
              messageType: 'file',
            );
          }
        },
      );
    } catch (e) {
      if (mounted) {
        if (e is ServerError || e is MessageSendFailure) {
          _handleSendError(e);
        } else {
          AppToast.error(
            context,
            AppLocalizations.of(context).chatFileUploadFailed,
          );
        }
      }
    }
  }

  Future<void> _handleSendMedia(List<ChatPickedMedia> mediaItems) async {
    if (mediaItems.isEmpty) return;
    final l10n = AppLocalizations.of(context);
    final imagePreview = l10n.chatImageMessage;
    final videoPreview = l10n.chatVideoMessage;
    final uploadFailedText = l10n.chatImageUploadUnsupported;
    try {
      final sendConversationId = await _ensureDirectConversationForSend();
      if (!mounted) return;
      final notifier = ref.read(
        chatProvider((_spaceId, sendConversationId, _effectiveIsGroup))
            .notifier,
      );
      await sendChatPickedMediaBatch(mediaItems, (item) async {
        final clientMsgId = _uuid.v4();
        final localized = await const OutgoingMediaLocalizer(
          runtime: MediaFileRuntime(),
        ).localize(
          spaceId: _spaceId,
          conversationId: sendConversationId,
          messageId: clientMsgId,
          variant:
              item.isVideo ? MediaVariant.videoSource : MediaVariant.original,
          sourcePath: item.path,
          fileName: item.fileName,
        );
        final sizeBytes = localized.sizeBytes > 0
            ? localized.sizeBytes
            : item.sizeBytes ?? await localFileLength(item.path);
        final localPosterUrl = item.isVideo
            ? await generateLocalVideoPoster(localized.localPath)
            : null;
        final mediaDimensions = item.isImage
            ? await readLocalImageDimensions(localized.localPath)
            : await readLocalImageDimensions(localPosterUrl);
        final resource = MediaResource(
          url: localized.localPath,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: sizeBytes,
          width: mediaDimensions?.$1,
          height: mediaDimensions?.$2,
          localPreviewUrl: localized.localPath,
          localPosterUrl: localPosterUrl,
        );
        final type = item.isVideo ? MessageType.video : MessageType.image;
        final body = item.isVideo
            ? MessageBody(video: resource)
            : MessageBody(image: resource);
        await _sendChatMessage(
          type: type,
          body: body,
          clientMsgId: clientMsgId,
          replyToMessageId: _replyingTo?.id,
          onOptimisticInsert: (msg) {
            notifier.optimisticInsert(msg);
            _scrollToBottom();
          },
          onMessageUpdate: (clientMsgId, updated) {
            notifier.updateMessage(clientMsgId, updated);
            if (updated.status.isServerUsable) {
              _updateConversationLocally(
                updated,
                item.isVideo ? videoPreview : imagePreview,
                messageType: item.isVideo ? 'video' : 'image',
              );
            }
          },
        );
      });
      if (mounted) setState(() => _replyingTo = null);
    } catch (e) {
      if (!mounted) return;
      if (e is ServerError) {
        _handleSendError(e);
      } else {
        AppToast.show(
          context,
          uploadFailedText,
          type: AppToastType.error,
          duration: const Duration(seconds: 3),
        );
      }
    }
  }

  Future<void> _handleSendLocation() async {
    if (shouldBlockChatSendAction(
      ChatSendAction.location,
      isSingleActionRunning: _isSending,
    )) {
      return;
    }
    if (!_locationSendingEnabled) {
      AppToast.comingSoon(context);
      return;
    }
    final location = await Navigator.of(context).push<LocationDto>(
      MaterialPageRoute(builder: (_) => const _LocationPickerPage()),
    );
    if (location == null || !mounted) return;

    setState(() => _isSending = true);
    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);
    final previewTitle = location.title?.trim().isNotEmpty == true
        ? location.title!.trim()
        : AppLocalizations.of(context).chatLocationMessage;

    try {
      await _sendChatMessage(
        type: MessageType.location,
        body: MessageBody(location: location),
        onOptimisticInsert: (msg) {
          notifier.optimisticInsert(msg);
          _scrollToBottom();
        },
        onMessageUpdate: (clientMsgId, updated) {
          notifier.updateMessage(clientMsgId, updated);
          if (updated.status.isServerUsable) {
            _updateConversationLocally(
              updated,
              previewTitle,
              messageType: 'location',
            );
          }
        },
      );
    } catch (e) {
      _handleSendError(e);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  /// 发送失败感叹号点击：弹出「重发 / 删除」ActionSheet（参考微信）
  void _showFailedMessageSheet(BuildContext context, Message message) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  children: [
                    if (message.failureReason?.isNotEmpty == true) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                        child: Text(
                          '发送失败：${message.failureReason}',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      const Divider(height: 1, indent: 0),
                    ],
                    ListTile(
                      title: Text(
                        AppLocalizations.of(context).chatResend,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 17,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        _retryMessage(message);
                      },
                    ),
                    const Divider(height: 1, indent: 0),
                    ListTile(
                      title: Text(
                        AppLocalizations.of(context).commonDelete,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 17, color: Colors.red),
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        final notifier = ref.read(chatProvider((
                          _spaceId,
                          widget.conversationId,
                          _effectiveIsGroup
                        )).notifier);
                        notifier.deleteMessageLocally(message.messageId);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: ListTile(
                  title: Text(
                    AppLocalizations.of(context).commonCancel,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface),
                  ),
                  onTap: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 重发失败消息
  Future<void> _retryMessage(Message message) async {
    if (shouldBlockChatSendAction(
      ChatSendAction.retryFailed,
      isSingleActionRunning: _isSending,
    )) {
      return;
    }
    setState(() => _isSending = true);
    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);
    // 先把消息状态改回 sending
    notifier.updateMessage(
      message.messageId,
      message.copyWith(status: MessageStatus.sending),
    );
    try {
      await _sendChatMessage(
        type: message.type,
        body: message.body,
        clientMsgId: message.clientMsgId ?? message.messageId,
        onOptimisticInsert: (_) {}, // 不重复插入，已有消息
        onMessageUpdate: (clientMsgId, updated) {
          notifier.updateMessage(message.messageId, updated);
          if (updated.status.isServerUsable) {
            _updateConversationLocally(updated, updated.body.text ?? '');
          }
        },
      );
    } catch (e) {
      // 重发失败，恢复 failed 状态
      notifier.updateMessage(
        message.messageId,
        message.copyWith(
          status:
              e is ServerError ? MessageStatus.rejected : MessageStatus.failed,
          failureReason: _sendFailureReason(e),
        ),
      );
      _handleSendError(e);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  String _sendFailureReason(Object error) {
    if (error is ServerError) {
      return error.code.isNotEmpty ? error.code : error.message;
    }
    if (error is AuthError) return error.code;
    if (error is NetworkError) return error.message;
    return error.toString();
  }

  /// 转发消息：打开会话选择页面，选中后调用 POST /messages/forward
  Future<void> _handleForward({Iterable<String>? messageIds}) async {
    final sourceIds = messageIds ??
        (_selectedMessageId == null ? const <String>[] : [_selectedMessageId!]);
    final forwardIds = sourceIds.where((id) => id.isNotEmpty).toList();
    if (forwardIds.isEmpty) return;
    if (!_allMessagesCanForward(forwardIds)) {
      if (mounted) {
        AppToast.error(
          context,
          AppLocalizations.of(context).chatForwardFailed,
        );
      }
      return;
    }

    // 获取当前空间会话列表供选择
    final convs = ref.read(conversationsProvider(_spaceId)).valueOrNull ?? [];
    if (convs.isEmpty) {
      if (mounted) {
        AppToast.info(
            context, AppLocalizations.of(context).chatNoConversations);
      }
      return;
    }

    // 打开转发选择页面（全屏页面，不用底部弹窗）
    final target = await Navigator.of(context).push<Conversation>(
      MaterialPageRoute(
        builder: (_) => _ForwardSelectPage(conversations: convs),
      ),
    );
    if (target == null || !mounted) return;

    try {
      await ref.read(conversationActionsControllerProvider).forwardMessages(
            sourceMessageIds: forwardIds,
            targetConversationId: target.conversationId,
          );
      ref.invalidate(conversationsProvider(_spaceId));
      ref.invalidate(chatProvider((
        _spaceId,
        target.conversationId,
        target.type == ConversationType.group,
      )));
      if (_multiSelectMode) _handleExitMultiSelect();
      if (mounted) {
        AppToast.show(
          context,
          AppLocalizations.of(context).chatForwardSuccess,
          type: AppToastType.success,
          duration: const Duration(milliseconds: 900),
        );
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(
          context,
          AppLocalizations.of(context).chatForwardFailed,
        );
      }
    }
  }

  bool _allMessagesCanForward(List<String> messageIds) {
    final messages = ref
            .read(chatProvider(
                (_spaceId, widget.conversationId, _effectiveIsGroup)))
            .valueOrNull ??
        const <Message>[];
    final byId = {for (final message in messages) message.messageId: message};
    for (final id in messageIds) {
      final message = byId[id];
      if (message == null ||
          message.isRecalled ||
          !message.status.isServerUsable) {
        return false;
      }
    }
    return true;
  }

  void _handleEnterMultiSelect() {
    setState(() {
      _multiSelectMode = true;
      _selectedMessages.clear();
      if (_selectedMessageId != null) {
        _selectedMessages.add(_selectedMessageId!);
      }
    });
  }

  void _handleExitMultiSelect() {
    setState(() {
      _multiSelectMode = false;
      _selectedMessages.clear();
    });
  }

  Future<void> _handleSendContactCard() async {
    // 打开联系人选择页面（全屏，参考微信"选择朋友"）
    final contact = await Navigator.of(context).push<_ContactPickResult>(
      MaterialPageRoute(builder: (_) => const _ContactPickPage()),
    );
    if (contact == null || !mounted) return;

    final notifier = ref.read(
        chatProvider((_spaceId, widget.conversationId, _effectiveIsGroup))
            .notifier);
    try {
      await _sendChatMessage(
        type: MessageType.contactCard,
        body: MessageBody(
          contactCard: ContactCardDto(
            userId: contact.userId,
            displayName: contact.displayName,
            avatarUrl: contact.avatarUrl,
          ),
        ),
        onOptimisticInsert: (msg) {
          notifier.optimisticInsert(msg);
        },
        onMessageUpdate: (clientMsgId, updated) {
          notifier.updateMessage(clientMsgId, updated);
        },
      );
    } catch (e) {
      if (mounted) {
        if (e is ServerError) {
          _handleSendError(e);
        } else {
          AppToast.error(
            context,
            AppLocalizations.of(context).chatCardSendFailed,
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_spaceId.isNotEmpty) {
      ref.watch(conversationsProvider(_spaceId));
    }
    final effectiveIsGroup = _effectiveIsGroup;
    final activeConversationId = _activeConversationId;
    _ensureGroupDetailRefreshTimer(effectiveIsGroup);
    final AsyncValue<List<Message>> messagesAsync = _isPendingDirectChat
        ? const AsyncData(<Message>[])
        : ref.watch(
            chatProvider((_spaceId, activeConversationId, effectiveIsGroup)));
    final groupDetail = effectiveIsGroup
        ? ref.watch(groupDetailProvider(activeConversationId))
        : null;
    final groupMembersAsync = effectiveIsGroup
        ? ref.watch(groupMembersProvider(activeConversationId))
        : null;
    final currentUserId = ref.watch(currentSpaceProvider)?.userId ?? '';
    final space = ref.watch(currentSpaceProvider);
    final groupDetailValue = groupDetail?.valueOrNull;
    final groupPermissions = groupDetailValue == null
        ? null
        : AppPermissions.group(
            myRole: groupDetailValue.myRole,
            isAllMuted: groupDetailValue.muteMode == 'all_muted',
            allowMemberInvite: true,
            allowMemberModifyTitle: true,
            allowMemberAtAll: groupDetailValue.allowMemberAtAll,
            allowMemberViewMemberList: true,
            allowMemberAddFriend: groupDetailValue.allowMemberAddFriend,
            space: space,
          );
    final groupMutedForMe = groupPermissions?.canSpeak == false;
    final allowAddFriendFromGroup =
        groupPermissions?.canAddFriendFromGroup ?? true;
    final mentionCandidates = groupMembersAsync?.valueOrNull
            ?.where((member) => member.userId != currentUserId)
            .map(
              (member) => ChatMentionCandidate(
                userId: member.userId,
                displayName: member.displayName,
                avatarUrl: member.avatarUrl,
              ),
            )
            .toList(growable: false) ??
        const <ChatMentionCandidate>[];
    final isEmployee = space?.type == SpaceType.employee;
    final quickReplyScope =
        !effectiveIsGroup && AppPermissions.canUseCustomerWorkbench(space)
            ? (widget.customerServiceThreadType == 'temp_session'
                ? 'temp_session'
                : 'direct_customer')
            : null;
    final aiReplyContextText =
        _latestPeerText(messagesAsync.valueOrNull, currentUserId);
    final customerServiceProfileAsync = _isCustomerServiceThread
        ? ref.watch(customerThreadProfileCardProvider((
            customerUserId: widget.customerServiceCustomerUserId ?? '',
            threadType: widget.customerServiceThreadType ?? 'temp_session',
            threadId: widget.customerServiceThreadId ?? '',
          )))
        : null;
    final customerServiceProfile = customerServiceProfileAsync?.valueOrNull;
    // 读取当前用户头像和名字，用于消息气泡头像
    final myProfile = ref.watch(myPageProfileProvider).valueOrNull;
    final myAvatarUrl = myProfile?.avatarUrl;
    final myName = myProfile?.displayName ?? '';
    final currentConversation = _spaceId.isNotEmpty
        ? ref
            .watch(conversationsProvider(_spaceId))
            .valueOrNull
            ?.where((c) => c.conversationId == activeConversationId)
            .firstOrNull
        : null;
    final serviceThreadForDisplay =
        _isCustomerServiceThread ? _customerServiceThreadForDisplay() : null;
    final currentTitle = _isCustomerServiceThread
        ? (_usableCustomerServiceTitle(
                customerServiceProfile?.identity.displayName) ??
            _usableCustomerServiceTitle(serviceThreadForDisplay?.title) ??
            _usableCustomerServiceTitle(widget.title) ??
            '未知客户')
        : effectiveIsGroup
            ? (groupDetailValue?.title.isNotEmpty == true
                ? groupDetailValue!.title
                : currentConversation?.title.isNotEmpty == true
                    ? currentConversation!.title
                    : widget.title)
            : (currentConversation?.title.isNotEmpty == true
                ? currentConversation!.title
                : widget.title);
    final currentAvatarUrl = _isCustomerServiceThread
        ? (customerServiceProfile?.identity.avatarUrl ??
            serviceThreadForDisplay?.avatarUrl ??
            currentConversation?.avatarUrl ??
            widget.avatarUrl)
        : currentConversation?.avatarUrl ?? widget.avatarUrl;
    final currentMemberCount =
        groupDetailValue?.memberCount ?? currentConversation?.memberCount;
    final localDraft = ref
        .watch(
            chatDraftProvider((_spaceId, currentUserId, activeConversationId)))
        .valueOrNull;
    final initialDraft = localDraft ?? currentConversation?.draft;
    final chatBackground =
        ref.watch(chatBackgroundProvider(activeConversationId));
    final receptionThread = _customerServiceDetail == null
        ? null
        : _customerServiceThreadForDisplay();

    PreferredSizeWidget appBarWidget;
    if (_multiSelectMode) {
      appBarWidget = _MultiSelectAppBar(
        selectedCount: _selectedMessages.length,
        onCancel: _handleExitMultiSelect,
        onForward: () {
          // 多选转发：逐条转发选中消息
          if (_selectedMessages.isEmpty) return;
          unawaited(_handleForward(messageIds: _selectedMessages));
        },
      );
    } else {
      appBarWidget = _ChatAppBar(
        conversationId: activeConversationId,
        title: currentTitle,
        avatarUrl: currentAvatarUrl,
        isGroup: effectiveIsGroup,
        subtitle: effectiveIsGroup && currentMemberCount != null
            ? '($currentMemberCount)'
            : null,
        memberCount: currentMemberCount,
        isQuickTranslating: _isQuickTranslating,
        readOnly: _isReadOnlyConversation,
        onCustomerProfile:
            _isCustomerServiceThread ? _openCustomerProfileSheet : null,
        customerServiceSubtitle: _isCustomerServiceThread
            ? _customerServiceSubtitle(
                customerServiceProfile,
                serviceThreadForDisplay,
              )
            : null,
        onQuickTranslate: () => unawaited(
          _handleQuickTranslate(
            messagesAsync.valueOrNull ?? const <Message>[],
            currentUserId,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFEDEDED),
      appBar: appBarWidget,
      body: Stack(
        children: [
          Positioned.fill(
            child: _ChatBackground(setting: chatBackground),
          ),
          Column(
            children: [
              // 营销工具栏（仅员工端显示）
              if (isEmployee && !_isReadOnlyConversation)
                MarketingToolbar(
                  onToolClick: (toolId) {
                    AppToast.info(
                      context,
                      AppLocalizations.of(context)
                          .chatFeatureComingSoon(toolId),
                    );
                  },
                ),
              if (_shouldShowReceptionBar(receptionThread))
                _CustomerServiceReceptionBar(
                  thread: receptionThread!,
                  currentStaffUserId: space?.userId,
                  actionRunning: _isReceptionActionRunning,
                  onTakeover: () =>
                      _handleCustomerServiceTakeover(receptionThread),
                ),
              Expanded(
                child: messagesAsync.when(
                  // 首次加载时显示空列表而不是转圈，视觉更流畅
                  loading: () => _MessageList(
                    messages: const [],
                    showEmptyState: false,
                    currentUserId: currentUserId,
                    myAvatarUrl: myAvatarUrl,
                    myName: myName,
                    peerName: currentTitle,
                    peerAvatarUrl: currentAvatarUrl,
                    scrollController: _scrollController,
                    isGroup: _effectiveIsGroup,
                    conversationId: activeConversationId,
                    lastReadSeq: currentConversation?.lastReadSeq ?? 0,
                    mentionReminderReadSeq: _initialMentionLastReadSeq,
                    allowAddFriendFromGroup: allowAddFriendFromGroup,
                    multiSelectMode: _multiSelectMode,
                    selectedMessages: _selectedMessages,
                    onLongPress: (_, __) {},
                    onToggleSelect: (_) {},
                    onConvertVoiceToText: (_) {},
                  ),
                  error: (e, _) => Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: Colors.grey),
                        const SizedBox(height: 8),
                        Text(AppLocalizations.of(context).commonLoadFailed,
                            style: TextStyle(color: Colors.grey[600])),
                        TextButton(
                          onPressed: () => ref.invalidate(chatProvider((
                            _spaceId,
                            activeConversationId,
                            _effectiveIsGroup
                          ))),
                          child: Text(AppLocalizations.of(context).commonRetry),
                        ),
                      ],
                    ),
                  ),
                  data: (msgs) {
                    _ensureScrollTargetLoaded(msgs);
                    return _MessageList(
                      messages: msgs,
                      currentUserId: currentUserId,
                      myAvatarUrl: myAvatarUrl,
                      myName: myName,
                      peerName: currentTitle,
                      peerAvatarUrl: currentAvatarUrl,
                      scrollController: _scrollController,
                      isGroup: _effectiveIsGroup,
                      conversationId: activeConversationId,
                      lastReadSeq: currentConversation?.lastReadSeq ?? 0,
                      mentionReminderReadSeq: _initialMentionLastReadSeq,
                      allowAddFriendFromGroup: allowAddFriendFromGroup,
                      multiSelectMode: _multiSelectMode,
                      selectedMessages: _selectedMessages,
                      onLongPress: _isReadOnlyConversation
                          ? (_, __) {}
                          : (msg, pos) => _handleLongPress(context, msg, pos),
                      onToggleSelect: (id) {
                        setState(() {
                          if (_selectedMessages.contains(id)) {
                            _selectedMessages.remove(id);
                          } else {
                            _selectedMessages.add(id);
                          }
                        });
                      },
                      scrollToMessageId: widget.scrollToMessageId,
                      onConvertVoiceToText: _isReadOnlyConversation
                          ? (_) {}
                          : (msg) => unawaited(_handleVoiceToText(msg)),
                      onCallLogTap: _handleCallLogTap,
                      onFailedTap: _isReadOnlyConversation
                          ? null
                          : (msg) => _showFailedMessageSheet(context, msg),
                    );
                  },
                ),
              ),
              // 回复预览条（对照 figma ChatPage 的 replyingTo 区域）
              if (_replyingTo != null)
                _ReplyPreview(
                  senderName: _replyingTo!.sender,
                  text: _replyingTo!.text,
                  onClose: () => setState(() => _replyingTo = null),
                ),
              // 非好友提示 or 输入框。群全员禁言时仍展示工具栏，但统一置灰不可操作。
              if (_isReadOnlyConversation)
                _isCustomerServiceThread
                    ? const SizedBox.shrink()
                    : const _ReadOnlyConversationNotice()
              else if (_customerServiceThreadEnded)
                const _CustomerServiceEndedNotice()
              else if (_customerServiceRequiresManualEntry)
                _CustomerServiceManualEntryNotice(
                  gate: _customerServiceReplyGate(_customerServiceDetail!),
                )
              else if (_notFriend)
                const _NotFriendNotice()
              else
                SafeArea(
                  top: false,
                  child: ChatInputToolbar(
                    conversationId: activeConversationId,
                    isGroup: _effectiveIsGroup,
                    isMuted: groupMutedForMe,
                    canSpeak: !groupMutedForMe,
                    muteReason: groupPermissions?.muteReason,
                    initialDraft: initialDraft,
                    onSendText: (text) async {
                      return _sendTextMessage(
                        text: text,
                        replyToMessageId: _replyingTo?.id,
                        clearReplyOnSuccess: true,
                      );
                    },
                    onSendTextRequest: (request) async {
                      return _sendTextMessage(
                        text: request.text,
                        mentions: request.mentions,
                        replyToMessageId: _replyingTo?.id,
                        clearReplyOnSuccess: true,
                      );
                    },
                    onScheduleText: _scheduleTextMessage,
                    onSendVoice: (filePath, duration) async {
                      final notifier = ref.read(chatProvider((
                        _spaceId,
                        widget.conversationId,
                        _effectiveIsGroup
                      )).notifier);
                      try {
                        await _sendChatMessage(
                          type: MessageType.voice,
                          body: MessageBody(
                            voice: MediaResource(
                              url: filePath,
                              durationSeconds: duration,
                              mimeType: 'audio/m4a',
                            ),
                          ),
                          onOptimisticInsert: (msg) {
                            notifier.optimisticInsert(msg);
                            _scrollToBottom();
                          },
                          onMessageUpdate: (clientMsgId, updated) {
                            notifier.updateMessage(clientMsgId, updated);
                          },
                        );
                      } catch (e) {
                        _handleSendError(e);
                      }
                    },
                    onSendMedia: _handleSendMedia,
                    onVoiceCall: () => _startCall(isVideo: false),
                    onVideoCall: () => _startCall(isVideo: true),
                    onSendFile: (filePath, fileName, mimeType, sizeBytes) =>
                        _handleSendFile(
                            filePath, fileName, mimeType, sizeBytes),
                    onLocation: () => unawaited(_handleSendLocation()),
                    mentionCandidates: mentionCandidates,
                    canMentionAll: groupPermissions?.canAtAll ?? false,
                    onFavorite: () => context.push('/favorites'),
                    onSendContactCard: () => _handleSendContactCard(),
                    quickReplyScope: quickReplyScope,
                    aiReplyContextText: aiReplyContextText,
                    externalInsertText: _externalInsertText,
                    externalInsertToken: _externalInsertToken,
                  ),
                ), // SafeArea
            ],
          ),
        ],
      ),
    );
  }

  void _ensureGroupDetailRefreshTimer(bool effectiveIsGroup) {
    if (!effectiveIsGroup || _groupDetailRefreshTimer != null) return;
    _groupDetailRefreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!mounted) return;
      unawaited(
        ref.read(groupDetailProvider(widget.conversationId).notifier).refresh(),
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Multi-select AppBar
// ---------------------------------------------------------------------------

class _MultiSelectAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  final int selectedCount;
  final VoidCallback onCancel;
  final VoidCallback onForward;

  const _MultiSelectAppBar({
    required this.selectedCount,
    required this.onCancel,
    required this.onForward,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: null,
      elevation: 0.5,
      leading: TextButton(
        onPressed: onCancel,
        child: Text(AppLocalizations.of(context).commonCancel,
            style: const TextStyle(fontSize: 15, color: Color(0xFF576B95))),
      ),
      title: Text(
        AppLocalizations.of(context).chatSelectedCount(selectedCount),
        style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: Color(0xFF2C2C2C)),
      ),
      centerTitle: true,
      actions: [
        TextButton(
          onPressed: selectedCount > 0 ? onForward : null,
          child: Text(
            AppLocalizations.of(context).chatMenuForward,
            style: TextStyle(
                fontSize: 15,
                color:
                    selectedCount > 0 ? const Color(0xFF576B95) : Colors.grey),
          ),
        ),
      ],
    );
  }
}

class _MessageAiReplySheet extends StatelessWidget {
  final String contextText;

  const _MessageAiReplySheet({required this.contextText});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final suggestions = _buildSuggestions(contextText);
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.55,
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(top: 8, bottom: 8),
            decoration: BoxDecoration(
              color: colorScheme.onSurface.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.auto_awesome_outlined,
                  color: Color(0xFF00B27A),
                ),
                const SizedBox(width: 8),
                Text(
                  'AI回复',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '参考消息：$contextText',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                height: 1.35,
                color: colorScheme.onSurface.withValues(alpha: 0.56),
              ),
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
              itemCount: suggestions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, index) {
                return _MessageAiReplyTile(text: suggestions[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  List<String> _buildSuggestions(String rawContext) {
    final context = rawContext.trim();
    final lower = context.toLowerCase();
    final suggestions = <String>[];

    if (context.contains('退款') || context.contains('退货')) {
      suggestions.add('您好，关于退款/退货问题我先帮您核实订单状态。麻烦您提供一下订单号，我确认后给您处理方案。');
    } else if (context.contains('订单') || context.contains('物流')) {
      suggestions.add('您好，我先帮您查询订单和物流状态。麻烦您发一下订单号，我确认后马上回复您。');
    } else if (context.contains('价格') ||
        context.contains('多少钱') ||
        context.contains('报价')) {
      suggestions.add('您好，价格会根据具体方案和数量有所不同。我先了解一下您的需求，再给您准确报价。');
    } else if (context.contains('投诉') || context.contains('不满意')) {
      suggestions.add('您好，非常抱歉给您带来不好的体验。我先记录并核实情况，会尽快给您一个明确处理结果。');
    } else if (lower.contains('hello') || lower.contains('hi')) {
      suggestions.add('您好，我在的。请问有什么可以帮您处理？');
    }

    suggestions.addAll([
      '您好，我已收到您的消息。我先帮您核实一下具体情况，稍后给您回复。',
      '收到，为了更快帮您处理，麻烦您补充一下订单号或相关截图。',
      '理解您的情况，我会尽快帮您跟进处理，处理进展会在这里同步给您。',
    ]);

    final seen = <String>{};
    return suggestions.where(seen.add).take(4).toList();
  }
}

class _MessageAiReplyTile extends StatelessWidget {
  final String text;

  const _MessageAiReplyTile({required this.text});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).pop(text),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.auto_awesome_outlined,
                size: 18,
                color: Color(0xFF00B27A),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.38,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.add_rounded,
                size: 18,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AppBar
// ---------------------------------------------------------------------------

class _CustomerServiceReceptionBar extends StatelessWidget {
  final CsThread thread;
  final String? currentStaffUserId;
  final bool actionRunning;
  final VoidCallback onTakeover;
  const _CustomerServiceReceptionBar({
    required this.thread,
    required this.currentStaffUserId,
    required this.actionRunning,
    required this.onTakeover,
  });

  @override
  Widget build(BuildContext context) {
    final isAi = thread.isAiHandled;
    final colorScheme = Theme.of(context).colorScheme;
    final assignedName = thread.assignedStaffDisplayName?.trim();
    final assignedToMe = thread.assignedStaffUserId?.isNotEmpty == true &&
        thread.assignedStaffUserId == currentStaffUserId;
    final title = isAi
        ? 'AI 正在接待'
        : assignedToMe || assignedName == null || assignedName.isEmpty
            ? '我正在接待'
            : '$assignedName 正在接待';
    final sourceLabel = _csChannelLabel(thread.source);
    final subtitle = isAi
        ? '客户消息由 AI 客服回复 · 来源 $sourceLabel'
        : '人工客服正在处理此会话 · 来源 $sourceLabel';
    final icon = isAi ? Icons.auto_awesome_outlined : Icons.support_agent;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.65),
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: isAi ? const Color(0xFFEAF1FF) : const Color(0xFFEAF7F0),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 18,
              color: isAi ? const Color(0xFF2563EB) : const Color(0xFF059669),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.58),
                  ),
                ),
              ],
            ),
          ),
          if (isAi) ...[
            const SizedBox(width: 10),
            SizedBox(
              height: 32,
              child: FilledButton(
                onPressed: actionRunning ? null : onTakeover,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(86, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: _ReceptionActionLabel(
                  label: '人工接管',
                  loading: actionRunning,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

String _csChannelLabel(String? source) {
  final value = source?.trim();
  if (value == null || value.isEmpty) return '未知';
  if (value.contains('抖音')) return '抖音';
  if (value.contains('微信')) return '微信';
  if (value.contains('网页') || value.contains('网站')) return '网页';
  if (value.contains('自有') || value.contains('APP') || value.contains('App')) {
    return '自有 App';
  }
  final normalized = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  if (normalized.contains('douyin') || normalized.contains('tiktok')) {
    return '抖音';
  }
  if (normalized.contains('whatsapp') || normalized.contains('wathsup')) {
    return 'WhatsApp';
  }
  if (normalized.contains('telegram') || normalized == 'tg') {
    return 'Telegram';
  }
  if (normalized.contains('app') || normalized.contains('native')) {
    return '自有 App';
  }
  if (normalized.contains('widget') ||
      normalized.contains('web') ||
      normalized.contains('site')) {
    return '网页';
  }
  return value.length <= 16 ? value : '${value.substring(0, 16)}…';
}

class _ReceptionActionLabel extends StatelessWidget {
  final String label;
  final bool loading;

  const _ReceptionActionLabel({
    required this.label,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    if (!loading) {
      return Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      );
    }
    return const SizedBox(
      width: 14,
      height: 14,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }
}

class _ChatAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final String title;
  final String? avatarUrl;
  final bool isGroup;
  final String conversationId;
  final String? subtitle;
  final int? memberCount;
  final bool isQuickTranslating;
  final bool readOnly;
  final String? customerServiceSubtitle;
  final VoidCallback? onCustomerProfile;
  final VoidCallback onQuickTranslate;

  const _ChatAppBar({
    required this.title,
    this.avatarUrl,
    required this.isGroup,
    required this.conversationId,
    this.subtitle,
    this.memberCount,
    required this.isQuickTranslating,
    this.readOnly = false,
    this.customerServiceSubtitle,
    this.onCustomerProfile,
    required this.onQuickTranslate,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spaceId = ref.watch(currentSpaceProvider)?.spaceId ?? '';
    final space = ref.watch(currentSpaceProvider);
    final convs = ref.watch(conversationsProvider(spaceId)).valueOrNull ?? [];
    final conv =
        convs.where((c) => c.conversationId == conversationId).firstOrNull;
    final unreadCount = conv?.unreadCount ?? 0;
    var identity = !isGroup && space != null && !space.isPersonal
        ? identityBadgeFor(userType: conv?.peerUserType)
        : null;
    if (identity == null &&
        !isGroup &&
        conv?.peerUserId?.isNotEmpty == true &&
        space != null &&
        !space.isPersonal) {
      final contacts = [
        ...?ref.watch(tenantMembersProvider).valueOrNull,
        ...?ref.watch(friendsProvider).valueOrNull,
      ];
      for (final contact in contacts) {
        if (contact.userId != conv!.peerUserId) continue;
        identity = identityBadgeFor(
          userType: contact.userType,
          customerTag: contact.customerTag,
        );
        if (identity == null && space.isCustomer && contact.userType == 2) {
          identity = identityBadgeFor(userType: 2, customerTag: '客服');
        }
        break;
      }
    }
    if (identity == null &&
        !isGroup &&
        space != null &&
        space.isCustomer &&
        conv?.peerUserType == 2) {
      identity = identityBadgeFor(userType: 2, customerTag: '客服');
    }

    // 企业空间单聊：副标题显示 @企业名称（参考微信，个人空间不显示）
    String? effectiveSubtitle = customerServiceSubtitle ?? subtitle;
    if (effectiveSubtitle == null &&
        !isGroup &&
        space != null &&
        !space.isPersonal) {
      final spacesAsync = ref.watch(spacesProvider);
      final companyName = spacesAsync.valueOrNull
          ?.where((s) => s.spaceId == space.spaceId)
          .map((s) => s.name)
          .firstOrNull;
      if (companyName != null && companyName.isNotEmpty) {
        effectiveSubtitle = companyName;
      }
    }
    final reserveSubtitleSlot = customerServiceSubtitle?.isNotEmpty == true ||
        isGroup ||
        (space != null && !space.isPersonal);

    return AppBar(
      backgroundColor: Theme.of(context).colorScheme.surface,
      elevation: 0,
      scrolledUnderElevation: 0,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x4DE6F7F2), Colors.white],
          ),
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(0.5),
        child: Container(height: 0.5, color: const Color(0xFFE6F7F2)),
      ),
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Icon(Icons.arrow_back_ios,
                  size: 20, color: Color(0xFF1D2129)),
            ),
          ),
          Visibility(
            visible: unreadCount > 0,
            maintainState: true,
            maintainAnimation: true,
            maintainSize: true,
            child: Container(
              constraints: const BoxConstraints(minWidth: 20),
              height: 20,
              padding: const EdgeInsets.symmetric(horizontal: 5),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  unreadCount > 99 ? '99+' : '$unreadCount',
                  style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.surface,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      leadingWidth: 64,
      title: reserveSubtitleSlot
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D2129),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (identity != null) ...[
                      const SizedBox(width: 6),
                      IdentityBadge(
                        label: identity.label,
                        tone: identity.tone,
                        compact: true,
                      ),
                    ],
                  ],
                ),
                SizedBox(
                  height: 15,
                  child: Text(
                    effectiveSubtitle ?? '',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF86909C),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1D2129),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (identity != null) ...[
                  const SizedBox(width: 6),
                  IdentityBadge(
                    label: identity.label,
                    tone: identity.tone,
                    compact: true,
                  ),
                ],
              ],
            ),
      centerTitle: true,
      actions: [
        if (onCustomerProfile != null)
          IconButton(
            tooltip: '客户资料',
            onPressed: onCustomerProfile,
            icon: const Icon(
              Icons.badge_outlined,
              color: Color(0xFF1D2129),
            ),
          ),
        IconButton(
          tooltip: AppLocalizations.of(context).autoTranslateTitle,
          onPressed: isQuickTranslating ? null : onQuickTranslate,
          icon: isQuickTranslating
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF07C160),
                  ),
                )
              : const Icon(
                  Icons.translate_outlined,
                  color: Color(0xFF1D2129),
                ),
        ),
        if (!readOnly)
          IconButton(
            icon: const Icon(Icons.more_horiz, color: Color(0xFF1D2129)),
            onPressed: () {
              if (isGroup) {
                context.push('/group-settings/$conversationId', extra: {
                  'title': title,
                  'avatarUrl': avatarUrl,
                  'memberCount': memberCount,
                });
              } else {
                context.push('/chat-settings/$conversationId');
              }
            },
          ),
      ],
    );
  }
}

class _CustomerProfileSheet extends ConsumerWidget {
  final String? customerUserId;
  final String? customerServiceThreadType;
  final String? customerServiceThreadId;
  final CustomerProfileCard fallbackCard;

  const _CustomerProfileSheet({
    required this.customerUserId,
    this.customerServiceThreadType,
    this.customerServiceThreadId,
    required this.fallbackCard,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = customerUserId?.trim();
    final threadType = customerServiceThreadType?.trim();
    final threadId = customerServiceThreadId?.trim();
    final hasThreadContext =
        threadType?.isNotEmpty == true && threadId?.isNotEmpty == true;
    final asyncCard = hasThreadContext
        ? ref.watch(customerThreadProfileCardProvider((
            customerUserId: id ?? '',
            threadType: threadType!,
            threadId: threadId!,
          )))
        : id?.isNotEmpty == true
            ? ref.watch(customerProfileCardProvider(id!))
            : null;
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.86,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
      ),
      child: SafeArea(
        top: false,
        child: asyncCard == null
            ? _CustomerProfileContent(card: fallbackCard)
            : asyncCard.when(
                loading: () => const SizedBox(
                  height: 320,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (_, __) => _CustomerProfileContent(
                  card: fallbackCard,
                  warning: '客户画像接口暂不可用',
                ),
                data: (card) => _CustomerProfileContent(card: card),
              ),
      ),
    );
  }
}

class _CustomerProfileContent extends ConsumerWidget {
  final CustomerProfileCard card;
  final String? warning;

  const _CustomerProfileContent({
    required this.card,
    this.warning,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tzOffset = ref.watch(timezoneOffsetProvider);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE5E6EB),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 16),
          _ProfileSection(
            title: '客户画像',
            icon: Icons.person_outline,
            children: [
              _ProfileLine(label: '姓名', value: card.identity.displayName),
              _ProfileLine(label: '等级', value: card.identity.level ?? '--'),
              _ProfileLine(
                  label: 'KYC', value: _kycLabel(card.identity.kycStatus)),
              _ProfileLine(
                  label: '风险', value: _riskLabel(card.identity.riskLevel)),
              _ProfileLine(label: '语言', value: card.identity.language ?? '--'),
              _ProfileLine(label: '来源', value: card.identity.source ?? '--'),
              _ProfileLine(
                label: '归属客服',
                value: card.identity.assignedStaffDisplayName ?? '--',
              ),
              _TagsLine(tags: card.identity.tags),
            ],
          ),
          if (warning != null) ...[
            const SizedBox(height: 12),
            _WarningBox(text: warning!),
          ],
          if (card.isRegisteredCustomer) ...[
            const SizedBox(height: 12),
            _ProfileSection(
              title: '账户概况',
              icon: Icons.account_balance_wallet_outlined,
              children: [
                _ProfileLine(
                  label: '账户余额',
                  value: card.isMasked('balance')
                      ? '--'
                      : _moneyText(card.account?.balance),
                ),
                _ProfileLine(
                  label: '累计入金',
                  value: _moneyText(card.account?.totalDeposit),
                ),
                _ProfileLine(
                  label: '净入金',
                  value: _moneyText(card.account?.netDeposit),
                ),
                _ProfileLine(
                  label: '账户状态',
                  value: _statusLabel(card.account?.accountStatus),
                ),
                _ProfileLine(
                  label: '注册日期',
                  value: _dateText(card.account?.registeredAt, tzOffset),
                ),
                _ProfileLine(label: 'IB', value: card.account?.ibCode ?? '--'),
              ],
            ),
            const SizedBox(height: 12),
            _ProfileSection(
              title: '历史交易概况',
              icon: Icons.business_center_outlined,
              children: [
                _ProfileLine(
                  label: '总订单',
                  value: card.trading?.totalOrders?.toString() ?? '--',
                ),
                _ProfileLine(
                  label: '交易产品',
                  value: card.trading?.products.isNotEmpty == true
                      ? card.trading!.products.join('、')
                      : '--',
                ),
                _ProfileLine(
                  label: '胜率',
                  value: _percentText(card.trading?.winRate),
                ),
                _ProfileLine(
                  label: '最近交易时间',
                  value: _dateTimeText(card.trading?.lastTradeAt, tzOffset),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _TemporaryOrdersSection(
              orders: card.temporaryOrders,
              timezoneOffset: tzOffset,
            ),
            const SizedBox(height: 12),
            _TicketSection(
              tickets: card.tickets,
              timezoneOffset: tzOffset,
            ),
          ] else ...[
            const SizedBox(height: 12),
            _ProfileSection(
              title: '访客画像',
              icon: Icons.travel_explore_outlined,
              children: [
                _ProfileLine(
                  label: '访客 ID',
                  value: card.visitor?.visitorId ?? '--',
                ),
                _ProfileLine(
                  label: '语言',
                  value: card.visitor?.locale ?? card.identity.language ?? '--',
                ),
                _ProfileLine(
                  label: '历史会话',
                  value: '${card.visitor?.totalSessions ?? 0}',
                ),
                _ProfileLine(
                  label: '来源页面',
                  value: card.visitor?.sourceUrl ?? '--',
                ),
              ],
            ),
            const SizedBox(height: 12),
            const _WarningBox(text: '客户注册并绑定后可查看账户、交易和工单资料'),
          ],
        ],
      ),
    );
  }

  String _kycLabel(String? value) {
    return switch (value) {
      'verified' => '已认证',
      'pending' => '审核中',
      'rejected' => '未通过',
      null || '' => '--',
      _ => value,
    };
  }

  String _riskLabel(String? value) {
    return switch (value) {
      'low' => '低',
      'medium' => '中',
      'high' => '高',
      null || '' => '--',
      _ => value,
    };
  }

  String _statusLabel(String? value) {
    return switch (value) {
      'active' => '活跃',
      'disabled' => '停用',
      'frozen' => '冻结',
      null || '' => '--',
      _ => value,
    };
  }

  String _moneyText(num? value) {
    if (value == null) return '--';
    final fixed = value % 1 == 0 ? value.toInt().toString() : value.toString();
    return '\$$fixed';
  }

  String _percentText(num? value) {
    if (value == null) return '--';
    final percent = value <= 1 ? value * 100 : value;
    final fixed =
        percent % 1 == 0 ? percent.toInt().toString() : percent.toString();
    return '$fixed%';
  }

  String _dateText(DateTime? value, double tzOffset) {
    if (value == null) return '--';
    return formatDateWithTimezone(value, tzOffset);
  }

  String _dateTimeText(DateTime? value, double tzOffset) {
    if (value == null) return '--';
    return formatFullMinuteWithTimezone(value, tzOffset);
  }
}

class _ProfileSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _ProfileSection({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF60708A)),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1D2129),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _ProfileLine extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileLine({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, color: Color(0xFF60708A)),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 15,
                color: Color(0xFF1D2129),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TagsLine extends StatelessWidget {
  final List<String> tags;

  const _TagsLine({required this.tags});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(
            width: 92,
            child: Text(
              '标签',
              style: TextStyle(fontSize: 14, color: Color(0xFF60708A)),
            ),
          ),
          Expanded(
            child: tags.isEmpty
                ? const Text(
                    '--',
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 15,
                      color: Color(0xFF1D2129),
                      fontWeight: FontWeight.w600,
                    ),
                  )
                : Wrap(
                    alignment: WrapAlignment.end,
                    spacing: 6,
                    runSpacing: 6,
                    children: tags
                        .map(
                          (tag) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEDE7FF),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              tag,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF5B37D6),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
          ),
        ],
      ),
    );
  }
}

class _TicketSection extends StatelessWidget {
  final List<CustomerTicketSummary> tickets;
  final double timezoneOffset;

  const _TicketSection({
    required this.tickets,
    required this.timezoneOffset,
  });

  @override
  Widget build(BuildContext context) {
    return _ProfileSection(
      title: '工单信息',
      icon: Icons.assignment_outlined,
      children: tickets.isEmpty
          ? const [
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  '暂无工单',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Color(0xFF86909C)),
                ),
              ),
            ]
          : tickets
              .map(
                (ticket) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.title,
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF1D2129),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${_ticketStatus(ticket.status)} · ${ticket.assigneeDisplayName ?? '未分配'} · ${_ticketTime(ticket.updatedAt, timezoneOffset)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF86909C),
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(growable: false),
    );
  }

  String _ticketStatus(String status) {
    return switch (status) {
      'open' => '处理中',
      'pending' => '待处理',
      'closed' => '已关闭',
      _ => status,
    };
  }

  String _ticketTime(DateTime? value, double tzOffset) {
    if (value == null) return '--';
    return formatFullMinuteWithTimezone(value, tzOffset);
  }
}

class _TemporaryOrdersSection extends StatelessWidget {
  final List<CustomerTemporaryOrderSummary> orders;
  final double timezoneOffset;

  const _TemporaryOrdersSection({
    required this.orders,
    required this.timezoneOffset,
  });

  @override
  Widget build(BuildContext context) {
    return _ProfileSection(
      title: '临时订单数据',
      icon: Icons.receipt_long_outlined,
      children: orders.isEmpty
          ? const [
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  '暂无临时订单',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Color(0xFF86909C)),
                ),
              ),
            ]
          : orders.map(_orderCard).toList(growable: false),
    );
  }

  Widget _orderCard(CustomerTemporaryOrderSummary order) {
    final status = _orderStatus(order.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.product?.isNotEmpty == true ? order.product! : '订单',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF1D2129),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                status,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF60708A),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: [
              _miniInfo('单号', order.orderId.isNotEmpty ? order.orderId : '--'),
              _miniInfo('方向', _sideLabel(order.side)),
              _miniInfo('手数', _numText(order.volume)),
              _miniInfo('开仓价', _numText(order.price)),
              _miniInfo('浮盈亏', _moneyText(order.floatingProfit)),
              _miniInfo('开仓时间', _dateTimeText(order.openedAt)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniInfo(String label, String value) {
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 12, color: Color(0xFF86909C)),
        children: [
          TextSpan(text: '$label '),
          TextSpan(
            text: value,
            style: const TextStyle(
              color: Color(0xFF1D2129),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _sideLabel(String? value) {
    return switch (value?.toLowerCase()) {
      'buy' || 'long' => '买入',
      'sell' || 'short' => '卖出',
      null || '' => '--',
      _ => value!,
    };
  }

  String _orderStatus(String? value) {
    return switch (value?.toLowerCase()) {
      'open' || 'opened' || 'active' => '持仓中',
      'pending' => '挂单中',
      'closed' => '已平仓',
      'cancelled' || 'canceled' => '已取消',
      null || '' => '--',
      _ => value!,
    };
  }

  String _numText(num? value) {
    if (value == null) return '--';
    return value % 1 == 0 ? value.toInt().toString() : value.toString();
  }

  String _moneyText(num? value) {
    if (value == null) return '--';
    final fixed = value % 1 == 0 ? value.toInt().toString() : value.toString();
    return '\$$fixed';
  }

  String _dateTimeText(DateTime? value) {
    if (value == null) return '--';
    return formatFullMinuteWithTimezone(value, timezoneOffset);
  }
}

class _WarningBox extends StatelessWidget {
  final String text;

  const _WarningBox({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E8),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          color: Color(0xFFB26B00),
          height: 1.4,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Location Picker Page
// ---------------------------------------------------------------------------

class _LocationPickerPage extends StatefulWidget {
  const _LocationPickerPage();

  @override
  State<_LocationPickerPage> createState() => _LocationPickerPageState();
}

class _LocationPickerPageState extends State<_LocationPickerPage> {
  static const _fallbackLatitude = 35.681236;
  static const _fallbackLongitude = 139.767125;

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _addressController = TextEditingController();
  final _latitudeController = TextEditingController();
  final _longitudeController = TextEditingController();
  final _zoomController = TextEditingController(text: '15');
  bool _locating = true;
  bool _resolvingAddress = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _titleController.text =
          AppLocalizations.of(context).chatLocationDefaultTitle;
      _latitudeController.text = _fallbackLatitude.toStringAsFixed(6);
      _longitudeController.text = _fallbackLongitude.toStringAsFixed(6);
      _moveToCurrentLocation();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _addressController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    _zoomController.dispose();
    super.dispose();
  }

  Future<void> _moveToCurrentLocation() async {
    setState(() => _locating = true);
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showLocationError();
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showLocationError();
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      if (!mounted) return;
      _latitudeController.text = position.latitude.toStringAsFixed(6);
      _longitudeController.text = position.longitude.toStringAsFixed(6);
      setState(() {});
      await _resolveAddress(
        latitude: position.latitude,
        longitude: position.longitude,
      );
    } catch (_) {
      // 定位失败时保留默认坐标，用户可手动修改。
      if (mounted) _showLocationError();
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _resolveAddress({
    required double latitude,
    required double longitude,
  }) async {
    if (!mounted) return;
    setState(() => _resolvingAddress = true);
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'format': 'jsonv2',
        'lat': latitude.toString(),
        'lon': longitude.toString(),
        'zoom': '18',
        'addressdetails': '1',
      });
      final response = await http.get(uri, headers: const {
        'User-Agent': 'LPPMobile/1.0 location-picker',
      }).timeout(const Duration(seconds: 6));
      if (response.statusCode != 200) return;

      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data is! Map) return;
      final address = _readAddressFromReverseResult(data);
      if (!mounted) return;
      if (address.title.isNotEmpty) {
        _titleController.text = address.title;
      }
      if (address.detail.isNotEmpty) {
        _addressController.text = address.detail;
      }
      setState(() {});
    } catch (_) {
      // 地址解析失败不阻断发送，经纬度仍可按文档发送。
    } finally {
      if (mounted) setState(() => _resolvingAddress = false);
    }
  }

  ({String title, String detail}) _readAddressFromReverseResult(Map data) {
    final addressRaw = data['address'];
    final address = addressRaw is Map ? addressRaw : const {};
    final rawTitle = data['name']?.toString().trim();
    final title = rawTitle != null && rawTitle.isNotEmpty
        ? rawTitle
        : (address['amenity'] ??
                address['building'] ??
                address['shop'] ??
                address['office'] ??
                address['road'] ??
                address['suburb'] ??
                address['city'] ??
                AppLocalizations.of(context).chatLocationDefaultTitle)
            .toString()
            .trim();
    final detail = data['display_name']?.toString().trim() ?? '';
    return (title: title, detail: detail);
  }

  void _showLocationError() {
    if (!mounted) return;
    AppToast.error(context, AppLocalizations.of(context).commonOperationFailed);
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    final title = _titleController.text.trim();
    final address = _addressController.text.trim();
    final latitude = double.parse(_latitudeController.text.trim());
    final longitude = double.parse(_longitudeController.text.trim());
    final zoomText = _zoomController.text.trim();
    Navigator.of(context).pop(LocationDto(
      latitude: latitude,
      longitude: longitude,
      title: title.isEmpty ? l10n.chatLocationDefaultTitle : title,
      address: address.isEmpty ? null : address,
      zoomLevel: zoomText.isEmpty ? null : int.parse(zoomText),
    ));
  }

  String? _validateCoordinate(
    String? value,
    String label,
    double min,
    double max,
  ) {
    final l10n = AppLocalizations.of(context);
    final text = value?.trim() ?? '';
    if (text.isEmpty) return l10n.chatLocationValidationRequired(label);
    final parsed = double.tryParse(text);
    if (parsed == null || parsed < min || parsed > max) {
      return l10n.chatLocationValidationRange(label);
    }
    return null;
  }

  String? _validateZoom(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return null;
    final parsed = int.tryParse(text);
    if (parsed == null || parsed < 1 || parsed > 20) {
      return AppLocalizations.of(context)
          .chatLocationValidationRange('zoomLevel');
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.chatLocationSheetTitle),
        actions: [
          TextButton(
            onPressed: _submit,
            child: Text(l10n.commonSend),
          ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              TextFormField(
                controller: _titleController,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: l10n.chatLocationNameLabel,
                  hintText: l10n.chatLocationNameHint,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressController,
                minLines: 1,
                maxLines: 3,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: l10n.chatLocationAddressLabel,
                  hintText: l10n.chatLocationOptionalHint,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _latitudeController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                ),
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: l10n.chatLocationLatitudeLabel,
                  hintText: l10n.chatLocationLatitudeHint,
                ),
                validator: (value) => _validateCoordinate(
                  value,
                  l10n.chatLocationLatitudeLabel,
                  -90,
                  90,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _longitudeController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                ),
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: l10n.chatLocationLongitudeLabel,
                  hintText: l10n.chatLocationLongitudeHint,
                ),
                validator: (value) => _validateCoordinate(
                  value,
                  l10n.chatLocationLongitudeLabel,
                  -180,
                  180,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _zoomController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'zoomLevel',
                  hintText: '1 - 20',
                ),
                validator: _validateZoom,
              ),
              const SizedBox(height: 18),
              OutlinedButton.icon(
                onPressed: _locating ? null : _moveToCurrentLocation,
                icon: _locating
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location),
                label: Text(_locating ? '定位中' : '重新定位'),
              ),
              if (_resolvingAddress) ...[
                const SizedBox(height: 8),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 1.6),
                    ),
                    SizedBox(width: 8),
                    Text('正在获取详细地址', style: TextStyle(fontSize: 13)),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              FilledButton(
                onPressed: _submit,
                child: Text(l10n.commonSend),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reply Preview Bar（对照 figma ChatPage replyingTo 区域）
// ---------------------------------------------------------------------------

class _ReplyPreview extends StatelessWidget {
  final String senderName;
  final String text;
  final VoidCallback onClose;

  const _ReplyPreview({
    required this.senderName,
    required this.text,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF00B27A),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  AppLocalizations.of(context).chatReplyTo(senderName),
                  style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF00B27A),
                      fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  text,
                  style:
                      const TextStyle(fontSize: 13, color: Color(0xFF86909C)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onClose,
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 14, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 非好友提示（参考微信：「你已不是对方好友，无法发送消息」）
// ---------------------------------------------------------------------------

class _NotFriendNotice extends StatelessWidget {
  const _NotFriendNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFF7F8FA),
        border: Border(top: BorderSide(color: Color(0xFFE5E6EB))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.block_outlined, size: 16, color: Color(0xFF86909C)),
          const SizedBox(width: 6),
          Text(
            AppLocalizations.of(context).chatNotFriendSendBlocked,
            style: const TextStyle(fontSize: 13, color: Color(0xFF86909C)),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyConversationNotice extends StatelessWidget {
  const _ReadOnlyConversationNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFF7F8FA),
        border: Border(top: BorderSide(color: Color(0xFFE5E6EB))),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.visibility_outlined, size: 16, color: Color(0xFF86909C)),
          SizedBox(width: 6),
          Text(
            '会话查看模式，仅可查看，不能发言',
            style: TextStyle(fontSize: 13, color: Color(0xFF86909C)),
          ),
        ],
      ),
    );
  }
}

enum _CustomerServiceReplyGate { claim, takeover, open }

_CustomerServiceReplyGate _customerServiceReplyGate(CsThreadDetail detail) {
  final status = detail.status.toLowerCase().replaceAll('-', '_');
  final responder =
      detail.currentResponderType?.toLowerCase().replaceAll('-', '_') ?? '';
  final ai = detail.aiStatus?.toLowerCase().replaceAll('-', '_') ?? '';
  if (status == '1' ||
      status == 'queued' ||
      status == 'created' ||
      status.contains('queue') ||
      status.contains('pending') ||
      status.contains('waiting')) {
    return _CustomerServiceReplyGate.claim;
  }
  if (responder == 'ai' ||
      ai == 'bot_active' ||
      status == 'bot_active' ||
      status.contains('ai') ||
      status == 'bot') {
    return _CustomerServiceReplyGate.takeover;
  }
  return _CustomerServiceReplyGate.open;
}

class _CustomerServiceManualEntryNotice extends StatelessWidget {
  final _CustomerServiceReplyGate gate;

  const _CustomerServiceManualEntryNotice({required this.gate});

  @override
  Widget build(BuildContext context) {
    final isClaim = gate == _CustomerServiceReplyGate.claim;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFF7F8FA),
        border: Border(top: BorderSide(color: Color(0xFFE5E6EB))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isClaim ? Icons.support_agent_outlined : Icons.smart_toy_outlined,
            size: 16,
            color: const Color(0xFF86909C),
          ),
          const SizedBox(width: 6),
          Text(
            isClaim ? '请先接入会话后再回复' : '请先人工接管后再回复',
            style: const TextStyle(fontSize: 13, color: Color(0xFF86909C)),
          ),
        ],
      ),
    );
  }
}

class _CustomerServiceEndedNotice extends StatelessWidget {
  const _CustomerServiceEndedNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xFFF7F8FA),
        border: Border(top: BorderSide(color: Color(0xFFE5E6EB))),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF86909C)),
          SizedBox(width: 6),
          Text(
            '会话已结束',
            style: TextStyle(fontSize: 13, color: Color(0xFF86909C)),
          ),
        ],
      ),
    );
  }
}

class _ChatBackground extends StatelessWidget {
  final ChatBackgroundSetting setting;

  const _ChatBackground({required this.setting});

  @override
  Widget build(BuildContext context) {
    if (setting.hasImage) {
      return FutureBuilder<bool>(
        future: localFileExists(setting.imagePath!),
        builder: (context, snapshot) {
          if (snapshot.data != true) {
            return ColoredBox(color: setting.color);
          }
          return localImageWidget(
            setting.imagePath!,
            fit: BoxFit.cover,
          );
        },
      );
    }
    return ColoredBox(color: setting.color);
  }
}

// ---------------------------------------------------------------------------
// Message List
// ---------------------------------------------------------------------------

class _MessageList extends ConsumerWidget {
  final List<Message> messages;
  final bool showEmptyState;
  final String currentUserId;
  final String? myAvatarUrl;
  final String? myName;
  final String? peerName;
  final String? peerAvatarUrl;
  final ScrollController scrollController;
  final bool isGroup;
  final String conversationId;
  final int lastReadSeq;
  final int? mentionReminderReadSeq;
  final bool allowAddFriendFromGroup;
  final bool multiSelectMode;
  final Set<String> selectedMessages;
  final void Function(Message msg, Offset position) onLongPress;
  final void Function(String id) onToggleSelect;
  final String? scrollToMessageId;
  final void Function(Message msg)? onConvertVoiceToText;
  final void Function(Message msg)? onCallLogTap;
  final void Function(Message msg)? onFailedTap;

  const _MessageList({
    required this.messages,
    this.showEmptyState = true,
    required this.currentUserId,
    this.myAvatarUrl,
    this.myName,
    this.peerName,
    this.peerAvatarUrl,
    required this.scrollController,
    required this.isGroup,
    required this.conversationId,
    this.lastReadSeq = 0,
    this.mentionReminderReadSeq,
    required this.allowAddFriendFromGroup,
    required this.multiSelectMode,
    required this.selectedMessages,
    required this.onLongPress,
    required this.onToggleSelect,
    this.scrollToMessageId,
    this.onConvertVoiceToText,
    this.onCallLogTap,
    this.onFailedTap,
  });

  bool get _isSelfChat => conversationId.startsWith('self-');
  bool get _isPersonalSelf => conversationId == 'self-personal';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tzOffset = ref.watch(timezoneOffsetProvider);
    if (messages.isEmpty) {
      if (!showEmptyState) {
        return const SizedBox.expand();
      }
      if (_isSelfChat) {
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _isPersonalSelf ? '🧑' : '👔',
                  style: const TextStyle(fontSize: 64),
                ),
                const SizedBox(height: 16),
                Text(
                  _isPersonalSelf
                      ? l10n.chatPersonalNotesTitle
                      : l10n.chatWorkNotesTitle,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1D2129),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isPersonalSelf
                      ? l10n.chatPersonalNotesDescription
                      : l10n.chatWorkNotesDescription,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF86909C),
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
        );
      }
      return Center(
        child: Text(
          l10n.chatNoMessages,
          style: const TextStyle(color: Color(0xFF86909C), fontSize: 14),
        ),
      );
    }

    final mentionReminder = _latestUnreadMentionReminder();
    final listView = ListView.builder(
      controller: scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 24),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        // reverse: true 时 index 0 是最新消息，需要反转
        final realIndex = messages.length - 1 - index;
        final message = messages[realIndex];
        final isSelf = message.senderUserId == currentUserId;
        final senderName =
            isSelf ? (myName ?? '') : _displayNameForSender(context, message);
        final senderAvatarUrl = isSelf
            ? myAvatarUrl
            : _avatarUrlForSender(context, message) ?? peerAvatarUrl;
        final senderIdentity =
            !isSelf ? _identityForSender(context, message) : null;

        // 判断是否需要显示时间戳（与上一条消息间隔超过5分钟）
        // reverse 时，"上一条"是 realIndex + 1（更早的消息）
        bool showTimestamp = false;
        if (realIndex == 0) {
          showTimestamp = true; // 最早的消息总是显示时间
        } else {
          final prevMessage = messages[realIndex - 1];
          final diff = message.sentAt.difference(prevMessage.sentAt).abs();
          showTimestamp = diff.inMinutes >= 5;
        }

        // 滚动到指定消息（首次渲染后执行）。
        final targetRealIndex = scrollToMessageId == null
            ? -1
            : messages.indexWhere((m) => m.messageId == scrollToMessageId);
        final targetRenderIndex =
            targetRealIndex < 0 ? -1 : messages.length - 1 - targetRealIndex;
        if (scrollToMessageId != null &&
            message.messageId == scrollToMessageId &&
            index == targetRenderIndex) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (scrollController.hasClients) {
              // 估算目标位置（每条消息约 80px）
              final estimatedOffset = index * 80.0;
              scrollController.animateTo(
                estimatedOffset.clamp(
                    0.0, scrollController.position.maxScrollExtent),
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
              );
            }
          });
        }

        // 系统事件消息居中显示；text 为空时不渲染
        if (message.type == MessageType.event) {
          final text = message.body.text ?? '';
          if (text.isEmpty) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  text,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF86909C),
                  ),
                ),
              ),
            ),
          );
        }

        return Column(
          children: [
            // 时间戳分隔（微信风格，居中灰色小字）
            if (showTimestamp)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Center(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF000000).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _formatMessageTime(message.sentAt, tzOffset),
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF888888)),
                    ),
                  ),
                ),
              ),
            GestureDetector(
              onTap: multiSelectMode
                  ? () => onToggleSelect(message.messageId)
                  : null,
              onLongPressStart: (details) {
                if (!multiSelectMode) {
                  onLongPress(message, details.globalPosition);
                }
              },
              child: Row(
                children: [
                  // 多选 checkbox
                  if (multiSelectMode)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Icon(
                        selectedMessages.contains(message.messageId)
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        color: selectedMessages.contains(message.messageId)
                            ? const Color(0xFF00B27A)
                            : Colors.grey,
                        size: 24,
                      ),
                    ),
                  Expanded(
                    child: MessageBubble(
                      message: message,
                      isSelf: isSelf,
                      senderAvatarUrl: senderAvatarUrl,
                      senderName: senderName,
                      senderIdentityLabel:
                          isGroup ? senderIdentity?.label : null,
                      senderIdentityTone: isGroup ? senderIdentity?.tone : null,
                      senderAvatarBadgeLabel:
                          !isGroup ? senderIdentity?.shortLabel : null,
                      senderAvatarBadgeTone:
                          !isGroup ? senderIdentity?.tone : null,
                      showSenderInfo: isGroup && !isSelf,
                      onAvatarTap: !isSelf && message.senderUserId.isNotEmpty
                          ? () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ProfilePage(
                                    userId: message.senderUserId,
                                    allowAddFriendFromGroup:
                                        allowAddFriendFromGroup,
                                  ),
                                ),
                              )
                          : isSelf
                              ? () => context.push('/my-profile')
                              : null,
                      onConvertVoiceToText: message.type == MessageType.voice
                          ? () => onConvertVoiceToText?.call(message)
                          : null,
                      onCallLogTap: message.type == MessageType.callLog
                          ? () => onCallLogTap?.call(message)
                          : null,
                      // 查找被引用的消息，传给气泡显示引用内容
                      replyMessage: message.replyToMessageId != null
                          ? messages
                              .where((m) =>
                                  m.messageId == message.replyToMessageId)
                              .firstOrNull
                          : null,
                      replySenderName: message.replyToMessageId != null
                          ? (() {
                              final replied = messages
                                  .where((m) =>
                                      m.messageId == message.replyToMessageId)
                                  .firstOrNull;
                              if (replied == null) return null;
                              return replied.senderUserId == currentUserId
                                  ? (myName ?? l10n.chatSelf)
                                  : _displayNameForSender(context, replied);
                            })()
                          : null,
                      groupId: isGroup ? conversationId : null,
                      onGroupReadReceiptTap: isGroup &&
                              isSelf &&
                              message.status.isServerUsable &&
                              message.conversationSeq > 0
                          ? () => context.push(
                                '/group-read-receipts/'
                                '${Uri.encodeComponent(conversationId)}/'
                                '${Uri.encodeComponent(message.messageId)}'
                                '?seq=${message.conversationSeq}',
                              )
                          : null,
                      onFailedTap: message.status.isSendFailure && isSelf
                          ? () => onFailedTap?.call(message)
                          : null,
                      // 有时间分隔符时隐藏气泡内时间戳，避免重复
                      showTimestamp: !showTimestamp,
                    ),
                  ),
                ],
              ),
            ), // GestureDetector
          ], // Column children
        ); // Column
      },
    );
    if (mentionReminder == null) return listView;
    return Stack(
      children: [
        listView,
        Positioned(
          top: 8,
          left: 12,
          right: 12,
          child: _MentionReminderJumpBar(
            kind: mentionReminder.kind,
            onTap: () => _scrollToMessage(mentionReminder.messageId),
          ),
        ),
      ],
    );
  }

  UnreadMentionReminder? _latestUnreadMentionReminder() {
    return latestUnreadMentionReminderForMessages(
      messages: messages,
      currentUserId: currentUserId,
      isGroup: isGroup,
      lastReadSeq: mentionReminderReadSeq ?? lastReadSeq,
    );
  }

  void _scrollToMessage(String messageId) {
    final realIndex = messages.indexWhere((m) => m.messageId == messageId);
    if (!scrollController.hasClients) return;
    if (realIndex < 0) {
      scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
      return;
    }
    final renderIndex = messages.length - 1 - realIndex;
    final estimatedOffset = renderIndex * 80.0;
    scrollController.animateTo(
      estimatedOffset.clamp(0.0, scrollController.position.maxScrollExtent),
      duration: const Duration(milliseconds: 360),
      curve: Curves.easeInOut,
    );
  }

  String _displayNameForSender(BuildContext context, Message message) {
    final state = context.findAncestorStateOfType<_ChatPageState>();
    final name = state?._displayNameForUser(message.senderUserId);
    if (name?.trim().isNotEmpty == true) return name!.trim();
    return peerName ?? AppLocalizations.of(context).chatPeer;
  }

  String? _avatarUrlForSender(BuildContext context, Message message) {
    final state = context.findAncestorStateOfType<_ChatPageState>();
    return state?._avatarUrlForUser(message.senderUserId);
  }

  ({String label, String shortLabel, IdentityBadgeTone tone})?
      _identityForSender(BuildContext context, Message message) {
    final state = context.findAncestorStateOfType<_ChatPageState>();
    return state?._identityForUser(message.senderUserId);
  }
}

class _MentionReminderJumpBar extends StatelessWidget {
  final MentionReminderKind kind;
  final VoidCallback onTap;

  const _MentionReminderJumpBar({
    required this.kind,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final text = kind == MentionReminderKind.me ? '有 @你的消息' : '有 @所有人的消息';
    final colorScheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.topCenter,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: const Color(0xFF2F6FED).withValues(alpha: 0.22),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.alternate_email_rounded,
                  size: 15,
                  color: Color(0xFF2F6FED),
                ),
                const SizedBox(width: 6),
                Text(
                  text,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2F6FED),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '查看',
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withValues(alpha: 0.66),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 时间格式化辅助函数
// ---------------------------------------------------------------------------

String _formatMessageTime(DateTime dt, double tzOffset) {
  return formatChatSeparatorTime(dt, tzOffset);
}

// ---------------------------------------------------------------------------
// 转发会话选择页面（全屏，参考微信"选择聊天"页面）
// ---------------------------------------------------------------------------

class _ForwardSelectPage extends StatefulWidget {
  final List<Conversation> conversations;

  const _ForwardSelectPage({required this.conversations});

  @override
  State<_ForwardSelectPage> createState() => _ForwardSelectPageState();
}

class _ForwardSelectPageState extends State<_ForwardSelectPage> {
  String _query = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final filtered = _query.isEmpty
        ? widget.conversations
        : widget.conversations.where((c) {
            final title = c.title.toLowerCase();
            return title.contains(_query.toLowerCase());
          }).toList();

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        leading: TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.commonClose,
              style: const TextStyle(color: Color(0xFF07C160), fontSize: 16)),
        ),
        title: Text(l10n.chatForwardSelectTitle,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D2129))),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 搜索框
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: l10n.commonSearch,
                hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
                prefixIcon: const Icon(Icons.search,
                    color: Color(0xFFAEAEB2), size: 20),
                filled: true,
                fillColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // 会话列表
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (ctx, i) {
                final conv = filtered[i];
                final title = conv.title;
                final isGroup = conv.type == ConversationType.group ||
                    conv.type == ConversationType.tempSession;
                return Container(
                  color: Theme.of(context).colorScheme.surface,
                  child: Column(
                    children: [
                      InkWell(
                        onTap: () => Navigator.of(context).pop(conv),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              isGroup
                                  ? ConversationAvatar(
                                      conversation: conv,
                                      isPersonal: true,
                                      isEmployee: false,
                                      showIdentity: false,
                                    )
                                  : UserAvatar(
                                      avatarUrl: conv.avatarUrl,
                                      name: title,
                                      size: 48,
                                      borderRadius: 24,
                                    ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(title,
                                    style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w400,
                                        color: Color(0xFF1D2129))),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (i < filtered.length - 1)
                        const Divider(
                            height: 1, indent: 76, color: Color(0xFFF2F2F7)),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 名片联系人选择结果
// ---------------------------------------------------------------------------

class _ContactPickResult {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  const _ContactPickResult(
      {required this.userId, required this.displayName, this.avatarUrl});
}

// ---------------------------------------------------------------------------
// 名片联系人选择页面（全屏，参考微信"选择朋友"）
// ---------------------------------------------------------------------------

class _ContactPickPage extends ConsumerStatefulWidget {
  const _ContactPickPage();

  @override
  ConsumerState<_ContactPickPage> createState() => _ContactPickPageState();
}

class _ContactPickPageState extends ConsumerState<_ContactPickPage> {
  String _query = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final friendsAsync = ref.watch(friendsProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Color(0xFF1D2129)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.chatContactSelectTitle,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D2129))),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 搜索框
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: l10n.commonSearch,
                hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
                prefixIcon: const Icon(Icons.search,
                    color: Color(0xFFAEAEB2), size: 20),
                filled: true,
                fillColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: friendsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => Center(child: Text(l10n.commonLoadFailed)),
              data: (friends) {
                final filtered = _query.isEmpty
                    ? friends
                    : friends
                        .where((f) => f.displayName
                            .toLowerCase()
                            .contains(_query.toLowerCase()))
                        .toList();
                if (filtered.isEmpty) {
                  return Center(
                      child: Text(l10n.chatNoContacts,
                          style: const TextStyle(color: Color(0xFF8E8E93))));
                }
                return ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) {
                    final f = filtered[i];
                    return Container(
                      color: Theme.of(context).colorScheme.surface,
                      child: Column(
                        children: [
                          InkWell(
                            onTap: () => Navigator.of(context).pop(
                              _ContactPickResult(
                                userId: f.userId,
                                displayName: f.displayName,
                                avatarUrl: f.avatarUrl,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                              child: Row(
                                children: [
                                  UserAvatar(
                                    avatarUrl: f.avatarUrl,
                                    name: f.displayName,
                                    size: 48,
                                    borderRadius: 24,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(f.displayName,
                                        style: const TextStyle(
                                            fontSize: 16,
                                            color: Color(0xFF1D2129))),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (i < filtered.length - 1)
                            const Divider(
                                height: 1,
                                indent: 76,
                                color: Color(0xFFF2F2F7)),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 微信风格长按菜单
// ---------------------------------------------------------------------------

class _WxMenuItem {
  final String value;
  final IconData icon;
  final String label;
  final bool danger;
  const _WxMenuItem(this.value, this.icon, this.label, {this.danger = false});
}

class _WxMessageMenu extends StatelessWidget {
  final Offset position;
  final List<_WxMenuItem> items;
  final Size screenSize;

  const _WxMessageMenu({
    required this.position,
    required this.items,
    required this.screenSize,
  });

  static const double _itemW = 64.0;
  static const double _itemH = 64.0;
  static const int _maxCols = 5;

  @override
  Widget build(BuildContext context) {
    final availableW = screenSize.width - 16;
    var cols = (availableW / _itemW).floor();
    if (cols < 1) cols = 1;
    if (cols > _maxCols) cols = _maxCols;
    final menuW = _itemW * cols;

    // 每行最多 5 个，计算行数
    final rows = (items.length / cols).ceil();
    final menuH = rows * _itemH + 12.0; // 12 = padding

    // 计算菜单位置：优先显示在长按点上方，避免超出屏幕
    double left = position.dx - menuW / 2;
    double top = position.dy - menuH - 16;

    // 左右边界保护
    if (left < 8) left = 8;
    if (left + menuW > screenSize.width - 8) {
      left = screenSize.width - menuW - 8;
    }
    // 上方空间不足时显示在下方
    if (top < 80) top = position.dy + 16;
    if (top + menuH > screenSize.height - 8) {
      top = screenSize.height - menuH - 8;
    }
    if (top < 8) top = 8;

    return Stack(
      children: [
        // 点击空白区域关闭
        Positioned.fill(
          child: GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            behavior: HitTestBehavior.opaque,
            child: const SizedBox.expand(),
          ),
        ),
        // 菜单主体
        Positioned(
          left: left,
          top: top,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: menuW,
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A1A),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Wrap(
                children:
                    items.map((item) => _buildItem(context, item)).toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildItem(BuildContext context, _WxMenuItem item) {
    final color = item.danger ? const Color(0xFFFF6B6B) : Colors.white;
    return GestureDetector(
      onTap: () => Navigator.of(context).pop(item.value),
      child: SizedBox(
        width: _itemW,
        height: _itemH,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, size: 22, color: color),
            const SizedBox(height: 4),
            Text(
              item.label,
              style: TextStyle(fontSize: 11, color: color),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
