import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/auth/token_refresh_service.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

void main() {
  group('lpp_id platform login', () {
    test('platform registration waits for explicit space selection', () async {
      final storage = _MemorySecureStorage();
      final adapter = _LppIdPlatformLoginAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;

      final container = ProviderContainer(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          dioProvider.overrideWithValue(dio),
        ],
      );
      addTearDown(() {
        TokenRefreshService.instance.stop();
        container.dispose();
      });

      await container
          .read(authProvider.notifier)
          .registerPlatform(
            displayName: '新用户',
            password: '123123123',
            loginType: 'email',
            email: 'new-user@example.com',
          );

      final authState = container.read(authProvider).valueOrNull;
      expect(adapter.paths, ['/api/platform/v1/auth/register']);
      expect(adapter.platformRegisterBody['email'], 'new-user@example.com');
      expect(adapter.platformRegisterBody['loginType'], 'email');
      expect(authState?.status, AuthStatus.unauthenticated);
      expect(authState?.platformToken, 'platform-token');
      expect(authState?.currentSpace, isNull);
      expect(container.read(currentSpaceProvider), isNull);
      expect(
        await storage.read(SecureStorageService.platformTokenKey),
        'platform-token',
      );
      expect(await storage.read(SecureStorageService.activeSpaceIdKey), isNull);
      expect(await storage.readAccessToken('personal'), isNull);
    });

    test('platform registration rejects lpp id identifiers', () async {
      final storage = _MemorySecureStorage();
      final adapter = _LppIdPlatformLoginAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;

      final container = ProviderContainer(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          dioProvider.overrideWithValue(dio),
        ],
      );
      addTearDown(() {
        TokenRefreshService.instance.stop();
        container.dispose();
      });

      await expectLater(
        container
            .read(authProvider.notifier)
            .registerPlatform(
              displayName: '微界号用户',
              password: '123123123',
              loginType: 'lpp_id',
              loginName: 'wj0701163730',
            ),
        throwsA(
          isA<ServerError>()
              .having((error) => error.code, 'code',
                  'AUTH_REGISTER_IDENTIFIER_UNSUPPORTED')
              .having((error) => error.message, 'message',
                  '注册暂不支持微界号，请使用邮箱或手机号注册'),
        ),
      );
      expect(adapter.paths, isEmpty);
    });

    test(
      'platform registration accepts invitation and enters tenant',
      () async {
        final storage = _MemorySecureStorage();
        final adapter = _LppIdPlatformLoginAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;

        final container = ProviderContainer(
          overrides: [
            secureStorageProvider.overrideWithValue(storage),
            dioProvider.overrideWithValue(dio),
          ],
        );
        addTearDown(() {
          TokenRefreshService.instance.stop();
          container.dispose();
        });

        await container
            .read(authProvider.notifier)
            .registerPlatform(
              displayName: '邀请用户',
              password: '123123123',
              loginType: 'email',
              email: 'invited@example.com',
              invitationCode: 'DD11D7976EDE33BB',
            );

        expect(adapter.paths, [
          '/api/platform/v1/auth/register',
          '/api/platform/v1/invitations/DD11D7976EDE33BB',
          '/api/platform/v1/invitations/DD11D7976EDE33BB/accept',
        ]);
        expect(adapter.invitationAcceptAuthHeader, 'Bearer platform-token');
        expect(container.read(currentSpaceProvider)?.spaceId, 'tenant-1');
        expect(container.read(currentSpaceProvider)?.membershipRole, 2);
        expect(
          await storage.readAccessToken('tenant-1'),
          'invitation-tenant-access',
        );
        expect(
          await storage.read(SecureStorageService.activeSpaceIdKey),
          'tenant-1',
        );
      },
    );

    test('pending platform token requires explicit space selection', () {
      const state = AuthState(
        status: AuthStatus.unauthenticated,
        platformToken: 'platform-token',
      );

      expect(authStateNeedsSpaceSelection(state), isTrue);
    });

    test('platform registration maps 409 response to server error', () async {
      final storage = _MemorySecureStorage();
      final adapter = _LppIdPlatformLoginAdapter(
        platformRegisterSucceeds: false,
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;

      final container = ProviderContainer(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          dioProvider.overrideWithValue(dio),
        ],
      );
      addTearDown(() {
        TokenRefreshService.instance.stop();
        container.dispose();
      });

      await expectLater(
        container
            .read(authProvider.notifier)
            .registerPlatform(
              displayName: '新用户',
              password: '123123123',
              loginType: 'email',
              email: 'existing@example.com',
            ),
        throwsA(
          isA<ServerError>()
              .having((error) => error.code, 'code', 'AUTH_ACCOUNT_EXISTS')
              .having((error) => error.statusCode, 'statusCode', 409)
              .having((error) => error.requestId, 'requestId', 'register-409')
              .having((error) => error.message, 'message', '邮箱已被注册'),
        ),
      );

      expect(container.read(authProvider).error, isA<ServerError>());
    });

    test('uses platform login and select-tenant without tenant code', () async {
      final storage = _MemorySecureStorage();
      final adapter = _LppIdPlatformLoginAdapter(platformSpaceType: 2);
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;

      final container = ProviderContainer(
        overrides: [
          secureStorageProvider.overrideWithValue(storage),
          dioProvider.overrideWithValue(dio),
        ],
      );
      addTearDown(() {
        TokenRefreshService.instance.stop();
        container.dispose();
      });

      await container
          .read(authProvider.notifier)
          .loginByPassword('lpp_aej69f2o', '123123123', 'lpp_id');

      expect(adapter.paths, [
        '/api/platform/v1/auth/login',
        '/api/platform/v1/auth/select-tenant',
      ]);
      expect(adapter.platformLoginBody['identifier'], 'lpp_aej69f2o');
      expect(adapter.platformLoginBody['loginType'], 'lpp_id');
      expect(adapter.platformLoginBody.containsKey('tenantCode'), isFalse);
      expect(adapter.platformLoginBody.containsKey('tenantId'), isFalse);
      expect(adapter.tenantLoginCalled, isFalse);
      expect(container.read(currentSpaceProvider)?.spaceId, 'tenant-1');
      expect(container.read(currentSpaceProvider)?.membershipRole, 4);
    });

    test(
      'enters the single owner tenant even when server suggests personal',
      () async {
        final storage = _MemorySecureStorage();
        final adapter = _LppIdPlatformLoginAdapter(platformSpaceType: 1);
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;

        final container = ProviderContainer(
          overrides: [
            secureStorageProvider.overrideWithValue(storage),
            dioProvider.overrideWithValue(dio),
          ],
        );
        addTearDown(() {
          TokenRefreshService.instance.stop();
          container.dispose();
        });

        await container
            .read(authProvider.notifier)
            .loginByPassword('mcx953141own', 'password', 'lpp_id');

        expect(adapter.paths, [
          '/api/platform/v1/auth/login',
          '/api/platform/v1/auth/select-tenant',
        ]);
        expect(container.read(currentSpaceProvider)?.spaceId, 'tenant-1');
        expect(container.read(currentSpaceProvider)?.membershipRole, 4);
      },
    );

    test(
      'does not fall back to tenant login when platform login fails',
      () async {
        final storage = _MemorySecureStorage();
        await storage.write(
          SecureStorageService.lastActiveSpaceIdKey,
          'tenant-1',
        );
        final adapter = _LppIdPlatformLoginAdapter(
          platformLoginSucceeds: false,
        );
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;

        final container = ProviderContainer(
          overrides: [
            secureStorageProvider.overrideWithValue(storage),
            dioProvider.overrideWithValue(dio),
          ],
        );
        addTearDown(() {
          TokenRefreshService.instance.stop();
          container.dispose();
        });

        await container
            .read(authProvider.notifier)
            .loginByPassword('lpp_aej69f2o', '123123123', 'lpp_id');

        expect(adapter.paths, ['/api/platform/v1/auth/login']);
        expect(adapter.tenantLoginCalled, isFalse);
        expect(
          container.read(authProvider).error,
          isA<ServerError>().having(
            (error) => error.code,
            'code',
            'INVALID_OPERATION',
          ),
        );
      },
    );
  });
}

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

class _LppIdPlatformLoginAdapter implements HttpClientAdapter {
  _LppIdPlatformLoginAdapter({
    this.platformLoginSucceeds = true,
    this.platformRegisterSucceeds = true,
    this.platformSpaceType = 2,
  });

  final bool platformLoginSucceeds;
  final bool platformRegisterSucceeds;
  final int platformSpaceType;
  final List<String> paths = [];
  Map<String, dynamic> platformLoginBody = {};
  Map<String, dynamic> platformRegisterBody = {};
  bool tenantLoginCalled = false;
  String? invitationAcceptAuthHeader;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    paths.add(options.path);

    if (options.path == '/api/platform/v1/auth/login') {
      platformLoginBody = Map<String, dynamic>.from(options.data as Map);
      if (!platformLoginSucceeds) {
        return _json({
          'code': 'INVALID_OPERATION',
          'message': 'invalid operation',
          'requestId': 'test-request-1',
          'data': null,
        }, statusCode: 500);
      }
      return _json({
        'code': 'OK',
        'message': 'success',
        'requestId': 'test-request-1',
        'data': {
          'platformUserId': 'platform-owner-1',
          'lppId': 'lpp_aej69f2o',
          'displayName': '所有者',
          'userType': 2,
          'platformToken': 'platform-token',
          'expiresIn': 3600,
          'tenants': [
            {
              'tenantId': 'tenant-1',
              'tenantCode': 'mouse-corp',
              'tenantName': 'Mouse 测试企业',
              'membershipRole': 4,
            },
          ],
          'spaceContext': {
            'spaceType': platformSpaceType,
            'tenantId': platformSpaceType == 2 ? 'tenant-1' : null,
          },
        },
      });
    }

    if (options.path == '/api/platform/v1/auth/register') {
      platformRegisterBody = Map<String, dynamic>.from(options.data as Map);
      if (!platformRegisterSucceeds) {
        return _json({
          'code': 'AUTH_ACCOUNT_EXISTS',
          'message': '邮箱已被注册',
          'requestId': 'register-409',
          'data': null,
        }, statusCode: 409);
      }
      return _json({
        'code': 'OK',
        'message': 'success',
        'requestId': 'test-register-1',
        'data': {
          'platformUserId': 'platform-new-1',
          'lppId': 'lpp_newuser1',
          'displayName': '新用户',
          'userType': 1,
          'platformToken': 'platform-token',
          'expiresIn': 3600,
          'tenants': <Map<String, dynamic>>[],
          'spaceContext': {'spaceType': 0, 'tenantId': null},
        },
      });
    }

    if (options.path == '/api/platform/v1/auth/select-tenant') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'requestId': 'test-request-2',
        'data': {
          'tenantId': 'tenant-1',
          'userId': 'owner-1',
          'platformUserId': 'platform-owner-1',
          'lppId': 'lpp_aej69f2o',
          'displayName': '所有者',
          'userType': 2,
          'accessToken': 'tenant-access',
          'refreshToken': 'tenant-refresh',
          'expiresIn': 3600,
          'spaceContext': {'spaceType': 2, 'tenantId': 'tenant-1'},
        },
      });
    }

    if (options.path == '/api/platform/v1/invitations/DD11D7976EDE33BB') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'requestId': 'test-invitation-preview-1',
        'data': {
          'tenantId': 'tenant-1',
          'tenantCode': 'mouse-corp',
          'tenantName': 'Mouse 测试企业',
          'targetMembershipRole': 2,
          'alreadyMember': false,
        },
      });
    }

    if (options.path ==
        '/api/platform/v1/invitations/DD11D7976EDE33BB/accept') {
      invitationAcceptAuthHeader = options.headers['Authorization'] as String?;
      return _json({
        'code': 'OK',
        'message': 'success',
        'requestId': 'test-invitation-accept-1',
        'data': {
          'tenantId': 'tenant-1',
          'userId': 'invited-user-1',
          'platformUserId': 'platform-new-1',
          'lppId': 'lpp_newuser1',
          'displayName': '邀请用户',
          'userType': 1,
          'accessToken': 'invitation-tenant-access',
          'refreshToken': 'invitation-tenant-refresh',
          'expiresIn': 3600,
          'membershipRole': 2,
          'spaceContext': {'spaceType': 2, 'tenantId': 'tenant-1'},
        },
      });
    }

    if (options.path == '/api/client/v1/auth/login') {
      tenantLoginCalled = true;
    }

    return _json({
      'code': 'NOT_FOUND',
      'message': 'not found',
      'data': null,
    }, statusCode: 404);
  }

  ResponseBody _json(Map<String, dynamic> body, {int statusCode = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
