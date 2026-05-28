import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

final groupJoinRequestsProvider = FutureProvider.family
    .autoDispose<List<GroupJoinRequest>, String>((ref, groupId) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get<Map<String, dynamic>>(
    '/api/client/v1/groups/$groupId/join-requests',
  );
  final rawData = resp.data?['data'];
  final data = rawData is Map ? rawData['items'] : rawData;
  if (data is! List) return const [];
  return data
      .whereType<Map>()
      .map((e) => GroupJoinRequest.fromJson(Map<String, dynamic>.from(e)))
      .toList();
});

class GroupJoinRequest {
  final String requestId;
  final String groupId;
  final String conversationId;
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? message;
  final String status;
  final DateTime? createdAt;
  final DateTime? reviewedAt;
  final String? reviewerUserId;
  final String? rejectReason;

  const GroupJoinRequest({
    required this.requestId,
    required this.groupId,
    required this.conversationId,
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.message,
    required this.status,
    this.createdAt,
    this.reviewedAt,
    this.reviewerUserId,
    this.rejectReason,
  });

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  factory GroupJoinRequest.fromJson(Map<String, dynamic> json) {
    return GroupJoinRequest(
      requestId: json['requestId'] as String? ?? '',
      groupId: json['groupId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      displayName: json['userDisplayName'] as String? ??
          json['displayName'] as String? ??
          '申请人',
      avatarUrl:
          json['userAvatarUrl'] as String? ?? json['avatarUrl'] as String?,
      message: json['message'] as String?,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      reviewedAt: DateTime.tryParse(json['reviewedAt'] as String? ?? ''),
      reviewerUserId: json['reviewerUserId'] as String?,
      rejectReason: json['rejectReason'] as String?,
    );
  }
}
