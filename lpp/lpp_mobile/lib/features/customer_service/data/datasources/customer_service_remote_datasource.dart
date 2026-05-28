import 'package:dio/dio.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';

class CustomerServiceRemoteDataSource {
  final Dio _dio;

  const CustomerServiceRemoteDataSource(this._dio);

  Future<CsThreadsData> getThreads() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CsThreadsData.fromJson(data);
    } on DioException catch (e) {
      if (!_shouldFallbackToLegacyTempSessions(e)) rethrow;
      return _getLegacyTempSessionThreads();
    }
  }

  Future<CsDashboardData> getDashboard() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/dashboard',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CsDashboardData.fromJson(data);
    } on DioException catch (e) {
      if (!_shouldFallbackToLegacyTempSessions(e)) rethrow;
      return _getLegacyTempSessionDashboard();
    }
  }

  Future<List<CsThread>> getStaffServiceHistory({
    String threadType = 'temp_session',
    int limit = 50,
    String? cursor,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/staff/service-history',
      queryParameters: {
        'threadType': threadType,
        'limit': limit,
        if (cursor != null && cursor.trim().isNotEmpty) 'cursor': cursor.trim(),
      },
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      List<dynamic> items => items,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => CsThread.fromServiceHistoryJson(
              Map<String, dynamic>.from(e),
            ))
        .where((thread) => thread.isTempSession && thread.isTerminal)
        .toList(growable: false);
  }

  Future<CsReceptionStatus> getReceptionStatus() async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/reception/status',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsReceptionStatus.fromJson(data);
  }

  Future<CsReceptionStatus> updateReceptionStatus({
    required String serviceStatus,
    bool? queueAcceptEnabled,
    int? maxConcurrentSessions,
  }) async {
    final resp = await _dio.put<Map<String, dynamic>>(
      '/api/client/v1/customer-service/reception/status',
      data: {
        'serviceStatus': serviceStatus,
        if (queueAcceptEnabled != null)
          'queueAcceptEnabled': queueAcceptEnabled,
        if (maxConcurrentSessions != null)
          'maxConcurrentSessions': maxConcurrentSessions,
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsReceptionStatus.fromJson(data);
  }

  Future<List<CsQuickReply>> getQuickReplies({String? scope}) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/quick-replies',
      queryParameters: {
        if (scope != null && scope.isNotEmpty) 'scope': scope,
      },
    );
    final data = resp.data?['data'] as List<dynamic>? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => CsQuickReply.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) {
        final order = a.sortOrder.compareTo(b.sortOrder);
        if (order != 0) return order;
        return a.title.compareTo(b.title);
      });
  }

  Future<CsThreadDetail> getThread(CsThread thread) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads/${thread.routeType}/${thread.threadId}',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CsThreadDetail.fromJson(data);
    } on DioException catch (e) {
      if (!thread.isTempSession || !_shouldFallbackToLegacyTempSessions(e)) {
        rethrow;
      }
      return _getLegacyTempSessionDetail(thread.threadId);
    }
  }

  Future<CustomerProfileCard> getCustomerProfileCard(
    String customerUserId, {
    String? threadType,
    String? threadId,
  }) async {
    if (threadType?.trim().isNotEmpty == true &&
        threadId?.trim().isNotEmpty == true) {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads/${_serverThreadType(threadType!)}/${threadId!.trim()}/profile-card',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CustomerProfileCard.fromJson(data);
    }
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/workbench/customers/$customerUserId/profile-card',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CustomerProfileCard.fromJson(data);
  }

  Future<Message> sendThreadMessage({
    required String threadType,
    required String threadId,
    required String conversationId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    String? senderUserId,
  }) async {
    final routeType = threadType.replaceAll('-', '_') == 'temp_session'
        ? 'temp-session'
        : 'direct-customer';
    final requestBody = {
      'clientMsgId': clientMsgId,
      'messageType': MessageModel.toJson(Message(
        messageId: clientMsgId,
        clientMsgId: clientMsgId,
        conversationId: conversationId,
        conversationSeq: 0,
        senderUserId: senderUserId ?? '',
        type: type,
        body: body,
        sentAt: DateTime.now(),
      ))['messageType'],
      'body': body.toJson(),
      if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
    };
    final resp = await _postThreadMessage(
      routeType: routeType,
      threadId: threadId,
      body: requestBody,
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return Message(
      messageId: data['messageId'] as String? ?? clientMsgId,
      clientMsgId: clientMsgId,
      conversationId: data['conversationId'] as String? ?? conversationId,
      conversationSeq: data['conversationSeq'] as int? ?? 0,
      senderUserId: senderUserId ?? '',
      type: type,
      body: body,
      sentAt: DateTime.tryParse(
            data['sentAt'] as String? ?? data['serverTime'] as String? ?? '',
          ) ??
          DateTime.now(),
      replyToMessageId: replyToMessageId,
      status: MessageStatus.sent,
    );
  }

  Future<CsThreadDetail> claimThread(CsThread thread) async {
    try {
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads/${thread.routeType}/${thread.threadId}/claim',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CsThreadDetail.fromJson(data);
    } on DioException catch (e) {
      if (!thread.isTempSession || !_shouldFallbackToLegacyTempSessions(e)) {
        rethrow;
      }
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/temp-sessions/${thread.threadId}/claim',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return _legacyTempSessionDetailFromJson(data);
    }
  }

  Future<CsThreadDetail> takeoverThread(CsThread thread) async {
    try {
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads/${thread.routeType}/${thread.threadId}/takeover',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return CsThreadDetail.fromJson(data);
    } on DioException catch (e) {
      if (!thread.isTempSession || !_shouldFallbackToLegacyTempSessions(e)) {
        rethrow;
      }
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/temp-sessions/${thread.threadId}/takeover',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      return _legacyTempSessionDetailFromJson(data);
    }
  }

  Future<void> closeThread(CsThread thread) async {
    try {
      await _dio.post<void>(
        '/api/client/v1/customer-service/workbench/threads/${thread.routeType}/${thread.threadId}/close',
      );
    } on DioException catch (e) {
      if (!thread.isTempSession || !_shouldFallbackToLegacyTempSessions(e)) {
        rethrow;
      }
      await _dio.post<void>(
        '/api/client/v1/customer-service/temp-sessions/${thread.threadId}/close',
      );
    }
  }

  Future<CsThread> outboundDirectCustomer({
    required String customerUserId,
    String? reason,
    int priority = 0,
    String? fallbackTitle,
    String? fallbackAvatarUrl,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/customer-service/im-direct/outbound',
      data: {
        'customerUserId': customerUserId,
        if (reason?.trim().isNotEmpty == true) 'reason': reason!.trim(),
        'skillGroupId': null,
        'priority': priority,
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsThread.fromImDirectJson(
      data,
      fallbackTitle: fallbackTitle,
      fallbackAvatarUrl: fallbackAvatarUrl,
    );
  }

  Future<CsThread> transferDirectCustomer({
    required String threadId,
    required String toStaffUserId,
    String? reason,
    String? fallbackTitle,
    String? fallbackAvatarUrl,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/customer-service/im-direct/$threadId/transfer',
      data: {
        'toStaffUserId': toStaffUserId,
        if (reason?.trim().isNotEmpty == true) 'reason': reason!.trim(),
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsThread.fromImDirectJson(
      data,
      fallbackTitle: fallbackTitle,
      fallbackAvatarUrl: fallbackAvatarUrl,
    );
  }

  Future<List<CsKnowledgeSearchResult>> searchKnowledge({
    required String query,
    int topK = 8,
    String? knowledgeBaseId,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/knowledge/search',
      queryParameters: {
        'q': query,
        'topK': topK,
        if (knowledgeBaseId?.trim().isNotEmpty == true)
          'knowledgeBaseId': knowledgeBaseId!.trim(),
      },
    );
    return _listData(resp.data?['data'])
        .map(CsKnowledgeSearchResult.fromJson)
        .where((item) => item.documentId.isNotEmpty || item.title.isNotEmpty)
        .toList(growable: false);
  }

  Future<List<CsKnowledgeBase>> getKnowledgeBases() async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/knowledge/bases',
    );
    return _listData(resp.data?['data'])
        .map(CsKnowledgeBase.fromJson)
        .where((item) => item.knowledgeBaseId.isNotEmpty)
        .toList(growable: false);
  }

  Future<List<CsKnowledgeDocument>> getKnowledgeDocuments(
    String knowledgeBaseId,
  ) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/knowledge/bases/$knowledgeBaseId/documents',
    );
    final data = resp.data?['data'];
    final rawItems = data is Map ? _listData(data['items']) : _listData(data);
    return rawItems
        .map(CsKnowledgeDocument.fromJson)
        .where((item) => item.documentId.isNotEmpty)
        .toList(growable: false);
  }

  Future<CsAiSuggestion> createAiSuggestion({
    required String threadType,
    required String threadId,
    String? customerMessageId,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/customer-service/workbench/threads/${_serverThreadType(threadType)}/$threadId/ai-suggestion',
      data: {
        if (customerMessageId?.trim().isNotEmpty == true)
          'customerMessageId': customerMessageId!.trim(),
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsAiSuggestion.fromJson(data);
  }

  Future<List<CsAiSuggestion>> getAiSuggestions({
    required String threadType,
    required String threadId,
    int limit = 10,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/workbench/threads/${_serverThreadType(threadType)}/$threadId/ai-suggestions',
      queryParameters: {'limit': limit},
    );
    return _listData(resp.data?['data'])
        .map(CsAiSuggestion.fromJson)
        .where((item) => item.suggestionId.isNotEmpty)
        .toList(growable: false);
  }

  Future<void> adoptAiSuggestion(String suggestionId) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/client/v1/customer-service/workbench/ai-suggestions/$suggestionId/adopt',
    );
  }

  Future<Response<Map<String, dynamic>>> _postThreadMessage({
    required String routeType,
    required String threadId,
    required Map<String, Object?> body,
  }) async {
    try {
      return await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/workbench/threads/$routeType/$threadId/messages',
        data: body,
      );
    } on DioException catch (e) {
      if (routeType != 'temp-session' ||
          !_shouldFallbackToLegacyTempSessions(e)) {
        rethrow;
      }
      return _dio.post<Map<String, dynamic>>(
        '/api/client/v1/customer-service/temp-sessions/$threadId/messages',
        data: body,
      );
    }
  }

  static String _serverThreadType(String threadType) {
    final normalized = threadType.trim().replaceAll('-', '_');
    return normalized == 'temp_session' ? 'temp_session' : 'im_direct';
  }

  Future<CsThreadsData> _getLegacyTempSessionThreads() async {
    final mineResp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/temp-sessions/mine',
    );
    final mineItems = await _enrichLegacyThreadPreviews(
      _listData(mineResp.data?['data'])
          .map((item) => _legacyTempSessionThreadFromJson(item))
          .where((thread) => thread.threadId.isNotEmpty)
          .toList(growable: false),
    );

    final queueItems = <CsThread>[];
    try {
      final queueResp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/temp-sessions/queue',
      );
      queueItems.addAll(await _enrichLegacyThreadPreviews(
        _listData(queueResp.data?['data'])
            .map((item) => _legacyTempSessionThreadFromJson(
                  item,
                  fallbackStatus: 'queued',
                ))
            .where((thread) => thread.threadId.isNotEmpty)
            .toList(growable: false),
      ));
    } on DioException {
      // The current staff's assigned sessions are still usable without queue.
    }

    final activeIds = mineItems.map((item) => item.threadId).toSet();
    return CsThreadsData(
      _sortThreadsByActivity(queueItems
          .where((item) => !activeIds.contains(item.threadId))
          .toList(growable: false)),
      _sortThreadsByActivity(mineItems),
    );
  }

  Future<List<CsThread>> _enrichLegacyThreadPreviews(
    List<CsThread> threads,
  ) async {
    if (threads.isEmpty) return threads;
    return Future.wait(
      threads.map((thread) async {
        try {
          final detail = await _getLegacyTempSessionDetail(thread.threadId);
          final latest = detail.messages.isEmpty ? null : detail.messages.last;
          if (latest == null) return thread;
          return thread.fromDetail(detail).copyWith(
                lastMessageType: _messageTypeName(latest.type),
                lastMessagePreview: _messagePreview(latest),
                lastMessageAt: latest.sentAt,
                updatedAt: latest.sentAt,
              );
        } on DioException {
          return thread;
        }
      }),
    );
  }

  List<CsThread> _sortThreadsByActivity(List<CsThread> threads) {
    return [...threads]..sort((a, b) {
        final aAt = a.updatedAt ?? a.lastMessageAt ?? a.assignedAt;
        final bAt = b.updatedAt ?? b.lastMessageAt ?? b.assignedAt;
        if (aAt == null && bAt == null) return 0;
        if (aAt == null) return 1;
        if (bAt == null) return -1;
        return bAt.compareTo(aAt);
      });
  }

  String _messageTypeName(MessageType type) {
    return switch (type) {
      MessageType.contactCard => 'contact_card',
      MessageType.callLog => 'call_log',
      _ => type.name,
    };
  }

  String _messagePreview(Message message) {
    final text = message.body.text?.trim();
    if (text?.isNotEmpty == true) return text!;
    final event = message.body.event?.trim();
    if (event?.isNotEmpty == true) return event!;
    return switch (message.type) {
      MessageType.image => '[图片]',
      MessageType.video => '[视频]',
      MessageType.voice => '[语音]',
      MessageType.file => '[文件]',
      MessageType.contactCard => '[联系人]',
      MessageType.callLog => '[通话]',
      MessageType.location => '[位置]',
      MessageType.event => '[系统消息]',
      MessageType.markdown => '[富文本]',
      MessageType.text => '[消息]',
    };
  }

  Future<CsDashboardData> _getLegacyTempSessionDashboard() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/customer-service/temp-sessions/dashboard',
      );
      final data = _mapData(resp.data?['data']);
      return CsDashboardData(
        queuedTotalCount: _asInt(data['queuedCount']),
        totalActiveCount: _asInt(data['activeSessionCount']),
        onlineStaffCount: _asInt(data['onlineStaffCount']),
        busyStaffCount: _asInt(data['busyStaffCount']),
        queuedTempCount: _asInt(data['queuedCount']),
        activeTempCount: _asInt(data['activeSessionCount']),
      );
    } on DioException {
      final threads = await _getLegacyTempSessionThreads();
      return CsDashboardData(
        queuedTotalCount: threads.queueItems.length,
        totalActiveCount: threads.activeItems.length,
        queuedTempCount: threads.queueItems.length,
        activeTempCount: threads.activeItems.length,
      );
    }
  }

  Future<CsThreadDetail> _getLegacyTempSessionDetail(String sessionId) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/customer-service/temp-sessions/$sessionId',
    );
    return _legacyTempSessionDetailFromJson(
      _mapData(resp.data?['data']),
    );
  }

  CsThread _legacyTempSessionThreadFromJson(
    Map<String, dynamic> json, {
    String fallbackStatus = 'active',
  }) {
    final ai = _mapData(json['ai']);
    final visitorName = _stringValue(json['visitorName']) ??
        _stringValue(json['customerName']) ??
        '访客';
    final category = _stringValue(json['category']);
    final visitorMessageCount = _asInt(json['visitorMessageCount']);
    final staffMessageCount = _asInt(json['staffMessageCount']);
    return CsThread(
      threadType: 'temp_session',
      threadId: _stringValue(json['sessionId']) ?? '',
      conversationId: _stringValue(json['conversationId']) ?? '',
      status: _stringValue(json['status']) ??
          _stringValue(json['session_status']) ??
          _stringValue(json['sessionStatus']) ??
          fallbackStatus,
      title: visitorName,
      customerUserId: _stringValue(json['linkedUserId']),
      visitorId: _stringValue(json['visitorId']),
      peerUserId: _stringValue(json['visitorUserId']),
      assignedStaffUserId: _stringValue(json['currentOwnerStaffUserId']),
      assignedStaffDisplayName:
          _stringValue(json['currentOwnerStaffDisplayName']),
      source: _firstLegacySource(json),
      lastMessageType: 'text',
      lastMessagePreview: _stringValue(json['lastMessagePreview']) ??
          (category == null ? null : '分类：$category'),
      lastMessageAt: _dateTimeValue(json['lastMessageAt']),
      updatedAt: _dateTimeValue(json['lastMessageAt']) ??
          _dateTimeValue(json['createdAt']),
      assignedAt: _dateTimeValue(ai['humanHandoffAt']),
      unreadCount: visitorMessageCount > staffMessageCount
          ? visitorMessageCount - staffMessageCount
          : 0,
      queuePosition: _nullableInt(json['queuePosition']),
      estimatedWaitSeconds: _nullableInt(json['estimatedWaitSeconds']),
      currentResponderType: _stringValue(json['currentResponderType']),
      aiStatus: _stringValue(ai['serviceStatus']),
      vip: _isVipText(_stringValue(json['priority'])),
      priority: _stringValue(json['priority']),
      tags: [
        if (category != null && category.isNotEmpty) category,
      ],
    );
  }

  CsThreadDetail _legacyTempSessionDetailFromJson(Map<String, dynamic> json) {
    final session = _mapData(json['session']);
    final visitor = _mapData(json['visitor']);
    final messages = _listData(json['messages'])
        .map(MessageModel.fromJson)
        .toList()
      ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
    return CsThreadDetail(
      threadType: 'temp_session',
      threadId: _stringValue(session['sessionId']) ?? '',
      conversationId: _stringValue(session['conversationId']) ?? '',
      status: _stringValue(session['status']) ??
          _stringValue(session['session_status']) ??
          _stringValue(session['sessionStatus']) ??
          'active',
      title: _stringValue(session['visitorName']) ??
          _stringValue(visitor['visitorName']) ??
          '访客',
      peerUserId: _stringValue(visitor['visitorUserId']),
      customerUserId: _stringValue(visitor['linkedUserId']),
      visitorId: _stringValue(session['visitorId']) ??
          _stringValue(visitor['visitorId']),
      assignedStaffUserId: _stringValue(session['currentOwnerStaffUserId']),
      assignedStaffDisplayName:
          _stringValue(session['currentOwnerStaffDisplayName']),
      source: _firstLegacySource(session) ?? _firstLegacySource(visitor),
      assignedAt: _dateTimeValue(_mapData(session['ai'])['humanHandoffAt']),
      currentResponderType: _stringValue(session['currentResponderType']),
      aiStatus: _stringValue(_mapData(session['ai'])['serviceStatus']),
      messages: messages,
    );
  }

  bool _shouldFallbackToLegacyTempSessions(DioException error) {
    final response = error.response;
    final data = response?.data;
    final code = data is Map ? data['code']?.toString() : null;
    return response?.statusCode == 500 && code == 'INVALID_OPERATION';
  }

  static List<Map<String, dynamic>> _listData(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  static Map<String, dynamic> _mapData(Object? value) {
    if (value is! Map) return const {};
    return Map<String, dynamic>.from(value);
  }

  static String? _stringValue(Object? value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }

  static int _asInt(Object? value) {
    return _nullableInt(value) ?? 0;
  }

  static int? _nullableInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static DateTime? _dateTimeValue(Object? value) {
    final text = _stringValue(value);
    return text == null ? null : DateTime.tryParse(text);
  }

  static bool _isVipText(String? value) {
    final normalized = value?.toLowerCase().trim();
    return normalized == 'vip' ||
        normalized == 'high' ||
        normalized == 'important';
  }

  static String? _firstLegacySource(Map<String, dynamic> json) {
    for (final key in const [
      'source',
      'from',
      'channel',
      'sourceChannel',
      'entryChannel',
      'platform',
      'provider',
    ]) {
      final value = _stringValue(json[key]);
      if (value != null) return value;
    }
    return null;
  }
}

class AdminCustomerServiceRemoteDataSource {
  final Dio _dio;

  const AdminCustomerServiceRemoteDataSource(this._dio);

  Future<AdminCustomerServiceDashboard> getCenterDashboard() async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/customer-service/center/dashboard',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return AdminCustomerServiceDashboard.fromJson(data);
  }

  Future<List<AdminStaffStatus>> getStaffStatuses() async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/customer-service/center/staff-statuses',
    );
    final data = resp.data?['data'] as List<dynamic>? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => AdminStaffStatus.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<AdminGroup>> getGroups() async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/groups',
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      {'groups': final List<dynamic> groups} => groups,
      {'data': final List<dynamic> items} => items,
      List<dynamic> list => list,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => AdminGroup.fromJson(Map<String, dynamic>.from(e)))
        .where((group) => group.conversationId.isNotEmpty)
        .toList();
  }

  Future<CsBroadcastPreview> previewBroadcast({
    required int targetType,
    String? groupId,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts/preview',
      data: {
        'targetType': targetType,
        if (groupId?.trim().isNotEmpty == true) 'groupId': groupId!.trim(),
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsBroadcastPreview.fromJson(data);
  }

  Future<CsBroadcastTask> createBroadcast({
    required int targetType,
    String? groupId,
    required String messageType,
    required Map<String, Object?> body,
    String? auditReason,
    String? officialAccountId,
  }) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts',
      data: {
        'targetType': targetType,
        if (groupId?.trim().isNotEmpty == true) 'groupId': groupId!.trim(),
        if (officialAccountId?.trim().isNotEmpty == true)
          'officialAccountId': officialAccountId!.trim(),
        'messageType': messageType,
        'body': body,
        if (auditReason?.trim().isNotEmpty == true)
          'auditReason': auditReason!.trim(),
      },
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsBroadcastTask.fromJson(data);
  }

  Future<CsBroadcastTask> getBroadcastTask(
    String taskId, {
    int failedLimit = 20,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts/$taskId',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsBroadcastTask.fromJson(data);
  }

  Future<CsBroadcastRetryResult> retryBroadcastFailed(String taskId) async {
    final resp = await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts/$taskId/retry-failed',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CsBroadcastRetryResult.fromJson(data);
  }

  Future<List<CsBroadcastTask>> getBroadcastTasks({int limit = 20}) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts',
      queryParameters: {'limit': limit},
    );
    final data = resp.data?['data'];
    final rawItems = data is Map ? _listData(data['items']) : _listData(data);
    return rawItems
        .map(CsBroadcastTask.fromJson)
        .where((item) => item.taskId.isNotEmpty)
        .toList(growable: false);
  }

  Future<void> cancelBroadcast(String taskId) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/enterprise-broadcasts/$taskId/cancel',
    );
  }

  Future<void> freezeConversation({
    required String conversationId,
    required bool frozen,
    String? reason,
    String? threadType,
    String? threadId,
  }) async {
    if (threadType != null &&
        threadType.trim().isNotEmpty &&
        threadId != null &&
        threadId.trim().isNotEmpty) {
      final normalizedThreadType = threadType.trim().replaceAll('-', '_');
      final canonicalThreadType =
          normalizedThreadType == 'temp_session' ? 'temp_session' : 'im_direct';
      await _dio.post<Map<String, dynamic>>(
        '/api/admin/v1/customer-service/center/threads/'
        '$canonicalThreadType/${threadId.trim()}/${frozen ? 'freeze' : 'unfreeze'}',
        data: {
          if (reason?.trim().isNotEmpty == true) 'reason': reason!.trim(),
        },
      );
      return;
    }
    await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/groups/$conversationId/freeze',
      data: {
        'frozen': frozen,
        if (reason?.trim().isNotEmpty == true) 'reason': reason!.trim(),
      },
    );
  }

  Future<List<AdminCustomer>> getCustomers({
    String? keyword,
    String? status,
    String? assignedStaffUserId,
    List<String> tags = const [],
    String tagMatch = 'any',
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/customer-management/customers',
      queryParameters: {
        'assignment': _assignmentParam(assignedStaffUserId),
        if (keyword != null && keyword.trim().isNotEmpty)
          'keyword': keyword.trim(),
        if (assignedStaffUserId != null &&
            assignedStaffUserId.trim().isNotEmpty)
          'assignedStaffUserId': assignedStaffUserId.trim(),
        'page': 1,
        'pageSize': 50,
      },
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      {'data': final List<dynamic> items} => items,
      List<dynamic> list => list,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => AdminCustomer.fromJson(Map<String, dynamic>.from(e)))
        .where((customer) => customer.userId.isNotEmpty)
        .toList();
  }

  Future<AdminCustomerDetail> getCustomerDetail(String customerUserId) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/users/$customerUserId',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return AdminCustomerDetail.fromJson(data);
  }

  Future<CustomerProfileCard> getCustomerProfileCard(
    String customerUserId,
  ) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/customer-service/center/customers/$customerUserId/profile-card',
    );
    final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
    return CustomerProfileCard.fromJson(data);
  }

  Future<void> updateCustomerTags({
    required String customerUserId,
    required List<String> tags,
  }) async {
    await _dio.put<Map<String, dynamic>>(
      '/api/admin/v1/users/$customerUserId/tags',
      data: {
        'tags': tags
            .map((tag) => tag.trim())
            .where((tag) => tag.isNotEmpty)
            .toList(growable: false),
      },
    );
  }

  Future<void> assignCustomerService({
    required String customerUserId,
    required String? staffUserId,
    bool transferConversation = true,
  }) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/admin/v1/users/$customerUserId/customer-service/assign',
      data: {
        'staffUserId': staffUserId,
        'transferConversation': transferConversation,
      },
    );
  }

  Future<List<CsThread>> getCenterThreads({
    String? keyword,
    String? status,
    String? threadType,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/conversation-management/conversations',
      queryParameters: {
        if (keyword != null && keyword.trim().isNotEmpty)
          'keyword': keyword.trim(),
        if (status != null && status.trim().isNotEmpty)
          'frozen': status.trim() == 'frozen',
        if (threadType != null && threadType.trim().isNotEmpty)
          'type': _conversationTypeParam(threadType.trim()),
        'serviceOnly': true,
        'page': 1,
        'pageSize': 50,
      },
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      {'threads': final List<dynamic> threads} => threads,
      {
        'queueItems': final List<dynamic> queueItems,
        'activeItems': final List<dynamic> activeItems,
      } =>
        <dynamic>[...queueItems, ...activeItems],
      {'queueItems': final List<dynamic> queueItems} => queueItems,
      {'activeItems': final List<dynamic> activeItems} => activeItems,
      List<dynamic> list => list,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => _conversationManagementItemToThread(
              Map<String, dynamic>.from(e),
            ))
        .toList();
  }

  Future<List<CsThread>> getDirectCustomerThreads({
    String? keyword,
    String? status,
    bool? unassignedOnly,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/customer-service/im-direct/threads',
      queryParameters: {
        if (keyword != null && keyword.trim().isNotEmpty)
          'keyword': keyword.trim(),
        if (status != null && status.trim().isNotEmpty) 'status': status,
        if (unassignedOnly != null) 'unassignedOnly': unassignedOnly,
      },
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      {'data': final List<dynamic> items} => items,
      List<dynamic> list => list,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => CsThread.fromImDirectJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static String _assignmentParam(String? assignedStaffUserId) {
    final value = assignedStaffUserId?.trim();
    if (value == null || value.isEmpty) return 'all';
    if (value == '__unassigned__') return 'unassigned';
    return 'assigned';
  }

  static List<Map<String, dynamic>> _listData(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  static String? _stringValue(Object? value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }

  static bool? _boolValue(Object? value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    final text = value?.toString().trim().toLowerCase();
    if (text == null || text.isEmpty) return null;
    if (text == 'true' || text == '1' || text == 'yes') return true;
    if (text == 'false' || text == '0' || text == 'no') return false;
    return null;
  }

  static String _conversationTypeParam(String threadType) {
    final normalized = threadType.replaceAll('-', '_');
    if (normalized == 'temp_session') return 'temp_session';
    if (normalized == 'direct_customer' || normalized == 'im_direct') {
      return 'direct';
    }
    return normalized;
  }

  static CsThread _conversationManagementItemToThread(
    Map<String, dynamic> json,
  ) {
    final type = _stringValue(json['type']) ??
        _stringValue(json['threadType']) ??
        'direct';
    final threadType = type == 'temp_session'
        ? 'temp_session'
        : type == 'group'
            ? 'group'
            : 'direct_customer';
    return CsThread.fromJson({
      'threadType': threadType,
      'threadId': _stringValue(json['threadId']) ??
          _stringValue(json['conversationId']) ??
          '',
      'conversationId': _stringValue(json['conversationId']) ?? '',
      'status': _boolValue(json['isFrozen']) == true ? 'frozen' : 'active',
      'title': _stringValue(json['title']) ?? '会话',
      'lastMessageAt': _stringValue(json['lastMessageAt']),
      'updatedAt': _stringValue(json['lastMessageAt']) ??
          _stringValue(json['createdAt']),
    });
  }

  Future<List<AdminAuditLog>> getAuditLogs({
    String? actionCode,
    String? targetType,
  }) async {
    final resp = await _dio.get<Map<String, dynamic>>(
      '/api/admin/v1/audit-logs',
      queryParameters: {
        if (actionCode != null && actionCode.trim().isNotEmpty)
          'actionCode': actionCode.trim(),
        if (targetType != null && targetType.trim().isNotEmpty)
          'targetType': targetType.trim(),
      },
    );
    final data = resp.data?['data'];
    final rawItems = switch (data) {
      {'items': final List<dynamic> items} => items,
      {'logs': final List<dynamic> logs} => logs,
      List<dynamic> list => list,
      _ => const <dynamic>[],
    };
    return rawItems
        .whereType<Map>()
        .map((e) => AdminAuditLog.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
