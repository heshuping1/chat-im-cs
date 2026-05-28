import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/contacts/data/datasources/contacts_remote_datasource.dart';
import 'package:lpp_mobile/features/contacts/data/repositories/contacts_repository_impl.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/domain/repositories/contacts_repository.dart';

// ---------------------------------------------------------------------------
// Repository Provider
// ---------------------------------------------------------------------------

final contactsRepositoryProvider = Provider<ContactsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ContactsRepositoryImpl(ContactsRemoteDataSourceImpl(dio));
});

/// 空间切换后清空通讯录相关的内存状态。
///
/// 通讯录数据虽然有按 spaceId 写入本地缓存，但这些 provider 是全局入口。
/// 主动 invalidate 可以避免切换空间后短暂展示上一空间的联系人。
void invalidateContactScopedProviders(Ref ref) {
  ref.invalidate(friendsProvider);
  ref.invalidate(tenantMembersProvider);
  ref.invalidate(departmentTreeProvider);
  ref.invalidate(departmentMembersProvider);
  ref.invalidate(pendingJoinRequestsCountProvider);
  ref.invalidate(assignedStaffProvider);
  ref.invalidate(friendRequestsProvider);
  ref.invalidate(pendingFriendRequestsProvider);
}

// ---------------------------------------------------------------------------
// Friends list — 本地优先缓存，后台异步刷新（微信做法）
// ---------------------------------------------------------------------------

const _kFriendsCacheKey = 'friends_cache';

class FriendsNotifier extends StateNotifier<AsyncValue<List<Contact>>> {
  final Ref _ref;

  FriendsNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadWithCache();
  }

  bool _isStillCurrentSpace(String spaceId) {
    return mounted && _ref.read(currentSpaceProvider)?.spaceId == spaceId;
  }

  Future<void> _loadWithCache() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }

    // 1. 先读本地缓存立即显示；头像后台预热，避免联系人首屏被头像 I/O 拖慢。
    final cached = await _loadFromCache(space.spaceId);
    if (cached != null && cached.isNotEmpty) {
      if (!_isStillCurrentSpace(space.spaceId)) return;
      state = AsyncValue.data(cached);
      Future.microtask(() => _prefetchAvatars(cached));
      // 2. 后台静默刷新
      _syncFromRemote(space.spaceId);
      return;
    }

    // 3. 无缓存：走网络
    await _fetchAndCache(space.spaceId);
  }

  Future<List<Contact>?> _loadFromCache(String spaceId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get(_kFriendsCacheKey);
      if (raw == null) return null;
      final list = jsonDecode(raw as String) as List<dynamic>;
      return list
          .map((e) => _contactFromMap(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToCache(String spaceId, List<Contact> contacts) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final encoded = jsonEncode(contacts
          .map((c) => {
                'userId': c.userId,
                'name': c.name,
                'avatarUrl': c.avatarUrl,
                'remark': c.remark,
                'isOnline': c.isOnline,
                'customerTag': c.customerTag,
                'userType': c.userType,
              })
          .toList());
      await box.put(_kFriendsCacheKey, encoded);
    } catch (_) {}
  }

  static Contact _contactFromMap(Map<String, dynamic> m) => Contact(
        userId: m['userId'] as String? ?? '',
        name: m['name'] as String? ?? '',
        avatarUrl: m['avatarUrl'] as String?,
        remark: m['remark'] as String?,
        isOnline: m['isOnline'] as bool? ?? false,
        customerTag: m['customerTag'] as String?,
        userType: m['userType'] as int?,
      );

  Future<void> _fetchAndCache(String spaceId) async {
    try {
      final repo = _ref.read(contactsRepositoryProvider);
      final friends = await repo.getFriends();
      await _saveToCache(spaceId, friends);
      if (!_isStillCurrentSpace(spaceId)) return;
      final current = state.valueOrNull;
      if (!_listEquals(current, friends)) {
        state = AsyncValue.data(friends);
      }
      Future.microtask(() => _prefetchAvatars(friends));
    } catch (e, st) {
      if (!_isStillCurrentSpace(spaceId)) return;
      // 401：token 过期，静默处理
      if (e.toString().contains('401')) return;
      if (state.valueOrNull == null) {
        state = AsyncValue.error(e, st);
      }
    }
  }

  /// 比较两个好友列表是否内容相同（按 userId + avatarUrl + name + remark）
  static bool _listEquals(List<Contact>? a, List<Contact>? b) {
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      final x = a[i], y = b[i];
      if (x.userId != y.userId ||
          x.avatarUrl != y.avatarUrl ||
          x.name != y.name ||
          x.remark != y.remark) {
        return false;
      }
    }
    return true;
  }

  /// 预热好友头像到内存缓存
  Future<void> _prefetchAvatars(List<Contact> friends) async {
    await prefetchAvatarUrls(
      friends.map((f) => f.avatarUrl).toList(),
      accessToken: _ref.read(currentSpaceProvider)?.accessToken,
    );
  }

  void _syncFromRemote(String spaceId) {
    Future.microtask(() => _fetchAndCache(spaceId));
  }

  /// 手动刷新（下拉刷新时调用）
  Future<void> refresh() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null) return;
    await _fetchAndCache(space.spaceId);
  }
}

/// keepAlive：好友列表缓存，不随页面销毁（微信做法）
final friendsProvider =
    StateNotifierProvider<FriendsNotifier, AsyncValue<List<Contact>>>((ref) {
  // 好友列表是按空间隔离的数据。这里订阅当前空间，避免切换到个人空间时
  // 继续展示企业空间缓存的客服/官方账号，或旧请求返回后写回旧数据。
  ref.watch(currentSpaceProvider);
  ref.keepAlive();
  return FriendsNotifier(ref);
});

// ---------------------------------------------------------------------------
// Tenant members — 本地优先缓存，后台异步刷新
// ---------------------------------------------------------------------------

const _kTenantMembersCacheKey = 'tenant_members_cache';

class TenantMembersNotifier extends StateNotifier<AsyncValue<List<Contact>>> {
  final Ref _ref;

  TenantMembersNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadWithCache();
  }

  bool _isStillCurrentSpace(String spaceId) {
    return mounted && _ref.read(currentSpaceProvider)?.spaceId == spaceId;
  }

  Future<void> _loadWithCache() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }
    final cached = await _loadFromCache(space.spaceId);
    if (cached != null && cached.isNotEmpty) {
      if (!_isStillCurrentSpace(space.spaceId)) return;
      state = AsyncValue.data(cached);
      _syncFromRemote(space.spaceId);
      return;
    }
    await _fetchAndCache(space.spaceId);
  }

  Future<List<Contact>?> _loadFromCache(String spaceId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get(_kTenantMembersCacheKey);
      if (raw == null) return null;
      final list = jsonDecode(raw as String) as List<dynamic>;
      return list
          .map(
              (e) => FriendsNotifier._contactFromMap(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToCache(String spaceId, List<Contact> contacts) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final encoded = jsonEncode(contacts
          .map((c) => {
                'userId': c.userId,
                'name': c.name,
                'avatarUrl': c.avatarUrl,
                'remark': c.remark,
                'isOnline': c.isOnline,
                'customerTag': c.customerTag,
                'userType': c.userType,
              })
          .toList());
      await box.put(_kTenantMembersCacheKey, encoded);
    } catch (_) {}
  }

  Future<void> _fetchAndCache(String spaceId) async {
    try {
      final repo = _ref.read(contactsRepositoryProvider);
      final members = await repo.getTenantMembers();
      await _saveToCache(spaceId, members);
      // 检查 provider 是否已被销毁
      if (!_isStillCurrentSpace(spaceId)) return;
      final current = state.valueOrNull;
      if (!FriendsNotifier._listEquals(current, members)) {
        state = AsyncValue.data(members);
      }
    } catch (e, st) {
      if (!_isStillCurrentSpace(spaceId)) return;
      // 403 TENANT_MEMBER_LIST_FORBIDDEN：客户无权访问，静默返回空列表
      // 401：token 过期，静默处理，不覆盖现有状态
      final isPermissionError = e is ServerError &&
          (e.code == 'TENANT_MEMBER_LIST_FORBIDDEN' || e.statusCode == 403);
      final isAuthError = e.toString().contains('401');
      if (isPermissionError) {
        state = const AsyncValue.data([]);
      } else if (!isAuthError && state.valueOrNull == null) {
        state = AsyncValue.error(e, st);
      }
    }
  }

  void _syncFromRemote(String spaceId) {
    Future.microtask(() => _fetchAndCache(spaceId));
  }

  Future<void> refresh() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null) return;
    await _fetchAndCache(space.spaceId);
  }
}

final tenantMembersProvider =
    StateNotifierProvider<TenantMembersNotifier, AsyncValue<List<Contact>>>(
        (ref) {
  // 企业成员列表也是空间级缓存；切换空间时必须重建，防止企业成员串到个人空间。
  ref.watch(currentSpaceProvider);
  ref.keepAlive();
  return TenantMembersNotifier(ref);
});

// ---------------------------------------------------------------------------
// Department tree — 本地优先缓存，后台异步刷新
// ---------------------------------------------------------------------------

const _kDeptTreeCacheKey = 'dept_tree_cache';

class DepartmentTreeNotifier
    extends StateNotifier<AsyncValue<List<Department>>> {
  final Ref _ref;

  DepartmentTreeNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadWithCache();
  }

  Future<void> _loadWithCache() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }
    final cached = await _loadFromCache(space.spaceId);
    if (cached != null && cached.isNotEmpty) {
      state = AsyncValue.data(cached);
      _syncFromRemote(space.spaceId);
      return;
    }
    await _fetchAndCache(space.spaceId);
  }

  Future<List<Department>?> _loadFromCache(String spaceId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get(_kDeptTreeCacheKey);
      if (raw == null) return null;
      final list = jsonDecode(raw as String) as List<dynamic>;
      return list.map((e) => _deptFromMap(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  static Department _deptFromMap(Map<String, dynamic> m) => Department(
        departmentId: m['departmentId'] as String? ?? '',
        departmentName: m['departmentName'] as String? ?? '',
        parentId: m['parentId'] as String?,
        leaderUserId: m['leaderUserId'] as String?,
        memberCount: m['memberCount'] as int? ?? 0,
        children: ((m['children'] as List<dynamic>?) ?? [])
            .map((e) => _deptFromMap(e as Map<String, dynamic>))
            .toList(),
      );

  static Map<String, dynamic> _deptToMap(Department d) => {
        'departmentId': d.departmentId,
        'departmentName': d.departmentName,
        'parentId': d.parentId,
        'leaderUserId': d.leaderUserId,
        'memberCount': d.memberCount,
        'children': d.children.map(_deptToMap).toList(),
      };

  Future<void> _saveToCache(String spaceId, List<Department> tree) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      await box.put(
          _kDeptTreeCacheKey, jsonEncode(tree.map(_deptToMap).toList()));
    } catch (_) {}
  }

  Future<void> _fetchAndCache(String spaceId) async {
    try {
      final repo = _ref.read(contactsRepositoryProvider);
      final tree = await repo.getDepartmentTree();
      await _saveToCache(spaceId, tree);
      state = AsyncValue.data(tree);
    } catch (e, st) {
      if (state.valueOrNull == null) state = AsyncValue.error(e, st);
    }
  }

  void _syncFromRemote(String spaceId) {
    Future.microtask(() => _fetchAndCache(spaceId));
  }

  Future<void> refresh() async {
    final space = _ref.read(currentSpaceProvider);
    if (space == null) return;
    await _fetchAndCache(space.spaceId);
  }
}

final departmentTreeProvider =
    StateNotifierProvider<DepartmentTreeNotifier, AsyncValue<List<Department>>>(
        (ref) {
  // 监听 currentSpaceProvider，空间切换时重建（清除旧空间的缓存数据）
  ref.watch(currentSpaceProvider);
  return DepartmentTreeNotifier(ref);
});

// ---------------------------------------------------------------------------
// Department members — 按 departmentId 缓存
// ---------------------------------------------------------------------------

final departmentMembersProvider =
    FutureProvider.family<List<DepartmentMember>, String>(
        (ref, departmentId) async {
  ref.keepAlive();
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) return [];
  final repo = ref.watch(contactsRepositoryProvider);
  return repo.getDepartmentMembers(departmentId);
});

// ---------------------------------------------------------------------------
// User search — 搜索结果不缓存（每次输入都是新查询）
// ---------------------------------------------------------------------------

final userSearchProvider =
    FutureProvider.family<List<Contact>, String>((ref, keyword) async {
  if (keyword.trim().isEmpty) return [];
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) return [];
  final repo = ref.watch(contactsRepositoryProvider);
  return repo.searchUsers(keyword);
});

// ---------------------------------------------------------------------------
// 待审批加入申请数量（员工端「新的申请」badge 动态化）
// ---------------------------------------------------------------------------

final pendingJoinRequestsCountProvider =
    FutureProvider.autoDispose<int>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || !space.isAdminOrAbove) return 0;
  try {
    final dio = ref.read(dioProvider);
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/tenant/join-requests',
    );
    final list = resp.data?['data'] as List<dynamic>? ?? [];
    // 只统计 pending 状态（status=0）
    return list.where((e) => (e as Map<String, dynamic>)['status'] == 0).length;
  } catch (_) {
    return 0;
  }
});

// ---------------------------------------------------------------------------
// 客户端：获取分配给我的客服信息（用于「我的专属顾问」跳转）
// 从通讯录联系人中找到带客服标识的联系人
// ---------------------------------------------------------------------------

class AssignedStaffInfo {
  final String userId;
  final String displayName;
  final String? avatarUrl;

  const AssignedStaffInfo({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
  });
}

final assignedStaffProvider =
    FutureProvider.autoDispose<AssignedStaffInfo?>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || !space.isCustomer) return null;
  try {
    final dio = ref.read(dioProvider);
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/profile/me/assigned-staff',
    );
    final data = resp.data?['data'] as Map<String, dynamic>?;
    if (data == null) return null;
    final userId = data['userId'] as String?;
    if (userId == null || userId.isEmpty) return null;
    return AssignedStaffInfo(
      userId: userId,
      displayName: data['displayName'] as String? ?? '',
      avatarUrl: data['avatarUrl'] as String?,
    );
  } catch (_) {
    return null;
  }
});

// ---------------------------------------------------------------------------
// 好友申请列表
// ---------------------------------------------------------------------------

final friendRequestsProvider =
    FutureProvider.autoDispose<List<FriendRequest>>((ref) async {
  final space = ref.watch(currentSpaceProvider);
  if (space == null || space.accessToken.isEmpty) return [];
  final repo = ref.read(contactsRepositoryProvider);
  return repo.getFriendRequests();
});

// 用于底部导航栏红点。服务端当前只返回 pending，这里仍保留过滤，避免后续接口扩展后误亮红点。
final pendingFriendRequestsProvider =
    FutureProvider.autoDispose<List<FriendRequest>>((ref) async {
  try {
    final requests = await ref.watch(friendRequestsProvider.future);
    return requests.where((r) => r.status == 'pending').toList();
  } catch (_) {
    return [];
  }
});
