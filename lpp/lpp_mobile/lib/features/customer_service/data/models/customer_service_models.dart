import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

const Set<String> _terminalCustomerServiceThreadStatuses = {
  'closed',
  'closed_by_visitor',
  'closed_by_staff',
  'closed_timeout',
  'closed_system',
  'archived',
  'ended',
  'finished',
  'resolved',
  'terminated',
  'cancelled',
  'canceled',
  'expired',
  '5',
  '6',
  '7',
  '8',
  '9',
};

String normalizeCustomerServiceThreadStatus(String? status) {
  return (status ?? '').trim().toLowerCase().replaceAll('-', '_');
}

bool isCustomerServiceThreadTerminalStatus(String? status) {
  final normalized = normalizeCustomerServiceThreadStatus(status);
  return _terminalCustomerServiceThreadStatuses.contains(normalized) ||
      normalized.startsWith('closed');
}

class AdminGroup {
  final String conversationId;
  final String title;
  final int memberCount;
  final String? ownerDisplayName;
  final bool? isFrozen;
  final String? riskLevel;
  final String? lastMessagePreview;
  final DateTime? updatedAt;

  const AdminGroup({
    required this.conversationId,
    required this.title,
    this.memberCount = 0,
    this.ownerDisplayName,
    this.isFrozen,
    this.riskLevel,
    this.lastMessagePreview,
    this.updatedAt,
  });

  factory AdminGroup.fromJson(Map<String, dynamic> json) {
    return AdminGroup(
      conversationId: _firstNonBlankString(json, const [
            'conversationId',
            'groupId',
            'id',
          ]) ??
          '',
      title: _firstNonBlankString(json, const [
            'title',
            'groupName',
            'name',
          ]) ??
          '未命名群聊',
      memberCount: _asInt(json['memberCount']) ?? 0,
      ownerDisplayName: _firstNonBlankString(json, const [
        'ownerDisplayName',
        'ownerName',
        'groupOwnerDisplayName',
      ]),
      isFrozen: _boolValue(json['isFrozen'] ?? json['frozen']),
      riskLevel: _firstNonBlankString(json, const [
        'riskLevel',
        'riskStatus',
        'risk',
      ]),
      lastMessagePreview: _firstNonBlankString(json, const [
        'lastMessagePreview',
        'lastMessageText',
        'preview',
      ]),
      updatedAt: _parseDateTime(json['updatedAt'] ?? json['lastMessageAt']),
    );
  }
}

bool? _boolValue(Object? value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final normalized = value.trim().toLowerCase();
    if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
      return true;
    }
    if (normalized == 'false' || normalized == '0' || normalized == 'no') {
      return false;
    }
  }
  return null;
}

class CsBroadcastPreview {
  final int targetType;
  final int recipientCount;
  final String? groupTitle;
  final List<String> sampleDisplayNames;
  final List<String> sampleGroupTitles;
  final CsBroadcastSender? sender;

  const CsBroadcastPreview({
    required this.targetType,
    required this.recipientCount,
    this.groupTitle,
    this.sampleDisplayNames = const [],
    this.sampleGroupTitles = const [],
    this.sender,
  });

  factory CsBroadcastPreview.fromJson(Map<String, dynamic> json) {
    final senderJson = json['sender'];
    return CsBroadcastPreview(
      targetType: _intValue(json['targetType']),
      recipientCount: _intValue(json['recipientCount']),
      groupTitle: _firstNonBlankString(json, const [
        'groupTitle',
        'groupName',
        'title',
      ]),
      sampleDisplayNames: _stringListValue(json['sampleDisplayNames']),
      sampleGroupTitles: _stringListValue(json['sampleGroupTitles']),
      sender: senderJson is Map
          ? CsBroadcastSender.fromJson(Map<String, dynamic>.from(senderJson))
          : null,
    );
  }
}

class CsBroadcastSender {
  final String? officialAccountId;
  final String displayName;
  final String? avatarUrl;

  const CsBroadcastSender({
    this.officialAccountId,
    required this.displayName,
    this.avatarUrl,
  });

  factory CsBroadcastSender.fromJson(Map<String, dynamic> json) {
    return CsBroadcastSender(
      officialAccountId: _firstNonBlankString(json, const [
        'officialAccountId',
        'userId',
        'senderUserId',
      ]),
      displayName: _firstNonBlankString(json, const [
            'displayName',
            'senderDisplayName',
            'name',
          ]) ??
          '企业官方账号',
      avatarUrl:
          _firstNonBlankString(json, const ['avatarUrl', 'senderAvatarUrl']),
    );
  }
}

class CsBroadcastTask {
  final String taskId;
  final int status;
  final int totalCount;
  final int sentCount;
  final int failedCount;
  final int skippedCount;
  final String? failureReason;
  final List<CsBroadcastRecipientResult> failedRecipients;

  const CsBroadcastTask({
    required this.taskId,
    required this.status,
    this.totalCount = 0,
    this.sentCount = 0,
    this.failedCount = 0,
    this.skippedCount = 0,
    this.failureReason,
    this.failedRecipients = const [],
  });

  factory CsBroadcastTask.fromJson(Map<String, dynamic> json) {
    final failedRecipients =
        (json['failedRecipients'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map>()
            .map((item) => CsBroadcastRecipientResult.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false);
    return CsBroadcastTask(
      taskId: _firstNonBlankString(json, const [
            'taskId',
            'broadcastTaskId',
            'id',
          ]) ??
          '',
      status: _intValue(json['status']),
      totalCount: _intValue(json['totalCount']),
      sentCount: _intValue(json['sentCount']),
      failedCount: _intValue(json['failedCount']),
      skippedCount: _intValue(json['skippedCount']),
      failureReason: _firstNonBlankString(json, const [
        'failureReason',
        'errorMessage',
        'message',
      ]),
      failedRecipients: failedRecipients,
    );
  }

  bool get isPending => status == 0;
  bool get isDelivering => status == 1;
  bool get isCompleted => status == 2;
  bool get isFailed => status == 3;
  bool get isCanceled => status == 4;
  bool get isFinished => isCompleted || isFailed || isCanceled;

  String get statusLabel {
    return switch (status) {
      0 => '待投递',
      1 => '投递中',
      2 => '已完成',
      3 => '失败',
      4 => '已取消',
      _ => '未知',
    };
  }
}

class CsBroadcastRecipientResult {
  final String? targetUserId;
  final String displayName;
  final int status;
  final String? errorCode;
  final int retryCount;

  const CsBroadcastRecipientResult({
    this.targetUserId,
    required this.displayName,
    required this.status,
    this.errorCode,
    this.retryCount = 0,
  });

  factory CsBroadcastRecipientResult.fromJson(Map<String, dynamic> json) {
    return CsBroadcastRecipientResult(
      targetUserId:
          _firstNonBlankString(json, const ['targetUserId', 'userId']),
      displayName: _firstNonBlankString(json, const [
            'displayName',
            'name',
            'targetDisplayName',
          ]) ??
          '成员',
      status: _intValue(json['status']),
      errorCode: _firstNonBlankString(json, const ['errorCode', 'code']),
      retryCount: _intValue(json['retryCount']),
    );
  }

  bool get skipped => status == 3;
}

class CsBroadcastRetryResult {
  final String taskId;
  final int requeuedCount;

  const CsBroadcastRetryResult({
    required this.taskId,
    this.requeuedCount = 0,
  });

  factory CsBroadcastRetryResult.fromJson(Map<String, dynamic> json) {
    return CsBroadcastRetryResult(
      taskId: _firstNonBlankString(json, const [
            'taskId',
            'broadcastTaskId',
            'id',
          ]) ??
          '',
      requeuedCount: _intValue(json['requeuedCount']),
    );
  }
}

/// Unified customer-service thread shown in the workbench.
class CsThread {
  final String threadType; // 'temp_session' | 'direct_customer'
  final String threadId;
  final String conversationId;
  final String status;
  final String title;
  final String? avatarUrl;
  final String? customerUserId;
  final String? visitorId;
  final String? peerUserId;
  final String? assignedStaffUserId;
  final String? assignedStaffDisplayName;
  final String? source;
  final String? lastMessageType;
  final String? lastMessagePreview;
  final DateTime? lastMessageAt;
  final DateTime? updatedAt;
  final DateTime? assignedAt;
  final int unreadCount;
  final int? queuePosition;
  final int? estimatedWaitSeconds;
  final String? currentResponderType;
  final String? aiStatus;
  final bool vip;
  final String? customerLevel;
  final String? priority;
  final List<String> tags;

  const CsThread({
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    required this.status,
    required this.title,
    this.avatarUrl,
    this.customerUserId,
    this.visitorId,
    this.peerUserId,
    this.assignedStaffUserId,
    this.assignedStaffDisplayName,
    this.source,
    this.lastMessageType,
    this.lastMessagePreview,
    this.lastMessageAt,
    this.updatedAt,
    this.assignedAt,
    this.unreadCount = 0,
    this.queuePosition,
    this.estimatedWaitSeconds,
    this.currentResponderType,
    this.aiStatus,
    this.vip = false,
    this.customerLevel,
    this.priority,
    this.tags = const [],
  });

  factory CsThread.fromJson(Map<String, dynamic> json) {
    final rawThreadType = json['threadType'] as String? ?? 'temp_session';
    final normalizedThreadType = rawThreadType.replaceAll('-', '_');
    return CsThread(
      threadType: normalizedThreadType,
      threadId: json['threadId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      status: _firstNonBlankString(json, const [
            'status',
            'session_status',
            'sessionStatus',
          ]) ??
          'queued',
      title: json['title'] as String? ?? '未知',
      avatarUrl: json['avatarUrl'] as String?,
      customerUserId: json['customerUserId'] as String?,
      visitorId: json['visitorId'] as String?,
      peerUserId: json['peerUserId'] as String?,
      assignedStaffUserId: _firstNonBlankString(json, const [
        'assignedStaffUserId',
        'staffUserId',
        'currentOwnerStaffUserId',
        'ownerStaffUserId',
      ]),
      assignedStaffDisplayName: _firstNonBlankString(json, const [
        'assignedStaffDisplayName',
        'staffDisplayName',
        'currentOwnerStaffDisplayName',
        'ownerStaffDisplayName',
      ]),
      source: _firstNonBlankString(json, const [
        'source',
        'from',
        'channel',
        'sourceChannel',
        'entryChannel',
        'platform',
        'provider',
      ]),
      lastMessageType: json['lastMessageType'] as String?,
      lastMessagePreview: json['lastMessagePreview'] as String?,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      assignedAt: json['assignedAt'] != null
          ? DateTime.tryParse(json['assignedAt'] as String)
          : null,
      unreadCount: json['unreadCount'] as int? ?? 0,
      queuePosition: json['queuePosition'] as int?,
      estimatedWaitSeconds: json['estimatedWaitSeconds'] as int?,
      currentResponderType: json['currentResponderType'] as String?,
      aiStatus: json['aiStatus'] as String? ??
          (json['ai'] is Map ? (json['ai'] as Map)['status'] as String? : null),
      vip: _firstBool(json, const [
            'isVip',
            'vip',
            'isImportantCustomer',
            'importantCustomer',
          ]) ??
          false,
      customerLevel: _firstNonBlankString(json, const [
        'customerLevel',
        'customerTier',
        'memberLevel',
        'vipLevel',
        'level',
      ]),
      priority: _firstNonBlankString(json, const [
        'priority',
        'threadPriority',
        'customerPriority',
      ]),
      tags: _firstNonEmptyStringList(json, const [
        'tags',
        'customerTags',
        'enterpriseTags',
      ]),
    );
  }

  factory CsThread.fromServiceHistoryJson(Map<String, dynamic> json) {
    final normalized = Map<String, dynamic>.from(json);
    final rawThreadType =
        normalized['threadType']?.toString().replaceAll('-', '_') ??
            'temp_session';
    normalized['threadType'] =
        rawThreadType == 'direct' ? 'im_direct' : rawThreadType;
    normalized['conversationId'] ??= normalized['threadId'];
    final title = _historyTitle(normalized);
    if (title != null) {
      normalized['title'] = title;
    } else {
      normalized['title'] = '未知客户';
    }
    normalized['avatarUrl'] ??= _firstNonBlankString(normalized, const [
      'customerAvatarUrl',
      'visitorAvatarUrl',
      'peerAvatarUrl',
    ]);
    normalized['lastMessagePreview'] ??= _historyPreview(normalized);
    return CsThread.fromJson(normalized);
  }

  bool get isTempSession => threadType == 'temp_session';
  bool get isDirectCustomer =>
      threadType == 'direct_customer' || threadType == 'im_direct';

  bool get isQueued {
    final normalized = status.toLowerCase().replaceAll('-', '_');
    return normalized == 'queued' ||
        normalized == 'created' ||
        normalized.contains('queue') ||
        normalized.contains('pending') ||
        normalized.contains('waiting');
  }

  bool get isAiHandled {
    final normalized = status.toLowerCase().replaceAll('-', '_');
    final responder = currentResponderType?.toLowerCase().replaceAll('-', '_');
    final ai = aiStatus?.toLowerCase().replaceAll('-', '_');
    return responder == 'ai' ||
        ai == 'bot_active' ||
        normalized == 'bot_active' ||
        normalized.contains('ai') ||
        normalized == 'bot';
  }

  bool get isManualHandled {
    final normalized = status.toLowerCase().replaceAll('-', '_');
    final responder = currentResponderType?.toLowerCase().replaceAll('-', '_');
    final ai = aiStatus?.toLowerCase().replaceAll('-', '_');
    return responder == 'staff' ||
        responder == 'human' ||
        ai == 'human_serving' ||
        normalized == 'active' ||
        normalized == 'assisting' ||
        normalized == 'assigned' ||
        normalized == 'manual' ||
        normalized == 'human_serving' ||
        normalized.contains('staff');
  }

  bool get isWaiting {
    return isQueued;
  }

  bool get isTerminal => isCustomerServiceThreadTerminalStatus(status);

  bool get isVip {
    return vip ||
        _isVipText(customerLevel) ||
        _isVipText(priority) ||
        tags.any(_isVipText);
  }

  /// Workbench route segment expected by the API.
  String get routeType => isTempSession ? 'temp-session' : 'direct-customer';

  /// New server-supported APIs use canonical thread type values.
  String get serverThreadType => isTempSession ? 'temp_session' : 'im_direct';

  CsThread copyWith({
    String? threadType,
    String? threadId,
    String? conversationId,
    String? status,
    String? title,
    String? avatarUrl,
    String? customerUserId,
    String? visitorId,
    String? peerUserId,
    String? assignedStaffUserId,
    String? assignedStaffDisplayName,
    String? source,
    String? lastMessageType,
    String? lastMessagePreview,
    DateTime? lastMessageAt,
    DateTime? updatedAt,
    DateTime? assignedAt,
    int? unreadCount,
    int? queuePosition,
    int? estimatedWaitSeconds,
    String? currentResponderType,
    String? aiStatus,
    bool? vip,
    String? customerLevel,
    String? priority,
    List<String>? tags,
  }) {
    return CsThread(
      threadType: threadType ?? this.threadType,
      threadId: threadId ?? this.threadId,
      conversationId: conversationId ?? this.conversationId,
      status: status ?? this.status,
      title: title ?? this.title,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      customerUserId: customerUserId ?? this.customerUserId,
      visitorId: visitorId ?? this.visitorId,
      peerUserId: peerUserId ?? this.peerUserId,
      assignedStaffUserId: assignedStaffUserId ?? this.assignedStaffUserId,
      assignedStaffDisplayName:
          assignedStaffDisplayName ?? this.assignedStaffDisplayName,
      source: source ?? this.source,
      lastMessageType: lastMessageType ?? this.lastMessageType,
      lastMessagePreview: lastMessagePreview ?? this.lastMessagePreview,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      updatedAt: updatedAt ?? this.updatedAt,
      assignedAt: assignedAt ?? this.assignedAt,
      unreadCount: unreadCount ?? this.unreadCount,
      queuePosition: queuePosition ?? this.queuePosition,
      estimatedWaitSeconds: estimatedWaitSeconds ?? this.estimatedWaitSeconds,
      currentResponderType: currentResponderType ?? this.currentResponderType,
      aiStatus: aiStatus ?? this.aiStatus,
      vip: vip ?? this.vip,
      customerLevel: customerLevel ?? this.customerLevel,
      priority: priority ?? this.priority,
      tags: tags ?? this.tags,
    );
  }

  CsThread fromDetail(CsThreadDetail detail) {
    if (detail.threadId.isEmpty) return this;
    return CsThread(
      threadType: detail.threadType,
      threadId: detail.threadId,
      conversationId: detail.conversationId.isNotEmpty
          ? detail.conversationId
          : conversationId,
      status: detail.status.isNotEmpty ? detail.status : status,
      title: detail.title.isNotEmpty ? detail.title : title,
      avatarUrl: detail.avatarUrl ?? avatarUrl,
      customerUserId: detail.customerUserId ?? customerUserId,
      visitorId: detail.visitorId ?? visitorId,
      peerUserId: detail.peerUserId ?? peerUserId,
      assignedStaffUserId: detail.assignedStaffUserId ?? assignedStaffUserId,
      assignedStaffDisplayName:
          detail.assignedStaffDisplayName ?? assignedStaffDisplayName,
      source: detail.source ?? source,
      assignedAt: detail.assignedAt ?? assignedAt,
      lastMessageType: lastMessageType,
      lastMessagePreview: lastMessagePreview,
      lastMessageAt: lastMessageAt,
      updatedAt: updatedAt,
      unreadCount: unreadCount,
      queuePosition: queuePosition,
      estimatedWaitSeconds: estimatedWaitSeconds,
      currentResponderType: detail.currentResponderType ?? currentResponderType,
      aiStatus: detail.aiStatus ?? aiStatus,
      vip: vip,
      customerLevel: customerLevel,
      priority: priority,
      tags: tags,
    );
  }

  factory CsThread.fromImDirectJson(Map<String, dynamic> json,
      {String? fallbackTitle, String? fallbackAvatarUrl}) {
    final threadId = json['threadId'] as String? ?? '';
    final conversationId = json['conversationId'] as String? ?? '';
    return CsThread(
      threadType: 'direct_customer',
      threadId: threadId,
      conversationId: conversationId,
      status:
          json['threadStatus'] as String? ?? json['status'] as String? ?? '',
      title: json['customerDisplayName'] as String? ??
          json['title'] as String? ??
          fallbackTitle ??
          '客户',
      avatarUrl: json['customerAvatarUrl'] as String? ??
          json['avatarUrl'] as String? ??
          fallbackAvatarUrl,
      customerUserId: json['customerUserId'] as String?,
      assignedStaffUserId: _firstNonBlankString(json, const [
        'assignedStaffUserId',
        'staffUserId',
        'currentOwnerStaffUserId',
        'ownerStaffUserId',
      ]),
      assignedStaffDisplayName: _firstNonBlankString(json, const [
        'assignedStaffDisplayName',
        'staffDisplayName',
        'currentOwnerStaffDisplayName',
        'ownerStaffDisplayName',
      ]),
      source: _firstNonBlankString(json, const [
        'source',
        'from',
        'channel',
        'sourceChannel',
        'entryChannel',
        'platform',
        'provider',
      ]),
      lastMessageType: json['lastMessageType'] as String?,
      lastMessagePreview: json['lastMessagePreview'] as String?,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      unreadCount: json['unreadCount'] as int? ?? 0,
      vip: _firstBool(json, const [
            'isVip',
            'vip',
            'isImportantCustomer',
            'importantCustomer',
          ]) ??
          false,
      customerLevel: _firstNonBlankString(json, const [
        'customerLevel',
        'customerTier',
        'memberLevel',
        'vipLevel',
        'level',
      ]),
      priority: _firstNonBlankString(json, const [
        'priority',
        'threadPriority',
        'customerPriority',
      ]),
      tags: _firstNonEmptyStringList(json, const [
        'tags',
        'customerTags',
        'enterpriseTags',
      ]),
    );
  }
}

bool _isVipText(String? value) {
  if (value == null) return false;
  final normalized = value.trim().toLowerCase().replaceAll('-', '_');
  if (normalized.isEmpty) return false;
  return normalized == 'vip' ||
      normalized == 'important' ||
      normalized == 'high' ||
      normalized == 'high_value' ||
      normalized.contains('vip') ||
      normalized.contains('重要') ||
      normalized.contains('高价值') ||
      normalized.contains('大客户');
}

String? _firstNonBlankString(
  Map<String, dynamic> json,
  List<String> keys,
) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.trim().isNotEmpty) {
      return value.trim();
    }
    if (value is num) {
      return value.toString();
    }
  }
  return null;
}

int? _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

bool? _asBool(Object? value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String && value.trim().isNotEmpty) {
    final normalized = value.trim().toLowerCase();
    if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
      return true;
    }
    if (normalized == 'false' || normalized == '0' || normalized == 'no') {
      return false;
    }
  }
  return null;
}

bool? _firstBool(
  Map<String, dynamic> json,
  List<String> keys,
) {
  for (final key in keys) {
    final value = _asBool(json[key]);
    if (value != null) return value;
  }
  return null;
}

DateTime? _parseDateTime(Object? value) {
  if (value is String && value.trim().isNotEmpty) {
    return DateTime.tryParse(value.trim());
  }
  return null;
}

String _historyPreview(Map<String, dynamic> json) {
  final closedAt = _firstNonBlankString(json, const ['closedAt']);
  if (closedAt != null) return '关闭时间 $closedAt';
  final lastMessageAt = _firstNonBlankString(json, const ['lastMessageAt']);
  if (lastMessageAt != null) return '最近活跃 $lastMessageAt';
  final participation = _firstNonBlankString(json, const ['participation']);
  if (participation == 'transferred') return '转接参与的历史会话';
  return '历史会话';
}

String? _historyTitle(Map<String, dynamic> json) {
  final title = _firstNonBlankString(json, const [
    'title',
    'customerDisplayName',
    'customerName',
    'customerNickname',
    'visitorDisplayName',
    'visitorName',
    'visitorNickname',
    'peerDisplayName',
    'displayName',
    'nickname',
    'name',
  ]);
  if (title == null) return null;
  final normalized = title.trim();
  if (normalized.isEmpty || normalized.startsWith('历史会话')) {
    return null;
  }
  return normalized;
}

int _intValue(dynamic value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

num? _numValue(Object? value) {
  if (value is num) return value;
  if (value is String && value.trim().isNotEmpty) {
    return num.tryParse(value.trim());
  }
  return null;
}

List<String> _stringListValue(Object? value) {
  if (value is List) {
    return value
        .map((item) => item?.toString().trim() ?? '')
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
  if (value is String && value.trim().isNotEmpty) {
    return value
        .split(RegExp(r'[,，、]'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
  return const [];
}

Map<String, dynamic> _mapValue(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

List<String> _firstNonEmptyStringList(
  Map<String, dynamic> json,
  List<String> keys,
) {
  for (final key in keys) {
    final value = _stringListValue(json[key]);
    if (value.isNotEmpty) return value;
  }
  return const [];
}

class CustomerProfileIdentity {
  final String? customerUserId;
  final String displayName;
  final String? avatarUrl;
  final bool registered;
  final String? level;
  final String? kycStatus;
  final String? riskLevel;
  final String? language;
  final String? source;
  final String? assignedStaffUserId;
  final String? assignedStaffDisplayName;
  final List<String> tags;

  const CustomerProfileIdentity({
    this.customerUserId,
    required this.displayName,
    this.avatarUrl,
    this.registered = false,
    this.level,
    this.kycStatus,
    this.riskLevel,
    this.language,
    this.source,
    this.assignedStaffUserId,
    this.assignedStaffDisplayName,
    this.tags = const [],
  });

  factory CustomerProfileIdentity.fromJson(Map<String, dynamic> json) {
    return CustomerProfileIdentity(
      customerUserId: _firstNonBlankString(json, const [
        'customerUserId',
        'userId',
      ]),
      displayName: _firstNonBlankString(json, const [
            'displayName',
            'customerDisplayName',
            'customerName',
            'visitorName',
            'name',
          ]) ??
          '客户',
      avatarUrl: _firstNonBlankString(json, const [
        'avatarUrl',
        'customerAvatarUrl',
      ]),
      registered: json['registered'] as bool? ??
          (_firstNonBlankString(json, const ['customerUserId', 'userId']) !=
              null),
      level: _firstNonBlankString(json, const ['level', 'customerLevel']),
      kycStatus: _firstNonBlankString(json, const ['kycStatus', 'kyc']),
      riskLevel: _firstNonBlankString(json, const ['riskLevel', 'risk']),
      language: _firstNonBlankString(json, const ['language', 'locale']),
      source: _firstNonBlankString(json, const [
        'source',
        'from',
        'channel',
        'sourceChannel',
        'entryChannel',
        'platform',
        'provider',
      ]),
      assignedStaffUserId: _firstNonBlankString(json, const [
        'assignedStaffUserId',
        'staffUserId',
      ]),
      assignedStaffDisplayName: _firstNonBlankString(json, const [
        'assignedStaffDisplayName',
        'staffDisplayName',
      ]),
      tags: _firstNonEmptyStringList(json, const [
        'tags',
        'customerTags',
        'labels',
      ]),
    );
  }
}

class CustomerAccountSummary {
  final num? balance;
  final num? totalDeposit;
  final num? netDeposit;
  final String? accountStatus;
  final DateTime? registeredAt;
  final String? ibCode;

  const CustomerAccountSummary({
    this.balance,
    this.totalDeposit,
    this.netDeposit,
    this.accountStatus,
    this.registeredAt,
    this.ibCode,
  });

  factory CustomerAccountSummary.fromJson(Map<String, dynamic> json) {
    return CustomerAccountSummary(
      balance: _numValue(json['balance']),
      totalDeposit: _numValue(json['totalDeposit']),
      netDeposit: _numValue(json['netDeposit']),
      accountStatus: _firstNonBlankString(json, const [
        'accountStatus',
        'status',
      ]),
      registeredAt: _parseDateTime(json['registeredAt']),
      ibCode: _firstNonBlankString(json, const ['ibCode', 'ib']),
    );
  }
}

class CustomerTradingSummary {
  final int? totalOrders;
  final List<String> products;
  final num? winRate;
  final DateTime? lastTradeAt;

  const CustomerTradingSummary({
    this.totalOrders,
    this.products = const [],
    this.winRate,
    this.lastTradeAt,
  });

  factory CustomerTradingSummary.fromJson(Map<String, dynamic> json) {
    return CustomerTradingSummary(
      totalOrders: _asInt(json['totalOrders']),
      products: _firstNonEmptyStringList(json, const [
        'products',
        'tradingProducts',
      ]),
      winRate: _numValue(json['winRate']),
      lastTradeAt: _parseDateTime(json['lastTradeAt']),
    );
  }
}

class CustomerTemporaryOrderSummary {
  final String orderId;
  final String? product;
  final String? side;
  final num? volume;
  final num? price;
  final num? floatingProfit;
  final String? status;
  final DateTime? openedAt;
  final DateTime? updatedAt;

  const CustomerTemporaryOrderSummary({
    required this.orderId,
    this.product,
    this.side,
    this.volume,
    this.price,
    this.floatingProfit,
    this.status,
    this.openedAt,
    this.updatedAt,
  });

  factory CustomerTemporaryOrderSummary.fromJson(Map<String, dynamic> json) {
    return CustomerTemporaryOrderSummary(
      orderId: _firstNonBlankString(json, const [
            'orderId',
            'orderNo',
            'ticketId',
            'ticket',
            'id',
          ]) ??
          '',
      product: _firstNonBlankString(json, const [
        'product',
        'symbol',
        'instrument',
        'tradingProduct',
      ]),
      side: _firstNonBlankString(json, const [
        'side',
        'direction',
        'orderSide',
        'type',
      ]),
      volume: _numValue(json['volume'] ?? json['lots'] ?? json['quantity']),
      price: _numValue(json['price'] ?? json['openPrice']),
      floatingProfit: _numValue(
        json['floatingProfit'] ??
            json['unrealizedPnl'] ??
            json['unrealizedProfit'] ??
            json['pnl'] ??
            json['profit'],
      ),
      status: _firstNonBlankString(json, const [
        'status',
        'orderStatus',
        'state',
      ]),
      openedAt: _parseDateTime(
        json['openedAt'] ?? json['openTime'] ?? json['createdAt'],
      ),
      updatedAt: _parseDateTime(json['updatedAt'] ?? json['lastUpdatedAt']),
    );
  }
}

class CustomerTicketSummary {
  final String ticketId;
  final String title;
  final String status;
  final String? priority;
  final String? assigneeDisplayName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CustomerTicketSummary({
    required this.ticketId,
    required this.title,
    required this.status,
    this.priority,
    this.assigneeDisplayName,
    this.createdAt,
    this.updatedAt,
  });

  factory CustomerTicketSummary.fromJson(Map<String, dynamic> json) {
    return CustomerTicketSummary(
      ticketId: _firstNonBlankString(json, const [
            'ticketId',
            'workOrderId',
            'id',
          ]) ??
          '',
      title: _firstNonBlankString(json, const ['title', 'subject']) ?? '工单',
      status: _firstNonBlankString(json, const ['status']) ?? 'unknown',
      priority: _firstNonBlankString(json, const ['priority']),
      assigneeDisplayName: _firstNonBlankString(json, const [
        'assigneeDisplayName',
        'assignedStaffDisplayName',
      ]),
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
    );
  }
}

class VisitorProfileSummary {
  final String? visitorId;
  final String? sourceUrl;
  final String? locale;
  final int totalSessions;

  const VisitorProfileSummary({
    this.visitorId,
    this.sourceUrl,
    this.locale,
    this.totalSessions = 0,
  });

  factory VisitorProfileSummary.fromJson(Map<String, dynamic> json) {
    return VisitorProfileSummary(
      visitorId: _firstNonBlankString(json, const ['visitorId']),
      sourceUrl: _firstNonBlankString(json, const ['sourceUrl']),
      locale: _firstNonBlankString(json, const ['locale', 'language']),
      totalSessions: _intValue(json['totalSessions']),
    );
  }
}

class CustomerProfileCard {
  final CustomerProfileIdentity identity;
  final CustomerAccountSummary? account;
  final CustomerTradingSummary? trading;
  final List<CustomerTemporaryOrderSummary> temporaryOrders;
  final List<CustomerTicketSummary> tickets;
  final VisitorProfileSummary? visitor;
  final List<String> maskedFields;

  const CustomerProfileCard({
    required this.identity,
    this.account,
    this.trading,
    this.temporaryOrders = const [],
    this.tickets = const [],
    this.visitor,
    this.maskedFields = const [],
  });

  factory CustomerProfileCard.fromJson(Map<String, dynamic> json) {
    final identityJson = _mapValue(json['identity']);
    final visitorJson = _mapValue(json['visitor']);
    final ticketsRaw = json['tickets'];
    final visibilityJson = _mapValue(json['visibility']);
    return CustomerProfileCard(
      identity: CustomerProfileIdentity.fromJson(identityJson.isNotEmpty
          ? identityJson
          : Map<String, dynamic>.from(json)),
      account: json['account'] is Map
          ? CustomerAccountSummary.fromJson(_mapValue(json['account']))
          : null,
      trading: json['trading'] is Map
          ? CustomerTradingSummary.fromJson(_mapValue(json['trading']))
          : null,
      temporaryOrders: _temporaryOrdersFromJson(json),
      tickets: ticketsRaw is List
          ? ticketsRaw
              .whereType<Map>()
              .map((item) => CustomerTicketSummary.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList(growable: false)
          : const [],
      visitor: visitorJson.isNotEmpty
          ? VisitorProfileSummary.fromJson(visitorJson)
          : null,
      maskedFields: _stringListValue(visibilityJson['maskedFields']),
    );
  }

  bool get isRegisteredCustomer => identity.registered;

  bool isMasked(String field) => maskedFields.contains(field);

  static List<CustomerTemporaryOrderSummary> _temporaryOrdersFromJson(
    Map<String, dynamic> json,
  ) {
    final tradingJson = _mapValue(json['trading']);
    final accountJson = _mapValue(json['account']);
    for (final value in [
      json['temporaryOrders'],
      json['tempOrders'],
      json['openOrders'],
      json['pendingOrders'],
      json['currentOrders'],
      json['orders'],
      tradingJson['temporaryOrders'],
      tradingJson['tempOrders'],
      tradingJson['openOrders'],
      tradingJson['pendingOrders'],
      tradingJson['currentOrders'],
      tradingJson['orders'],
      accountJson['temporaryOrders'],
      accountJson['tempOrders'],
      accountJson['openOrders'],
      accountJson['pendingOrders'],
      accountJson['currentOrders'],
      accountJson['orders'],
    ]) {
      if (value is List) {
        final orders = value
            .whereType<Map>()
            .map((item) => CustomerTemporaryOrderSummary.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList(growable: false);
        if (orders.isNotEmpty) return orders;
      }
    }
    return const [];
  }
}

class AdminCustomer {
  final String userId;
  final String loginName;
  final String? lppId;
  final String displayName;
  final String? avatarUrl;
  final String status;
  final String? mobile;
  final String? email;
  final int userType;
  final int membershipRole;
  final String? assignedStaffUserId;
  final String? assignedStaffDisplayName;
  final int assignedCustomerCount;
  final DateTime? createdAt;
  final DateTime? lastSeenAt;
  final List<String> tags;

  const AdminCustomer({
    required this.userId,
    required this.loginName,
    this.lppId,
    required this.displayName,
    this.avatarUrl,
    required this.status,
    this.mobile,
    this.email,
    required this.userType,
    required this.membershipRole,
    this.assignedStaffUserId,
    this.assignedStaffDisplayName,
    this.assignedCustomerCount = 0,
    this.createdAt,
    this.lastSeenAt,
    this.tags = const [],
  });

  factory AdminCustomer.fromJson(Map<String, dynamic> json) {
    return AdminCustomer(
      userId: json['userId'] as String? ?? '',
      loginName: json['loginName'] as String? ??
          json['lppId'] as String? ??
          json['userId'] as String? ??
          '',
      lppId: json['lppId'] as String?,
      displayName: json['displayName'] as String? ??
          json['customerDisplayName'] as String? ??
          '客户',
      avatarUrl:
          json['avatarUrl'] as String? ?? json['customerAvatarUrl'] as String?,
      status: json['status'] as String? ?? 'active',
      mobile: json['mobile'] as String? ?? json['mobileMasked'] as String?,
      email: json['email'] as String? ?? json['emailMasked'] as String?,
      userType: _intValue(json['userType'], 1),
      membershipRole: _intValue(json['membershipRole']),
      assignedStaffUserId: _firstNonBlankString(json, const [
        'assignedStaffUserId',
        'staffUserId',
        'currentOwnerStaffUserId',
        'ownerStaffUserId',
      ]),
      assignedStaffDisplayName: _firstNonBlankString(json, const [
        'assignedStaffDisplayName',
        'staffDisplayName',
        'currentOwnerStaffDisplayName',
        'ownerStaffDisplayName',
      ]),
      assignedCustomerCount: _intValue(json['assignedCustomerCount']),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      lastSeenAt: DateTime.tryParse(
        json['lastSeenAt'] as String? ?? json['lastActiveAt'] as String? ?? '',
      ),
      tags: _firstNonEmptyStringList(json, const [
        'tags',
        'customerTags',
        'labels',
      ]),
    );
  }

  bool get isUnassigned =>
      (assignedStaffUserId == null || assignedStaffUserId!.isEmpty) &&
      (assignedStaffDisplayName == null ||
          assignedStaffDisplayName!.trim().isEmpty);
}

class AdminCustomerServicePeer {
  final String userId;
  final String displayName;
  final String loginName;
  final String? lppId;
  final String? conversationId;
  final bool isFriend;

  const AdminCustomerServicePeer({
    required this.userId,
    required this.displayName,
    required this.loginName,
    this.lppId,
    this.conversationId,
    this.isFriend = false,
  });

  factory AdminCustomerServicePeer.fromJson(Map<String, dynamic> json) {
    return AdminCustomerServicePeer(
      userId: json['userId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '客服',
      loginName: json['loginName'] as String? ?? '',
      lppId: json['lppId'] as String?,
      conversationId: json['conversationId'] as String?,
      isFriend: json['isFriend'] as bool? ?? false,
    );
  }
}

class AdminCustomerServiceContext {
  final AdminCustomerServicePeer? officialAccount;
  final AdminCustomerServicePeer? assignedStaff;
  final DateTime? assignedAt;
  final int assignedCustomerCount;
  final List<AdminCustomerServicePeer> assignableStaff;

  const AdminCustomerServiceContext({
    this.officialAccount,
    this.assignedStaff,
    this.assignedAt,
    this.assignedCustomerCount = 0,
    this.assignableStaff = const [],
  });

  factory AdminCustomerServiceContext.fromJson(Map<String, dynamic> json) {
    final officialAccount = json['officialAccount'];
    final assignedStaff = json['assignedStaff'];
    final assignableStaff = json['assignableStaff'];
    return AdminCustomerServiceContext(
      officialAccount: officialAccount is Map
          ? AdminCustomerServicePeer.fromJson(
              Map<String, dynamic>.from(officialAccount),
            )
          : null,
      assignedStaff: assignedStaff is Map
          ? AdminCustomerServicePeer.fromJson(
              Map<String, dynamic>.from(assignedStaff),
            )
          : null,
      assignedAt: DateTime.tryParse(json['assignedAt'] as String? ?? ''),
      assignedCustomerCount: _intValue(json['assignedCustomerCount']),
      assignableStaff: assignableStaff is List
          ? assignableStaff
              .whereType<Map>()
              .map((e) => AdminCustomerServicePeer.fromJson(
                    Map<String, dynamic>.from(e),
                  ))
              .where((staff) => staff.userId.isNotEmpty)
              .toList()
          : const [],
    );
  }
}

class AdminCustomerDetail extends AdminCustomer {
  final AdminCustomerServiceContext customerService;

  const AdminCustomerDetail({
    required super.userId,
    required super.loginName,
    super.lppId,
    required super.displayName,
    super.avatarUrl,
    required super.status,
    super.mobile,
    super.email,
    required super.userType,
    required super.membershipRole,
    super.assignedStaffUserId,
    super.assignedStaffDisplayName,
    super.assignedCustomerCount,
    super.createdAt,
    super.lastSeenAt,
    super.tags,
    this.customerService = const AdminCustomerServiceContext(),
  });

  factory AdminCustomerDetail.fromJson(Map<String, dynamic> json) {
    final base = AdminCustomer.fromJson(json);
    final customerService = json['customerService'];
    final serviceContext = customerService is Map
        ? AdminCustomerServiceContext.fromJson(
            Map<String, dynamic>.from(customerService),
          )
        : const AdminCustomerServiceContext();
    return AdminCustomerDetail(
      userId: base.userId,
      loginName: base.loginName,
      lppId: base.lppId,
      displayName: base.displayName,
      avatarUrl: base.avatarUrl,
      status: base.status,
      mobile: base.mobile,
      email: base.email,
      userType: base.userType,
      membershipRole: base.membershipRole,
      assignedStaffUserId:
          base.assignedStaffUserId ?? serviceContext.assignedStaff?.userId,
      assignedStaffDisplayName: base.assignedStaffDisplayName ??
          serviceContext.assignedStaff?.displayName,
      assignedCustomerCount: base.assignedCustomerCount,
      createdAt: base.createdAt,
      lastSeenAt: base.lastSeenAt,
      tags: base.tags,
      customerService: serviceContext,
    );
  }
}

class CsThreadDetail {
  final String threadType;
  final String threadId;
  final String conversationId;
  final String status;
  final String title;
  final String? avatarUrl;
  final String? peerUserId;
  final String? customerUserId;
  final String? visitorId;
  final String? assignedStaffUserId;
  final String? assignedStaffDisplayName;
  final String? source;
  final DateTime? assignedAt;
  final String? currentResponderType;
  final String? aiStatus;
  final List<Message> messages;

  const CsThreadDetail({
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    required this.status,
    required this.title,
    this.avatarUrl,
    this.peerUserId,
    this.customerUserId,
    this.visitorId,
    this.assignedStaffUserId,
    this.assignedStaffDisplayName,
    this.source,
    this.assignedAt,
    this.currentResponderType,
    this.aiStatus,
    this.messages = const [],
  });

  factory CsThreadDetail.fromJson(Map<String, dynamic> json) {
    final rawThreadType = json['threadType'] as String? ?? 'temp_session';
    final normalizedThreadType = rawThreadType.replaceAll('-', '_');
    return CsThreadDetail(
      threadType: normalizedThreadType,
      threadId: json['threadId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      status: _firstNonBlankString(json, const [
            'status',
            'session_status',
            'sessionStatus',
          ]) ??
          '',
      title: json['title'] as String? ?? '未知',
      avatarUrl: json['avatarUrl'] as String?,
      peerUserId: json['peerUserId'] as String?,
      customerUserId: json['customerUserId'] as String?,
      visitorId: json['visitorId'] as String?,
      assignedStaffUserId: json['assignedStaffUserId'] as String?,
      assignedStaffDisplayName: json['assignedStaffDisplayName'] as String?,
      source: _firstNonBlankString(json, const [
        'source',
        'from',
        'channel',
        'sourceChannel',
        'entryChannel',
        'platform',
        'provider',
      ]),
      assignedAt: json['assignedAt'] != null
          ? DateTime.tryParse(json['assignedAt'] as String)
          : null,
      currentResponderType: json['currentResponderType'] as String?,
      aiStatus: json['aiStatus'] as String? ??
          (json['ai'] is Map ? (json['ai'] as Map)['status'] as String? : null),
      messages: _parseMessages(json),
    );
  }

  bool get isTempSession => threadType == 'temp_session';
  String get routeType => isTempSession ? 'temp-session' : 'direct-customer';
  String get serverThreadType => isTempSession ? 'temp_session' : 'im_direct';
  bool get isTerminal => isCustomerServiceThreadTerminalStatus(status);

  CsThreadDetail copyWith({
    String? threadType,
    String? threadId,
    String? conversationId,
    String? status,
    String? title,
    String? avatarUrl,
    String? peerUserId,
    String? customerUserId,
    String? visitorId,
    String? assignedStaffUserId,
    String? assignedStaffDisplayName,
    String? source,
    DateTime? assignedAt,
    String? currentResponderType,
    String? aiStatus,
    List<Message>? messages,
  }) {
    return CsThreadDetail(
      threadType: threadType ?? this.threadType,
      threadId: threadId ?? this.threadId,
      conversationId: conversationId ?? this.conversationId,
      status: status ?? this.status,
      title: title ?? this.title,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      peerUserId: peerUserId ?? this.peerUserId,
      customerUserId: customerUserId ?? this.customerUserId,
      visitorId: visitorId ?? this.visitorId,
      assignedStaffUserId: assignedStaffUserId ?? this.assignedStaffUserId,
      assignedStaffDisplayName:
          assignedStaffDisplayName ?? this.assignedStaffDisplayName,
      source: source ?? this.source,
      assignedAt: assignedAt ?? this.assignedAt,
      currentResponderType: currentResponderType ?? this.currentResponderType,
      aiStatus: aiStatus ?? this.aiStatus,
      messages: messages ?? this.messages,
    );
  }

  static List<Message> _parseMessages(Map<String, dynamic> json) {
    final directChat = json['directChat'];
    if (directChat is Map) {
      final messages = directChat['messages'];
      if (messages is List) return _messageList(messages);
    }

    final tempSession = json['tempSession'];
    if (tempSession is Map) {
      final messages = tempSession['messages'];
      if (messages is List) return _messageList(messages);
    }

    final topLevelMessages = json['messages'];
    if (topLevelMessages is List) return _messageList(topLevelMessages);

    return const [];
  }

  static List<Message> _messageList(List<dynamic> raw) {
    return raw
        .whereType<Map>()
        .map((m) => MessageModel.fromJson(Map<String, dynamic>.from(m)))
        .toList()
      ..sort((a, b) => a.conversationSeq.compareTo(b.conversationSeq));
  }
}

class CsThreadsData {
  final List<CsThread> queueItems;
  final List<CsThread> activeItems;
  final CsWorkbenchSummary? summary;

  const CsThreadsData(
    this.queueItems,
    this.activeItems, {
    this.summary,
  });

  int get tempQueueCount =>
      queueItems.where((item) => item.isTempSession).length;
  int get directQueueCount =>
      queueItems.where((item) => item.isDirectCustomer).length;
  int get queueCount => summary?.queuedCount ?? queueItems.length;
  int get aiCount => activeItems.where((item) => item.isAiHandled).length;
  int get manualCount =>
      activeItems.where((item) => item.isManualHandled).length;
  int get myActiveCount => summary?.activeCount ?? activeItems.length;
  int get allCount =>
      summary?.allCount ?? queueItems.length + activeItems.length;
  int get vipCount =>
      summary?.vipCount ??
      [...queueItems, ...activeItems].where((item) => item.isVip).length;

  CsThreadsData get tempSessionOnly {
    final tempQueueItems =
        queueItems.where((item) => item.isTempSession).toList(growable: false);
    final tempActiveItems =
        activeItems.where((item) => item.isTempSession).toList(growable: false);
    final tempAllItems = [...tempQueueItems, ...tempActiveItems];
    return CsThreadsData(
      tempQueueItems,
      tempActiveItems,
      summary: CsWorkbenchSummary(
        allCount: tempAllItems.length,
        queuedCount: tempQueueItems.length,
        activeCount: tempActiveItems.length,
        vipCount: tempAllItems.where((item) => item.isVip).length,
      ),
    );
  }

  factory CsThreadsData.fromJson(Map<String, dynamic> json) {
    final summaryJson = json['summary'];
    final queueItems = (json['queueItems'] as List<dynamic>? ?? [])
        .map((e) => CsThread.fromJson(e as Map<String, dynamic>))
        .toList();
    final activeItems = (json['activeItems'] as List<dynamic>? ?? [])
        .map((e) => CsThread.fromJson(e as Map<String, dynamic>))
        .toList();
    return CsThreadsData(
      queueItems,
      activeItems,
      summary: summaryJson is Map
          ? CsWorkbenchSummary.fromJson(Map<String, dynamic>.from(summaryJson))
          : null,
    );
  }
}

class CsWorkbenchSummary {
  final int allCount;
  final int queuedCount;
  final int activeCount;
  final int vipCount;

  const CsWorkbenchSummary({
    this.allCount = 0,
    this.queuedCount = 0,
    this.activeCount = 0,
    this.vipCount = 0,
  });

  factory CsWorkbenchSummary.fromJson(Map<String, dynamic> json) {
    return CsWorkbenchSummary(
      allCount: _intValue(json['allCount']),
      queuedCount: _intValue(json['queuedCount']),
      activeCount: _intValue(json['activeCount']),
      vipCount: _intValue(json['vipCount']),
    );
  }
}

class CsDashboardData {
  final int queuedTotalCount;
  final int totalActiveCount;
  final int onlineStaffCount;
  final int busyStaffCount;
  final int directUnreadCount;
  final int queuedTempCount;
  final int queuedDirectCount;
  final int activeTempCount;
  final int assignedDirectCount;

  const CsDashboardData({
    this.queuedTotalCount = 0,
    this.totalActiveCount = 0,
    this.onlineStaffCount = 0,
    this.busyStaffCount = 0,
    this.directUnreadCount = 0,
    this.queuedTempCount = 0,
    this.queuedDirectCount = 0,
    this.activeTempCount = 0,
    this.assignedDirectCount = 0,
  });

  factory CsDashboardData.fromJson(Map<String, dynamic> json) {
    return CsDashboardData(
      queuedTotalCount: json['queuedTotalCount'] as int? ?? 0,
      totalActiveCount: json['totalActiveCount'] as int? ?? 0,
      onlineStaffCount: json['onlineStaffCount'] as int? ?? 0,
      busyStaffCount: json['busyStaffCount'] as int? ?? 0,
      directUnreadCount: json['directUnreadCount'] as int? ?? 0,
      queuedTempCount: json['queuedTempCount'] as int? ?? 0,
      queuedDirectCount: json['queuedDirectCount'] as int? ?? 0,
      activeTempCount: json['activeTempCount'] as int? ?? 0,
      assignedDirectCount: json['assignedDirectCount'] as int? ?? 0,
    );
  }
}

class PagedResult<T> {
  final List<T> items;
  final int page;
  final int pageSize;
  final int total;
  final bool hasMore;

  const PagedResult({
    required this.items,
    this.page = 1,
    this.pageSize = 20,
    this.total = 0,
    this.hasMore = false,
  });

  factory PagedResult.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemFactory,
  ) {
    final rawItems = json['items'] is List
        ? json['items'] as List<dynamic>
        : json['data'] is List
            ? json['data'] as List<dynamic>
            : const <dynamic>[];
    return PagedResult(
      items: rawItems
          .whereType<Map>()
          .map((item) => itemFactory(Map<String, dynamic>.from(item)))
          .toList(growable: false),
      page: _intValue(json['page'], 1),
      pageSize: _intValue(json['pageSize'], 20),
      total: _intValue(json['total'], rawItems.length),
      hasMore: _boolValue(json['hasMore']) ?? false,
    );
  }
}

class CsReceptionStatus {
  final String staffUserId;
  final String displayName;
  final String serviceStatus;
  final bool queueAcceptEnabled;
  final int maxConcurrentSessions;
  final int reservedSessionCount;
  final int activeSessionCount;
  final DateTime? lastOnlineAt;
  final DateTime? lastAssignedAt;
  final DateTime? lastHeartbeatAt;
  final DateTime? statusChangedAt;

  const CsReceptionStatus({
    required this.staffUserId,
    required this.displayName,
    required this.serviceStatus,
    required this.queueAcceptEnabled,
    required this.maxConcurrentSessions,
    required this.reservedSessionCount,
    required this.activeSessionCount,
    this.lastOnlineAt,
    this.lastAssignedAt,
    this.lastHeartbeatAt,
    this.statusChangedAt,
  });

  factory CsReceptionStatus.fromJson(Map<String, dynamic> json) {
    return CsReceptionStatus(
      staffUserId: json['staffUserId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      serviceStatus: json['serviceStatus'] as String? ?? 'offline',
      queueAcceptEnabled: json['queueAcceptEnabled'] as bool? ?? false,
      maxConcurrentSessions: json['maxConcurrentSessions'] as int? ?? 0,
      reservedSessionCount: json['reservedSessionCount'] as int? ?? 0,
      activeSessionCount: json['activeSessionCount'] as int? ?? 0,
      lastOnlineAt: DateTime.tryParse(json['lastOnlineAt'] as String? ?? ''),
      lastAssignedAt:
          DateTime.tryParse(json['lastAssignedAt'] as String? ?? ''),
      lastHeartbeatAt:
          DateTime.tryParse(json['lastHeartbeatAt'] as String? ?? ''),
      statusChangedAt:
          DateTime.tryParse(json['statusChangedAt'] as String? ?? ''),
    );
  }

  bool get isOnline => serviceStatus == 'online';
  bool get isBusy => serviceStatus == 'busy' || serviceStatus == 'break';
  bool get isOffline => serviceStatus == 'offline';

  String get label {
    switch (serviceStatus) {
      case 'online':
        return '在线';
      case 'busy':
      case 'break':
        return '忙碌';
      case 'offline':
      default:
        return '离线';
    }
  }
}

class CsQuickReply {
  final String quickReplyId;
  final String scope;
  final String locale;
  final String category;
  final String title;
  final String content;
  final List<String> tags;
  final int sortOrder;
  final bool enabled;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CsQuickReply({
    required this.quickReplyId,
    required this.scope,
    required this.locale,
    required this.category,
    required this.title,
    required this.content,
    this.tags = const [],
    this.sortOrder = 0,
    this.enabled = true,
    this.createdAt,
    this.updatedAt,
  });

  factory CsQuickReply.fromJson(Map<String, dynamic> json) {
    return CsQuickReply(
      quickReplyId: json['quickReplyId'] as String? ?? '',
      scope: json['scope'] as String? ?? 'all',
      locale: json['locale'] as String? ?? 'zh-CN',
      category: json['category'] as String? ?? '默认',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      tags: (json['tags'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .where((e) => e.isNotEmpty)
          .toList(),
      sortOrder: json['sortOrder'] as int? ?? 0,
      enabled: json['enabled'] as bool? ?? true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
    );
  }

  Map<String, dynamic> toJson() => {
        'quickReplyId': quickReplyId,
        'scope': scope,
        'locale': locale,
        'category': category,
        'title': title,
        'content': content,
        'tags': tags,
        'sortOrder': sortOrder,
        'enabled': enabled,
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
      };

  String get scopeLabel {
    switch (scope) {
      case 'temp_session':
        return '在线客服';
      case 'direct_customer':
        return '聊天';
      case 'all':
      default:
        return '全部';
    }
  }
}

class CsKnowledgeBase {
  final String knowledgeBaseId;
  final String name;
  final String? description;

  const CsKnowledgeBase({
    required this.knowledgeBaseId,
    required this.name,
    this.description,
  });

  factory CsKnowledgeBase.fromJson(Map<String, dynamic> json) {
    return CsKnowledgeBase(
      knowledgeBaseId: _firstNonBlankString(json, const [
            'knowledgeBaseId',
            'id',
          ]) ??
          '',
      name: _firstNonBlankString(json, const ['name', 'title']) ?? '知识库',
      description: _firstNonBlankString(json, const ['description', 'summary']),
    );
  }
}

class CsKnowledgeDocument {
  final String documentId;
  final String title;
  final String? summary;

  const CsKnowledgeDocument({
    required this.documentId,
    required this.title,
    this.summary,
  });

  factory CsKnowledgeDocument.fromJson(Map<String, dynamic> json) {
    return CsKnowledgeDocument(
      documentId: _firstNonBlankString(json, const ['documentId', 'id']) ?? '',
      title: _firstNonBlankString(json, const ['title', 'name']) ?? '知识文档',
      summary: _firstNonBlankString(json, const ['summary', 'contentPreview']),
    );
  }
}

class CsKnowledgeSearchResult {
  final String documentId;
  final String title;
  final String snippet;
  final double score;

  const CsKnowledgeSearchResult({
    required this.documentId,
    required this.title,
    required this.snippet,
    this.score = 0,
  });

  factory CsKnowledgeSearchResult.fromJson(Map<String, dynamic> json) {
    return CsKnowledgeSearchResult(
      documentId: _firstNonBlankString(json, const ['documentId', 'id']) ?? '',
      title: _firstNonBlankString(json, const ['title', 'name']) ?? '知识结果',
      snippet: _firstNonBlankString(json, const [
            'snippet',
            'summary',
            'contentPreview',
            'content',
          ]) ??
          '',
      score: _doubleValue(json['score']),
    );
  }
}

class CsAiSuggestion {
  final String suggestionId;
  final String threadType;
  final String threadId;
  final String text;
  final double confidence;
  final String? source;
  final int status;
  final DateTime? createdAt;
  final DateTime? adoptedAt;

  const CsAiSuggestion({
    required this.suggestionId,
    required this.threadType,
    required this.threadId,
    required this.text,
    this.confidence = 0,
    this.source,
    this.status = 0,
    this.createdAt,
    this.adoptedAt,
  });

  factory CsAiSuggestion.fromJson(Map<String, dynamic> json) {
    return CsAiSuggestion(
      suggestionId:
          _firstNonBlankString(json, const ['suggestionId', 'id']) ?? '',
      threadType: _firstNonBlankString(json, const ['threadType']) ?? '',
      threadId: _firstNonBlankString(json, const ['threadId']) ?? '',
      text: _firstNonBlankString(json, const ['text', 'content']) ?? '',
      confidence: _doubleValue(json['confidence']),
      source: _firstNonBlankString(json, const ['source', 'model']),
      status: _intValue(json['status']),
      createdAt: _parseDateTime(json['createdAt']),
      adoptedAt: _parseDateTime(json['adoptedAt']),
    );
  }
}

double _doubleValue(Object? value, [double fallback = 0]) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

class AdminCustomerServiceDashboard {
  final int queuedTempCount;
  final int queuedDirectCount;
  final int queuedTotalCount;
  final int activeTempCount;
  final int activeDirectCount;
  final int totalActiveCount;
  final int onlineStaffCount;
  final int busyStaffCount;
  final int? todaySessions;
  final int? todayServed;
  final int? avgWaitSeconds;

  const AdminCustomerServiceDashboard({
    this.queuedTempCount = 0,
    this.queuedDirectCount = 0,
    this.queuedTotalCount = 0,
    this.activeTempCount = 0,
    this.activeDirectCount = 0,
    this.totalActiveCount = 0,
    this.onlineStaffCount = 0,
    this.busyStaffCount = 0,
    this.todaySessions,
    this.todayServed,
    this.avgWaitSeconds,
  });

  int get idleStaffCount {
    final count = onlineStaffCount - busyStaffCount;
    return count < 0 ? 0 : count;
  }

  factory AdminCustomerServiceDashboard.fromJson(Map<String, dynamic> json) {
    return AdminCustomerServiceDashboard(
      queuedTempCount: json['queuedTempCount'] as int? ?? 0,
      queuedDirectCount: json['queuedDirectCount'] as int? ?? 0,
      queuedTotalCount:
          json['queuedTotalCount'] as int? ?? json['queuedCount'] as int? ?? 0,
      activeTempCount: json['activeTempCount'] as int? ?? 0,
      activeDirectCount: json['activeDirectCount'] as int? ?? 0,
      totalActiveCount:
          json['totalActiveCount'] as int? ?? json['activeCount'] as int? ?? 0,
      onlineStaffCount: json['onlineStaffCount'] as int? ?? 0,
      busyStaffCount: json['busyStaffCount'] as int? ?? 0,
      todaySessions: json['todaySessions'] as int?,
      todayServed: json['todayServed'] as int?,
      avgWaitSeconds: json['avgWaitSeconds'] as int?,
    );
  }
}

class AdminStaffStatus {
  final String staffUserId;
  final String displayName;
  final String serviceStatus;
  final bool queueAcceptEnabled;
  final int activeSessionCount;
  final int maxConcurrentSessions;
  final DateTime? lastHeartbeatAt;
  final DateTime? statusChangedAt;

  const AdminStaffStatus({
    required this.staffUserId,
    required this.displayName,
    required this.serviceStatus,
    this.queueAcceptEnabled = false,
    this.activeSessionCount = 0,
    this.maxConcurrentSessions = 0,
    this.lastHeartbeatAt,
    this.statusChangedAt,
  });

  factory AdminStaffStatus.fromJson(Map<String, dynamic> json) {
    return AdminStaffStatus(
      staffUserId: json['staffUserId'] as String? ?? '',
      displayName: json['displayName'] as String? ??
          json['staffDisplayName'] as String? ??
          '客服',
      serviceStatus: json['serviceStatus'] as String? ??
          json['status'] as String? ??
          'offline',
      queueAcceptEnabled: json['queueAcceptEnabled'] as bool? ?? false,
      activeSessionCount: json['activeSessionCount'] as int? ??
          json['currentSessionCount'] as int? ??
          0,
      maxConcurrentSessions: json['maxConcurrentSessions'] as int? ?? 0,
      lastHeartbeatAt:
          DateTime.tryParse(json['lastHeartbeatAt'] as String? ?? ''),
      statusChangedAt:
          DateTime.tryParse(json['statusChangedAt'] as String? ?? ''),
    );
  }

  String get label {
    switch (serviceStatus) {
      case 'online':
        return '在线';
      case 'busy':
      case 'break':
        return '忙碌';
      case 'offline':
      default:
        return '离线';
    }
  }
}

class AdminAuditLog {
  final String auditLogId;
  final String actionCode;
  final String actionName;
  final String actorUserId;
  final String actorDisplayName;
  final String targetType;
  final String targetId;
  final String targetDisplayName;
  final DateTime? createdAt;

  const AdminAuditLog({
    required this.auditLogId,
    required this.actionCode,
    required this.actionName,
    required this.actorUserId,
    required this.actorDisplayName,
    required this.targetType,
    required this.targetId,
    required this.targetDisplayName,
    this.createdAt,
  });

  factory AdminAuditLog.fromJson(Map<String, dynamic> json) {
    final actionCode = json['actionCode'] as String? ??
        json['action'] as String? ??
        json['operation'] as String? ??
        '';
    return AdminAuditLog(
      auditLogId: json['auditLogId'] as String? ??
          json['auditId'] as String? ??
          json['id'] as String? ??
          '',
      actionCode: actionCode,
      actionName: json['actionName'] as String? ??
          json['displayName'] as String? ??
          actionCode,
      actorUserId: json['actorUserId'] as String? ??
          json['operatorUserId'] as String? ??
          '',
      actorDisplayName: json['actorDisplayName'] as String? ??
          json['operatorDisplayName'] as String? ??
          json['actorName'] as String? ??
          '未知用户',
      targetType: json['targetType'] as String? ?? '',
      targetId: json['targetId'] as String? ?? '',
      targetDisplayName: json['targetDisplayName'] as String? ??
          json['targetName'] as String? ??
          '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ??
          json['occurredAt'] as String? ??
          json['timestamp'] as String? ??
          ''),
    );
  }
}
