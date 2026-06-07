import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/conversation_row.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('conversation row hides customer badge for customer-side chats', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'customer-1',
          type: SpaceType.customerRestricted,
        ),
        child: ConversationRow(
          conversation: _conversation(title: '我（工作笔记）', peerUserType: 1),
          isPersonal: false,
          isEmployee: false,
          onTap: () {},
        ),
      ),
    );

    expect(find.text('我（工作笔记）'), findsOneWidget);
    expect(find.text('客户'), findsNothing);
    expect(find.text('客'), findsNothing);
  });

  testWidgets('conversation row still shows service badge for staff chats', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'customer-1',
          type: SpaceType.customerRestricted,
        ),
        child: ConversationRow(
          conversation: _conversation(title: '客服小王', peerUserType: 2),
          isPersonal: false,
          isEmployee: false,
          onTap: () {},
        ),
      ),
    );

    expect(find.text('客服小王'), findsOneWidget);
    expect(find.text('客服'), findsOneWidget);
  });

  testWidgets('conversation row prefixes unread direct mention reminder', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'me',
          type: SpaceType.employee,
        ),
        child: ConversationRow(
          conversation: _groupConversation(
            unreadCount: 2,
            text: '@我 看一下',
            mentions: const [Mention.user(userId: 'me', offset: 0, length: 2)],
          ),
          isPersonal: false,
          isEmployee: true,
          onTap: () {},
        ),
      ),
    );

    expect(find.textContaining('[@我]'), findsOneWidget);
  });

  testWidgets('conversation row prefixes unread all-member mention reminder', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'me',
          type: SpaceType.employee,
        ),
        child: ConversationRow(
          conversation: _groupConversation(
            unreadCount: 2,
            text: '@所有人 看一下',
            mentions: const [Mention.all(offset: 0, length: 4)],
            isMuted: true,
          ),
          isPersonal: false,
          isEmployee: true,
          onTap: () {},
        ),
      ),
    );

    expect(find.textContaining('[@所有人]'), findsOneWidget);
  });

  testWidgets('conversation row does not prefix read mention reminder', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'me',
          type: SpaceType.employee,
        ),
        child: ConversationRow(
          conversation: _groupConversation(
            unreadCount: 0,
            text: '@所有人 看一下',
            mentions: const [Mention.all(offset: 0, length: 4)],
          ),
          isPersonal: false,
          isEmployee: true,
          onTap: () {},
        ),
      ),
    );

    expect(find.textContaining('[@'), findsNothing);
  });

  testWidgets('conversation unread badge sits on the avatar corner', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'me',
          type: SpaceType.employee,
        ),
        child: ConversationRow(
          conversation: _groupConversation(
            unreadCount: 4,
            text: '刷了也没破涕为笑',
            mentions: const [],
          ),
          isPersonal: false,
          isEmployee: true,
          onTap: () {},
        ),
      ),
    );

    final badgeFinder = find.byKey(const ValueKey('conversation-unread-badge'));

    expect(badgeFinder, findsOneWidget);
    expect(find.text('4'), findsOneWidget);

    final badgeRect = tester.getRect(badgeFinder);
    expect(badgeRect.width, inInclusiveRange(20, 28));
    expect(badgeRect.height, inInclusiveRange(20, 24));
  });

  testWidgets('conversation unread badge keeps 99 plus compact', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        space: const SpaceContext(
          spaceId: 'tenant-1',
          accessToken: 'tenant-access',
          refreshToken: 'tenant-refresh',
          userId: 'me',
          type: SpaceType.employee,
        ),
        child: ConversationRow(
          conversation: _groupConversation(
            unreadCount: 120,
            text: '新消息',
            mentions: const [],
          ),
          isPersonal: false,
          isEmployee: true,
          onTap: () {},
        ),
      ),
    );

    final badgeFinder = find.byKey(const ValueKey('conversation-unread-badge'));

    expect(badgeFinder, findsOneWidget);
    expect(find.text('99+'), findsOneWidget);
    expect(tester.getRect(badgeFinder).width, lessThanOrEqualTo(34));
  });
}

Widget _wrap({required SpaceContext space, required Widget child}) {
  return ProviderScope(
    overrides: [
      currentSpaceProvider.overrideWith(() => _FakeSpaceManager(space)),
      dioProvider.overrideWithValue(_fakeDio()),
      groupAvatarMembersProvider(
        'group-1',
      ).overrideWith((ref) async => const <GroupAvatarMember>[]),
    ],
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: child),
    ),
  );
}

Dio _fakeDio() {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.httpClientAdapter = _FakeAdapter();
  return dio;
}

Conversation _conversation({required String title, int? peerUserType}) {
  return Conversation(
    conversationId: 'conv-$title',
    type: ConversationType.direct,
    title: title,
    peerUserType: peerUserType,
  );
}

Conversation _groupConversation({
  required int unreadCount,
  required String text,
  required List<Mention> mentions,
  bool isMuted = false,
}) {
  return Conversation(
    conversationId: 'group-1',
    type: ConversationType.group,
    title: '项目群',
    unreadCount: unreadCount,
    isMuted: isMuted,
    lastMessage: LastMessage(
      messageId: 'msg-1',
      text: text,
      messageType: 'text',
      senderUserId: 'other',
      sentAt: DateTime.utc(2026, 6, 6, 12),
      mentions: mentions,
    ),
  );
}

class _FakeSpaceManager extends SpaceManager {
  _FakeSpaceManager(this._space);

  final SpaceContext _space;

  @override
  SpaceContext? build() => _space;
}

class _FakeAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'code': 'OK', 'message': 'success', 'data': []}),
      200,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
