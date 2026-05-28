import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart'
    show GroupRole;
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

void main() {
  group('AppPermissions group rules', () {
    test('owner and admin can manage, member cannot', () {
      expect(AppPermissions.isGroupManager('owner'), isTrue);
      expect(AppPermissions.isGroupManager(GroupRole.admin), isTrue);
      expect(AppPermissions.isGroupManager('member'), isFalse);
    });

    test('all-muted group blocks ordinary member input with reason', () {
      final permissions = AppPermissions.group(
        myRole: 'member',
        isAllMuted: true,
        allowMemberInvite: true,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: true,
        allowMemberAddFriend: true,
      );

      expect(permissions.canSpeak, isFalse);
      expect(permissions.muteReason, AppPermissions.groupMutedReason);
    });

    test('customer service can speak when group is all muted', () {
      const space = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 2,
      );

      final permissions = AppPermissions.group(
        myRole: 'member',
        isAllMuted: true,
        allowMemberInvite: false,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberViewMemberList: true,
        allowMemberAddFriend: true,
        space: space,
      );

      expect(permissions.canSpeak, isTrue);
      expect(permissions.muteReason, isNull);
    });
  });

  group('AppPermissions space and profile rules', () {
    test('create group is admin-only in employee space, allowed in personal',
        () {
      const employee = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 1,
      );
      const admin = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 3,
      );
      const personal = SpaceContext(
        spaceId: 'personal',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.personal,
      );

      expect(AppPermissions.canCreateGroup(employee), isFalse);
      expect(AppPermissions.canCreateGroup(admin), isTrue);
      expect(AppPermissions.canCreateGroup(personal), isTrue);
    });

    test('admin customer view blocks direct message', () {
      const admin = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 3,
      );

      expect(
        AppPermissions.canDirectMessageProfile(
          space: admin,
          adminCustomerView: true,
          targetIsFriend: true,
          targetIsEmployee: false,
        ),
        isFalse,
      );
    });

    test('owner and admin can see all tenant customers', () {
      const owner = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.employee,
        membershipRole: 4,
      );
      const admin = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u2',
        type: SpaceType.employee,
        membershipRole: 3,
      );
      const service = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u3',
        type: SpaceType.employee,
        membershipRole: 2,
      );

      expect(AppPermissions.canSeeAllCustomers(owner), isTrue);
      expect(AppPermissions.canSeeAllCustomers(admin), isTrue);
      expect(AppPermissions.canSeeAllCustomers(service), isFalse);
    });

    test('customer identity is based on userType, not only display tag', () {
      const customerWithoutTag = Contact(
        userId: 'customer-1',
        name: '客户',
        userType: 1,
      );
      const employeeWithNameOnly = Contact(
        userId: 'staff-1',
        name: '客户经理',
        userType: 2,
      );

      expect(customerWithoutTag.isCustomer, isTrue);
      expect(employeeWithNameOnly.isCustomer, isFalse);
    });

    test('friend request denial reports the first applicable reason', () {
      final groupBlocked = AppPermissions.canSendFriendRequest(
        space: null,
        groupAllowsFriendRequest: false,
      );
      const restrictedCustomer = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 'u1',
        type: SpaceType.customerRestricted,
      );
      final tenantBlocked = AppPermissions.canSendFriendRequest(
        space: restrictedCustomer,
        groupAllowsFriendRequest: true,
      );

      expect(groupBlocked.allowed, isFalse);
      expect(groupBlocked.reason, '该群已关闭群成员互加好友');
      expect(tenantBlocked.allowed, isFalse);
      expect(tenantBlocked.reason, '当前企业已开启客户隔离，暂不支持添加客户好友');
    });
  });
}
