import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

abstract class ContactsRepository {
  Future<List<Contact>> getFriends();
  Future<void> sendFriendRequest(String toUserId, {String? message});
  Future<List<Contact>> searchUsers(String keyword);
  Future<List<Department>> getDepartmentTree();
  Future<List<DepartmentMember>> getDepartmentMembers(String departmentId);
  Future<List<Contact>> getTenantMembers();

  // 好友申请管理
  Future<List<FriendRequest>> getFriendRequests();
  Future<void> handleFriendRequest(String requestId, String action); // 'accept' | 'reject'

  // 好友操作
  Future<void> updateFriend(String friendUserId, {String? remark, String? group});
  Future<void> deleteFriend(String friendUserId);

  // 黑名单
  Future<List<BlockedUser>> getBlocklist();
  Future<void> blockUser(String userId);
  Future<void> unblockUser(String userId);
}
