import 'package:path/path.dart' as p;

import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';

enum MessageSendPolicyContext {
  personal,
  enterpriseEmployee,
  enterpriseCustomer,
}

class MessageSendPolicy {
  final MessageSendPolicyContext context;

  const MessageSendPolicy({required this.context});

  static const allowAll = MessageSendPolicy(
    context: MessageSendPolicyContext.personal,
  );

  MessageSendFailure? validate({
    required MessageType type,
    required MessageBody body,
  }) {
    if (type == MessageType.file && _isExecutableFile(body.file)) {
      return const MessageSendFailure.serverRejected(
        code: 'LOCAL_POLICY_EXECUTABLE_FILE_BLOCKED',
        message: 'message blocked by local send policy',
      );
    }
    if (type == MessageType.text &&
        context == MessageSendPolicyContext.enterpriseCustomer &&
        _containsLink(body.text)) {
      return const MessageSendFailure.serverRejected(
        code: 'LOCAL_POLICY_ENTERPRISE_LINK_BLOCKED',
        message: 'message blocked by local send policy',
      );
    }
    return null;
  }

  bool _isExecutableFile(MediaResource? file) {
    if (file == null) return false;
    if (_hasExeExtension(file.fileName) || _hasExeExtension(file.url)) {
      return true;
    }
    final mimeType = file.mimeType?.trim().toLowerCase();
    return const {
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-exe',
      'application/exe',
      'application/dos-exe',
      'application/x-winexe',
      'application/vnd.microsoft.portable-executable',
      'vms/exe',
    }.contains(mimeType);
  }

  bool _hasExeExtension(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty) return false;
    final parsed = Uri.tryParse(trimmed);
    final path = parsed?.path.isNotEmpty == true ? parsed!.path : trimmed;
    return p.extension(path).toLowerCase() == '.exe';
  }

  bool _containsLink(String? text) {
    final value = text?.trim();
    if (value == null || value.isEmpty) return false;
    if (RegExp(r'(?:https?:\/\/|www\.)\S+', caseSensitive: false)
        .hasMatch(value)) {
      return true;
    }

    final bareDomain = RegExp(
      r'\b(?:[a-z0-9-]+\.)+'
      r'(?:com|cn|net|org|io|co|app|dev|ai|xyz|top|me|info|biz|edu|gov|us|uk|jp|kr|hk|tw|de|fr|ru|in|shop|site|online|vip|club|cc)'
      r'(?:[/:?#][^\s]*)?',
      caseSensitive: false,
    );
    for (final match in bareDomain.allMatches(value)) {
      final start = match.start;
      if (start > 0 && value[start - 1] == '@') continue;
      return true;
    }
    return false;
  }
}
