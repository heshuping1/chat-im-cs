import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

const customerServiceTypingPreviewTtl = Duration(seconds: 5);
const customerServiceTypingPreviewMaxLength = 500;

enum CustomerServiceTypingPreviewResult { clear }

enum CustomerServiceTransferRole { customerService }

class CustomerServiceTypingPreviewEvent {
  final String threadId;
  final String threadType;
  final bool isTyping;
  final String? previewText;
  final String? senderRole;
  final String? senderUserId;
  final DateTime receivedAt;

  const CustomerServiceTypingPreviewEvent({
    required this.threadId,
    required this.threadType,
    required this.isTyping,
    this.previewText,
    this.senderRole,
    this.senderUserId,
    required this.receivedAt,
  });
}

class CustomerServiceTypingPreview {
  final String threadId;
  final String threadType;
  final String previewText;
  final String? senderUserId;
  final DateTime receivedAt;
  final DateTime expiresAt;

  const CustomerServiceTypingPreview({
    required this.threadId,
    required this.threadType,
    required this.previewText,
    this.senderUserId,
    required this.receivedAt,
    required this.expiresAt,
  });

  bool isExpired(DateTime now) => !expiresAt.isAfter(now);
}

class CustomerServiceStaffCandidate {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final int? membershipRole;

  const CustomerServiceStaffCandidate({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.membershipRole,
  });
}

class CustomerServiceTransferTarget {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final CustomerServiceTransferRole roleLabel;

  const CustomerServiceTransferTarget({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.roleLabel,
  });
}

class CustomerServiceTransferNoticeEvent {
  final String threadType;
  final String threadId;
  final String conversationId;
  final String? customerUserId;
  final String? fromStaffUserId;
  final String toStaffUserId;
  final String? reason;
  final String? recipientRole;

  const CustomerServiceTransferNoticeEvent({
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    this.customerUserId,
    this.fromStaffUserId,
    required this.toStaffUserId,
    this.reason,
    this.recipientRole,
  });
}

class CustomerServiceTransferNotice {
  final String noticeId;
  final String threadKey;
  final String threadType;
  final String threadId;
  final String conversationId;
  final String title;
  final String body;
  final DateTime receivedAt;

  const CustomerServiceTransferNotice({
    required this.noticeId,
    required this.threadKey,
    required this.threadType,
    required this.threadId,
    required this.conversationId,
    required this.title,
    required this.body,
    required this.receivedAt,
  });
}

List<Message> applyCustomerServiceRecall(
  List<Message> messages, {
  required String messageId,
  required bool silent,
}) {
  final id = messageId.trim();
  if (id.isEmpty) return messages;
  if (silent) {
    return messages
        .where((message) =>
            message.messageId != id && (message.clientMsgId ?? '') != id)
        .toList(growable: false);
  }
  return messages.map((message) {
    if (message.messageId != id && (message.clientMsgId ?? '') != id) {
      return message;
    }
    return message.copyWith(isRecalled: true, status: MessageStatus.recalled);
  }).toList(growable: false);
}

Object? reduceCustomerServiceTypingPreview(
  CustomerServiceTypingPreviewEvent event, {
  DateTime? now,
}) {
  if (event.threadId.trim().isEmpty) return null;
  if (_isStaffTypingSender(event.senderRole)) return null;
  if (!event.isTyping) return CustomerServiceTypingPreviewResult.clear;
  final receivedAt = now ?? event.receivedAt;
  return CustomerServiceTypingPreview(
    threadId: event.threadId.trim(),
    threadType: _normalizeThreadType(event.threadType),
    previewText: normalizeCustomerServiceTypingPreviewText(event.previewText),
    senderUserId: _nonBlank(event.senderUserId),
    receivedAt: event.receivedAt,
    expiresAt: receivedAt.add(customerServiceTypingPreviewTtl),
  );
}

String normalizeCustomerServiceTypingPreviewText(String? value) {
  if (value == null) return '';
  final normalized =
      value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
  if (normalized.length <= customerServiceTypingPreviewMaxLength) {
    return normalized;
  }
  return normalized.substring(0, customerServiceTypingPreviewMaxLength);
}

List<CustomerServiceTransferTarget> createCustomerServiceTransferTargets(
  List<CustomerServiceStaffCandidate> candidates, {
  Iterable<String?> currentUserIds = const [],
}) {
  final excluded = currentUserIds
      .map((id) => id?.trim())
      .whereType<String>()
      .where((id) => id.isNotEmpty)
      .toSet();
  final targets = <CustomerServiceTransferTarget>[];
  for (final candidate in candidates) {
    final userId = candidate.userId.trim();
    if (userId.isEmpty || excluded.contains(userId)) continue;
    if (candidate.membershipRole != 2) continue;
    targets.add(CustomerServiceTransferTarget(
      userId: userId,
      displayName: candidate.displayName.trim().isNotEmpty
          ? candidate.displayName.trim()
          : userId,
      avatarUrl: candidate.avatarUrl,
      roleLabel: CustomerServiceTransferRole.customerService,
    ));
  }
  targets.sort((left, right) => left.displayName.compareTo(right.displayName));
  return targets;
}

CustomerServiceTransferNotice? createCustomerServiceTransferNotice(
  CustomerServiceTransferNoticeEvent event, {
  required String currentStaffUserId,
  DateTime? receivedAt,
}) {
  final normalizedRole =
      (event.recipientRole ?? '').trim().toLowerCase().replaceAll('-', '_');
  if (normalizedRole == 'customer' || normalizedRole == 'visitor') return null;
  final currentUserId = currentStaffUserId.trim();
  final toStaffUserId = event.toStaffUserId.trim();
  if (toStaffUserId.isEmpty || currentUserId.isEmpty) return null;
  if (toStaffUserId != currentUserId) return null;
  final threadId = event.threadId.trim();
  if (threadId.isEmpty) return null;
  final threadType = _normalizeThreadType(event.threadType);
  final reason = event.reason?.trim();
  return CustomerServiceTransferNotice(
    noticeId:
        '$threadType:$threadId:${receivedAt?.millisecondsSinceEpoch ?? 0}',
    threadKey: '$threadType:$threadId',
    threadType: threadType,
    threadId: threadId,
    conversationId: event.conversationId.trim(),
    title: '收到转接会话',
    body: reason == null || reason.isEmpty
        ? '有一条客服会话已转接给你，可进入工作台预览历史。'
        : '有一条客服会话已转接给你，备注：$reason',
    receivedAt: receivedAt ?? DateTime.now(),
  );
}

List<Message> applyCustomerServiceCustomerReadStatus(
  List<Message> messages, {
  required String currentStaffUserId,
  required int customerLastReadSeq,
}) {
  final staffUserId = currentStaffUserId.trim();
  if (staffUserId.isEmpty || customerLastReadSeq <= 0) return messages;
  return messages.map((message) {
    if (!_isStaffServerMessage(message, staffUserId)) return message;
    if (message.conversationSeq > customerLastReadSeq) return message;
    return message.copyWith(isReadByPeer: true, status: MessageStatus.read);
  }).toList(growable: false);
}

bool _isStaffServerMessage(Message message, String currentStaffUserId) {
  if (message.isRecalled) return false;
  if (!message.status.isServerUsable) return false;
  if (message.conversationSeq <= 0) return false;
  if (message.isSelf) return true;
  return message.senderUserId.trim().toLowerCase() ==
      currentStaffUserId.trim().toLowerCase();
}

bool _isStaffTypingSender(String? senderRole) {
  final role = (senderRole ?? '').trim().toLowerCase().replaceAll('-', '_');
  if (role.isEmpty) return false;
  return const [
    'staff',
    'agent',
    'operator',
    'customer_service',
    'service_staff',
    'kefu',
  ].any(role.contains);
}

String _normalizeThreadType(String value) {
  final normalized = value.trim().toLowerCase().replaceAll('-', '_');
  if (normalized == 'direct_customer') return 'im_direct';
  if (normalized == 'temp_session') return 'temp_session';
  return normalized.isEmpty ? 'temp_session' : normalized;
}

String? _nonBlank(String? value) {
  final text = value?.trim();
  return text == null || text.isEmpty ? null : text;
}
