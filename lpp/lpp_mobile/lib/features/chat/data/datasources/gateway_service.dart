import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/platform/app_platform.dart';
import 'package:signalr_netcore/signalr_client.dart';

Object? _readField(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    if (map.containsKey(key)) return map[key];
  }
  final lowerKeys = {
    for (final entry in map.entries) entry.key.toLowerCase(): entry.value,
  };
  for (final key in keys) {
    if (lowerKeys.containsKey(key.toLowerCase())) {
      return lowerKeys[key.toLowerCase()];
    }
  }
  return null;
}

String _readString(Map<String, dynamic> map, List<String> keys,
    {String fallback = ''}) {
  final value = _readField(map, keys);
  if (value == null) return fallback;
  final text = value.toString();
  return text.isEmpty ? fallback : text;
}

Map<String, dynamic>? _readMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is String) {
    final text = value.trim();
    if (!text.startsWith('{')) return null;
    try {
      final decoded = jsonDecode(text);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// Gateway 事件类型
// ---------------------------------------------------------------------------

sealed class GatewayEvent {}

enum GatewayConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

GatewayConnectionStatus effectiveGatewayConnectionStatus(
  GatewayConnectionStatus status, {
  required bool isConnected,
}) {
  if (isConnected && status != GatewayConnectionStatus.disconnected) {
    return GatewayConnectionStatus.connected;
  }
  return status;
}

const Duration gatewayConnectionStartTimeout = Duration(seconds: 12);

Future<T?> awaitGatewayConnectionStart<T>(
  Future<T>? startFuture, {
  Duration timeout = gatewayConnectionStartTimeout,
}) {
  if (startFuture == null) return Future<T?>.value();
  return startFuture.timeout(
    timeout,
    onTimeout: () {
      throw TimeoutException(
        'Gateway connection start timed out after ${timeout.inSeconds}s',
        timeout,
      );
    },
  );
}

String syncCursorStorageKey({
  required String spaceId,
  required String userId,
}) {
  return 'sync_cursor_${spaceId}_$userId';
}

class NewMessageEvent extends GatewayEvent {
  final Map<String, dynamic> data;
  NewMessageEvent(this.data);
}

class SpaceNoticeEvent extends GatewayEvent {
  final String noticeType;

  /// 来源空间类型（1=personal, 2=tenant）
  final int sourceSpaceType;
  final String? sourceTenantId;
  final String? sourceTenantName;
  final int targetUnreadConversationCount;
  final int targetUnreadMessageCount;
  final int globalUnreadSpaceCount;
  final int globalTotalUnreadConversationCount;
  final int globalTotalUnreadMessageCount;
  SpaceNoticeEvent({
    required this.noticeType,
    required this.sourceSpaceType,
    this.sourceTenantId,
    this.sourceTenantName,
    required this.targetUnreadConversationCount,
    required this.targetUnreadMessageCount,
    required this.globalUnreadSpaceCount,
    required this.globalTotalUnreadConversationCount,
    required this.globalTotalUnreadMessageCount,
  });
}

class PresenceChangedEvent extends GatewayEvent {
  final String userId;
  final bool isOnline;
  final String? customStatus;
  PresenceChangedEvent({
    required this.userId,
    required this.isOnline,
    this.customStatus,
  });
}

/// msg.read — 对端已读回执
class MessageReadEvent extends GatewayEvent {
  final String conversationId;
  final String userId;
  final int readSeq;
  final DateTime? readAt;
  MessageReadEvent({
    required this.conversationId,
    required this.userId,
    required this.readSeq,
    this.readAt,
  });
}

/// msg.recalled — 消息撤回
class MessageRecalledEvent extends GatewayEvent {
  final String messageId;
  final String conversationId;
  final int conversationSeq;
  final String operatorUserId;
  final bool silent;
  MessageRecalledEvent({
    required this.messageId,
    required this.conversationId,
    required this.conversationSeq,
    required this.operatorUserId,
    this.silent = false,
  });
}

class CustomerServiceTypingEvent extends GatewayEvent {
  final String threadType;
  final String threadId;
  final String conversationId;
  final String senderUserId;
  final String? senderRole;
  final String? preview;
  final bool isTyping;
  final DateTime? at;

  CustomerServiceTypingEvent({
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    required this.senderUserId,
    this.senderRole,
    this.preview,
    required this.isTyping,
    this.at,
  });
}

class CustomerServiceThreadTransferredEvent extends GatewayEvent {
  final String threadType;
  final String threadId;
  final String conversationId;
  final String? customerUserId;
  final String? fromStaffUserId;
  final String toStaffUserId;
  final String? reason;
  final String? recipientRole;
  final DateTime? transferredAt;

  CustomerServiceThreadTransferredEvent({
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    this.customerUserId,
    this.fromStaffUserId,
    required this.toStaffUserId,
    this.reason,
    this.recipientRole,
    this.transferredAt,
  });
}

/// auth.* — 强制登出/凭证失效/安全事件
class ForceLogoutEvent extends GatewayEvent {
  final String platformUserId;
  final String? deviceId;
  final String reason;
  ForceLogoutEvent({
    required this.platformUserId,
    this.deviceId,
    required this.reason,
  });
}

/// customer_service.assigned — 客服归属变更
class CustomerServiceAssignedEvent extends GatewayEvent {
  final String tenantId;
  final String customerUserId;
  final String staffUserId;
  final String? staffDisplayName;
  final bool transferConversation;
  CustomerServiceAssignedEvent({
    required this.tenantId,
    required this.customerUserId,
    required this.staffUserId,
    this.staffDisplayName,
    required this.transferConversation,
  });
}

/// temp_session.assigned — 临时会话分配给客服
class TempSessionAssignedEvent extends GatewayEvent {
  final String tenantId;
  final String sessionId;
  final String staffUserId;
  TempSessionAssignedEvent({
    required this.tenantId,
    required this.sessionId,
    required this.staffUserId,
  });
}

/// temp_session.closed — 临时会话关闭
class TempSessionClosedEvent extends GatewayEvent {
  final String tenantId;
  final String sessionId;
  final String status;
  final String? reasonCode;
  TempSessionClosedEvent({
    required this.tenantId,
    required this.sessionId,
    required this.status,
    this.reasonCode,
  });
}

/// temp_session.rated — 访客评价
class TempSessionRatedEvent extends GatewayEvent {
  final String tenantId;
  final String sessionId;
  final int rating;
  TempSessionRatedEvent({
    required this.tenantId,
    required this.sessionId,
    required this.rating,
  });
}

/// tenant.join_request.reviewed — 加入申请审核结果（当前仅拒绝时推送）
class TenantJoinRequestReviewedEvent extends GatewayEvent {
  final String tenantId;
  final String requestId;
  final String status; // 'rejected'
  final String? rejectReason;
  TenantJoinRequestReviewedEvent({
    required this.tenantId,
    required this.requestId,
    required this.status,
    this.rejectReason,
  });
}

/// friend.request.* — 好友申请创建/处理结果
class FriendRequestChangedEvent extends GatewayEvent {
  final String requestId;
  final String status;
  final String eventName;
  final String? peerUserId;
  final String? peerDisplayName;
  final String? peerAvatarUrl;
  final String? requestMessage;

  FriendRequestChangedEvent({
    required this.requestId,
    required this.status,
    required this.eventName,
    this.peerUserId,
    this.peerDisplayName,
    this.peerAvatarUrl,
    this.requestMessage,
  });
}

/// customer_service.status_changed / auto_status_changed — 在线客服状态变化
class CustomerServiceStatusChangedEvent extends GatewayEvent {
  final String staffUserId;
  final String serviceStatus;
  final bool? queueAcceptEnabled;
  final String eventName;

  CustomerServiceStatusChangedEvent({
    required this.staffUserId,
    required this.serviceStatus,
    this.queueAcceptEnabled,
    this.eventName = '',
  });
}

/// customer_service.sla.* — SLA 风险/违约
class CustomerServiceSlaEvent extends GatewayEvent {
  final String threadId;
  final String riskLevel;
  final String eventName;

  CustomerServiceSlaEvent({
    required this.threadId,
    required this.riskLevel,
    required this.eventName,
  });
}

/// friend.profile.updated — 好友资料扩展信息更新
class FriendProfileUpdatedEvent extends GatewayEvent {
  final String friendUserId;

  FriendProfileUpdatedEvent({required this.friendUserId});
}

/// voicecall.incoming — 跨节点来电通知
class VoiceCallIncomingEvent extends GatewayEvent {
  final String callId;
  final String callerUserId;
  final String callerDisplayName;
  final String relayUrl;
  final String mediaMode;
  final String? callerVideoProfile;

  VoiceCallIncomingEvent({
    required this.callId,
    required this.callerUserId,
    required this.callerDisplayName,
    required this.relayUrl,
    required this.mediaMode,
    this.callerVideoProfile,
  });
}

// ---------------------------------------------------------------------------
// GatewayService
// ---------------------------------------------------------------------------

/// SignalR Gateway 服务
///
/// - Hub 路径：/ws/client
/// - 认证：Authorization: Bearer {accessToken}（通过 accessTokenFactory 注入）
/// - 指数退避重连：初始 1 秒，最大 30 秒
/// - 重连成功后触发 [onReconnected] 回调（由 gateway_provider 调用 /sync）
class GatewayService {
  static const String _publicVoiceRelayHost = '64.185.229.74';

  HubConnection? _connection;
  final StreamController<GatewayEvent> _eventController =
      StreamController<GatewayEvent>.broadcast();
  final StreamController<GatewayConnectionStatus> _statusController =
      StreamController<GatewayConnectionStatus>.broadcast();

  bool _disposed = false;
  int _retryCount = 0;
  Timer? _retryTimer;
  Timer? _heartbeatTimer;
  GatewayConnectionStatus _status = GatewayConnectionStatus.disconnected;

  // 重连成功回调（由外部注入，用于触发 /sync）
  Future<void> Function()? onReconnected;

  // ---------------------------------------------------------------------------
  // 公开 API
  // ---------------------------------------------------------------------------

  bool get isConnected => _connection?.state == HubConnectionState.Connected;

  Stream<GatewayEvent> get events => _eventController.stream;
  GatewayConnectionStatus get status => effectiveGatewayConnectionStatus(
        _status,
        isConnected: isConnected,
      );
  Stream<GatewayConnectionStatus> get statusStream => _statusController.stream;

  /// 连接到 Gateway
  Future<void> connect(String accessToken, String baseUrl) async {
    // 如果已连接，先断开
    if (_connection != null) {
      await disconnect();
    }
    _retryCount = 0;
    await _doConnect(accessToken, baseUrl);
  }

  /// 断开连接
  Future<void> disconnect() async {
    _retryTimer?.cancel();
    _retryTimer = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    final conn = _connection;
    _connection = null;
    _setStatus(GatewayConnectionStatus.disconnected);
    if (conn != null) {
      try {
        await conn.stop();
      } catch (_) {}
    }
  }

  /// 心跳（HeartbeatAsync）
  Future<void> heartbeat() async {
    if (!isConnected) return;
    try {
      await _connection!.invoke('HeartbeatAsync', args: [_gatewayPlatform()]);
    } catch (_) {}
  }

  /// 标记已读（ReadAsync）
  Future<void> markRead(String conversationId, int readSeq) async {
    if (!isConnected) return;
    await _connection!.invoke(
      'ReadAsync',
      args: [conversationId, readSeq],
    );
  }

  /// 释放资源
  void dispose() {
    _disposed = true;
    _retryTimer?.cancel();
    disconnect();
    _eventController.close();
    _statusController.close();
  }

  // ---------------------------------------------------------------------------
  // 内部实现
  // ---------------------------------------------------------------------------

  Future<void> _doConnect(String accessToken, String baseUrl) async {
    if (_disposed) return;
    _setStatus(
      _retryCount == 0
          ? GatewayConnectionStatus.connecting
          : GatewayConnectionStatus.reconnecting,
    );

    final wsUrl = '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/ws/client';

    final connection = HubConnectionBuilder()
        .withUrl(
          wsUrl,
          options: HttpConnectionOptions(
            accessTokenFactory: () async => accessToken,
          ),
        )
        .withAutomaticReconnect(retryDelays: _retryDelays())
        .build();

    // 注册下行事件
    connection.on('msg.new', _onMsgNew);
    connection.on('msg.read', _onMsgRead);
    connection.on('msg.recalled', _onMsgRecalled);
    connection.on('msg.typing', _onDirectTyping);
    connection.on('auth.force_logout', _onForceLogout);
    connection.on('auth.session.revoked', _onForceLogout);
    connection.on('auth.device.kicked', _onForceLogout);
    connection.on('auth.password.changed', _onForceLogout);
    connection.on('auth.security.required', _onForceLogout);
    connection.on('auth.reuse.detected', _onForceLogout);
    connection.on('customer_service.assigned', _onCustomerServiceAssigned);
    connection.on('temp_session.assigned', _onTempSessionAssigned);
    connection.on('temp_session.closed', _onTempSessionClosed);
    connection.on('temp_session.rated', _onTempSessionRated);
    connection.on('temp_session.typing', _onTempSessionTyping);
    connection.on('temp_session.transferred', _onTempSessionTransferred);
    connection.on('customer_service.thread.transferred',
        _onCustomerServiceThreadTransferred);
    connection.on('tenant.join_request.reviewed', _onTenantJoinRequestReviewed);
    connection.on('friend.request.created', _onFriendRequestChanged);
    connection.on('friend.request.accepted', _onFriendRequestChanged);
    connection.on('friend.request.rejected', _onFriendRequestChanged);
    connection.on(
        'customer_service.status_changed', _onCustomerServiceStatusChanged);
    connection.on('customer_service.auto_status_changed',
        _onCustomerServiceStatusChanged);
    connection.on('customer_service.staff.status_changed',
        _onCustomerServiceStatusChanged);
    connection.on(
        'customer_service.staff.auto_offline', _onCustomerServiceStatusChanged);
    connection.on('customer_service.sla.warning', _onCustomerServiceSla);
    connection.on('customer_service.sla.breached', _onCustomerServiceSla);
    connection.on('friend.profile.updated', _onFriendProfileUpdated);
    connection.on('voicecall.incoming', _onVoiceCallIncoming);
    connection.on('presence.changed', _onPresenceChanged);
    connection.on('space.notice', _onSpaceNotice);

    // 连接关闭时触发重连
    connection.onclose(({Exception? error}) {
      _heartbeatTimer?.cancel();
      _heartbeatTimer = null;
      if (!_disposed && _connection != null) {
        _setStatus(GatewayConnectionStatus.reconnecting);
        _scheduleReconnect(accessToken, baseUrl);
      } else if (!_disposed) {
        _setStatus(GatewayConnectionStatus.disconnected);
      }
    });

    // 重连成功回调
    connection.onreconnected(({String? connectionId}) {
      _retryCount = 0;
      _setStatus(GatewayConnectionStatus.connected);
      _startHeartbeat();
      onReconnected?.call();
    });

    _connection = connection;

    try {
      await awaitGatewayConnectionStart(connection.start());
      if (_connection != connection) {
        unawaited(connection.stop().catchError((_) {}));
        return;
      }
      _retryCount = 0;
      _setStatus(GatewayConnectionStatus.connected);
      _startHeartbeat();
    } on TimeoutException catch (error) {
      debugPrint('[GatewayService] connection start timeout: $error');
      _setStatus(GatewayConnectionStatus.reconnecting);
      _scheduleReconnect(accessToken, baseUrl);
      unawaited(connection.stop().catchError((_) {}));
    } catch (error) {
      debugPrint('[GatewayService] connection start failed: $error');
      _setStatus(GatewayConnectionStatus.reconnecting);
      _scheduleReconnect(accessToken, baseUrl);
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    heartbeat();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      heartbeat();
    });
  }

  void _onMsgNew(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(NewMessageEvent(data));
  }

  void _onPresenceChanged(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(
      PresenceChangedEvent(
        userId: data['userId'] as String? ?? '',
        isOnline: data['isOnline'] as bool? ?? false,
        customStatus: data['customStatus'] as String?,
      ),
    );
  }

  void _onSpaceNotice(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(
      SpaceNoticeEvent(
        noticeType: data['noticeType'] as String? ?? 'message',
        sourceSpaceType: data['sourceSpaceType'] as int? ?? 2,
        sourceTenantId: data['sourceTenantId'] as String?,
        sourceTenantName: data['sourceTenantName'] as String?,
        targetUnreadConversationCount:
            data['targetUnreadConversationCount'] as int? ?? 0,
        targetUnreadMessageCount: data['targetUnreadMessageCount'] as int? ?? 0,
        globalUnreadSpaceCount: data['globalUnreadSpaceCount'] as int? ?? 0,
        globalTotalUnreadConversationCount:
            data['globalTotalUnreadConversationCount'] as int? ?? 0,
        globalTotalUnreadMessageCount:
            data['globalTotalUnreadMessageCount'] as int? ?? 0,
      ),
    );
  }

  void _onMsgRead(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(MessageReadEvent(
      conversationId: data['conversationId'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      readSeq: data['readSeq'] as int? ?? 0,
      readAt: DateTime.tryParse(data['readAt']?.toString() ?? ''),
    ));
  }

  void _onMsgRecalled(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(MessageRecalledEvent(
      messageId: data['messageId'] as String? ?? '',
      conversationId: data['conversationId'] as String? ?? '',
      conversationSeq: data['conversationSeq'] as int? ?? 0,
      operatorUserId: data['operatorUserId'] as String? ?? '',
      silent: data['silent'] as bool? ?? false,
    ));
  }

  void _onTempSessionTyping(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceTypingEvent(
      threadType: 'temp_session',
      threadId: data['sessionId'] as String? ?? '',
      conversationId: data['conversationId'] as String? ?? '',
      senderUserId: data['senderUserId'] as String? ?? '',
      senderRole: data['senderType'] as String? ?? data['senderRole'] as String?,
      preview: data['preview'] as String?,
      isTyping: data['isTyping'] as bool? ?? false,
      at: DateTime.tryParse(data['at']?.toString() ?? ''),
    ));
  }

  void _onDirectTyping(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceTypingEvent(
      threadType: 'im_direct',
      threadId: data['conversationId'] as String? ?? '',
      conversationId: data['conversationId'] as String? ?? '',
      senderUserId: data['senderUserId'] as String? ?? '',
      senderRole: data['senderType'] as String? ?? data['senderRole'] as String?,
      preview: data['preview'] as String?,
      isTyping: data['isTyping'] as bool? ?? false,
      at: DateTime.tryParse(data['at']?.toString() ?? ''),
    ));
  }

  void _onTempSessionTransferred(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceThreadTransferredEvent(
      threadType: 'temp_session',
      threadId: data['sessionId'] as String? ?? data['threadId'] as String? ?? '',
      conversationId: data['conversationId'] as String? ?? '',
      fromStaffUserId: data['fromStaffUserId'] as String?,
      toStaffUserId: data['toStaffUserId'] as String? ?? '',
      reason: data['reason'] as String?,
      recipientRole: data['recipientRole'] as String?,
      transferredAt: DateTime.tryParse(data['transferredAt']?.toString() ?? ''),
    ));
  }

  void _onCustomerServiceThreadTransferred(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceThreadTransferredEvent(
      threadType: 'im_direct',
      threadId: data['threadId'] as String? ?? '',
      conversationId: data['conversationId'] as String? ?? '',
      customerUserId: data['customerUserId'] as String?,
      fromStaffUserId: data['fromStaffUserId'] as String?,
      toStaffUserId: data['toStaffUserId'] as String? ?? '',
      reason: data['reason'] as String?,
      recipientRole: data['recipientRole'] as String?,
      transferredAt: DateTime.tryParse(data['transferredAt']?.toString() ?? ''),
    ));
  }

  void _onForceLogout(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(ForceLogoutEvent(
      platformUserId: _readString(
        data,
        const ['platformUserId', 'PlatformUserId', 'entityId', 'EntityId'],
        fallback: _readString(envelope ?? const {}, const ['entityId']),
      ),
      deviceId: _readString(data, const ['deviceId', 'DeviceId']),
      reason: _readString(
        data,
        const ['reason', 'Reason', 'eventType', 'EventType', 'type', 'Type'],
        fallback: _readString(
          envelope ?? const {},
          const ['eventType', 'EventType', 'type', 'Type'],
          fallback: 'force_logout',
        ),
      ),
    ));
  }

  void _onCustomerServiceAssigned(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceAssignedEvent(
      tenantId: data['tenantId'] as String? ?? '',
      customerUserId: data['customerUserId'] as String? ?? '',
      staffUserId: data['staffUserId'] as String? ?? '',
      staffDisplayName: data['staffDisplayName'] as String?,
      transferConversation: data['transferConversation'] as bool? ?? false,
    ));
  }

  void _onTempSessionAssigned(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(TempSessionAssignedEvent(
      tenantId: data['tenantId'] as String? ?? '',
      sessionId: data['sessionId'] as String? ?? '',
      staffUserId: data['staffUserId'] as String? ?? '',
    ));
  }

  void _onTempSessionClosed(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(TempSessionClosedEvent(
      tenantId: data['tenantId'] as String? ?? '',
      sessionId: data['sessionId'] as String? ?? '',
      status: data['status'] as String? ?? 'closed',
      reasonCode: data['reasonCode'] as String?,
    ));
  }

  void _onTempSessionRated(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(TempSessionRatedEvent(
      tenantId: data['tenantId'] as String? ?? '',
      sessionId: data['sessionId'] as String? ?? '',
      rating: data['rating'] as int? ?? 0,
    ));
  }

  void _onTenantJoinRequestReviewed(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(TenantJoinRequestReviewedEvent(
      tenantId: data['tenantId'] as String? ?? '',
      requestId: data['requestId'] as String? ?? '',
      status: data['status'] as String? ?? 'rejected',
      rejectReason: data['rejectReason'] as String?,
    ));
  }

  void _onFriendRequestChanged(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    final data = _eventData(args);
    if (data == null) return;
    final eventName = _readString(
      envelope ?? data,
      const ['event', 'Event', 'type', 'Type'],
      fallback: '',
    );
    _eventController.add(FriendRequestChangedEvent(
      requestId: _readString(data, const ['requestId', 'RequestId']),
      status: _readString(data, const ['status', 'Status'], fallback: ''),
      eventName: eventName,
      peerUserId: _readString(
        data,
        const [
          'peerUserId',
          'PeerUserId',
          'friendUserId',
          'FriendUserId',
        ],
        fallback: '',
      ),
      peerDisplayName: _readString(
        data,
        const [
          'peerDisplayName',
          'PeerDisplayName',
          'friendDisplayName',
          'FriendDisplayName',
        ],
        fallback: '',
      ),
      peerAvatarUrl: _readString(
        data,
        const [
          'peerAvatarUrl',
          'PeerAvatarUrl',
          'friendAvatarUrl',
          'FriendAvatarUrl',
        ],
        fallback: '',
      ),
      requestMessage: _readString(
        data,
        const ['message', 'Message', 'requestMessage', 'RequestMessage'],
        fallback: '',
      ),
    ));
  }

  void _onCustomerServiceStatusChanged(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    final data = _eventData(args);
    if (data == null) return;
    final rawQueueAcceptEnabled = _readField(
      data,
      const ['queueAcceptEnabled', 'QueueAcceptEnabled'],
    );
    _eventController.add(CustomerServiceStatusChangedEvent(
      staffUserId: _readString(data, const ['staffUserId', 'StaffUserId']),
      serviceStatus: _readString(
        data,
        const [
          'serviceStatus',
          'ServiceStatus',
          'status',
          'Status',
          'newStatus',
          'NewStatus'
        ],
        fallback: 'offline',
      ),
      queueAcceptEnabled:
          rawQueueAcceptEnabled is bool ? rawQueueAcceptEnabled : null,
      eventName: _readString(
        envelope ?? data,
        const ['eventType', 'EventType', 'type', 'Type'],
      ),
    ));
  }

  void _onCustomerServiceSla(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(CustomerServiceSlaEvent(
      threadId: _readString(
        data,
        const ['threadId', 'ThreadId', 'entityId', 'EntityId'],
        fallback: _readString(envelope ?? const {}, const ['entityId']),
      ),
      riskLevel: _readString(
        data,
        const ['riskLevel', 'RiskLevel', 'level', 'Level'],
      ),
      eventName: _readString(
        envelope ?? data,
        const ['eventType', 'EventType', 'type', 'Type'],
      ),
    ));
  }

  void _onFriendProfileUpdated(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    final data = _eventData(args);
    if (data == null) return;
    _eventController.add(FriendProfileUpdatedEvent(
      friendUserId: _readString(
        data,
        const ['friendUserId', 'FriendUserId', 'userId', 'UserId'],
        fallback: _readString(envelope ?? const {}, const ['entityId']),
      ),
    ));
  }

  void _onVoiceCallIncoming(List<Object?>? args) {
    final data = _eventData(args);
    if (data == null) return;
    final relay = _readMap(_readField(data, const ['relay', 'Relay'])) ??
        _readMap(_readField(data, const ['node', 'Node'])) ??
        const <String, dynamic>{};
    final callId = _readString(data, const ['callId', 'CallId', 'sessionId']);
    final rawRelayUrl = _readString(
      data,
      const ['relayUrl', 'RelayUrl', 'hubUrl', 'HubUrl', 'relayHubUrl'],
      fallback: _readString(
        relay,
        const ['relayUrl', 'RelayUrl', 'hubUrl', 'HubUrl', 'publicBaseUrl'],
      ),
    );
    final relayUrl = _normalizeVoiceRelayUrl(rawRelayUrl);
    if (callId.isEmpty || relayUrl.isEmpty) {
      debugPrint(
        '[GatewayService] drop voicecall.incoming: missing callId or relayUrl, data=$data',
      );
      return;
    }
    debugPrint(
      '[GatewayService] voicecall.incoming callId=$callId relayUrl=$relayUrl',
    );
    _eventController.add(VoiceCallIncomingEvent(
      callId: callId,
      callerUserId: _readString(data,
          const ['callerUserId', 'CallerUserId', 'callerId', 'fromUserId']),
      callerDisplayName: _readString(
        data,
        const [
          'callerDisplayName',
          'CallerDisplayName',
          'callerName',
          'displayName',
          'fromDisplayName',
        ],
      ),
      relayUrl: relayUrl,
      mediaMode: _readString(
        data,
        const ['mediaMode', 'MediaMode', 'media_mode'],
        fallback: 'audio',
      ),
      callerVideoProfile: _readString(
        data,
        const [
          'callerVideoProfile',
          'CallerVideoProfile',
          'caller_video_profile',
          'videoProfile',
          'VideoProfile',
        ],
      ),
    ));
  }

  String _normalizeVoiceRelayUrl(String relayUrl) {
    final uri = Uri.tryParse(relayUrl.trim());
    if (uri == null || !uri.hasScheme) return relayUrl;

    final normalizedHost =
        _isLocalVoiceRelayHost(uri.host) ? _publicVoiceRelayHost : uri.host;
    if (normalizedHost == uri.host) return relayUrl;

    final normalized = uri.replace(host: normalizedHost).toString();
    debugPrint(
      '[GatewayService] replace unavailable voice relay host '
      '${uri.host} -> $normalizedHost',
    );
    return normalized;
  }

  bool _isLocalVoiceRelayHost(String host) {
    final normalized = host.toLowerCase();
    return normalized == '0.0.0.0' ||
        normalized == '::' ||
        normalized == '::1' ||
        normalized == 'localhost' ||
        normalized == '127.0.0.1';
  }

  Map<String, dynamic>? _eventData(List<Object?>? args) {
    final envelope = _mapFromFirstArg(args);
    if (envelope == null) return null;
    final nestedData = _readField(envelope, const ['data', 'Data']);
    final nestedMap = _readMap(nestedData);
    if (nestedMap != null) return nestedMap;
    return envelope;
  }

  Map<String, dynamic>? _mapFromFirstArg(List<Object?>? args) {
    if (args == null || args.isEmpty) return null;
    return _readMap(args[0]);
  }

  void _scheduleReconnect(String accessToken, String baseUrl) {
    if (_disposed) return;
    _setStatus(GatewayConnectionStatus.reconnecting);
    final delay = _backoffDelay(_retryCount);
    _retryCount++;
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, () {
      if (!_disposed) {
        _doConnect(accessToken, baseUrl);
      }
    });
  }

  /// 指数退避延迟：初始 1 秒，最大 30 秒
  Duration _backoffDelay(int attempt) {
    final seconds = (1 << attempt).clamp(1, 30);
    return Duration(seconds: seconds);
  }

  /// SignalR 自动重连延迟序列（毫秒）
  List<int> _retryDelays() => [1000, 2000, 4000, 8000, 16000, 30000];

  void _setStatus(GatewayConnectionStatus status) {
    final previousStatus = _status;
    _status = status;
    if (previousStatus != status && !_statusController.isClosed) {
      _statusController.add(this.status);
    }
  }

  String _gatewayPlatform() => AppPlatformInfo.gatewayPlatform;
}
