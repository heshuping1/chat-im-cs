import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_policy.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';

void main() {
  test('maps only enterprise customers to the link-blocked send policy', () {
    expect(
      messageSendPolicyContextForSpace(
        const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'token',
          refreshToken: 'refresh',
          userId: 'customer-1',
          type: SpaceType.customerRestricted,
        ),
      ),
      MessageSendPolicyContext.enterpriseCustomer,
    );
    expect(
      messageSendPolicyContextForSpace(
        const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'token',
          refreshToken: 'refresh',
          userId: 'employee-1',
          type: SpaceType.employee,
        ),
      ),
      MessageSendPolicyContext.enterpriseEmployee,
    );
    expect(
      messageSendPolicyContextForSpace(
        const SpaceContext(
          spaceId: 'personal',
          accessToken: 'token',
          refreshToken: 'refresh',
          userId: 'user-1',
          type: SpaceType.personal,
        ),
      ),
      MessageSendPolicyContext.personal,
    );
  });
}
