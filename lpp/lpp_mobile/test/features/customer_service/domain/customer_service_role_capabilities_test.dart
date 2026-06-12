import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/customer_service/domain/customer_service_role_capabilities.dart';

void main() {
  group('customer service role capabilities', () {
    test('keeps staff on reception APIs and admins on readonly management', () {
      final staff = customerServiceRoleCapabilities(membershipRole: 2);
      final admin = customerServiceRoleCapabilities(membershipRole: 3);
      final owner = customerServiceRoleCapabilities(membershipRole: 4);

      expect(staff.canUseStaffEndpoints, isTrue);
      expect(staff.canControlReception, isTrue);
      expect(staff.canUseManagementReadonly, isFalse);
      expect(staff.canMonitorRealtime, isFalse);

      expect(admin.canUseStaffEndpoints, isFalse);
      expect(admin.canControlReception, isFalse);
      expect(admin.canReadHistory, isTrue);
      expect(admin.canUseManagementReadonly, isTrue);
      expect(admin.canMonitorRealtime, isTrue);

      expect(owner.canUseStaffEndpoints, isFalse);
      expect(owner.canControlReception, isFalse);
      expect(owner.canReadHistory, isTrue);
      expect(owner.canUseManagementReadonly, isTrue);
      expect(owner.canMonitorRealtime, isTrue);
    });

    test('does not grant customer or unknown roles service capabilities', () {
      final customer = customerServiceRoleCapabilities(
        membershipRole: 0,
        roleLabel: '客户',
      );
      final unknownHighRole =
          customerServiceRoleCapabilities(membershipRole: 5);
      final noRole = customerServiceRoleCapabilities();

      for (final capability in [customer, unknownHighRole]) {
        expect(capability.canUseStaffEndpoints, isFalse);
        expect(capability.canControlReception, isFalse);
        expect(capability.canReadHistory, isFalse);
        expect(capability.canUseManagementReadonly, isFalse);
        expect(capability.canMonitorRealtime, isFalse);
      }

      expect(noRole.canUseStaffEndpoints, isFalse);
      expect(noRole.canReadHistory, isTrue);
      expect(noRole.canUseManagementReadonly, isFalse);
    });

    test('prefers numeric membership role over stale role labels', () {
      final adminWithStaleLabel = customerServiceRoleCapabilities(
        membershipRole: 3,
        roleLabel: 'customer service',
      );
      final staffWithStaleLabel = customerServiceRoleCapabilities(
        membershipRole: 2,
        roleLabel: 'admin',
      );

      expect(adminWithStaleLabel.canUseStaffEndpoints, isFalse);
      expect(adminWithStaleLabel.canUseManagementReadonly, isTrue);
      expect(staffWithStaleLabel.canUseStaffEndpoints, isTrue);
      expect(staffWithStaleLabel.canUseManagementReadonly, isFalse);
    });

    test('falls back to role label when membership role is unavailable', () {
      expect(
        customerServiceRoleCapabilities(roleLabel: 'customer_service')
            .canUseStaffEndpoints,
        isTrue,
      );
      expect(
        customerServiceRoleCapabilities(roleLabel: 'owner')
            .canUseManagementReadonly,
        isTrue,
      );
      expect(
        customerServiceRoleCapabilities(roleLabel: 'tenant-account')
            .canUseStaffEndpoints,
        isFalse,
      );
    });
  });

  group('customer service action permissions', () {
    test('requires claim before staff can reply to queued threads', () {
      final permission = customerServiceActionPermission(
        CustomerServiceAction.sendText,
        CustomerServiceActionPermissionInput(
          hasThread: true,
          capabilities: customerServiceRoleCapabilities(membershipRole: 2),
          replyGate: CustomerServiceActionReplyGate.claim,
        ),
      );
      final claim = customerServiceActionPermission(
        CustomerServiceAction.claim,
        CustomerServiceActionPermissionInput(
          hasThread: true,
          capabilities: customerServiceRoleCapabilities(membershipRole: 2),
          replyGate: CustomerServiceActionReplyGate.claim,
        ),
      );

      expect(permission.enabled, isFalse);
      expect(permission.visible, isTrue);
      expect(permission.reason, CustomerServiceActionReason.requiresClaim);
      expect(claim.enabled, isTrue);
      expect(claim.visible, isTrue);
    });

    test('requires takeover before staff can reply to AI threads', () {
      final permission = customerServiceActionPermission(
        CustomerServiceAction.sendMedia,
        CustomerServiceActionPermissionInput(
          hasThread: true,
          capabilities: customerServiceRoleCapabilities(membershipRole: 2),
          replyGate: CustomerServiceActionReplyGate.takeover,
        ),
      );

      expect(permission.enabled, isFalse);
      expect(permission.visible, isTrue);
      expect(permission.reason, CustomerServiceActionReason.requiresTakeover);
    });

    test(
        'allows staff to reply transfer close and silent recall only when open',
        () {
      final input = CustomerServiceActionPermissionInput(
        hasThread: true,
        capabilities: customerServiceRoleCapabilities(membershipRole: 2),
        replyGate: CustomerServiceActionReplyGate.open,
      );

      expect(
        customerServiceActionPermission(CustomerServiceAction.sendText, input)
            .enabled,
        isTrue,
      );
      expect(
        customerServiceActionPermission(CustomerServiceAction.transfer, input)
            .enabled,
        isTrue,
      );
      expect(
        customerServiceActionPermission(CustomerServiceAction.close, input)
            .enabled,
        isTrue,
      );
      expect(
        customerServiceActionPermission(
                CustomerServiceAction.silentRecall, input)
            .enabled,
        isTrue,
      );
    });

    test('keeps admin monitor readonly even when a thread is open', () {
      final input = CustomerServiceActionPermissionInput(
        hasThread: true,
        capabilities: customerServiceRoleCapabilities(membershipRole: 3),
        replyGate: CustomerServiceActionReplyGate.open,
      );

      expect(
        customerServiceActionPermission(
                CustomerServiceAction.monitorRealtime, input)
            .enabled,
        isTrue,
      );
      expect(
        customerServiceActionPermission(CustomerServiceAction.sendText, input)
            .enabled,
        isFalse,
      );
      expect(
        customerServiceActionPermission(CustomerServiceAction.transfer, input)
            .reason,
        CustomerServiceActionReason.roleDenied,
      );
    });

    test('hides active staff actions for readonly threads', () {
      final input = CustomerServiceActionPermissionInput(
        hasThread: true,
        capabilities: customerServiceRoleCapabilities(membershipRole: 2),
        replyGate: CustomerServiceActionReplyGate.readonly,
      );

      final send = customerServiceActionPermission(
        CustomerServiceAction.sendText,
        input,
      );
      final view = customerServiceActionPermission(
        CustomerServiceAction.viewReadonly,
        input,
      );

      expect(send.enabled, isFalse);
      expect(send.visible, isFalse);
      expect(send.reason, CustomerServiceActionReason.readonly);
      expect(view.enabled, isTrue);
      expect(view.visible, isTrue);
    });
  });
}
