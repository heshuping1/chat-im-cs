import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('scheduled message success feedback is only shown in the input bar', () {
    final sources = [
      'lib/features/chat/presentation/pages/chat_page.dart',
      'lib/features/chat/presentation/pages/scheduled_messages_page.dart',
    ].map((path) => File(path).readAsStringSync()).join('\n');

    expect(sources, isNot(contains('已设置定时发送')));
    expect(sources, isNot(contains('已更新定时消息')));
  });
}
