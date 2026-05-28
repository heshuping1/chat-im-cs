import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

void main() {
  group('contact identity contract', () {
    test('remark wins over original name for display name', () {
      const contact = Contact(
        userId: 'u-1',
        name: 'Alice',
        remark: '重要客户',
      );

      expect(contact.displayName, '重要客户');
    });

    test('empty remark falls back to original name', () {
      const contact = Contact(
        userId: 'u-1',
        name: 'Alice',
        remark: '',
      );

      expect(contact.displayName, 'Alice');
    });

    test('contact userType separates customers from employees', () {
      const customer = Contact(userId: 'c-1', name: '客户', userType: 1);
      const employee = Contact(userId: 'e-1', name: '员工', userType: 2);

      expect(customer.isCustomer, isTrue);
      expect(customer.isEmployee, isFalse);
      expect(employee.isCustomer, isFalse);
      expect(employee.isEmployee, isTrue);
    });

    test('department member treats userType or customer tag as customer', () {
      const customerByType = DepartmentMember(
        userId: 'c-1',
        displayName: '客户A',
        userType: 1,
      );
      const customerByTag = DepartmentMember(
        userId: 'c-2',
        displayName: '客户B',
        userType: 2,
        customerTag: '客户',
      );
      const employee = DepartmentMember(
        userId: 'e-1',
        displayName: '员工',
        userType: 2,
      );

      expect(customerByType.isCustomer, isTrue);
      expect(customerByTag.isCustomer, isTrue);
      expect(employee.isCustomer, isFalse);
    });

    test('friend request keeps pending status and creation time', () {
      final createdAt = DateTime.utc(2026, 5, 16, 9);
      final request = FriendRequest(
        requestId: 'req-1',
        fromUserId: 'u-1',
        fromDisplayName: 'Alice',
        message: '申请加入',
        status: 'pending',
        createdAt: createdAt,
      );

      expect(request.status, 'pending');
      expect(request.message, '申请加入');
      expect(request.createdAt, createdAt);
    });
  });
}
