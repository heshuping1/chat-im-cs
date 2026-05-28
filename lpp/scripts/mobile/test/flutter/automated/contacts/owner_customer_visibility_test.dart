import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

class _MemorySecureStorage extends SecureStorageService {
  final Map<String, String> _values = {};

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _values.clear();
  }
}

class _OwnerRestoreAdapter implements HttpClientAdapter {
  final Completer<void> tenantsRequested = Completer<void>();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == '/api/client/v1/profile/me') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'userId': 'owner-user',
          'displayName': 'Owner',
          'userType': 2,
        },
      });
    }

    if (options.path == '/api/platform/v1/my/tenants') {
      if (!tenantsRequested.isCompleted) tenantsRequested.complete();
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': [
          {
            'tenantId': 'tenant-1',
            'tenantName': '测试企业',
            'tenantCode': 'test-corp',
            'logoUrl': null,
            'membershipRole': 4,
          }
        ],
      });
    }

    return _json({'code': 'OK', 'message': 'success', 'data': null});
  }

  ResponseBody _json(Map<String, dynamic> body) {
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test(
      'owner cold-start restore keeps all-customer visibility and customer filtering',
      () async {
    final storage = _MemorySecureStorage();
    await storage.write(SecureStorageService.activeSpaceIdKey, 'tenant-1');
    await storage.write(
        SecureStorageService.platformTokenKey, 'platform-token');
    await storage.writeTokenPair(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
    );
    await storage.writeTokenPair(
      spaceId: 'personal',
      accessToken: 'personal-access',
      refreshToken: 'personal-refresh',
    );

    final adapter = _OwnerRestoreAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
    dio.httpClientAdapter = adapter;

    final container = ProviderContainer(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        dioProvider.overrideWithValue(dio),
      ],
    );
    addTearDown(container.dispose);

    final authState = await container.read(authProvider.future);
    expect(authState.status, AuthStatus.authenticated);
    expect(container.read(currentSpaceProvider)?.membershipRole, 0);

    await adapter.tenantsRequested.future.timeout(const Duration(seconds: 2));
    await _waitUntil(
      () => container.read(currentSpaceProvider)?.membershipRole == 4,
      reason: '平台租户列表返回后，应把当前企业空间角色从占位 0 补回所有者 4',
    );

    final restoredSpace = container.read(currentSpaceProvider);
    expect(restoredSpace?.type, SpaceType.employee);
    expect(restoredSpace?.membershipRole, 4);
    expect(AppPermissions.canSeeAllCustomers(restoredSpace), isTrue);

    const members = [
      Contact(userId: 'customer-1', name: '客户 A', userType: 1),
      Contact(userId: 'staff-1', name: '员工 B', userType: 2),
    ];
    final visibleCustomers = members.where((member) => member.isCustomer);
    expect(visibleCustomers.map((member) => member.userId), ['customer-1']);
  });
}

Future<void> _waitUntil(
  bool Function() predicate, {
  required String reason,
  Duration timeout = const Duration(seconds: 2),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    if (predicate()) return;
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
  fail(reason);
}
