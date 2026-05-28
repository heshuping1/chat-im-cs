import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/admin/admin_http_client.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

class FakeSecureStorage extends SecureStorageService {
  final Map<String, String> _store;

  FakeSecureStorage([Map<String, String>? initial]) : _store = initial ?? {};

  @override
  Future<String?> read(String key) async => _store[key];

  @override
  Future<void> write(String key, String value) async {
    _store[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    _store.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _store.clear();
  }
}

class AdminAdapter implements HttpClientAdapter {
  AdminAdapter({this.hasAdminTenant = true});

  final bool hasAdminTenant;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);

    if (options.path == '/api/platform/v1/auth/admin-token') {
      return ResponseBody.fromString(
        '{"code":"OK","data":{"tenantId":"tenant_1","accessToken":"admin_access","refreshToken":"admin_refresh","expiresIn":21600,"roleCodes":["owner"],"permissionCodes":[],"isPlatformAdministrator":false}}',
        200,
        headers: {
          'content-type': ['application/json'],
        },
      );
    }

    if (options.path == '/api/platform/v1/my/admin-tenants') {
      final auth = options.headers['Authorization']?.toString();
      if (auth == 'Bearer platform_access') {
        return ResponseBody.fromString(
          hasAdminTenant
              ? '{"code":"OK","data":[{"tenantId":"tenant_1","tenantName":"Tenant","roleCodes":["tenant_owner"]}]}'
              : '{"code":"OK","data":[]}',
          200,
          headers: {
            'content-type': ['application/json'],
          },
        );
      }
      return ResponseBody.fromString(
        '{"code":"UNAUTHORIZED","message":"missing platform token"}',
        401,
        headers: {
          'content-type': ['application/json'],
        },
      );
    }

    if (options.path == '/api/admin/v1/me') {
      final auth = options.headers['Authorization']?.toString();
      if (auth == 'Bearer admin_access') {
        return ResponseBody.fromString(
          '{"code":"OK","data":{"userId":"u1","displayName":"Owner","roleCodes":["owner"],"permissionCodes":[]}}',
          200,
          headers: {
            'content-type': ['application/json'],
          },
        );
      }
      return ResponseBody.fromString(
        '{"code":"UNAUTHORIZED","message":"missing admin token"}',
        401,
        headers: {
          'content-type': ['application/json'],
        },
      );
    }

    return ResponseBody.fromString(
      '{"code":"NOT_FOUND"}',
      404,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('AdminHttpClient', () {
    test(
      'uses platform token to issue admin token from platform API',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.platformTokenKey: 'platform_access',
        });
        const space = SpaceContext(
          spaceId: 'tenant_1',
          accessToken: 'client_access',
          refreshToken: 'client_refresh',
          userId: 'u1',
          type: SpaceType.employee,
          membershipRole: 4,
        );
        final adapter = AdminAdapter();
        final client = AdminHttpClient(
          storage: storage,
          spaceGetter: () => space,
        );
        client.dio.httpClientAdapter = adapter;

        final response = await client.dio.get<Map<String, dynamic>>(
          '/api/admin/v1/me',
        );

        expect(response.statusCode, 200);
        expect(
          adapter.requests.map((request) => request.path),
          containsAllInOrder([
            '/api/platform/v1/my/admin-tenants',
            '/api/platform/v1/auth/admin-token',
            '/api/admin/v1/me',
          ]),
        );
        expect(
          adapter.requests.map((request) => request.path),
          isNot(contains('/api/admin/v1/auth/select-tenant')),
        );
        expect(
          adapter.requests.first.headers['Authorization'],
          'Bearer platform_access',
        );
        expect(
          adapter.requests.last.headers['Authorization'],
          'Bearer admin_access',
        );
        expect(
          await storage.read(
            SecureStorageService.adminAccessTokenKey('tenant_1'),
          ),
          'admin_access',
        );
        expect(
          await storage.read(
            SecureStorageService.adminRefreshTokenKey('tenant_1'),
          ),
          'admin_refresh',
        );
      },
    );

    test('does not issue admin token for non-admin roles', () async {
      final storage = FakeSecureStorage({
        SecureStorageService.platformTokenKey: 'platform_access',
      });
      const space = SpaceContext(
        spaceId: 'tenant_1',
        accessToken: 'client_access',
        refreshToken: 'client_refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 2,
      );
      final adapter = AdminAdapter(hasAdminTenant: false);
      final client = AdminHttpClient(
        storage: storage,
        spaceGetter: () => space,
      );
      client.dio.httpClientAdapter = adapter;

      await expectLater(
        client.dio.get<Map<String, dynamic>>('/api/admin/v1/me'),
        throwsA(anything),
      );
      expect(
        adapter.requests.map((request) => request.path),
        contains('/api/platform/v1/my/admin-tenants'),
      );
      expect(
        adapter.requests.map((request) => request.path),
        isNot(contains('/api/platform/v1/auth/admin-token')),
      );
    });
  });
}
