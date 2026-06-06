import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';

class GroupInviteQrApi {
  final Dio _dio;

  GroupInviteQrApi(this._dio);

  Future<List<GroupInviteQr>> listActive(String groupId) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/invite-qr',
      );
      final list = resp.data?['data'] as List<dynamic>? ?? const [];
      return list
          .whereType<Map>()
          .map((item) => GroupInviteQr.fromJson(
                Map<String, dynamic>.from(item),
              ))
          .toList();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<GroupInviteQr> create(
    String groupId, {
    int ttlHours = 168,
    int maxUses = 0,
  }) async {
    try {
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/invite-qr',
        data: {'ttlHours': ttlHours, 'maxUses': maxUses},
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw StateError('Group invite QR response missing data');
      }
      return GroupInviteQr.fromJson(data);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<void> revoke(String groupId, String tokenId) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/client/v1/groups/$groupId/invite-qr/$tokenId',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<GroupInviteQrPreview> preview(String token) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/groups/join-by-qr/$token/preview',
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw StateError('Group invite QR preview response missing data');
      }
      return GroupInviteQrPreview.fromJson(data);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<AcceptGroupInviteQrResult> accept(
    String token, {
    String? message,
  }) async {
    try {
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/groups/join-by-qr/$token/accept',
        data: {
          if (message != null && message.trim().isNotEmpty)
            'message': message.trim(),
        },
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw StateError('Group invite QR accept response missing data');
      }
      return AcceptGroupInviteQrResult.fromJson(data);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }
}

class GroupInviteQr {
  final String tokenId;
  final String token;
  final String qrPayload;
  final String conversationId;
  final int maxUses;
  final int usedCount;
  final String status;
  final DateTime? expiresAt;
  final DateTime? createdAt;

  const GroupInviteQr({
    required this.tokenId,
    required this.token,
    required this.qrPayload,
    required this.conversationId,
    required this.maxUses,
    required this.usedCount,
    required this.status,
    this.expiresAt,
    this.createdAt,
  });

  factory GroupInviteQr.fromJson(Map<String, dynamic> json) {
    return GroupInviteQr(
      tokenId: json['tokenId'] as String? ?? '',
      token: json['token'] as String? ?? '',
      qrPayload: json['qrPayload'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      maxUses: json['maxUses'] as int? ?? 0,
      usedCount: json['usedCount'] as int? ?? 0,
      status: json['status'] as String? ?? 'active',
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
    );
  }

  bool get isUsable => status == 'active' && qrPayload.isNotEmpty;
}

class GroupInviteQrPreview {
  final String conversationId;
  final String groupTitle;
  final String? groupAvatarUrl;
  final int? memberCount;
  final String? inviterUserId;
  final String? inviterDisplayName;
  final DateTime? expiresAt;
  final bool requireApproval;
  final bool expired;
  final bool alreadyMember;

  const GroupInviteQrPreview({
    required this.conversationId,
    required this.groupTitle,
    this.groupAvatarUrl,
    this.memberCount,
    this.inviterUserId,
    this.inviterDisplayName,
    this.expiresAt,
    required this.requireApproval,
    required this.expired,
    required this.alreadyMember,
  });

  factory GroupInviteQrPreview.fromJson(Map<String, dynamic> json) {
    return GroupInviteQrPreview(
      conversationId: json['conversationId'] as String? ?? '',
      groupTitle: json['groupTitle'] as String? ?? '群聊',
      groupAvatarUrl: json['groupAvatarUrl'] as String?,
      memberCount: json['memberCount'] as int?,
      inviterUserId: json['inviterUserId'] as String?,
      inviterDisplayName: json['inviterDisplayName'] as String?,
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
      requireApproval: json['requireApproval'] as bool? ?? false,
      expired: json['expired'] as bool? ?? false,
      alreadyMember: json['alreadyMember'] as bool? ?? false,
    );
  }
}

class AcceptGroupInviteQrResult {
  final String conversationId;
  final String status;

  const AcceptGroupInviteQrResult({
    required this.conversationId,
    required this.status,
  });

  factory AcceptGroupInviteQrResult.fromJson(Map<String, dynamic> json) {
    return AcceptGroupInviteQrResult(
      conversationId: json['conversationId'] as String? ?? '',
      status: json['status'] as String? ?? 'joined',
    );
  }

  bool get isPending => status == 'pending';
}
