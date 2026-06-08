import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';

enum CustomerServiceReplyGate { claim, takeover, open }

class CustomerServiceChatState {
  final bool isCustomerServiceThread;
  final bool readOnly;
  final bool ended;
  final CustomerServiceReplyGate replyGate;
  final String statusLabel;

  const CustomerServiceChatState({
    required this.isCustomerServiceThread,
    required this.readOnly,
    required this.ended,
    required this.replyGate,
    required this.statusLabel,
  });

  factory CustomerServiceChatState.fromDetail(
    CsThreadDetail? detail, {
    required bool isCustomerServiceThread,
    bool readOnly = false,
  }) {
    return CustomerServiceChatState(
      isCustomerServiceThread: isCustomerServiceThread,
      readOnly: readOnly,
      ended: isCustomerServiceThread && (detail?.isTerminal ?? false),
      replyGate: replyGateForDetail(detail),
      statusLabel: statusLabelFor(detail?.status),
    );
  }

  bool get requiresManualEntry =>
      isCustomerServiceThread &&
      !ended &&
      replyGate != CustomerServiceReplyGate.open;

  bool get canReply =>
      !readOnly && isCustomerServiceThread && !ended && !requiresManualEntry;

  static CustomerServiceReplyGate replyGateForDetail(CsThreadDetail? detail) {
    if (detail == null) return CustomerServiceReplyGate.open;
    final status = normalizeCustomerServiceThreadStatus(detail.status);
    final responder =
        detail.currentResponderType?.toLowerCase().replaceAll('-', '_');
    final ai = detail.aiStatus?.toLowerCase().replaceAll('-', '_');
    if (status == '1' ||
        status == 'queued' ||
        status == 'created' ||
        status.contains('queue') ||
        status.contains('pending') ||
        status.contains('waiting')) {
      return CustomerServiceReplyGate.claim;
    }
    if (responder == 'ai' ||
        ai == 'bot_active' ||
        status == 'bot_active' ||
        status.contains('ai') ||
        status == 'bot') {
      return CustomerServiceReplyGate.takeover;
    }
    return CustomerServiceReplyGate.open;
  }

  static String statusLabelFor(String? status) {
    final normalized = normalizeCustomerServiceThreadStatus(status);
    return switch (normalized) {
      '5' || 'closed_by_visitor' => '访客关闭',
      '6' || 'closed_by_staff' => '客服关闭',
      '7' || 'closed_timeout' => '超时关闭',
      '8' || 'closed_system' => '系统关闭',
      '9' || 'archived' => '已归档',
      _ when normalized.startsWith('closed') => '已结束',
      _ => '',
    };
  }
}
