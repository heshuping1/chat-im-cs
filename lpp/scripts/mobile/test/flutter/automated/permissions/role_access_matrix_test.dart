import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';

void main() {
  group('role access matrix', () {
    test('enterprise roles expose the expected customer visibility', () {
      expect(AppPermissions.canSeeAllCustomers(_employee(4)), isTrue);
      expect(AppPermissions.canSeeAllCustomers(_employee(3)), isTrue);
      expect(AppPermissions.canSeeAllCustomers(_employee(2)), isFalse);
      expect(AppPermissions.canSeeCustomers(_employee(2)), isTrue);
      expect(AppPermissions.canSeeCustomers(_employee(1)), isTrue);
      expect(AppPermissions.canSeeCustomers(_employee(0)), isTrue);
      expect(AppPermissions.canSeeCustomers(_customer()), isFalse);
    });

    test('contact directory role modules follow the latest IM spec', () {
      expect(AppPermissions.canSeeCustomerGroups(_employee(0)), isFalse);
      expect(AppPermissions.canSeeCustomerGroups(_employee(1)), isFalse);
      expect(AppPermissions.canSeeCustomerGroups(_employee(2)), isTrue);
      expect(AppPermissions.canSeeCustomerGroups(_employee(3)), isTrue);
      expect(AppPermissions.canSeeCustomerGroups(_employee(4)), isTrue);
      expect(AppPermissions.canSeeCustomerGroups(_customer()), isFalse);

      expect(AppPermissions.canSeeJoinApplications(_employee(2)), isFalse);
      expect(AppPermissions.canSeeJoinApplications(_employee(3)), isTrue);
      expect(AppPermissions.canSeeJoinApplications(_employee(4)), isTrue);

      expect(AppPermissions.canSeeCustomerOverview(_employee(3)), isTrue);
      expect(AppPermissions.canSeeCustomerOverview(_employee(4)), isTrue);
      expect(AppPermissions.canSeeCustomerOverview(_personal()), isFalse);
    });

    test('create group and join-space actions are limited by role and space',
        () {
      expect(AppPermissions.canCreateGroup(_personal()), isTrue);
      expect(AppPermissions.canCreateGroup(_employee(4)), isTrue);
      expect(AppPermissions.canCreateGroup(_employee(3)), isTrue);
      expect(AppPermissions.canCreateGroup(_employee(2)), isFalse);
      expect(AppPermissions.canCreateGroup(_customer()), isFalse);

      expect(AppPermissions.canJoinSpaceFromHome(_employee(4)), isTrue);
      expect(AppPermissions.canJoinSpaceFromHome(_employee(3)), isTrue);
      expect(AppPermissions.canJoinSpaceFromHome(_employee(2)), isFalse);
      expect(AppPermissions.canJoinSpaceFromHome(_personal()), isFalse);
    });

    test('profile direct-message and friend-request decisions stay explicit',
        () {
      expect(
        AppPermissions.canDirectMessageProfile(
          space: _employee(3),
          adminCustomerView: true,
          targetIsFriend: true,
          targetIsEmployee: false,
        ),
        isFalse,
      );
      expect(
        AppPermissions.canDirectMessageProfile(
          space: _employee(2),
          adminCustomerView: false,
          targetIsFriend: false,
          targetIsEmployee: false,
        ),
        isTrue,
      );
      expect(
        AppPermissions.canDirectMessageProfile(
          space: _customer(),
          adminCustomerView: false,
          targetIsFriend: false,
          targetIsEmployee: true,
        ),
        isTrue,
      );

      final groupBlocked = AppPermissions.canSendFriendRequest(
        space: _employee(2),
        groupAllowsFriendRequest: false,
      );
      final isolationBlocked = AppPermissions.canSendFriendRequest(
        space: _customer(SpaceType.customerRestricted),
        groupAllowsFriendRequest: true,
      );
      final allowed = AppPermissions.canSendFriendRequest(
        space: _customer(SpaceType.customerSocial),
        groupAllowsFriendRequest: true,
      );

      expect(groupBlocked.allowed, isFalse);
      expect(groupBlocked.reason, '该群已关闭群成员互加好友');
      expect(isolationBlocked.allowed, isFalse);
      expect(isolationBlocked.reason, '当前企业已开启客户隔离，暂不支持添加客户好友');
      expect(allowed.allowed, isTrue);
    });

    test('all-muted group blocks ordinary members but allows managers and CS',
        () {
      final member = AppPermissions.group(
        myRole: 'member',
        isAllMuted: true,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
        space: _employee(1),
      );
      final cs = AppPermissions.group(
        myRole: 'member',
        isAllMuted: true,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
        space: _employee(2),
      );
      final admin = AppPermissions.group(
        myRole: 'admin',
        isAllMuted: true,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
        space: _employee(3),
      );

      expect(member.canSpeak, isFalse);
      expect(member.muteReason, AppPermissions.groupMutedReason);
      expect(cs.canSpeak, isTrue);
      expect(admin.canSpeak, isTrue);
      expect(admin.canManage, isTrue);
    });

    test('group role parser accepts server and UI role spellings', () {
      expect(AppPermissions.parseGroupRole('owner'), GroupMemberRole.owner);
      expect(
          AppPermissions.parseGroupRole('superAdmin'), GroupMemberRole.owner);
      expect(
        AppPermissions.parseGroupRole('super_admin'),
        GroupMemberRole.owner,
      );
      expect(AppPermissions.parseGroupRole('administrator'),
          GroupMemberRole.admin);
      expect(AppPermissions.parseGroupRole('GroupRole.admin'),
          GroupMemberRole.admin);
      expect(AppPermissions.parseGroupRole(null), GroupMemberRole.member);
      expect(AppPermissions.parseGroupRole('unknown'), GroupMemberRole.member);
    });

    test('owner can dismiss group while admin can manage but not dismiss', () {
      final owner = AppPermissions.group(
        myRole: 'owner',
        isAllMuted: false,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
      );
      final admin = AppPermissions.group(
        myRole: 'admin',
        isAllMuted: false,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
      );

      expect(owner.canManage, isTrue);
      expect(owner.canDismiss, isTrue);
      expect(admin.canManage, isTrue);
      expect(admin.canDismiss, isFalse);
    });

    test('member capabilities follow group management settings exactly', () {
      final locked = AppPermissions.group(
        myRole: 'member',
        isAllMuted: false,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: false,
        allowMemberAddFriend: false,
      );
      final open = AppPermissions.group(
        myRole: 'member',
        isAllMuted: false,
        allowMemberInvite: true,
        allowMemberModifyTitle: true,
        allowMemberAtAll: true,
        allowMemberViewMemberList: true,
        allowMemberAddFriend: true,
      );

      expect(locked.canInviteMembers, isFalse);
      expect(locked.canModifyTitle, isFalse);
      expect(locked.canAtAll, isFalse);
      expect(locked.canViewMembers, isFalse);
      expect(locked.canAddFriendFromGroup, isFalse);
      expect(open.canInviteMembers, isTrue);
      expect(open.canModifyTitle, isTrue);
      expect(open.canAtAll, isTrue);
      expect(open.canViewMembers, isTrue);
      expect(open.canAddFriendFromGroup, isTrue);
    });

    test('workbench tab is tenant-gated while customer-service page is CS-only',
        () {
      expect(_employee(2).isCustomerService, isTrue);
      expect(_employee(3).isCustomerService, isFalse);
      expect(_employee(4).isCustomerService, isFalse);

      expect(AppPermissions.canSeeWorkbench(_employee(1)), isTrue);
      expect(AppPermissions.canSeeWorkbench(_employee(2)), isTrue);
      expect(AppPermissions.canSeeWorkbench(_employee(3)), isTrue);
      expect(AppPermissions.canSeeWorkbench(_employee(4)), isTrue);
      expect(AppPermissions.canSeeWorkbench(_customer()), isFalse);
      expect(AppPermissions.canSeeWorkbench(_personal()), isFalse);

      expect(AppPermissions.canUseCustomerWorkbench(_employee(1)), isFalse);
      expect(AppPermissions.canUseCustomerWorkbench(_employee(2)), isTrue);
      expect(AppPermissions.canUseCustomerWorkbench(_employee(3)), isFalse);
      expect(AppPermissions.canUseCustomerWorkbench(_employee(4)), isFalse);
      expect(AppPermissions.canUseCustomerWorkbench(_customer()), isFalse);
      expect(AppPermissions.canUseCustomerWorkbench(_personal()), isFalse);

      expect(AppPermissions.canUseOwnerWorkbench(_employee(1)), isFalse);
      expect(AppPermissions.canUseOwnerWorkbench(_employee(2)), isFalse);
      expect(AppPermissions.canUseOwnerWorkbench(_employee(3)), isFalse);
      expect(AppPermissions.canUseOwnerWorkbench(_employee(4)), isTrue);
      expect(AppPermissions.canUseOwnerWorkbench(_customer()), isFalse);
      expect(AppPermissions.canUseOwnerWorkbench(_personal()), isFalse);
    });

    test('customer assignment candidates are exact customer-service role only',
        () {
      expect(
        AppPermissions.canBeAssignedAsCustomerService(membershipRole: 2),
        isTrue,
      );
      expect(
        AppPermissions.canBeAssignedAsCustomerService(membershipRole: 3),
        isFalse,
      );
      expect(
        AppPermissions.canBeAssignedAsCustomerService(membershipRole: 4),
        isFalse,
      );
      expect(
        AppPermissions.canBeAssignedAsCustomerService(roleTag: '客服'),
        isTrue,
      );
      expect(
        AppPermissions.canBeAssignedAsCustomerService(roleTag: '管理员'),
        isFalse,
      );
      expect(
        AppPermissions.canBeAssignedAsCustomerService(roleTag: '所有者'),
        isFalse,
      );
    });

    test('personal and customer spaces cannot see tenant customer pools', () {
      expect(AppPermissions.canSeeCustomers(_personal()), isFalse);
      expect(AppPermissions.canSeeCustomers(_customer()), isFalse);
      expect(AppPermissions.canSeeAllCustomers(_personal()), isFalse);
      expect(AppPermissions.canSeeAllCustomers(_customer()), isFalse);
    });

    test('group manage decision returns explicit denial copy for members', () {
      final denied = AppPermissions.canManageGroup('member');
      final allowed = AppPermissions.canManageGroup('admin');

      expect(denied.allowed, isFalse);
      expect(denied.reason, AppPermissions.groupManageDeniedReason);
      expect(allowed.allowed, isTrue);
      expect(allowed.reason, isNull);
    });
  });
}

SpaceContext _personal() => const SpaceContext(
      spaceId: 'personal',
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'user',
      type: SpaceType.personal,
    );

SpaceContext _employee(int membershipRole) => SpaceContext(
      spaceId: 'tenant',
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'user',
      type: SpaceType.employee,
      membershipRole: membershipRole,
    );

SpaceContext _customer([SpaceType type = SpaceType.customerSocial]) =>
    SpaceContext(
      spaceId: 'tenant',
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'customer',
      type: type,
    );
