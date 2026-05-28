import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/space/data/repositories/space_repository_impl.dart';

void main() {
  test('switching to personal space uses cached personal token when available',
      () async {
    final storage = _MemorySecureStorage();
    await storage.writeTokenPair(
      spaceId: 'personal',
      accessToken: 'personal-access',
      refreshToken: 'personal-refresh',
    );
    SpaceContext? switched;
    final repo = SpaceRepositoryImpl(
      storage: storage,
      getCurrentSpace: () => const SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      ),
      getAvailableTenants: () => const [],
      switchSpaceContext: (context) async => switched = context,
      selectSpace: (_, __) async => throw StateError('platform unavailable'),
      dio: Dio(BaseOptions(baseUrl: 'https://test.local')),
    );

    await repo.switchSpace('personal');

    expect(switched?.spaceId, 'personal');
    expect(switched?.type, SpaceType.personal);
    expect(switched?.accessToken, 'personal-access');
    expect(
        await storage.read(SecureStorageService.activeSpaceIdKey), 'personal');
  });

  test('switching to personal space reports missing credential clearly',
      () async {
    final repo = SpaceRepositoryImpl(
      storage: _MemorySecureStorage(),
      getCurrentSpace: () => const SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      ),
      getAvailableTenants: () => const [],
      switchSpaceContext: (_) async {},
      selectSpace: (_, __) async => throw StateError('platform unavailable'),
      dio: Dio(BaseOptions(baseUrl: 'https://test.local')),
    );

    await expectLater(
      repo.switchSpace('personal'),
      throwsA(isA<Exception>().having(
        (error) => error.toString(),
        'message',
        contains('个人空间凭证不可用'),
      )),
    );
  });

  test('switching to personal space can use in-memory platform token',
      () async {
    final storage = _MemorySecureStorage();
    SpaceContext? switched;
    String? usedPlatformToken;
    final repo = SpaceRepositoryImpl(
      storage: storage,
      getCurrentSpace: () => const SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      ),
      getAvailableTenants: () => const [],
      getPlatformToken: () => 'platform-in-memory',
      switchSpaceContext: (context) async => switched = context,
      selectSpace: (spaceId, platformToken) async {
        usedPlatformToken = platformToken;
        return const TenantAuthResult(
          tenantId: 'personal',
          userId: 'personal-user',
          platformUserId: 'platform-user',
          lppId: 'lpp_user',
          displayName: '用户',
          accessToken: 'personal-access-new',
          refreshToken: 'personal-refresh-new',
          expiresIn: 3600,
          spaceType: 1,
        );
      },
      dio: Dio(BaseOptions(baseUrl: 'https://test.local')),
    );

    await repo.switchSpace('personal');

    expect(usedPlatformToken, 'platform-in-memory');
    expect(switched?.spaceId, 'personal');
    expect(switched?.accessToken, 'personal-access-new');
    expect(await storage.readAccessToken('personal'), 'personal-access-new');
    expect(
        await storage.read(SecureStorageService.activeSpaceIdKey), 'personal');
    expect(
      await storage.read(SecureStorageService.lastActiveSpaceIdKey),
      'personal',
    );
  });

  test('switching to personal space rejects cached platform token as access',
      () async {
    final storage = _MemorySecureStorage();
    await storage.write(
      SecureStorageService.platformTokenKey,
      'platform-token',
    );
    await storage.writeTokenPair(
      spaceId: 'personal',
      accessToken: 'platform-token',
      refreshToken: 'platform-token',
    );
    SpaceContext? switched;
    final repo = SpaceRepositoryImpl(
      storage: storage,
      getCurrentSpace: () => const SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      ),
      getAvailableTenants: () => const [],
      switchSpaceContext: (context) async => switched = context,
      selectSpace: (_, __) async => throw StateError('select failed'),
      dio: Dio(BaseOptions(baseUrl: 'https://test.local')),
    );

    await expectLater(
      repo.switchSpace('personal'),
      throwsA(isA<Exception>().having(
        (error) => error.toString(),
        'message',
        contains('个人空间凭证不可用'),
      )),
    );
    expect(switched, isNull);
    expect(await storage.readAccessToken('personal'), isNull);
    expect(await storage.readRefreshToken('personal'), isNull);
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
