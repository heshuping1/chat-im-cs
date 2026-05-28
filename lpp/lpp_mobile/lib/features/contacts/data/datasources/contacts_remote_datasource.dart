import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/api_response.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

abstract class ContactsRemoteDataSource {
  Future<List<Contact>> getFriends();
  Future<void> sendFriendRequest(String toUserId, {String? message});
  Future<List<Contact>> searchUsers(String keyword);
  Future<List<Department>> getDepartmentTree();
  Future<List<DepartmentMember>> getDepartmentMembers(String departmentId);
  Future<List<Contact>> getTenantMembers();
  Future<List<FriendRequest>> getFriendRequests();
  Future<void> handleFriendRequest(String requestId, String action);
  Future<void> updateFriend(String friendUserId,
      {String? remark, String? group});
  Future<void> deleteFriend(String friendUserId);
  Future<List<BlockedUser>> getBlocklist();
  Future<void> blockUser(String userId);
  Future<void> unblockUser(String userId);
}

class ContactsRemoteDataSourceImpl implements ContactsRemoteDataSource {
  final Dio _dio;

  ContactsRemoteDataSourceImpl(this._dio);

  @override
  Future<List<Contact>> getFriends() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/api/client/v1/friends');
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _contactFromJson(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> sendFriendRequest(String toUserId, {String? message}) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/friends/request',
        data: {'toUserId': toUserId, if (message != null) 'message': message},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<Contact>> searchUsers(String keyword) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/search/users',
        queryParameters: {'keyword': keyword},
      );
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _contactFromJson(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<Department>> getDepartmentTree() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/api/client/v1/departments');
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        // API 返回平铺列表，客户端自行按 parentId 组树
        final flat = list
            .map((e) => _departmentFromJson(e as Map<String, dynamic>))
            .toList();
        return _buildTree(flat);
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  /// 平铺列表 → 树形结构
  static List<Department> _buildTree(List<Department> flat) {
    final map = {for (final d in flat) d.departmentId: d};
    final roots = <Department>[];
    final childrenMap = <String, List<Department>>{};

    for (final d in flat) {
      if (d.parentId == null || !map.containsKey(d.parentId)) {
        roots.add(d);
      } else {
        childrenMap.putIfAbsent(d.parentId!, () => []).add(d);
      }
    }

    Department attach(Department d) {
      final kids = childrenMap[d.departmentId] ?? [];
      return Department(
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        parentId: d.parentId,
        leaderUserId: d.leaderUserId,
        memberCount: d.memberCount,
        children: kids.map(attach).toList(),
      );
    }

    return roots.map(attach).toList();
  }

  @override
  Future<List<DepartmentMember>> getDepartmentMembers(
      String departmentId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/departments/$departmentId/members',
      );
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _memberFromJson(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<Contact>> getTenantMembers() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/api/client/v1/tenant/members');
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _tenantMemberToContact(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  /// 将 TenantMemberDto 转为 Contact，customerTag 存储角色标识
  /// joinMethod: 0=系统创建, 1=管理员直接创建(员工), 2=企业码/邀请加入(客户)
  static Contact _tenantMemberToContact(Map<String, dynamic> json) {
    final userId = json['userId'] as String? ?? '';
    final displayName = json['displayName'] as String? ?? '';
    final avatarUrl = _avatarUrlFromJson(json);
    final membershipRole = json['membershipRole'] as int? ?? 0;
    final joinMethod = json['joinMethod'] as int? ?? 0;
    final userType = json['userType'] as int?;
    final customerTag = json['customerTag'] as String?;

    // membershipRole 1/2/3/4 一定是企业成员，无论 userType/joinMethod 返回什么。
    // 只有无企业角色时，才按 userType/customerTag/joinMethod 判断客户身份。
    final isCustomer = membershipRole <= 0 &&
        (userType == 1 ||
            customerTag == '客户' ||
            (joinMethod == 2 && membershipRole == 0));
    String roleTag;
    if (isCustomer) {
      roleTag = '客户';
    } else {
      const roleLabels = {0: '员工', 1: '技术支持', 2: '客服', 3: '管理员', 4: '所有者'};
      roleTag = roleLabels[membershipRole] ?? '员工';
    }
    return Contact(
      userId: userId,
      name: displayName,
      avatarUrl: avatarUrl,
      customerTag: roleTag, // 复用 customerTag 存储角色标识
      userType: userType ?? (isCustomer ? 1 : 2),
    );
  }

  @override
  Future<List<FriendRequest>> getFriendRequests() async {
    try {
      final response = await _dio
          .get<Map<String, dynamic>>('/api/client/v1/friends/requests');
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _friendRequestFromJson(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> handleFriendRequest(String requestId, String action) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/friends/requests/$requestId/handle',
        data: {'action': action},
      );
    } on DioException catch (e) {
      final body = e.response?.data;
      final code =
          body is Map<String, dynamic> ? body['code'] as String? : null;
      if (e.response?.statusCode == 409 && code == 'FRIEND_REQUEST_HANDLED') {
        return;
      }
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> updateFriend(String friendUserId,
      {String? remark, String? group}) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/friends/$friendUserId',
        data: {
          if (remark != null) 'remarkName': remark,
          if (group != null) 'group': group,
        },
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> deleteFriend(String friendUserId) async {
    try {
      await _dio
          .delete<Map<String, dynamic>>('/api/client/v1/friends/$friendUserId');
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<BlockedUser>> getBlocklist() async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/api/client/v1/blocklist');
      final apiResponse = ApiResponse.fromJson(response.data!, (json) {
        final list = json as List<dynamic>;
        return list
            .map((e) => _blockedUserFromJson(e as Map<String, dynamic>))
            .toList();
      });
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> blockUser(String userId) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/blocklist',
        data: {'blockedUserId': userId},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> unblockUser(String userId) async {
    try {
      await _dio
          .delete<Map<String, dynamic>>('/api/client/v1/blocklist/$userId');
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  // ---------------------------------------------------------------------------
  // Parsers
  // ---------------------------------------------------------------------------

  static Contact _contactFromJson(Map<String, dynamic> json) {
    final userId = (json['friendUserId'] ??
            json['blockedUserId'] ??
            json['userId']) as String? ??
        '';
    final displayName =
        json['displayName'] as String? ?? json['name'] as String? ?? '';
    // userType: 1=客户, 2=员工（API 新增字段）
    final userType = json['userType'] as int?;
    return Contact(
      userId: userId,
      name: displayName,
      avatarUrl: _avatarUrlFromJson(json),
      remark: json['remarkName'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      customerTag: json['customerTag'] as String?,
      userType: userType,
    );
  }

  static Department _departmentFromJson(Map<String, dynamic> json) {
    final children = (json['children'] as List<dynamic>?)
            ?.map((e) => _departmentFromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    return Department(
      departmentId: json['departmentId'] as String,
      departmentName: json['departmentName'] as String,
      parentId: json['parentId'] as String?,
      leaderUserId: json['leaderUserId'] as String?,
      memberCount: json['memberCount'] as int? ?? 0,
      children: children,
    );
  }

  static DepartmentMember _memberFromJson(Map<String, dynamic> json) {
    final membershipRole = json['membershipRole'] as int?;
    final userType = json['userType'] as int?;
    final customerTag = json['customerTag'] as String?;
    return DepartmentMember(
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: _avatarUrlFromJson(json),
      isPrimary: json['isPrimary'] as bool? ?? false,
      position: json['position'] as String?,
      userType: userType,
      membershipRole: membershipRole,
      customerTag: customerTag,
    );
  }

  static FriendRequest _friendRequestFromJson(Map<String, dynamic> json) {
    return FriendRequest(
      requestId: json['requestId'] as String? ?? '',
      fromUserId: json['fromUserId'] as String? ?? '',
      fromDisplayName: json['fromDisplayName'] as String? ?? '',
      fromAvatarUrl: json['fromAvatarUrl'] as String?,
      toUserId: json['toUserId'] as String? ?? '',
      toDisplayName: json['toDisplayName'] as String? ?? '',
      toAvatarUrl: json['toAvatarUrl'] as String?,
      message: json['message'] as String?,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  static BlockedUser _blockedUserFromJson(Map<String, dynamic> json) {
    return BlockedUser(
      userId: (json['blockedUserId'] ?? json['userId']) as String,
      displayName: json['displayName'] as String? ?? '',
      avatarUrl: _avatarUrlFromJson(json),
    );
  }

  static String? _avatarUrlFromJson(Map<String, dynamic> json) {
    final raw = json['avatarUrl'] ??
        json['avatar_url'] ??
        json['avatar'] ??
        json['headImageUrl'] ??
        json['profileAvatarUrl'];
    final value = raw?.toString().trim();
    return value == null || value.isEmpty ? null : value;
  }
}
