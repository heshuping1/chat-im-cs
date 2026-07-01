import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_read_receipt_service.dart';

void main() {
  const service = MessageReadReceiptService();

  Message message({
    required String id,
    required int seq,
    required String senderUserId,
    bool isSelf = false,
    MessageStatus status = MessageStatus.sent,
    int readCount = 0,
  }) {
    return Message(
      messageId: id,
      conversationId: 'direct-1',
      conversationSeq: seq,
      senderUserId: senderUserId,
      type: MessageType.text,
      body: const MessageBody(text: 'hello'),
      sentAt: DateTime.utc(2026),
      isSelf: isSelf,
      status: status,
      readCount: readCount,
    );
  }

  test('marks only own direct server messages up to peer read seq', () {
    final messages = [
      message(id: 'mine-read', seq: 1, senderUserId: 'me', isSelf: true),
      message(id: 'peer', seq: 2, senderUserId: 'peer'),
      message(id: 'mine-pending', seq: 3, senderUserId: 'me', isSelf: true),
      message(
        id: 'mine-failed',
        seq: 4,
        senderUserId: 'me',
        isSelf: true,
        status: MessageStatus.failed,
      ),
    ];

    final next = service.applyDirectPeerReadSeq(
      messages,
      currentUserId: 'me',
      readSeq: 2,
    );

    expect(next[0].isReadByPeer, isTrue);
    expect(next[0].status, MessageStatus.read);
    expect(next[1].isReadByPeer, isFalse);
    expect(next[2].isReadByPeer, isFalse);
    expect(next[3].isReadByPeer, isFalse);
  });

  test('allows group receipt entry only for own usable group messages', () {
    final ownSent = message(
      id: 'group-mine',
      seq: 8,
      senderUserId: 'me',
      isSelf: true,
      readCount: 2,
    );
    final peerSent = message(id: 'group-peer', seq: 9, senderUserId: 'peer');
    final unknownSeq = message(
      id: 'group-unknown',
      seq: 0,
      senderUserId: 'me',
      isSelf: true,
    );

    expect(
      service.canShowGroupReadReceipt(
        ownSent,
        isSelf: true,
        isGroup: true,
      ),
      isTrue,
    );
    expect(
      service.canShowGroupReadReceipt(
        peerSent,
        isSelf: false,
        isGroup: true,
      ),
      isFalse,
    );
    expect(
      service.canShowGroupReadReceipt(
        ownSent,
        isSelf: true,
        isGroup: false,
      ),
      isFalse,
    );
    expect(
      service.canShowGroupReadReceipt(
        unknownSeq,
        isSelf: true,
        isGroup: true,
      ),
      isFalse,
    );
  });

  test('detects pending direct read receipts for sent own messages only', () {
    expect(
      service.hasPendingDirectPeerReadReceipt(
        [
          message(id: 'mine', seq: 1, senderUserId: 'me', isSelf: true),
          message(id: 'peer', seq: 2, senderUserId: 'peer'),
        ],
        currentUserId: 'me',
      ),
      isTrue,
    );

    expect(
      service.hasPendingDirectPeerReadReceipt(
        [
          message(
            id: 'read',
            seq: 1,
            senderUserId: 'me',
            isSelf: true,
            status: MessageStatus.read,
          ).copyWith(isReadByPeer: true),
        ],
        currentUserId: 'me',
      ),
      isFalse,
    );
  });

  test('selects latest own group messages for read receipt snapshot sync only',
      () {
    final targets = service.groupReadReceiptSnapshotTargets(
      [
        message(id: 'peer', seq: 1, senderUserId: 'peer'),
        message(id: 'failed', seq: 2, senderUserId: 'me', isSelf: true)
            .copyWith(status: MessageStatus.failed),
        message(id: 'unknown-seq', seq: 0, senderUserId: 'me', isSelf: true),
        message(id: 'mine-old', seq: 3, senderUserId: 'me', isSelf: true),
        message(id: 'mine-new', seq: 4, senderUserId: 'me', isSelf: true),
      ],
      currentUserId: 'me',
      maxTargets: 1,
    );

    expect(targets.map((message) => message.messageId), ['mine-new']);
  });
}
