import 'package:lpp_mobile/features/contacts/data/datasources/contacts_remote_datasource.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/domain/repositories/contacts_repository.dart';

class ContactsRepositoryImpl implements ContactsRepository {
  final ContactsRemoteDataSource _remote;

  ContactsRepositoryImpl(this._remote);

  @override
  Future<List<Contact>> getFriends() => _remote.getFriends();

  @override
  Future<void> sendFriendRequest(String toUserId, {String? message}) =>
      _remote.sendFriendRequest(toUserId, message: message);

  @override
  Future<List<Contact>> searchUsers(String keyword) =>
      _remote.searchUsers(keyword);

  @override
  Future<List<Department>> getDepartmentTree() => _remote.getDepartmentTree();

  @override
  Future<List<DepartmentMember>> getDepartmentMembers(String departmentId) =>
      _remote.getDepartmentMembers(departmentId);

  @override
  Future<List<Contact>> getTenantMembers() => _remote.getTenantMembers();

  @override
  Future<List<FriendRequest>> getFriendRequests() =>
      _remote.getFriendRequests();

  @override
  Future<void> handleFriendRequest(String requestId, String action) =>
      _remote.handleFriendRequest(requestId, action);

  @override
  Future<void> updateFriend(String friendUserId, {String? remark, String? group}) =>
      _remote.updateFriend(friendUserId, remark: remark, group: group);

  @override
  Future<void> deleteFriend(String friendUserId) =>
      _remote.deleteFriend(friendUserId);

  @override
  Future<List<BlockedUser>> getBlocklist() => _remote.getBlocklist();

  @override
  Future<void> blockUser(String userId) => _remote.blockUser(userId);

  @override
  Future<void> unblockUser(String userId) => _remote.unblockUser(userId);
}
