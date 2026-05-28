import 'package:flutter/foundation.dart';

/// 登录请求
@immutable
class LoginRequest {
  final String identifier; // 手机号或邮箱
  final String? password;
  final String? verificationCode;
  final String loginType; // 'mobile', 'email', 'login_name', 'auto', 'lpp_id'
  final bool isCodeLogin; // true=验证码登录, false=密码登录
  final String? captchaToken; // 图形验证码 token
  final String? captchaAnswer; // 图形验证码答案
  final String? tenantCode; // 企业码（ztId/login_name 登录时必填）

  const LoginRequest({
    required this.identifier,
    this.password,
    this.verificationCode,
    required this.loginType,
    required this.isCodeLogin,
    this.captchaToken,
    this.captchaAnswer,
    this.tenantCode,
  });
}

/// 租户摘要
@immutable
class TenantSummary {
  final String tenantId;
  final String tenantName;
  final String? tenantCode;
  final String? logoUrl;
  final int membershipRole; // 0=普通成员, 1=技术支持, 2=客服, 3=管理员, 4=所有者

  const TenantSummary({
    required this.tenantId,
    required this.tenantName,
    this.tenantCode,
    this.logoUrl,
    required this.membershipRole,
  });

  String get roleLabel {
    switch (membershipRole) {
      case 4:
        return '所有者';
      case 3:
        return '管理员';
      case 2:
        return '客服';
      case 1:
        return '技术支持';
      default:
        return '成员';
    }
  }
}

/// 平台登录结果
@immutable
class PlatformLoginResult {
  final String platformToken;
  final String platformUserId;
  final String? lppId;
  final String? displayName;
  final int? userType;
  final int expiresIn;
  final List<TenantSummary> tenants;

  /// spaceContext.spaceType: 0=需选择, 1=个人空间, 2=租户空间
  final int spaceType;
  final String? suggestedTenantId;

  /// 注册 platform-result 在企业绑定 + 人工审批时返回 true。
  final bool pendingApproval;

  /// 账号状态：'active' | 'deactivating'（注销冷静期）
  final String accountStatus;

  const PlatformLoginResult({
    required this.platformToken,
    required this.platformUserId,
    this.lppId,
    this.displayName,
    this.userType,
    required this.expiresIn,
    required this.tenants,
    this.spaceType = 0,
    this.suggestedTenantId,
    this.pendingApproval = false,
    this.accountStatus = 'active',
  });

  bool get isPendingDeactivation => accountStatus == 'deactivating';
}

/// 租户认证结果
@immutable
class TenantAuthResult {
  final String tenantId;
  final String userId;
  final String? platformUserId;
  final String? lppId;
  final String? displayName;
  final int? userType;
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  /// spaceContext.spaceType: 1=个人空间, 2=租户空间
  final int? spaceType;

  const TenantAuthResult({
    required this.tenantId,
    required this.userId,
    this.platformUserId,
    this.lppId,
    this.displayName,
    this.userType,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    this.spaceType,
  });
}
