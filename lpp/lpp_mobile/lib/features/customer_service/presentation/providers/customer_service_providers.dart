import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/admin/admin_access.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/customer_service/data/datasources/customer_service_remote_datasource.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';
import 'package:lpp_mobile/features/customer_service/domain/customer_service_realtime_models.dart';
import 'package:lpp_mobile/features/customer_service/domain/customer_service_role_capabilities.dart';

final customerServiceRepositoryProvider =
    Provider<CustomerServiceRepository>((ref) {
  return CustomerServiceRepository(
    CustomerServiceRemoteDataSource(ref.watch(dioProvider)),
  );
});

final adminCustomerServiceRepositoryProvider =
    Provider<AdminCustomerServiceRepository>((ref) {
  return AdminCustomerServiceRepository(
    AdminCustomerServiceRemoteDataSource(ref.watch(adminDioProvider)),
  );
});

final currentCustomerServiceRoleCapabilitiesProvider =
    Provider<CustomerServiceRoleCapabilities>((ref) {
  final space = ref.watch(currentSpaceProvider);
  return customerServiceRoleCapabilities(
    membershipRole: space?.membershipRole,
  );
});

final customerServiceTypingPreviewProvider = StateNotifierProvider<
    CustomerServiceTypingPreviewNotifier,
    Map<String, CustomerServiceTypingPreview>>((ref) {
  return CustomerServiceTypingPreviewNotifier();
});

final customerServiceTransferNoticeProvider = StateNotifierProvider<
    CustomerServiceTransferNoticeNotifier,
    List<CustomerServiceTransferNotice>>((ref) {
  return CustomerServiceTransferNoticeNotifier();
});

class CustomerServiceTransferNoticeNotifier
    extends StateNotifier<List<CustomerServiceTransferNotice>> {
  CustomerServiceTransferNoticeNotifier() : super(const []);

  void apply({
    required String threadType,
    required String threadId,
    required String conversationId,
    String? customerUserId,
    String? fromStaffUserId,
    required String toStaffUserId,
    String? reason,
    String? recipientRole,
    required String currentStaffUserId,
    DateTime? transferredAt,
  }) {
    final notice = createCustomerServiceTransferNotice(
      CustomerServiceTransferNoticeEvent(
        threadType: threadType,
        threadId: threadId,
        conversationId: conversationId,
        customerUserId: customerUserId,
        fromStaffUserId: fromStaffUserId,
        toStaffUserId: toStaffUserId,
        reason: reason,
        recipientRole: recipientRole,
      ),
      currentStaffUserId: currentStaffUserId,
      receivedAt: transferredAt,
    );
    if (notice == null) return;
    state = [
      notice,
      ...state.where((item) => item.threadKey != notice.threadKey),
    ].take(5).toList(growable: false);
  }

  void dismiss(String noticeId) {
    state = state.where((item) => item.noticeId != noticeId).toList();
  }

  void clear() {
    state = const [];
  }
}

class CustomerServiceTypingPreviewNotifier
    extends StateNotifier<Map<String, CustomerServiceTypingPreview>> {
  final Map<String, Timer> _timers = {};

  CustomerServiceTypingPreviewNotifier() : super(const {});

  void apply({
    required String threadType,
    required String threadId,
    required String conversationId,
    required bool isTyping,
    String? preview,
    String? senderRole,
    String? senderUserId,
    DateTime? at,
  }) {
    final primaryId = threadId.trim().isNotEmpty ? threadId : conversationId;
    if (primaryId.trim().isEmpty) return;
    final event = CustomerServiceTypingPreviewEvent(
      threadId: primaryId,
      threadType: threadType,
      isTyping: isTyping,
      previewText: preview,
      senderRole: senderRole,
      senderUserId: senderUserId,
      receivedAt: at ?? DateTime.now(),
    );
    final result = reduceCustomerServiceTypingPreview(event);
    final keys = {
      _key(threadType, primaryId),
      if (conversationId.trim().isNotEmpty) _key(threadType, conversationId),
    };
    if (result == CustomerServiceTypingPreviewResult.clear || result == null) {
      for (final key in keys) {
        _clearKey(key);
      }
      return;
    }
    final previewModel = result as CustomerServiceTypingPreview;
    for (final key in keys) {
      _timers[key]?.cancel();
      state = {...state, key: previewModel};
      _timers[key] = Timer(customerServiceTypingPreviewTtl, () {
        _clearKey(key);
      });
    }
  }

  CustomerServiceTypingPreview? previewFor({
    required String threadType,
    required String threadId,
    required String conversationId,
  }) {
    final normalizedThreadType =
        threadType.trim().isEmpty ? 'temp_session' : threadType;
    return state[_key(normalizedThreadType, threadId)] ??
        state[_key(normalizedThreadType, conversationId)];
  }

  void _clearKey(String key) {
    _timers.remove(key)?.cancel();
    if (!state.containsKey(key)) return;
    final next = Map<String, CustomerServiceTypingPreview>.from(state)
      ..remove(key);
    state = next;
  }

  static String _key(String threadType, String id) {
    final normalizedType = threadType.trim().replaceAll('-', '_');
    return '$normalizedType:${id.trim()}';
  }

  @override
  void dispose() {
    for (final timer in _timers.values) {
      timer.cancel();
    }
    _timers.clear();
    super.dispose();
  }
}

final adminManagementCredentialAvailableProvider =
    FutureProvider.family<bool, String>((ref, spaceId) async {
  final platformToken = ref.watch(authProvider).valueOrNull?.platformToken;
  if (platformToken != null && platformToken.isNotEmpty) return true;

  final cachedAdminAccessToken = await ref
      .watch(secureStorageProvider)
      .read(SecureStorageService.adminAccessTokenKey(spaceId));
  return cachedAdminAccessToken != null && cachedAdminAccessToken.isNotEmpty;
});

final adminAccessibleTenantsProvider =
    FutureProvider<List<AdminAccessibleTenant>>((ref) async {
  final platformToken = ref.watch(authProvider).valueOrNull?.platformToken;
  if (platformToken == null || platformToken.isEmpty) return const [];
  try {
    final resp = await ref.watch(dioProvider).get<Map<String, dynamic>>(
          '/api/platform/v1/my/admin-tenants',
          options: Options(headers: {
            'Authorization': 'Bearer $platformToken',
          }),
        );
    final raw = resp.data?['data'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map>()
        .map(
            (e) => AdminAccessibleTenant.fromJson(Map<String, dynamic>.from(e)))
        .where((tenant) => tenant.canAccess)
        .toList(growable: false);
  } catch (_) {
    return const [];
  }
});

final currentSpaceHasAdminConsoleAccessProvider = Provider<bool>((ref) {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || !space.isEmployee) return false;
  if (ref
      .watch(currentCustomerServiceRoleCapabilitiesProvider)
      .canUseManagementReadonly) {
    return true;
  }
  final tenants = ref.watch(adminAccessibleTenantsProvider).valueOrNull;
  return tenants?.any(
        (tenant) =>
            tenant.tenantId == space.spaceId &&
            tenant.hasManagementConsoleAccess,
      ) ??
      false;
});

final currentSpaceAdminAccessibleTenantProvider =
    Provider<AdminAccessibleTenant?>((ref) {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || !space.isEmployee) return null;
  final tenants = ref.watch(adminAccessibleTenantsProvider).valueOrNull;
  for (final tenant in tenants ?? const <AdminAccessibleTenant>[]) {
    if (tenant.tenantId == space.spaceId) return tenant;
  }
  return null;
});

final customerServiceThreadsProvider =
    FutureProvider<CsThreadsData>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null) return const CsThreadsData([], []);
  if (!ref
      .watch(currentCustomerServiceRoleCapabilitiesProvider)
      .canUseStaffEndpoints) {
    throw StateError('当前角色不是客服，不能调用客服工作台接口');
  }
  return ref.read(customerServiceRepositoryProvider).getThreads();
});

final customerServiceStaffHistoryProvider =
    FutureProvider<List<CsThread>>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null) return const <CsThread>[];
  if (!ref
      .watch(currentCustomerServiceRoleCapabilitiesProvider)
      .canUseStaffEndpoints) {
    throw StateError('当前角色不是客服，不能调用客服接待历史接口');
  }
  return ref
      .read(customerServiceRepositoryProvider)
      .getStaffServiceHistory(threadType: 'temp_session', limit: 50);
});

final customerServiceDashboardProvider =
    FutureProvider<CsDashboardData>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null) return const CsDashboardData();
  if (!ref
      .watch(currentCustomerServiceRoleCapabilitiesProvider)
      .canUseStaffEndpoints) {
    throw StateError('当前角色不是客服，不能调用客服工作台接口');
  }
  return ref.read(customerServiceRepositoryProvider).getDashboard();
});

final customerProfileCardProvider =
    FutureProvider.family<CustomerProfileCard, String>((ref, customerUserId) {
  if (customerUserId.trim().isEmpty) {
    throw StateError('缺少客户 ID');
  }
  return ref
      .read(customerServiceRepositoryProvider)
      .getCustomerProfileCard(customerUserId);
});

final customerThreadProfileCardProvider = FutureProvider.family<
    CustomerProfileCard,
    ({String customerUserId, String threadType, String threadId})>((ref, args) {
  return ref.read(customerServiceRepositoryProvider).getCustomerProfileCard(
        args.customerUserId,
        threadType: args.threadType,
        threadId: args.threadId,
      );
});

final customerServiceReceptionStatusProvider = AsyncNotifierProvider<
    CustomerServiceReceptionStatusNotifier,
    CsReceptionStatus>(CustomerServiceReceptionStatusNotifier.new);

class CustomerServiceReceptionStatusNotifier
    extends AsyncNotifier<CsReceptionStatus> {
  @override
  Future<CsReceptionStatus> build() async {
    final space = ref.watch(currentSpaceProvider);
    if (space == null ||
        !ref
            .watch(currentCustomerServiceRoleCapabilitiesProvider)
            .canUseStaffEndpoints) {
      throw StateError('当前角色不是客服，不能调用客服接待状态接口');
    }
    return ref.read(customerServiceRepositoryProvider).getReceptionStatus();
  }

  Future<void> setStatus(String serviceStatus) async {
    final space = ref.read(currentSpaceProvider);
    if (space == null ||
        !ref
            .read(currentCustomerServiceRoleCapabilitiesProvider)
            .canUseStaffEndpoints) {
      state = AsyncError(
        StateError('当前角色不是客服，不能切换客服接待状态'),
        StackTrace.current,
      );
      return;
    }

    final previous = state.valueOrNull;
    state = const AsyncLoading<CsReceptionStatus>().copyWithPrevious(state);
    try {
      final updated = await ref
          .read(customerServiceRepositoryProvider)
          .updateReceptionStatus(
            serviceStatus: serviceStatus,
            queueAcceptEnabled: serviceStatus == 'online'
                ? (previous?.queueAcceptEnabled ?? false)
                : false,
          );
      state = AsyncData(updated);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
    } catch (e, st) {
      if (previous != null) {
        state = AsyncData(previous);
      } else {
        state = AsyncError(e, st);
      }
      Error.throwWithStackTrace(e, st);
    }
  }

  Future<void> setQueueAcceptEnabled(bool enabled) async {
    final space = ref.read(currentSpaceProvider);
    if (space == null ||
        !ref
            .read(currentCustomerServiceRoleCapabilitiesProvider)
            .canUseStaffEndpoints) {
      state = AsyncError(
        StateError('当前角色不是客服，不能切换接入模式'),
        StackTrace.current,
      );
      return;
    }

    final previous = state.valueOrNull;
    final serviceStatus = previous?.serviceStatus ?? 'offline';
    state = const AsyncLoading<CsReceptionStatus>().copyWithPrevious(state);
    try {
      final updated = await ref
          .read(customerServiceRepositoryProvider)
          .updateReceptionStatus(
            serviceStatus: serviceStatus,
            queueAcceptEnabled: serviceStatus == 'online' ? enabled : false,
          );
      state = AsyncData(updated);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
    } catch (e, st) {
      if (previous != null) {
        state = AsyncData(previous);
      } else {
        state = AsyncError(e, st);
      }
      Error.throwWithStackTrace(e, st);
    }
  }
}

final customerServiceQuickRepliesProvider = AsyncNotifierProvider.family<
    CustomerServiceQuickRepliesNotifier,
    List<CsQuickReply>,
    String?>(CustomerServiceQuickRepliesNotifier.new);

final adminCustomerServiceDashboardProvider =
    FutureProvider<AdminCustomerServiceDashboard>((ref) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看管理工作台数据');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getCenterDashboard();
});

final adminCustomerServiceStaffStatusesProvider =
    FutureProvider<List<AdminStaffStatus>>((ref) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客服状态');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getStaffStatuses();
});

final adminTempSessionStatsProvider =
    FutureProvider<AdminTempSessionStats>((ref) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客服绩效');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getTempSessionStats();
});

final adminGroupsProvider = FutureProvider<List<AdminGroup>>((ref) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看群列表');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getGroups();
});

class AdminCustomerQuery {
  final String? keyword;
  final String? status;
  final String? assignedStaffUserId;
  final List<String> tags;
  final String tagMatch;

  const AdminCustomerQuery({
    this.keyword,
    this.status,
    this.assignedStaffUserId,
    this.tags = const [],
    this.tagMatch = 'any',
  });

  @override
  bool operator ==(Object other) {
    return other is AdminCustomerQuery &&
        other.keyword == keyword &&
        other.status == status &&
        other.assignedStaffUserId == assignedStaffUserId &&
        other.tagMatch == tagMatch &&
        _listEquals(other.tags, tags);
  }

  @override
  int get hashCode => Object.hash(
        keyword,
        status,
        assignedStaffUserId,
        tagMatch,
        Object.hashAll(tags),
      );
}

bool _listEquals<T>(List<T> a, List<T> b) {
  if (identical(a, b)) return true;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i += 1) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

final adminCustomersProvider =
    FutureProvider.family<List<AdminCustomer>, AdminCustomerQuery>(
        (ref, query) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客户管理');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getCustomers(
        keyword: query.keyword,
        status: query.status,
        assignedStaffUserId: query.assignedStaffUserId,
        tags: query.tags,
        tagMatch: query.tagMatch,
      );
});

final adminCustomerDetailProvider =
    FutureProvider.family<AdminCustomerDetail, String>((ref, customerUserId) {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客户详情');
  }
  return ref
      .read(adminCustomerServiceRepositoryProvider)
      .getCustomerDetail(customerUserId);
});

final adminCustomerProfileCardProvider =
    FutureProvider.family<CustomerProfileCard, String>((ref, customerUserId) {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客户画像');
  }
  if (customerUserId.trim().isEmpty) {
    throw StateError('缺少客户 ID');
  }
  return ref
      .read(adminCustomerServiceRepositoryProvider)
      .getCustomerProfileCard(customerUserId);
});

class AdminCustomerServiceThreadQuery {
  final String? status;
  final String? threadType;
  final String? assignedStaffUserId;

  const AdminCustomerServiceThreadQuery({
    this.status,
    this.threadType,
    this.assignedStaffUserId,
  });

  @override
  bool operator ==(Object other) {
    return other is AdminCustomerServiceThreadQuery &&
        other.status == status &&
        other.threadType == threadType &&
        other.assignedStaffUserId == assignedStaffUserId;
  }

  @override
  int get hashCode => Object.hash(status, threadType, assignedStaffUserId);
}

final adminCustomerServiceThreadsProvider =
    FutureProvider.family<List<CsThread>, AdminCustomerServiceThreadQuery>(
        (ref, query) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客服会话');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getCenterThreads(
        status: query.status,
        threadType: query.threadType,
        assignedStaffUserId: query.assignedStaffUserId,
      );
});

final adminCustomerServiceThreadDetailProvider = FutureProvider.family<
    CsThreadDetail, ({String threadType, String threadId})>((ref, args) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客服会话详情');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getCenterThreadDetail(
        threadType: args.threadType,
        threadId: args.threadId,
      );
});

final adminDirectCustomerThreadsProvider =
    FutureProvider.family<List<CsThread>, bool>((ref, unassignedOnly) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看客户线程池');
  }
  return ref
      .read(adminCustomerServiceRepositoryProvider)
      .getDirectCustomerThreads(unassignedOnly: unassignedOnly);
});

final adminAuditLogsProvider = FutureProvider<List<AdminAuditLog>>((ref) async {
  if (!ref.watch(currentSpaceHasAdminConsoleAccessProvider)) {
    throw StateError('当前角色不能查看操作审计');
  }
  return ref.read(adminCustomerServiceRepositoryProvider).getAuditLogs();
});

class CustomerServiceQuickRepliesNotifier
    extends FamilyAsyncNotifier<List<CsQuickReply>, String?> {
  static const _cacheKeyPrefix = 'quick_replies_';

  @override
  Future<List<CsQuickReply>> build(String? arg) async {
    final space = ref.watch(currentSpaceProvider);
    if (space == null) return const [];
    if (!ref
        .watch(currentCustomerServiceRoleCapabilitiesProvider)
        .canUseStaffEndpoints) {
      throw StateError('当前角色不是客服，不能调用客服话术接口');
    }

    final cached = await _loadFromCache(space.spaceId, arg);
    if (cached != null) {
      unawaited(_syncFromRemote(space.spaceId, arg, silent: true));
      return cached;
    }

    return _syncFromRemote(space.spaceId, arg, silent: false);
  }

  Future<void> refresh() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) {
      state = const AsyncData([]);
      return;
    }
    if (!ref
        .read(currentCustomerServiceRoleCapabilitiesProvider)
        .canUseStaffEndpoints) {
      state = AsyncError(
        StateError('当前角色不是客服，不能调用客服话术接口'),
        StackTrace.current,
      );
      return;
    }

    final previous = state.valueOrNull;
    state = const AsyncLoading<List<CsQuickReply>>().copyWithPrevious(state);
    try {
      final fresh = await _syncFromRemote(space.spaceId, arg, silent: false);
      state = AsyncData(fresh);
    } catch (e, st) {
      if (previous != null) {
        state = AsyncData(previous);
      } else {
        state = AsyncError(e, st);
      }
    }
  }

  Future<List<CsQuickReply>> _syncFromRemote(
    String spaceId,
    String? scope, {
    required bool silent,
  }) async {
    try {
      final fresh = await ref
          .read(customerServiceRepositoryProvider)
          .getQuickReplies(scope: scope);
      await _saveToCache(spaceId, scope, fresh);
      if (silent && state.hasValue && state.valueOrNull != fresh) {
        state = AsyncData(fresh);
      }
      return fresh;
    } catch (e, st) {
      if (!silent) Error.throwWithStackTrace(e, st);
      return state.valueOrNull ?? const [];
    }
  }

  Future<List<CsQuickReply>?> _loadFromCache(
      String spaceId, String? scope) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get(_cacheKey(scope));
      if (raw is! String || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! List) return null;
      return decoded
          .whereType<Map>()
          .map((e) => CsQuickReply.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToCache(
    String spaceId,
    String? scope,
    List<CsQuickReply> replies,
  ) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      await box.put(
        _cacheKey(scope),
        jsonEncode(replies.map((e) => e.toJson()).toList()),
      );
    } catch (_) {
      // 缓存失败不阻塞话术使用。
    }
  }

  String _cacheKey(String? scope) =>
      '$_cacheKeyPrefix${scope == null || scope.isEmpty ? 'all' : scope}';
}
