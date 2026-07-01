import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class MessageReadReceiptService {
  const MessageReadReceiptService();

  List<Message> applyDirectPeerReadSeq(
    List<Message> messages, {
    required String currentUserId,
    required int readSeq,
  }) {
    if (readSeq <= 0 || currentUserId.trim().isEmpty) return messages;

    var changed = false;
    final next = messages.map((message) {
      if (!isDirectPeerReadableMessage(
        message,
        currentUserId: currentUserId,
        readSeq: readSeq,
      )) {
        return message;
      }
      changed = true;
      return message.copyWith(isReadByPeer: true, status: MessageStatus.read);
    }).toList(growable: false);

    return changed ? next : messages;
  }

  bool isDirectPeerReadableMessage(
    Message message, {
    required String currentUserId,
    required int readSeq,
  }) {
    return isOwnServerMessage(message, currentUserId: currentUserId) &&
        message.conversationSeq <= readSeq &&
        !message.isReadByPeer;
  }

  bool hasPendingDirectPeerReadReceipt(
    List<Message> messages, {
    required String currentUserId,
  }) {
    return messages.any(
      (message) =>
          isOwnServerMessage(message, currentUserId: currentUserId) &&
          !message.isReadByPeer &&
          message.status != MessageStatus.read,
    );
  }

  bool isOwnServerMessage(
    Message message, {
    required String currentUserId,
  }) {
    if (message.isRecalled) return false;
    if (!message.status.isServerUsable) return false;
    if (message.conversationSeq <= 0) return false;
    if (message.isSelf) return true;
    return _sameIdentity(message.senderUserId, currentUserId);
  }

  bool canShowGroupReadReceipt(
    Message message, {
    required bool isSelf,
    required bool isGroup,
  }) {
    return isGroup &&
        isSelf &&
        message.status.isServerUsable &&
        message.conversationSeq > 0 &&
        !message.isRecalled;
  }

  List<Message> groupReadReceiptSnapshotTargets(
    List<Message> messages, {
    required String currentUserId,
    int maxTargets = 4,
  }) {
    if (maxTargets <= 0) return const [];
    final targets = <Message>[];
    for (final message in messages.reversed) {
      final isSelf =
          message.isSelf || _sameIdentity(message.senderUserId, currentUserId);
      if (!canShowGroupReadReceipt(message, isSelf: isSelf, isGroup: true)) {
        continue;
      }
      targets.add(message);
      if (targets.length >= maxTargets) break;
    }
    return targets;
  }

  bool _sameIdentity(String? left, String? right) {
    final a = left?.trim().toLowerCase();
    final b = right?.trim().toLowerCase();
    return a != null && a.isNotEmpty && b != null && b.isNotEmpty && a == b;
  }
}
