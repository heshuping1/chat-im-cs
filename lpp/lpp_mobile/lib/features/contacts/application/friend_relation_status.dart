import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

enum FriendRelationStatus {
  self,
  friend,
  outgoingPending,
  incomingPending,
  none,
}

class FriendRelationSnapshot {
  final FriendRelationStatus status;
  final FriendRequest? request;

  const FriendRelationSnapshot({
    required this.status,
    this.request,
  });

  bool get isFriend => status == FriendRelationStatus.friend;
  bool get isPending =>
      status == FriendRelationStatus.outgoingPending ||
      status == FriendRelationStatus.incomingPending;
}

FriendRelationSnapshot resolveFriendRelation({
  required String userId,
  required String? currentUserId,
  required List<Contact> friends,
  required List<FriendRequest> requests,
  bool? isFriend,
  bool localOutgoingPending = false,
}) {
  if (currentUserId != null && currentUserId.isNotEmpty) {
    if (currentUserId == userId) {
      return const FriendRelationSnapshot(status: FriendRelationStatus.self);
    }
  }

  if (isFriend == true || friends.any((friend) => friend.userId == userId)) {
    return const FriendRelationSnapshot(status: FriendRelationStatus.friend);
  }

  final pendingRequests = requests.where(
    (request) => request.status.toLowerCase() == 'pending',
  );
  for (final request in pendingRequests) {
    if (currentUserId != null &&
        currentUserId.isNotEmpty &&
        request.fromUserId == currentUserId &&
        request.toUserId == userId) {
      return FriendRelationSnapshot(
        status: FriendRelationStatus.outgoingPending,
        request: request,
      );
    }
    if (currentUserId != null &&
        currentUserId.isNotEmpty &&
        request.toUserId == currentUserId &&
        request.fromUserId == userId) {
      return FriendRelationSnapshot(
        status: FriendRelationStatus.incomingPending,
        request: request,
      );
    }
  }

  if (localOutgoingPending) {
    return const FriendRelationSnapshot(
      status: FriendRelationStatus.outgoingPending,
    );
  }

  return const FriendRelationSnapshot(status: FriendRelationStatus.none);
}

bool isAlreadyFriendErrorCode(String code, String message) {
  final normalizedCode = code.toUpperCase();
  final normalizedMessage = message.toLowerCase();
  return normalizedCode == 'FRIEND_ALREADY_EXISTS' ||
      normalizedMessage.contains('already friend') ||
      message.contains('已经是好友');
}

bool isFriendRequestPendingErrorCode(String code, String message) {
  final normalizedCode = code.toUpperCase();
  final normalizedMessage = message.toLowerCase();
  return normalizedCode == 'FRIEND_REQUEST_PENDING' ||
      normalizedMessage.contains('request pending') ||
      message.contains('等待') ||
      message.contains('已发送');
}
