import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/models/customer_service_chat_state_model.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';

void main() {
  group('CustomerServiceChatState', () {
    test('requires claim before replying to queued thread', () {
      final state = CustomerServiceChatState.fromDetail(
        _detail(status: 'queued'),
        isCustomerServiceThread: true,
      );

      expect(state.replyGate, CustomerServiceReplyGate.claim);
      expect(state.requiresManualEntry, isTrue);
      expect(state.canReply, isFalse);
    });

    test('requires takeover before replying to AI handled thread', () {
      final state = CustomerServiceChatState.fromDetail(
        _detail(status: 'bot_active', currentResponderType: 'ai'),
        isCustomerServiceThread: true,
      );

      expect(state.replyGate, CustomerServiceReplyGate.takeover);
      expect(state.requiresManualEntry, isTrue);
      expect(state.canReply, isFalse);
    });

    test('allows replies for manually handled active thread', () {
      final state = CustomerServiceChatState.fromDetail(
        _detail(status: 'active', currentResponderType: 'staff'),
        isCustomerServiceThread: true,
      );

      expect(state.replyGate, CustomerServiceReplyGate.open);
      expect(state.requiresManualEntry, isFalse);
      expect(state.canReply, isTrue);
    });

    test('marks terminal thread readonly and exposes status label', () {
      final state = CustomerServiceChatState.fromDetail(
        _detail(status: 'closed_by_staff'),
        isCustomerServiceThread: true,
      );

      expect(state.ended, isTrue);
      expect(state.canReply, isFalse);
      expect(state.statusLabel, '客服关闭');
    });

    test(
      'keeps externally readonly customer service conversation readonly',
      () {
        final state = CustomerServiceChatState.fromDetail(
          _detail(status: 'active', currentResponderType: 'staff'),
          isCustomerServiceThread: true,
          readOnly: true,
        );

        expect(state.replyGate, CustomerServiceReplyGate.open);
        expect(state.canReply, isFalse);
      },
    );
  });
}

CsThreadDetail _detail({
  required String status,
  String? currentResponderType,
  String? aiStatus,
}) {
  return CsThreadDetail(
    threadType: 'temp_session',
    threadId: 'thread-1',
    conversationId: 'conversation-1',
    status: status,
    title: '客户',
    currentResponderType: currentResponderType,
    aiStatus: aiStatus,
  );
}
