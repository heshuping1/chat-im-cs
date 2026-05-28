import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/space/data/datasources/platform_tenant_datasource.dart';
import 'package:lpp_mobile/features/space/data/models/enterprise_join_models.dart';

final platformTenantDataSourceProvider =
    Provider<PlatformTenantDataSource>((ref) {
  return PlatformTenantDataSource(ref.watch(dioProvider));
});

final recommendedTenantsProvider =
    FutureProvider.autoDispose<List<JoinableTenant>>((ref) async {
  final token = await _platformToken(ref);
  if (token == null) return [];
  return ref
      .watch(platformTenantDataSourceProvider)
      .searchTenants(platformToken: token);
});

final myJoinRequestsProvider =
    FutureProvider.autoDispose<List<MyJoinRequest>>((ref) async {
  final token = await _platformToken(ref);
  if (token == null) return [];
  final requests = await ref
      .watch(platformTenantDataSourceProvider)
      .getMyJoinRequests(platformToken: token);
  final tenants = ref.read(authProvider).valueOrNull?.availableTenants ?? [];
  if (tenants.isEmpty) return requests;
  return requests.map((request) {
    final tenant =
        tenants.where((t) => t.tenantId == request.tenantId).firstOrNull;
    if (tenant == null) return request;
    return request.copyWith(
      tenantCode: request.tenantCode.isNotEmpty
          ? request.tenantCode
          : tenant.tenantCode,
      tenantName: request.tenantName.isNotEmpty
          ? request.tenantName
          : tenant.tenantName,
      logoUrl: request.logoUrl ?? tenant.logoUrl,
    );
  }).toList();
});

final tenantSearchProvider = StateNotifierProvider.autoDispose<
    TenantSearchNotifier, AsyncValue<List<JoinableTenant>>>((ref) {
  return TenantSearchNotifier(ref);
});

class TenantSearchNotifier
    extends StateNotifier<AsyncValue<List<JoinableTenant>>> {
  final Ref _ref;

  TenantSearchNotifier(this._ref) : super(const AsyncData([]));

  Future<void> search(String keyword) async {
    final text = keyword.trim();
    if (text.isEmpty) {
      state = const AsyncData([]);
      return;
    }
    state = const AsyncLoading();
    try {
      final token = await _platformToken(_ref);
      if (token == null) throw const AuthError('AUTH_INVALID_TOKEN');
      final tenants = await _ref
          .read(platformTenantDataSourceProvider)
          .searchTenants(platformToken: token, keyword: text);
      state = AsyncData(tenants);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

Future<String?> _platformToken(Ref ref) async {
  return ref.read(authProvider).valueOrNull?.platformToken ??
      await ref
          .read(secureStorageProvider)
          .read(SecureStorageService.platformTokenKey);
}
