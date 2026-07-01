import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/auth/token_refresh_service.dart';
import 'package:lpp_mobile/core/database/app_database.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:lpp_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';

// ---------------------------------------------------------------------------
// Auth Status
// ---------------------------------------------------------------------------

enum AuthStatus { unknown, authenticated, unauthenticated }

// ---------------------------------------------------------------------------
// Auth State
// ---------------------------------------------------------------------------

class AuthState {
  final AuthStatus status;
  final SpaceContext? currentSpace;
  final List<TenantSummary> availableTenants;
  final String? platformToken;
  final String? error;

  /// 账号处于注销冷静期（7天内可撤销）
  final bool isPendingDeactivation;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.currentSpace,
    this.availableTenants = const [],
    this.platformToken,
    this.error,
    this.isPendingDeactivation = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    SpaceContext? currentSpace,
    List<TenantSummary>? availableTenants,
    String? platformToken,
    String? error,
    bool clearError = false,
    bool clearCurrentSpace = false,
    bool clearPlatformToken = false,
    bool? isPendingDeactivation,
  }) {
    return AuthState(
      status: status ?? this.status,
      currentSpace:
          clearCurrentSpace ? null : (currentSpace ?? this.currentSpace),
      availableTenants: availableTenants ?? this.availableTenants,
      platformToken:
          clearPlatformToken ? null : (platformToken ?? this.platformToken),
      error: clearError ? null : (error ?? this.error),
      isPendingDeactivation:
          isPendingDeactivation ?? this.isPendingDeactivation,
    );
  }
}

bool authStateNeedsSpaceSelection(AuthState state) {
  return state.status == AuthStatus.unauthenticated &&
      state.platformToken != null &&
      state.currentSpace == null;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final _authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(dioProvider);
  final dataSource = AuthRemoteDataSourceImpl(dio);
  return AuthRepositoryImpl(dataSource);
});

final authProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

// ---------------------------------------------------------------------------
// AuthNotifier
// ---------------------------------------------------------------------------

class AuthNotifier extends AsyncNotifier<AuthState> {
  AuthRepository get _repo => ref.read(_authRepositoryProvider);
  SecureStorageService get _storage => ref.read(secureStorageProvider);

  bool _isCaptchaError(Object e) {
    if (e is ServerError) {
      final code = e.code.toUpperCase();
      final message = e.message.toLowerCase();
      return code == 'AUTH_CAPTCHA_REQUIRED' ||
          code == 'AUTH_CAPTCHA_INVALID' ||
          message.contains('captcha') ||
          message.contains('图形验证码') ||
          message.contains('安全验证');
    }
    final text = e.toString().toLowerCase();
    return text.contains('auth_captcha_required') ||
        text.contains('auth_captcha_invalid') ||
        text.contains('captcha verification is required') ||
        text.contains('captcha') ||
        text.contains('图形验证码') ||
        text.contains('安全验证');
  }

  @override
  Future<AuthState> build() async {
    // 启动时检查是否已有有效 Token
    final spaceId = await _storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId == null) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }
    final accessToken = await _storage.readAccessToken(spaceId);
    final refreshToken = await _storage.readRefreshToken(spaceId);
    if (accessToken == null || refreshToken == null) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }
    final platformToken =
        await _storage.read(SecureStorageService.platformTokenKey);

    // 不用缓存的 SpaceType，直接等 _restoreUserId 从 /profile/me 获取正确类型
    // 先设置一个临时占位（personal 直接确定，企业空间等待检测）
    final initialType =
        spaceId == 'personal' ? SpaceType.personal : SpaceType.employee;
    final cachedMembershipRole = spaceId == 'personal'
        ? 0
        : int.tryParse(await _storage.read(
                  SecureStorageService.tenantMembershipRoleKey(spaceId),
                ) ??
                '') ??
            0;
    final space = SpaceContext(
      spaceId: spaceId,
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: '',
      type: initialType,
      membershipRole: cachedMembershipRole,
    );
    ref.read(currentSpaceProvider.notifier).setSpace(space);

    // 异步补全 userId 和 SpaceType，避免启动认证状态被 /profile/me 阻塞。
    unawaited(_restoreUserId(spaceId, accessToken));

    // 从 SecureStorage 恢复已知租户列表（不依赖 platformToken）
    final knownTenantIds = await _storage.readKnownTenantIds();
    final restoredTenants = <TenantSummary>[];
    for (final tenantId in knownTenantIds) {
      final name =
          await _storage.read(SecureStorageService.tenantNameKey(tenantId)) ??
              tenantId;
      final membershipRole = int.tryParse(await _storage.read(
                SecureStorageService.tenantMembershipRoleKey(tenantId),
              ) ??
              '') ??
          0;
      restoredTenants.add(TenantSummary(
        tenantId: tenantId,
        tenantName: name,
        membershipRole: membershipRole,
      ));
    }

    // 已知租户列表里有当前空间时，优先用本地角色缓存补齐占位空间，
    // 避免首页先按普通成员渲染，导致所有者/管理员工作台短暂消失。
    if (spaceId != 'personal' && cachedMembershipRole > 0) {
      final cachedSpace = space.copyWith(membershipRole: cachedMembershipRole);
      ref.read(currentSpaceProvider.notifier).setSpace(cachedSpace);
    }

    // 异步恢复租户列表（用于空间切换栏显示）
    if (platformToken != null) {
      _restoreTenants(platformToken, spaceId);
    }

    // 启动定时 token 刷新（前台 45 分钟，后台 15 分钟）
    _startTokenRefresh();

    return AuthState(
      status: AuthStatus.authenticated,
      currentSpace: ref.read(currentSpaceProvider) ?? space,
      availableTenants: restoredTenants,
      platformToken: platformToken,
    );
  }

  /// 启动时异步从 /profile/me 补全 userId，并判断 userType（员工 vs 客户）
  Future<void> _restoreUserId(String spaceId, String accessToken) async {
    try {
      // 用独立 Dio 实例绕过 TokenInterceptor，直接用传入的 accessToken
      final sourceDio = ref.read(dioProvider);
      final baseUrl = sourceDio.options.baseUrl;
      final plainDio = Dio(BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      plainDio.httpClientAdapter = sourceDio.httpClientAdapter;
      final resp = await plainDio.get<Map<String, dynamic>>(
        '/api/client/v1/profile/me',
        options: Options(headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        }),
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      final userId = data?['userId'] as String?;
      if (userId != null && userId.isNotEmpty) {
        final currentSpace = ref.read(currentSpaceProvider);
        final currentSpaceId = currentSpace?.spaceId;
        if (currentSpaceId != spaceId) return;

        SpaceType spaceType;
        int membershipRole = 0;

        if (spaceId == 'personal') {
          spaceType = SpaceType.personal;
        } else {
          // 直接用 /profile/me 返回的 userType 判断
          // userType: 1=客户, 2=员工/客服
          final userType = data?['userType'] as int? ?? 2;
          if (userType == 1) {
            // 客户：判断 social/restricted
            try {
              final featResp =
                  await ref.read(dioProvider).get<Map<String, dynamic>>(
                        '/api/client/v1/tenant/features',
                        options: Options(
                            headers: {'Authorization': 'Bearer $accessToken'}),
                      );
              final friendMode =
                  featResp.data?['data']?['friendMode'] as String? ??
                      'isolation';
              spaceType = friendMode == 'social'
                  ? SpaceType.customerSocial
                  : SpaceType.customerRestricted;
            } catch (_) {
              spaceType = SpaceType.customerSocial;
            }
          } else {
            // 员工：从 availableTenants 获取 membershipRole
            spaceType = SpaceType.employee;
            final tenants = state.valueOrNull?.availableTenants ?? [];
            membershipRole = tenants
                    .where((t) => t.tenantId == spaceId)
                    .map((t) => t.membershipRole)
                    .firstOrNull ??
                int.tryParse(await _storage.read(
                      SecureStorageService.tenantMembershipRoleKey(
                          spaceId, userId),
                    ) ??
                    '') ??
                0;
            if (membershipRole == 0) {
              membershipRole = await _resolveMembershipRoleFromTenantMembers(
                userId: userId,
                accessToken: accessToken,
              );
            }
          }
        }

        final updatedSpace = SpaceContext(
          spaceId: spaceId,
          accessToken: accessToken,
          refreshToken:
              (await _storage.readRefreshToken(spaceId)) ?? accessToken,
          userId: userId,
          type: spaceType,
          membershipRole: spaceId == 'personal'
              ? 0
              : await _resolveMembershipRoleWithSafeFallback(
                  spaceId: spaceId,
                  userId: userId,
                  candidateRole: membershipRole,
                ),
        );
        ref.read(currentSpaceProvider.notifier).setSpace(updatedSpace);
        // 同步更新 state 里的 currentSpace
        final current = state.valueOrNull;
        if (current != null) {
          state = AsyncData(current.copyWith(currentSpace: updatedSpace));
        }
      }
    } catch (_) {}
  }

  Future<int> _resolveMembershipRoleWithSafeFallback({
    required String spaceId,
    required String userId,
    required int candidateRole,
  }) async {
    // 平台登录 tenants[] 或租户成员接口返回的角色是当前用户的真实角色。
    // 只要拿到了非 0 角色，就必须信任服务端结果，不能被本地旧缓存升级。
    if (candidateRole > 0) return candidateRole;

    final latestSpace = ref.read(currentSpaceProvider);
    final latestRole =
        latestSpace?.spaceId == spaceId && latestSpace?.userId == userId
            ? latestSpace?.membershipRole ?? 0
            : 0;
    if (latestRole > 0) return latestRole;

    final storedUserRole = int.tryParse(await _storage.read(
              SecureStorageService.tenantMembershipRoleKey(spaceId, userId),
            ) ??
            '') ??
        0;
    if (storedUserRole > 0) return storedUserRole;

    final storedTenantRole = int.tryParse(await _storage.read(
              SecureStorageService.tenantMembershipRoleKey(spaceId),
            ) ??
            '') ??
        0;
    if (storedTenantRole > 0) return storedTenantRole;

    return 0;
  }

  /// 启动时异步恢复租户列表和各空间 token
  Future<void> _restoreTenants(
      String platformToken, String activeSpaceId) async {
    try {
      final tenants = await _repo.getMyTenants(platformToken);
      if (tenants.isEmpty) return;

      await _storage.writeKnownTenantIds(
        tenants.map((tenant) => tenant.tenantId).toList(),
      );
      for (final tenant in tenants) {
        await _storage.write(
          SecureStorageService.tenantNameKey(tenant.tenantId),
          tenant.tenantName,
        );
        await _storage.write(
          SecureStorageService.tenantMembershipRoleKey(tenant.tenantId),
          tenant.membershipRole.toString(),
        );
        final currentSpace = ref.read(currentSpaceProvider);
        if (currentSpace?.spaceId == tenant.tenantId &&
            currentSpace?.userId.isNotEmpty == true) {
          await _storage.write(
            SecureStorageService.tenantMembershipRoleKey(
              tenant.tenantId,
              currentSpace!.userId,
            ),
            tenant.membershipRole.toString(),
          );
        }
        if (tenant.logoUrl != null && tenant.logoUrl!.isNotEmpty) {
          await _storage.write(
            SecureStorageService.tenantLogoKey(tenant.tenantId),
            tenant.logoUrl!,
          );
        }
      }

      // 更新 state 里的 availableTenants
      final current = state.valueOrNull;
      if (current != null) {
        state = AsyncData(current.copyWith(availableTenants: tenants));
      }

      // 冷启动时 currentSpace 会先以 membershipRole=0 占位恢复。
      // 租户列表返回后必须立刻把当前空间角色补齐，否则所有者/管理员
      // 会被误判成普通成员，通讯录里看不到全部客户。
      final activeTenant = tenants
          .where((tenant) => tenant.tenantId == activeSpaceId)
          .firstOrNull;
      final currentSpace = ref.read(currentSpaceProvider);
      if (activeTenant != null &&
          currentSpace != null &&
          currentSpace.spaceId == activeSpaceId &&
          currentSpace.membershipRole != activeTenant.membershipRole) {
        final updatedSpace = currentSpace.copyWith(
          membershipRole: activeTenant.membershipRole,
        );
        ref.read(currentSpaceProvider.notifier).setSpace(updatedSpace);
        final latest = state.valueOrNull;
        if (latest != null) {
          state = AsyncData(latest.copyWith(currentSpace: updatedSpace));
        }
      }

      // 预取所有空间 token（跳过当前已激活的空间）
      for (final tenant in tenants) {
        if (tenant.tenantId == activeSpaceId) continue;
        final existing = await _storage.readAccessToken(tenant.tenantId);
        if (existing != null) continue; // 已有 token，跳过换取
        try {
          final result =
              await _repo.selectTenant(tenant.tenantId, platformToken);
          await _storage.writeTokenPair(
            spaceId: tenant.tenantId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          );
        } catch (_) {}
      }

      // 如果当前是企业空间，也确保个人空间 token 存在
      if (activeSpaceId != 'personal') {
        final personalToken = await _storage.readAccessToken('personal');
        if (personalToken == null) {
          try {
            final result = await _repo.selectPersonalSpace(platformToken);
            await _storage.writeTokenPair(
              spaceId: 'personal',
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            );
          } catch (_) {}
        }
      }

      ref.invalidate(spacesProvider);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // 验证码登录
  // ---------------------------------------------------------------------------

  Future<void> loginByCode(
    String identifier,
    String code,
    String loginType, {
    String? captchaToken,
    String? captchaAnswer,
  }) async {
    state = const AsyncLoading();
    final request = LoginRequest(
      identifier: identifier,
      verificationCode: code,
      loginType: loginType,
      isCodeLogin: true,
      captchaToken: captchaToken,
      captchaAnswer: captchaAnswer,
    );
    try {
      final result = await _repo.platformLoginByCode(request);
      await _handlePlatformLoginResult(result);
    } catch (e, st) {
      if (_isCaptchaError(e)) {
        state = const AsyncData(AuthState(status: AuthStatus.unauthenticated));
        rethrow;
      }
      state = AsyncError(e, st);
    }
  }

  // ---------------------------------------------------------------------------
  // 注册
  // ---------------------------------------------------------------------------

  /// 模式A：平台注册（多租户通用 APP）
  /// 注册成功后保留 platformToken，等待用户显式选择个人空间或企业空间。
  /// 支持两种响应变体：
  ///   - platform-result：返回 platformToken，进入空间选择
  ///   - tenant-result：企业绑定模式+自动审批，直接返回 accessToken
  Future<void> registerPlatform({
    required String displayName,
    required String password,
    required String loginType,
    String? loginName,
    String? mobile,
    String? email,
    String? verificationCode,
    String? captchaToken,
    String? captchaAnswer,
  }) async {
    state = const AsyncLoading();
    try {
      final dio = ref.read(dioProvider);
      final regResp = await dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/register',
        data: {
          'displayName': displayName,
          'password': password,
          'loginType': loginType,
          if (loginName != null && loginName.isNotEmpty) 'loginName': loginName,
          if (mobile != null) 'mobile': mobile,
          if (email != null) 'email': email,
          if (verificationCode != null) 'verificationCode': verificationCode,
          if (captchaToken != null) 'captchaToken': captchaToken,
          if (captchaAnswer != null) 'captchaAnswer': captchaAnswer,
        },
      );
      final data = regResp.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('注册失败：无响应数据');

      // 判断响应变体：有 accessToken → tenant-result（企业绑定模式自动通过）
      if (data.containsKey('accessToken')) {
        final tenantResult = TenantAuthResult(
          tenantId: data['tenantId'] as String? ?? '',
          userId: data['userId'] as String? ?? '',
          platformUserId: data['platformUserId'] as String?,
          lppId: data['lppId'] as String?,
          displayName: data['displayName'] as String?,
          userType: data['userType'] as int?,
          accessToken: data['accessToken'] as String,
          refreshToken: data['refreshToken'] as String,
          expiresIn: data['expiresIn'] as int? ?? 3600,
          spaceType: (data['spaceContext']
              as Map<String, dynamic>?)?['spaceType'] as int?,
        );
        await _applyTenantAuth(tenantResult, const AuthState());
        return;
      }

      // platform-result：有 platformToken
      final platformToken = data['platformToken'] as String?;
      if (platformToken == null) throw Exception('注册失败：未返回 platformToken');
      await _storage.write(
          SecureStorageService.platformTokenKey, platformToken);

      final tenants = await _resolveRegistrationTenants(data, platformToken);
      state = AsyncData(AuthState(
        status: AuthStatus.unauthenticated,
        availableTenants: tenants,
        platformToken: platformToken,
      ));
    } on DioException catch (e, st) {
      final error = ErrorHandler.fromDioException(e);
      state = AsyncError(error, st);
      throw error;
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<List<TenantSummary>> _resolveRegistrationTenants(
      Map<String, dynamic> data, String platformToken) async {
    final responseTenants = data['tenants'];
    if (responseTenants is List) {
      return responseTenants
          .whereType<Map<String, dynamic>>()
          .map(_tenantSummaryFromJson)
          .toList();
    }
    try {
      return await _repo.getMyTenants(platformToken);
    } catch (_) {
      return const [];
    }
  }

  TenantSummary _tenantSummaryFromJson(Map<String, dynamic> json) {
    return TenantSummary(
      tenantId: json['tenantId'] as String,
      tenantName: json['tenantName'] as String,
      tenantCode: json['tenantCode'] as String?,
      logoUrl: (json['logoUrl'] as String?)?.isNotEmpty == true
          ? json['logoUrl'] as String
          : null,
      membershipRole: json['membershipRole'] as int? ?? 0,
    );
  }

  /// 模式B：企业专属注册
  /// 支持手机/邮箱/loginName，注册后自动登录企业空间
  /// [tenantIdOrCode] 可以是 tenantId(GUID) 或 tenantCode
  Future<void> registerEnterprise({
    required String tenantIdOrCode,
    required String password,
    required String displayName,
    required String loginType,
    String? loginName,
    String? email,
    String? mobile,
    String? verificationCode,
    String? captchaToken,
    String? captchaAnswer,
  }) async {
    state = const AsyncLoading();
    try {
      final dio = ref.read(dioProvider);

      // Step1: 企业注册（X-Tenant-Id 传 tenantId 或 tenantCode 均可，服务端按优先级处理）
      await dio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/register',
        options: Options(headers: {'X-Tenant-Id': tenantIdOrCode}),
        data: {
          if (loginName != null && loginName.isNotEmpty) 'loginName': loginName,
          'password': password,
          'displayName': displayName,
          'loginType': loginType,
          if (email != null) 'email': email,
          if (mobile != null) 'mobile': mobile,
          if (verificationCode != null) 'verificationCode': verificationCode,
          if (captchaToken != null) 'captchaToken': captchaToken,
          if (captchaAnswer != null) 'captchaAnswer': captchaAnswer,
        },
      );

      // Step2: 注册成功后自动登录
      // 优先用邮箱/手机号登录（平台账号），否则用 loginName
      final String loginIdentifier;
      final String resolvedLoginType;
      if (email != null && email.isNotEmpty) {
        loginIdentifier = email;
        resolvedLoginType = 'email';
      } else if (mobile != null && mobile.isNotEmpty) {
        loginIdentifier = mobile;
        resolvedLoginType = 'mobile';
      } else {
        loginIdentifier = loginName ?? '';
        resolvedLoginType = 'login_name';
      }

      // X-Tenant-Id 接受 GUID 或 tenantCode，统一传给 tenantCode 字段
      final request = LoginRequest(
        identifier: loginIdentifier,
        password: password,
        loginType: resolvedLoginType,
        isCodeLogin: false,
        tenantCode: tenantIdOrCode,
      );
      final result = await _repo.tenantLogin(request);
      final tenantResult = TenantAuthResult(
        tenantId: _parseTenantIdFromToken(result.accessToken) ?? tenantIdOrCode,
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      );
      await _applyTenantAuth(tenantResult, const AuthState());
    } on DioException catch (e, st) {
      final error = ErrorHandler.fromDioException(e);
      state = AsyncError(error, st);
      throw error;
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  // ---------------------------------------------------------------------------
  // 密码登录
  // ---------------------------------------------------------------------------

  Future<void> loginByPassword(
    String identifier,
    String password,
    String loginType, {
    String? captchaToken,
    String? captchaAnswer,
    String? tenantCode,
  }) async {
    state = const AsyncLoading();
    final request = LoginRequest(
      identifier: identifier,
      password: password,
      loginType: loginType,
      isCodeLogin: false,
      captchaToken: captchaToken,
      captchaAnswer: captchaAnswer,
      tenantCode: tenantCode,
    );
    try {
      // lpp_id 登录：走平台登录流程（platform login → select-tenant）
      if (loginType == 'lpp_id') {
        final result = await _repo.platformLogin(request);
        // 平台登录成功后，根据 tenantCode 找到对应租户并进入
        if (tenantCode != null && tenantCode.isNotEmpty) {
          // 从 tenants 列表里找匹配的租户（按 tenantCode 或 tenantId 匹配）
          final matchedTenant = result.tenants.firstWhere(
            (t) => t.tenantCode == tenantCode || t.tenantId == tenantCode,
            orElse: () => result.tenants.isNotEmpty
                ? result.tenants.first
                : throw ServerError(
                    code: 'TENANT_NOT_FOUND',
                    message: '未找到企业「$tenantCode」，请确认企业码是否正确'),
          );
          // 用 platformToken 换取 tenant token
          final tenantResult = await _repo.selectTenant(
              matchedTenant.tenantId, result.platformToken);
          await _applyTenantAuth(
              tenantResult,
              AuthState(
                platformToken: result.platformToken,
                availableTenants: result.tenants,
              ));
        } else {
          await _handlePlatformLoginResult(result);
        }
        // login_name 登录走租户内接口
      } else if (loginType == 'login_name') {
        final result = await _repo.tenantLogin(request);
        final tenantId = _parseTenantIdFromToken(result.accessToken);
        final spaceId = tenantId ?? 'tenant_${request.identifier}';
        final authResult = TenantAuthResult(
          tenantId: spaceId,
          userId: result.userId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        );
        await _applyTenantAuth(authResult, const AuthState());
      } else {
        final result = await _repo.platformLogin(request);
        await _handlePlatformLoginResult(result);
      }
    } catch (e, st) {
      // AUTH_CAPTCHA_REQUIRED 需要重新抛出，让 UI 层处理弹窗
      if (_isCaptchaError(e)) {
        state = const AsyncData(AuthState(status: AuthStatus.unauthenticated));
        rethrow;
      }
      state = AsyncError(e, st);
    }
  }

  Future<int> _resolveMembershipRoleFromTenantMembers({
    required String userId,
    required String accessToken,
  }) async {
    if (userId.isEmpty || accessToken.isEmpty) return 0;
    try {
      final resp = await ref.read(dioProvider).get<Map<String, dynamic>>(
            '/api/client/v1/tenant/members',
            options: Options(
              headers: {'Authorization': 'Bearer $accessToken'},
            ),
          );
      final members = resp.data?['data'] as List<dynamic>? ?? const [];
      for (final item in members) {
        if (item is! Map<String, dynamic>) continue;
        if (item['userId'] == userId) {
          return item['membershipRole'] as int? ?? 0;
        }
      }
    } catch (_) {}
    return 0;
  }

  // ---------------------------------------------------------------------------
  // 发送验证码
  // ---------------------------------------------------------------------------

  Future<void> sendVerificationCode(String identifier, String channel) async {
    try {
      await _repo.sendVerificationCode(
        identifier: identifier,
        channel: channel,
        purpose: 'login',
      );
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  // ---------------------------------------------------------------------------
  // 选择租户
  // ---------------------------------------------------------------------------

  Future<void> selectTenant(String tenantId) async {
    final currentState = state.valueOrNull;
    final platformToken = currentState?.platformToken;
    if (platformToken == null) {
      state = AsyncError(
        Exception('platformToken 不存在，请重新登录'),
        StackTrace.current,
      );
      return;
    }

    state = const AsyncLoading();
    try {
      final result = await _repo.selectTenant(tenantId, platformToken);
      await _applyTenantAuth(result, currentState!);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  // ---------------------------------------------------------------------------
  // 选择个人空间
  // ---------------------------------------------------------------------------

  Future<void> selectPersonalSpace() async {
    final currentState = state.valueOrNull;
    final platformToken = currentState?.platformToken;
    if (platformToken == null) {
      state = AsyncError(
        Exception('platformToken 不存在，请重新登录'),
        StackTrace.current,
      );
      return;
    }

    state = const AsyncLoading();
    try {
      final result = await _repo.selectPersonalSpace(platformToken);
      await _storage.writeTokenPair(
        spaceId: 'personal',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      await _storage.write(SecureStorageService.activeSpaceIdKey, 'personal');
      await _storage.write(
          SecureStorageService.lastActiveSpaceIdKey, 'personal');

      final space = SpaceContext(
        spaceId: 'personal',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.userId,
        type: SpaceType.personal,
      );
      ref.read(currentSpaceProvider.notifier).setSpace(space);
      invalidateContactScopedProviders(ref);

      state = AsyncData(AuthState(
        status: AuthStatus.authenticated,
        currentSpace: space,
        availableTenants: currentState?.availableTenants ?? [],
        platformToken: platformToken,
      ));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  // ---------------------------------------------------------------------------
  // 退出登录
  // ---------------------------------------------------------------------------

  Future<void> logout() async {
    // 停止定时刷新
    TokenRefreshService.instance.stop();

    await ref.read(pushNotificationServiceProvider).unregisterCurrentDevice();

    try {
      await _repo.logout();
    } catch (_) {}

    // 退出前保存当前空间 ID，下次登录时恢复
    final spaceId = await _storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId != null) {
      await _storage.write(SecureStorageService.lastActiveSpaceIdKey, spaceId);
      await _storage.clearTokens(spaceId);
      await _storage.clearAdminTokens(spaceId);
      // 退出登录时删除该空间的 SQLite 数据库文件
      await AppDatabase.delete(spaceId);
    }
    final knownTenantIds = await _storage.readKnownTenantIds();
    for (final tenantId in knownTenantIds) {
      await _storage.clearAdminTokens(tenantId);
    }
    await _storage.delete(SecureStorageService.platformTokenKey);
    await _storage.delete(SecureStorageService.activeSpaceIdKey);

    ref.read(currentSpaceProvider.notifier).clearSpace();

    // 清除所有内存缓存，防止下次登录看到旧数据
    if (spaceId != null) {
      ref.invalidate(conversationsProvider(spaceId));
    }
    invalidateContactScopedProviders(ref);

    state = const AsyncData(
      AuthState(status: AuthStatus.unauthenticated),
    );
  }

  // ---------------------------------------------------------------------------
  // 内部辅助
  // ---------------------------------------------------------------------------

  Future<void> _handlePlatformLoginResult(PlatformLoginResult result) async {
    await _storage.write(
        SecureStorageService.platformTokenKey, result.platformToken);

    // 读取本地上次用户主动选择的空间（退出登录时保留）
    final lastSpaceId =
        await _storage.read(SecureStorageService.lastActiveSpaceIdKey);

    // 判断上次是否是个人空间
    final lastWasPersonal = lastSpaceId == 'personal';

    // 如果上次是某个企业空间，且该企业仍在租户列表中 → 进该企业空间
    final lastTenantStillValid = lastSpaceId != null &&
        lastSpaceId != 'personal' &&
        result.tenants.any((t) => t.tenantId == lastSpaceId);

    // 服务端建议进入的空间（优先级：本地记忆 > 服务端建议）
    // spaceType=0：需要选择；spaceType=1：个人空间；spaceType=2：指定租户
    final serverSuggestsTenant =
        result.spaceType == 2 && result.suggestedTenantId != null;

    // 如果上次是个人空间，或者没有租户且没有上次记忆 → 进个人空间。
    // 注意：服务端可能在 spaceType=1 时仍返回唯一企业租户；这种情况下
    // App 应直接进入该企业，避免所有者/管理员登录后落到个人空间。
    // 注意：客户账户 tenants[] 可能为空，但有 lastSpaceId 时应恢复上次的企业空间
    final shouldGoPersonal =
        lastWasPersonal || (result.tenants.isEmpty && lastSpaceId == null);

    // spaceType=0 且有多个租户且没有本地记忆 → 展示选择页
    final shouldShowSelection = result.spaceType == 0 &&
        result.tenants.length > 1 &&
        lastSpaceId == null &&
        !serverSuggestsTenant;

    // spaceType=0 且有多个租户且没有本地记忆 → 展示选择页（不自动进入任何空间）
    if (shouldShowSelection) {
      state = AsyncData(AuthState(
        status: AuthStatus.unauthenticated, // 保持未认证，让 router 跳转到选择页
        availableTenants: result.tenants,
        platformToken: result.platformToken,
      ));
      return;
    }

    if (shouldGoPersonal) {
      // 进个人空间
      final personalResult =
          await _repo.selectPersonalSpace(result.platformToken);
      await _storage.writeTokenPair(
        spaceId: 'personal',
        accessToken: personalResult.accessToken,
        refreshToken: personalResult.refreshToken,
      );
      await _storage.write(SecureStorageService.activeSpaceIdKey, 'personal');

      final space = SpaceContext(
        spaceId: 'personal',
        accessToken: personalResult.accessToken,
        refreshToken: personalResult.refreshToken,
        userId: personalResult.userId,
        type: SpaceType.personal,
      );
      ref.read(currentSpaceProvider.notifier).setSpace(space);

      var tenants = result.tenants;
      if (tenants.isEmpty) {
        try {
          tenants = await _repo.getMyTenants(result.platformToken);
        } catch (_) {}
      }

      state = AsyncData(AuthState(
        status: AuthStatus.authenticated,
        currentSpace: space,
        availableTenants: tenants,
        platformToken: result.platformToken,
        isPendingDeactivation: result.isPendingDeactivation,
      ));

      if (tenants.isNotEmpty) {
        _prefetchTenantTokens(tenants, result.platformToken);
      }
      return;
    }

    // 确定目标企业空间：优先用上次的，其次用服务端建议的，最后用 tenants 第一个
    // 客户账户 tenants[] 可能为空，但 lastSpaceId 有值时直接用
    final String targetTenantId;
    if (lastTenantStillValid) {
      targetTenantId = lastSpaceId;
    } else if (lastSpaceId != null &&
        lastSpaceId != 'personal' &&
        result.tenants.isEmpty) {
      // 客户账户：tenants[] 为空但有上次记忆，直接用 lastSpaceId
      targetTenantId = lastSpaceId;
    } else if (result.spaceType == 2 && result.suggestedTenantId != null) {
      targetTenantId = result.suggestedTenantId!;
    } else if (result.tenants.isNotEmpty) {
      targetTenantId = result.tenants.first.tenantId;
    } else {
      // 没有任何企业空间信息，进个人空间
      await selectPersonalSpace();
      return;
    }

    final tenantResult =
        await _repo.selectTenant(targetTenantId, result.platformToken);
    await _applyTenantAuth(
      tenantResult,
      AuthState(
        availableTenants: result.tenants,
        platformToken: result.platformToken,
      ),
    );

    // 异步换取个人空间 token
    _repo.selectPersonalSpace(result.platformToken).then((r) async {
      await _storage.writeTokenPair(
        spaceId: 'personal',
        accessToken: r.accessToken,
        refreshToken: r.refreshToken,
      );
      ref.invalidate(spacesProvider);
    }).catchError((_) {});

    // 异步换取其他企业空间 token
    final otherTenants =
        result.tenants.where((t) => t.tenantId != targetTenantId).toList();
    if (otherTenants.isNotEmpty) {
      _prefetchTenantTokens(otherTenants, result.platformToken);
    }
  }

  /// 预先换取所有企业空间的 tenant token，存入 SecureStorage
  /// 这样用户在个人空间时也能看到并切换到企业空间
  Future<void> _prefetchTenantTokens(
      List<TenantSummary> tenants, String platformToken) async {
    final tenantIds = <String>[];
    for (final tenant in tenants) {
      try {
        final result = await _repo.selectTenant(tenant.tenantId, platformToken);
        await _storage.writeTokenPair(
          spaceId: tenant.tenantId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        );
        await _storage.write(
            SecureStorageService.tenantNameKey(tenant.tenantId),
            tenant.tenantName);
        await _storage.write(
          SecureStorageService.tenantMembershipRoleKey(tenant.tenantId),
          tenant.membershipRole.toString(),
        );
        final currentSpace = ref.read(currentSpaceProvider);
        if (currentSpace?.spaceId == tenant.tenantId &&
            currentSpace?.userId.isNotEmpty == true) {
          await _storage.write(
            SecureStorageService.tenantMembershipRoleKey(
              tenant.tenantId,
              currentSpace!.userId,
            ),
            tenant.membershipRole.toString(),
          );
        }
        if (tenant.logoUrl != null && tenant.logoUrl!.isNotEmpty) {
          await _storage.write(
              SecureStorageService.tenantLogoKey(tenant.tenantId),
              tenant.logoUrl!);
        }
        tenantIds.add(tenant.tenantId);
      } catch (_) {
        // 单个企业换取失败不影响整体流程
      }
    }
    // 持久化已知租户 ID 列表
    if (tenantIds.isNotEmpty) {
      await _storage.writeKnownTenantIds(tenantIds);
    }
    // 全部换取完成后刷新空间列表
    ref.invalidate(spacesProvider);
  }

  /// 从 JWT token 解析 tenant_id
  String? _parseTenantIdFromToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      // Base64 解码 payload
      var payload = parts[1];
      // 补齐 padding
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final decoded = String.fromCharCodes(
        base64Decode(payload.replaceAll('-', '+').replaceAll('_', '/')),
      );
      final json = jsonDecode(decoded) as Map<String, dynamic>;
      return json['tenant_id'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> _applyTenantAuth(
      TenantAuthResult result, AuthState prevState) async {
    // 切换账户/空间前，清除旧数据
    final oldSpaceId = state.valueOrNull?.currentSpace?.spaceId;
    final oldUserId = state.valueOrNull?.currentSpace?.userId;
    final isSameSpace = oldSpaceId == result.tenantId;
    final isSameUser = oldUserId == result.userId && result.userId.isNotEmpty;

    // 同一空间但不同用户（切换账户）→ 先删除 SQLite，再 invalidate 内存缓存
    // 顺序很重要：必须先删 SQLite，否则 invalidate 后 provider 重建时会读到旧数据
    if (isSameSpace && !isSameUser && oldSpaceId != null) {
      await AppDatabase.delete(oldSpaceId);
      await _storage.clearAdminTokens(oldSpaceId);
      await _storage.delete(
        SecureStorageService.tenantMembershipRoleKey(oldSpaceId),
      );
    }

    // 不同空间 或 同一空间但不同用户（切换账户）→ 清除内存缓存
    if (oldSpaceId != null && (!isSameSpace || !isSameUser)) {
      ref.invalidate(conversationsProvider(oldSpaceId));
      invalidateContactScopedProviders(ref);
    }

    // 写入 SecureStorage（企业空间 token）
    await _storage.writeTokenPair(
      spaceId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    );

    // 保存租户名称（从 availableTenants 里找，用于空间列表显示）
    final tenantName = prevState.availableTenants
        .where((t) => t.tenantId == result.tenantId)
        .map((t) => t.tenantName)
        .firstOrNull;
    if (tenantName != null) {
      await _storage.write(
          SecureStorageService.tenantNameKey(result.tenantId), tenantName);
    }

    // 默认进入企业空间（不覆盖个人空间 token）
    await _storage.write(
        SecureStorageService.activeSpaceIdKey, result.tenantId);
    await _storage.write(
        SecureStorageService.lastActiveSpaceIdKey, result.tenantId);
    final knownTenantIds = await _storage.readKnownTenantIds();
    if (!knownTenantIds.contains(result.tenantId)) {
      await _storage.writeKnownTenantIds([...knownTenantIds, result.tenantId]);
    }

    // 构建企业空间 SpaceContext（从 availableTenants 获取 membershipRole）
    int membershipRole = prevState.availableTenants
            .where((t) => t.tenantId == result.tenantId)
            .map((t) => t.membershipRole)
            .firstOrNull ??
        0;
    if (membershipRole == 0 && result.userType != 1) {
      membershipRole = await _resolveMembershipRoleFromTenantMembers(
        userId: result.userId,
        accessToken: result.accessToken,
      );
    }
    membershipRole = await _resolveMembershipRoleWithSafeFallback(
      spaceId: result.tenantId,
      userId: result.userId,
      candidateRole: membershipRole,
    );
    await _storage.write(
      SecureStorageService.tenantMembershipRoleKey(result.tenantId),
      membershipRole.toString(),
    );
    if (result.userId.isNotEmpty) {
      await _storage.write(
        SecureStorageService.tenantMembershipRoleKey(
            result.tenantId, result.userId),
        membershipRole.toString(),
      );
    }

    // membershipRole: 1=技术支持，2=客服，3=管理员，4=所有者；0=客户
    // 直接用 membershipRole 判断，不需要额外调接口
    SpaceType spaceType;
    if (membershipRole == 1 ||
        membershipRole == 2 ||
        membershipRole == 3 ||
        membershipRole == 4) {
      spaceType = SpaceType.employee;
    } else {
      // membershipRole == 0：客户，进一步判断 social/restricted
      try {
        final featResp = await ref.read(dioProvider).get<Map<String, dynamic>>(
              '/api/client/v1/tenant/features',
              options: Options(
                  headers: {'Authorization': 'Bearer ${result.accessToken}'}),
            );
        final friendMode =
            featResp.data?['data']?['friendMode'] as String? ?? 'isolation';
        spaceType = friendMode == 'social'
            ? SpaceType.customerSocial
            : SpaceType.customerRestricted;
      } catch (_) {
        spaceType = SpaceType.customerSocial;
      }
    }

    // 缓存 SpaceType（按 userId 隔离），下次启动时直接用
    final typeStr = spaceType == SpaceType.customerSocial
        ? 'customerSocial'
        : spaceType == SpaceType.customerRestricted
            ? 'customerRestricted'
            : 'employee';
    await _storage.write(
        SecureStorageService.spaceTypeKey(result.tenantId, result.userId),
        typeStr);

    final space = SpaceContext(
      spaceId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      type: spaceType,
      membershipRole: membershipRole,
    );

    // 更新 SpaceManager
    ref.read(currentSpaceProvider.notifier).setSpace(space);

    state = AsyncData(AuthState(
      status: AuthStatus.authenticated,
      currentSpace: space,
      availableTenants: prevState.availableTenants,
      platformToken: prevState.platformToken,
    ));

    // 登录/切换空间后启动定时刷新
    _startTokenRefresh();
  }

  // ---------------------------------------------------------------------------
  // 定时 Token 刷新
  // ---------------------------------------------------------------------------

  /// 启动定时刷新（前台 45 分钟一次，后台通过 workmanager 15 分钟一次）
  void _startTokenRefresh() {
    TokenRefreshService.instance.start(
      onRefresh: () async {
        await refreshPlatformToken();
        await _refreshCurrentTenantToken();
      },
    );
  }

  /// 刷新当前激活空间的租户 token
  Future<void> _refreshCurrentTenantToken() async {
    final currentState = state.valueOrNull;
    final platformToken = currentState?.platformToken ??
        await _storage.read(SecureStorageService.platformTokenKey);
    if (platformToken == null) return;

    final spaceId = currentState?.currentSpace?.spaceId ??
        await _storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId == null) return;

    try {
      final TenantAuthResult result;
      if (spaceId == 'personal') {
        result = await _repo.selectPersonalSpace(platformToken);
      } else {
        result = await _repo.selectTenant(spaceId, platformToken);
      }
      await _storage.writeTokenPair(
        spaceId: spaceId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      // 更新内存状态
      updateTenantToken(spaceId, result.accessToken);
      debugPrint('[TokenRefresh] tenant token refreshed for $spaceId');
    } catch (e) {
      debugPrint('[TokenRefresh] tenant token refresh failed: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // 刷新 platformToken
  // ---------------------------------------------------------------------------

  /// TokenInterceptor 刷新 platformToken 成功后调用，同步更新内存 state
  void updatePlatformToken(String newToken) {
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(current.copyWith(platformToken: newToken));
    }
  }

  /// TokenInterceptor 刷新租户 token 成功后调用，同步更新内存 state
  void updateTenantToken(String spaceId, String newAccessToken) {
    final current = state.valueOrNull;
    if (current == null) return;
    // 只更新当前激活空间的 accessToken
    if (current.currentSpace?.spaceId == spaceId) {
      final updatedSpace = current.currentSpace!.copyWith(
        accessToken: newAccessToken,
      );
      state = AsyncData(current.copyWith(currentSpace: updatedSpace));
      // 同步更新 SpaceManager 内存状态（不持久化，避免覆盖 active_space_id）
      ref.read(currentSpaceProvider.notifier).setSpace(updatedSpace);
    }
  }

  /// 主动刷新 platformToken，成功后写入 SecureStorage 并更新 state
  /// 建议在 app 进入前台时调用，或在 platformToken 即将过期时调用
  Future<void> refreshPlatformToken() async {
    final currentPlatformToken = state.valueOrNull?.platformToken ??
        await _storage.read(SecureStorageService.platformTokenKey);

    if (currentPlatformToken == null) return;

    try {
      final result = await _repo.refreshPlatformToken(currentPlatformToken);
      // 持久化新 platformToken
      await _storage.write(
          SecureStorageService.platformTokenKey, result.platformToken);
      // 更新 state
      final current = state.valueOrNull;
      if (current != null) {
        state =
            AsyncData(current.copyWith(platformToken: result.platformToken));
      }
    } catch (e) {
      // 刷新失败（如 platformToken 已过期），需要重新登录
      if (e is AuthError) {
        await logout();
      }
      // 其他错误静默处理，不影响当前会话
    }
  }

  /// 下拉刷新时调用：检查是否有新审批通过的企业空间
  /// 对比当前 availableTenants 和服务端最新列表，有新租户则预取 token 并更新 state
  Future<void> refreshTenants() async {
    var platformToken = state.valueOrNull?.platformToken ??
        await _storage.read(SecureStorageService.platformTokenKey);
    if (platformToken == null) return;

    try {
      List<TenantSummary> newTenants;
      try {
        newTenants = await _repo.getMyTenants(platformToken);
      } on AuthError {
        // platform token 过期，先刷新再重试
        await refreshPlatformToken();
        platformToken = state.valueOrNull?.platformToken ??
            await _storage.read(SecureStorageService.platformTokenKey);
        if (platformToken == null) return;
        newTenants = await _repo.getMyTenants(platformToken);
      }
      final current = state.valueOrNull;
      if (current == null) return;

      // 存储最新的 logoUrl 到 SecureStorage
      for (final tenant in newTenants) {
        if (tenant.logoUrl != null && tenant.logoUrl!.isNotEmpty) {
          await _storage.write(
              SecureStorageService.tenantLogoKey(tenant.tenantId),
              tenant.logoUrl!);
        }
        await _storage.write(
            SecureStorageService.tenantNameKey(tenant.tenantId),
            tenant.tenantName);
        await _storage.write(
          SecureStorageService.tenantMembershipRoleKey(tenant.tenantId),
          tenant.membershipRole.toString(),
        );
        final currentSpace = ref.read(currentSpaceProvider);
        if (currentSpace?.spaceId == tenant.tenantId &&
            currentSpace?.userId.isNotEmpty == true) {
          await _storage.write(
            SecureStorageService.tenantMembershipRoleKey(
              tenant.tenantId,
              currentSpace!.userId,
            ),
            tenant.membershipRole.toString(),
          );
        }
      }

      // 无论有没有新租户，都更新 availableTenants（包含最新 logoUrl）
      state = AsyncData(current.copyWith(availableTenants: newTenants));

      // 同步更新当前空间的 membershipRole（服务端可能已修改角色）
      final currentSpaceId = current.currentSpace?.spaceId;
      if (currentSpaceId != null && currentSpaceId != 'personal') {
        final updatedTenant =
            newTenants.where((t) => t.tenantId == currentSpaceId).firstOrNull;
        if (updatedTenant != null) {
          final currentSpace = ref.read(currentSpaceProvider);
          if (currentSpace != null &&
              currentSpace.membershipRole != updatedTenant.membershipRole) {
            final updatedSpace = currentSpace.copyWith(
              membershipRole: updatedTenant.membershipRole,
            );
            ref.read(currentSpaceProvider.notifier).setSpace(updatedSpace);
            state = AsyncData((state.valueOrNull ?? current).copyWith(
              currentSpace: updatedSpace,
            ));
          }
        }
      }

      // 检查是否有新审批通过的租户
      final currentIds =
          current.availableTenants.map((t) => t.tenantId).toSet();
      final newIds = newTenants.map((t) => t.tenantId).toSet();
      final addedIds = newIds.difference(currentIds);
      if (addedIds.isNotEmpty) {
        _prefetchTenantTokens(
          newTenants.where((t) => addedIds.contains(t.tenantId)).toList(),
          platformToken,
        );
      }

      // 刷新空间列表（更新 logoUrl 显示）
      ref.invalidate(spacesProvider);
    } catch (_) {
      // refreshTenants 失败静默处理
    }
  }

  /// 企业码/邀请码自动通过时，服务端会直接返回 tenant token。
  /// 该方法用于把这类结果接入当前双层 Token/SpaceContext 状态。
  Future<void> enterTenantFromJoinResult(
    TenantAuthResult result, {
    TenantSummary? tenant,
  }) async {
    final current = state.valueOrNull ??
        AuthState(
          platformToken:
              await _storage.read(SecureStorageService.platformTokenKey),
        );
    final tenants = [...current.availableTenants];
    if (tenant != null && tenant.tenantId.isNotEmpty) {
      final index = tenants.indexWhere((t) => t.tenantId == tenant.tenantId);
      if (index >= 0) {
        tenants[index] = tenant;
      } else {
        tenants.add(tenant);
      }
    }
    await _applyTenantAuth(
      result,
      current.copyWith(availableTenants: tenants),
    );
    await refreshTenants();
  }
}
