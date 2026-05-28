import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';

class FriendInviteQrApi {
  final Dio _dio;

  FriendInviteQrApi(this._dio);

  Future<List<FriendInviteQr>> listActive() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/friends/invite-qr',
      );
      final list = resp.data?['data'] as List<dynamic>? ?? const [];
      return list
          .whereType<Map>()
          .map((item) => FriendInviteQr.fromJson(
                Map<String, dynamic>.from(item),
              ))
          .toList();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<FriendInviteQr> create({
    int ttlHours = 720,
    int maxUses = 0,
    String? message,
  }) async {
    try {
      final resp = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/friends/invite-qr',
        data: {
          'ttlHours': ttlHours,
          'maxUses': maxUses,
          if (message != null && message.trim().isNotEmpty)
            'message': message.trim(),
        },
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw StateError('Friend invite QR response missing data');
      }
      return FriendInviteQr.fromJson(data);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<void> revoke(String tokenId) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/client/v1/friends/invite-qr/$tokenId',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }
}

class FriendInviteQr {
  final String tokenId;
  final String token;
  final String qrPayload;
  final int maxUses;
  final int usedCount;
  final String? message;
  final String status;
  final DateTime? expiresAt;
  final DateTime? createdAt;

  const FriendInviteQr({
    required this.tokenId,
    required this.token,
    required this.qrPayload,
    required this.maxUses,
    required this.usedCount,
    this.message,
    required this.status,
    this.expiresAt,
    this.createdAt,
  });

  factory FriendInviteQr.fromJson(Map<String, dynamic> json) {
    return FriendInviteQr(
      tokenId: json['tokenId'] as String? ?? '',
      token: json['token'] as String? ?? '',
      qrPayload: json['qrPayload'] as String? ?? '',
      maxUses: json['maxUses'] as int? ?? 0,
      usedCount: json['usedCount'] as int? ?? 0,
      message: json['message'] as String?,
      status: json['status'] as String? ?? 'active',
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
    );
  }

  bool get isUsable => status == 'active' && qrPayload.isNotEmpty;
}
