import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/space/domain/entities/space_entity.dart';
import 'package:lpp_mobile/features/space/domain/repositories/space_repository.dart';

/// SpaceRepository 实现
///
/// Token 双层架构：
/// - platformToken = "身份证"，用于换取 tenant token，不用于业务接口
/// - tenantToken = "工牌"，用于所有 /api/client/v1/* 业务接口
/// - 切换空间 = 用 platformToken 重新换取目标空间的 tenant token
class SpaceRepositoryImpl implements SpaceRepository {
  final SecureStorageService _storage;
  final SpaceContext? Function() _getCurrentSpace;
  final List<TenantSummary> Function() _getAvailableTenants;
  final String? Function()? _getPlatformToken;
  final Future<void> Function(SpaceContext) _switchSpaceContext;
  final Dio _dio;

  /// 用 platformToken 换取指定空间的 tenant token
  /// spaceId='personal' 时调 select-personal-space，否则调 select-tenant
  final Future<TenantAuthResult> Function(String spaceId, String platformToken)
      _selectSpace;

  SpaceRepositoryImpl({
    required SecureStorageService storage,
    required SpaceContext? Function() getCurrentSpace,
    required List<TenantSummary> Function() getAvailableTenants,
    String? Function()? getPlatformToken,
    required Future<void> Function(SpaceContext) switchSpaceContext,
    required Future<TenantAuthResult> Function(
            String spaceId, String platformToken)
        selectSpace,
    required Dio dio,
  })  : _storage = storage,
        _getCurrentSpace = getCurrentSpace,
        _getAvailableTenants = getAvailableTenants,
        _getPlatformToken = getPlatformToken,
        _switchSpaceContext = switchSpaceContext,
        _selectSpace = selectSpace,
        _dio = dio;

  @override
  Future<List<Space>> getSpaces() async {
    final currentSpace = _getCurrentSpace();
    final activeSpaceId = currentSpace?.spaceId;
    final tenants = _getAvailableTenants();

    final spaces = <Space>[];

    // 个人空间（始终存在，无论 token 是否已缓存）
    spaces.add(Space(
      spaceId: 'personal',
      name: '个人空间',
      logoUrl: null,
      type: SpaceType.personal,
      unreadCount: await _getUnreadCount('personal'),
      conversationCount: await _getConversationCount('personal'),
      isActive: activeSpaceId == 'personal',
    ));

    // 企业空间（从 tenants 列表构建，同时从 SecureStorage 读取名称）
    for (final tenant in tenants) {
      final accessToken = await _storage.readAccessToken(tenant.tenantId);
      if (accessToken != null) {
        // 优先用 tenants 列表里的名字，其次用 SecureStorage 里存的
        final storedName = await _storage
            .read(SecureStorageService.tenantNameKey(tenant.tenantId));
        final storedLogo = await _storage
            .read(SecureStorageService.tenantLogoKey(tenant.tenantId));
        final logoUrl =
            (tenant.logoUrl?.isNotEmpty == true ? tenant.logoUrl : null) ??
                (storedLogo?.isNotEmpty == true ? storedLogo : null);
        spaces.add(Space(
          spaceId: tenant.tenantId,
          name: tenant.tenantName.isNotEmpty
              ? tenant.tenantName
              : (storedName ?? tenant.tenantId),
          logoUrl: logoUrl,
          type: SpaceType.employee,
          unreadCount: await _getUnreadCount(tenant.tenantId),
          conversationCount: await _getConversationCount(tenant.tenantId),
          isActive: activeSpaceId == tenant.tenantId,
        ));
      }
    }

    // tenants 列表为空时，从 SecureStorage 找已登录的企业空间
    if (tenants.isEmpty &&
        currentSpace != null &&
        currentSpace.spaceId != 'personal') {
      final accessToken = await _storage.readAccessToken(currentSpace.spaceId);
      if (accessToken != null &&
          !spaces.any((s) => s.spaceId == currentSpace.spaceId)) {
        final storedName = await _storage
            .read(SecureStorageService.tenantNameKey(currentSpace.spaceId));
        spaces.add(Space(
          spaceId: currentSpace.spaceId,
          name: storedName ?? currentSpace.spaceId,
          logoUrl: null,
          type: SpaceType.employee,
          unreadCount: await _getUnreadCount(currentSpace.spaceId),
          conversationCount: await _getConversationCount(currentSpace.spaceId),
          isActive: true,
        ));
      }
    }

    // 如果没有任何空间但有当前激活空间，至少返回当前空间
    if (spaces.isEmpty && currentSpace != null) {
      // 尝试从 tenants 列表找名字，找不到才用 spaceId
      final tenantName = tenants
          .where((t) => t.tenantId == currentSpace.spaceId)
          .map((t) => t.tenantName)
          .firstOrNull;
      spaces.add(Space(
        spaceId: currentSpace.spaceId,
        name: currentSpace.spaceId == 'personal'
            ? '个人空间'
            : (tenantName ?? currentSpace.spaceId),
        logoUrl: tenants
            .where((t) => t.tenantId == currentSpace.spaceId)
            .map((t) => t.logoUrl)
            .firstOrNull,
        type: currentSpace.type,
        unreadCount: await _getUnreadCount(currentSpace.spaceId),
        conversationCount: await _getConversationCount(currentSpace.spaceId),
        isActive: true,
      ));
    }

    return spaces;
  }

  Future<int> _getUnreadCount(String spaceId) async {
    // 从 SecureStorage 读取该空间的会话列表缓存，计算未读数
    final key = 'conversations_$spaceId';
    final json = await _storage.read(key);
    if (json == null) return 0;

    try {
      final list = (jsonDecode(json) as List<dynamic>);
      return list.fold<int>(0, (sum, item) {
        final unread = item['unreadCount'] as int? ?? 0;
        return sum + unread;
      });
    } catch (_) {
      return 0;
    }
  }

  Future<int> _getConversationCount(String spaceId) async {
    // 从 SecureStorage 读取该空间的会话列表缓存，计算会话数
    final key = 'conversations_$spaceId';
    final json = await _storage.read(key);
    if (json == null) return 0;

    try {
      final list = (jsonDecode(json) as List<dynamic>);
      return list.length;
    } catch (_) {
      return 0;
    }
  }

  /// 用 /profile/me 的 userType 检测 SpaceType
  Future<SpaceType> _detectUserSpaceType(String accessToken) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/profile/me',
        options: Options(headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        }),
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      final userType = data?['userType'] as int? ?? 2;
      if (userType == 1) {
        // 客户：判断 social/restricted
        try {
          final featResp = await _dio.get<Map<String, dynamic>>(
            '/api/client/v1/tenant/features',
            options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
          );
          final friendMode =
              featResp.data?['data']?['friendMode'] as String? ?? 'isolation';
          return friendMode == 'social'
              ? SpaceType.customerSocial
              : SpaceType.customerRestricted;
        } catch (_) {
          return SpaceType.customerSocial;
        }
      }
      return SpaceType.employee;
    } catch (_) {
      return SpaceType.employee;
    }
  }

  @override
  Future<void> switchSpace(String spaceId) async {
    // 按照 Token 双层架构：切换空间 = 用 platformToken 重新换取目标空间的 tenant token
    var platformToken =
        await _storage.read(SecureStorageService.platformTokenKey) ??
            _getPlatformToken?.call();

    if (platformToken != null) {
      try {
        // 用 platformToken 换取目标空间的新 tenant token
        final result = await _selectSpace(spaceId, platformToken);

        // 写入新 token
        await _storage.writeTokenPair(
          spaceId: spaceId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        );
        await _storage.write(SecureStorageService.activeSpaceIdKey, spaceId);
        await _storage.write(
            SecureStorageService.lastActiveSpaceIdKey, spaceId);

        // 从 tenants 列表获取 membershipRole
        final tenants = _getAvailableTenants();
        final role = tenants
                .where((t) => t.tenantId == spaceId)
                .map((t) => t.membershipRole)
                .firstOrNull ??
            0;
        // 用 /profile/me 的 userType 检测正确的 SpaceType
        final detectedType = spaceId == 'personal'
            ? SpaceType.personal
            : await _detectUserSpaceType(result.accessToken);
        final newContext = SpaceContext(
          spaceId: spaceId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          userId: result.userId,
          type: detectedType,
          membershipRole: spaceId == 'personal' ? 0 : role,
        );
        await _switchSpaceContext(newContext);
        return;
      } catch (_) {
        // platformToken 可能过期，尝试刷新后重试
        final newPlatformToken = await _refreshPlatformToken(platformToken);
        if (newPlatformToken != null) {
          platformToken = newPlatformToken;
          try {
            final result = await _selectSpace(spaceId, platformToken);
            await _storage.writeTokenPair(
              spaceId: spaceId,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            );
            await _storage.write(
                SecureStorageService.activeSpaceIdKey, spaceId);
            await _storage.write(
                SecureStorageService.lastActiveSpaceIdKey, spaceId);
            // 从 tenants 列表获取 membershipRole
            final tenants = _getAvailableTenants();
            final role = tenants
                    .where((t) => t.tenantId == spaceId)
                    .map((t) => t.membershipRole)
                    .firstOrNull ??
                0;
            // 用 /profile/me 的 userType 检测正确的 SpaceType
            final detectedType = spaceId == 'personal'
                ? SpaceType.personal
                : await _detectUserSpaceType(result.accessToken);
            final newContext = SpaceContext(
              spaceId: spaceId,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              userId: result.userId,
              type: detectedType,
              membershipRole: spaceId == 'personal' ? 0 : role,
            );
            await _switchSpaceContext(newContext);
            return;
          } catch (_) {
            // 刷新后仍失败，降级用旧 token
          }
        }
      }
    }

    // 降级：直接用 SecureStorage 里存的 token（可能已过期）
    final accessToken = await _storage.readAccessToken(spaceId);
    final refreshToken = await _storage.readRefreshToken(spaceId);

    if (accessToken == null || refreshToken == null) {
      if (spaceId == 'personal') {
        throw Exception('个人空间凭证不可用，请重新登录后再切换');
      }
      throw Exception('空间 $spaceId 的 Token 不存在，请重新登录');
    }

    // 旧版本曾在 select-personal-space 失败时把 platformToken 当作个人空间
    // accessToken 缓存。服务端文档明确 platformToken 不能访问 /api/client/v1/*，
    // 这里必须拒绝这种脏缓存，避免 UI 看似切换成功但后续接口全部失败。
    if (spaceId == 'personal' &&
        platformToken != null &&
        accessToken == platformToken) {
      await _storage.clearTokens('personal');
      throw Exception('个人空间凭证不可用，请重新登录后再切换');
    }

    await _storage.write(SecureStorageService.activeSpaceIdKey, spaceId);
    await _storage.write(SecureStorageService.lastActiveSpaceIdKey, spaceId);

    final detectedType = spaceId == 'personal'
        ? SpaceType.personal
        : await _detectUserSpaceType(accessToken);
    final newContext = SpaceContext(
      spaceId: spaceId,
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: '',
      type: detectedType,
    );
    await _switchSpaceContext(newContext);
  }

  /// 刷新 platformToken，成功返回新 token，失败返回 null
  Future<String?> _refreshPlatformToken(String currentToken) async {
    try {
      final refreshDio = Dio(BaseOptions(
        baseUrl: HttpClient.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ));
      final response = await refreshDio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/refresh-platform-token',
        options: Options(headers: {'Authorization': 'Bearer $currentToken'}),
      );
      final newToken = response.data?['data']?['platformToken'] as String?;
      if (newToken != null) {
        await _storage.write(SecureStorageService.platformTokenKey, newToken);
        return newToken;
      }
    } catch (_) {}
    return null;
  }
}
