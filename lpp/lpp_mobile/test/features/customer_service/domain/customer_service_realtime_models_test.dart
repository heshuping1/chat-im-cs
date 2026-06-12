import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/customer_service/domain/customer_service_realtime_models.dart';

void main() {
  Message message({
    required String id,
    required int seq,
    required String senderUserId,
    bool isSelf = false,
    MessageStatus status = MessageStatus.sent,
  }) {
    return Message(
      messageId: id,
      conversationId: 'thread-1',
      conversationSeq: seq,
      senderUserId: senderUserId,
      type: MessageType.text,
      body: MessageBody(text: id),
      sentAt: DateTime.utc(2026, 6, 12),
      status: status,
      isSelf: isSelf,
    );
  }

  test('silent recall removes messages while normal recall marks recalled', () {
    final messages = [
      message(id: 'm1', seq: 1, senderUserId: 'staff-1', isSelf: true),
      message(id: 'm2', seq: 2, senderUserId: 'visitor-1'),
    ];

    final silent = applyCustomerServiceRecall(
      messages,
      messageId: 'm1',
      silent: true,
    );

    expect(silent.map((item) => item.messageId), ['m2']);

    final normal = applyCustomerServiceRecall(
      messages,
      messageId: 'm1',
      silent: false,
    );

    expect(normal.first.isRecalled, isTrue);
    expect(normal.first.status, MessageStatus.recalled);
    expect(normal, hasLength(2));
  });

  test('typing preview ignores staff drafts and expires after ttl', () {
    final now = DateTime.utc(2026, 6, 12, 10);

    final staffPreview = reduceCustomerServiceTypingPreview(
      CustomerServiceTypingPreviewEvent(
        threadId: 'thread-1',
        threadType: 'temp_session',
        isTyping: true,
        previewText: 'internal draft',
        senderRole: 'staff',
        senderUserId: 'staff-1',
        receivedAt: now,
      ),
      now: now,
    );

    expect(staffPreview, isNull);

    final customerPreview = reduceCustomerServiceTypingPreview(
      CustomerServiceTypingPreviewEvent(
        threadId: 'thread-1',
        threadType: 'temp_session',
        isTyping: true,
        previewText: '  hello\r\nworld  ',
        senderRole: 'visitor',
        senderUserId: 'visitor-1',
        receivedAt: now,
      ),
      now: now,
    ) as CustomerServiceTypingPreview?;

    expect(customerPreview, isNotNull);
    expect(customerPreview!.previewText, 'hello\nworld');
    expect(customerPreview.isExpired(now.add(const Duration(seconds: 4))),
        isFalse);
    expect(
        customerPreview.isExpired(now.add(const Duration(seconds: 6))), isTrue);

    final stopped = reduceCustomerServiceTypingPreview(
      CustomerServiceTypingPreviewEvent(
        threadId: 'thread-1',
        threadType: 'temp_session',
        isTyping: false,
        senderRole: 'visitor',
        senderUserId: 'visitor-1',
        receivedAt: now,
      ),
      now: now,
    );

    expect(stopped, CustomerServiceTypingPreviewResult.clear);
  });

  test('transfer targets exclude current staff and non-service members', () {
    final targets = createCustomerServiceTransferTargets(
      const [
        CustomerServiceStaffCandidate(
          userId: 'staff-1',
          displayName: 'Current',
          membershipRole: 2,
        ),
        CustomerServiceStaffCandidate(
          userId: 'staff-2',
          displayName: 'Second',
          membershipRole: 2,
        ),
        CustomerServiceStaffCandidate(
          userId: 'member-1',
          displayName: 'Member',
          membershipRole: 0,
        ),
      ],
      currentUserIds: const ['staff-1'],
    );

    expect(targets.map((target) => target.userId), ['staff-2']);
    expect(
        targets.single.roleLabel, CustomerServiceTransferRole.customerService);
  });

  test('transfer notice is only created for the transferred staff', () {
    final notice = createCustomerServiceTransferNotice(
      const CustomerServiceTransferNoticeEvent(
        threadType: 'temp-session',
        threadId: 'session-1',
        conversationId: 'conv-1',
        toStaffUserId: 'staff-2',
        fromStaffUserId: 'staff-1',
        reason: '需要二线支持',
        recipientRole: 'staff',
      ),
      currentStaffUserId: 'staff-2',
      receivedAt: DateTime.utc(2026, 6, 12, 11),
    );

    expect(notice, isNotNull);
    expect(notice!.threadKey, 'temp_session:session-1');
    expect(notice.title, '收到转接会话');
    expect(notice.body, contains('需要二线支持'));

    final customerSide = createCustomerServiceTransferNotice(
      const CustomerServiceTransferNoticeEvent(
        threadType: 'temp_session',
        threadId: 'session-1',
        conversationId: 'conv-1',
        toStaffUserId: 'staff-2',
        recipientRole: 'customer',
      ),
      currentStaffUserId: 'staff-2',
    );

    expect(customerSide, isNull);
  });

  test('customer read status marks staff messages read by visitor seq', () {
    final messages = [
      message(id: 'staff-read', seq: 1, senderUserId: 'staff-1', isSelf: true),
      message(id: 'visitor', seq: 2, senderUserId: 'visitor-1'),
      message(
          id: 'staff-unread', seq: 3, senderUserId: 'staff-1', isSelf: true),
      message(
        id: 'failed',
        seq: 4,
        senderUserId: 'staff-1',
        isSelf: true,
        status: MessageStatus.failed,
      ),
    ];

    final next = applyCustomerServiceCustomerReadStatus(
      messages,
      currentStaffUserId: 'staff-1',
      customerLastReadSeq: 2,
    );

    expect(next[0].isReadByPeer, isTrue);
    expect(next[0].status, MessageStatus.read);
    expect(next[1].isReadByPeer, isFalse);
    expect(next[2].isReadByPeer, isFalse);
    expect(next[3].isReadByPeer, isFalse);
  });
}
