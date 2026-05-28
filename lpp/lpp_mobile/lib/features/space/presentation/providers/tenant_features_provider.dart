import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';

/// 租户功能特性数据类
class TenantFeatures {
  /// 社交模式：'social'=开放社交，'isolation'=客户隔离
  final String friendMode;

  /// 加入审批模式
  final String joinApprovalMode;

  /// 客服模式
  final String customerServiceMode;

  /// 指定客服模式下的客服人员 ID
  final String? designatedServiceStaffId;

  /// 是否启用临时会话
  final bool tempSessionEnabled;

  const TenantFeatures({
    required this.friendMode,
    required this.joinApprovalMode,
    required this.customerServiceMode,
    this.designatedServiceStaffId,
    required this.tempSessionEnabled,
  });

  factory TenantFeatures.fromJson(Map<String, dynamic> json) {
    return TenantFeatures(
      friendMode: json['friendMode'] as String? ?? 'isolation',
      joinApprovalMode: json['joinApprovalMode'] as String? ?? 'manual',
      customerServiceMode: json['customerServiceMode'] as String? ?? 'auto',
      designatedServiceStaffId: json['designatedServiceStaffId'] as String?,
      tempSessionEnabled: json['tempSessionEnabled'] as bool? ?? false,
    );
  }

  bool get isSocialMode => friendMode == 'social';
}

/// 按 spaceId 缓存租户功能特性
/// 使用 family 避免不同空间互相污染
final tenantFeaturesProvider =
    FutureProvider.family<TenantFeatures, String>((ref, spaceId) async {
  final dio = ref.read(dioProvider);
  final resp = await dio.get('/api/client/v1/tenant/features');
  final data = resp.data['data'] as Map<String, dynamic>? ?? {};
  return TenantFeatures.fromJson(data);
});
