import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';

class FriendAcceptanceConversationDraft {
  final String requestId;
  final String peerUserId;
  final String peerDisplayName;
  final String? peerAvatarUrl;
  final String? requestMessage;
  final String acceptedText;

  const FriendAcceptanceConversationDraft({
    required this.requestId,
    required this.peerUserId,
    required this.peerDisplayName,
    this.peerAvatarUrl,
    this.requestMessage,
    this.acceptedText = '我通过了你的朋友验证请求，现在我们可以开始聊天了',
  });

  factory FriendAcceptanceConversationDraft.fromRequest(
    FriendRequest request, {
    required String? currentUserId,
  }) {
    final isIncoming = currentUserId == null ||
        request.fromUserId.isEmpty ||
        request.fromUserId != currentUserId;
    return FriendAcceptanceConversationDraft(
      requestId: request.requestId,
      peerUserId: isIncoming ? request.fromUserId : request.toUserId,
      peerDisplayName:
          isIncoming ? request.fromDisplayName : request.toDisplayName,
      peerAvatarUrl: isIncoming ? request.fromAvatarUrl : request.toAvatarUrl,
      requestMessage: request.message,
    );
  }
}

/// 好友通过后按微信体验补齐会话入口：
/// 1. 创建/复用单聊；
/// 2. 写入本地系统消息：申请说明 + 验证通过；
/// 3. 更新会话摘要，让消息列表立即出现该会话。
///
/// 服务端当前好友申请结果事件不返回消息对象，所以这里是本地体验补齐；
/// 后续如果服务端返回正式 event message，SQLite upsert 会按 messageId 去重。
Future<void> ensureFriendAcceptanceConversation(
  dynamic ref,
  FriendAcceptanceConversationDraft draft,
) async {
  final space = ref.read(currentSpaceProvider);
  if (space == null || draft.peerUserId.isEmpty) return;

  final dio = ref.read(dioProvider);
  final response = await dio.post<Map<String, dynamic>>(
    '/api/client/v1/direct-chats',
    data: {'peerUserId': draft.peerUserId},
  );
  final data = response.data?['data'] as Map<String, dynamic>? ?? {};
  final chatId = (data['chatId'] ?? data['conversationId']) as String?;
  if (chatId == null || chatId.isEmpty) return;

  final now = DateTime.now().toUtc();
  final requestText = draft.requestMessage?.trim();
  final messages = <Message>[
    if (requestText != null && requestText.isNotEmpty)
      _eventMessage(
        messageId: 'friend_request_${draft.requestId}_request',
        conversationId: chatId,
        conversationSeq: -2,
        senderUserId: draft.peerUserId,
        sentAt: now.subtract(const Duration(milliseconds: 1)),
        text: '好友申请：$requestText',
        eventType: 'friend_request',
      ),
    _eventMessage(
      messageId: 'friend_request_${draft.requestId}_accepted',
      conversationId: chatId,
      conversationSeq: -1,
      senderUserId: space.userId,
      sentAt: now,
      text: draft.acceptedText,
      eventType: 'friend_request_accepted',
    ),
  ];

  final local = ChatLocalDataSourceImpl();
  await local.upsertMessages(space.spaceId, chatId, messages);

  Conversation? existing;
  for (final conversation in await local.getConversations(space.spaceId)) {
    if (conversation.conversationId == chatId) {
      existing = conversation;
      break;
    }
  }
  final last = messages.last;
  final existingSeq = existing?.lastMessageSeq ?? 0;
  final updated = (existing ??
          Conversation(
            conversationId: chatId,
            type: ConversationType.direct,
            title: draft.peerDisplayName,
            avatarUrl: draft.peerAvatarUrl,
            peerUserId: draft.peerUserId,
          ))
      .copyWith(
    type: ConversationType.direct,
    title: existing?.title.isNotEmpty == true
        ? existing!.title
        : draft.peerDisplayName,
    avatarUrl: existing?.avatarUrl ?? draft.peerAvatarUrl,
    peerUserId: existing?.peerUserId ?? draft.peerUserId,
    lastMessage: LastMessage(
      messageId: last.messageId,
      text: last.body.text,
      messageType: 'event',
      senderUserId: last.senderUserId,
      sentAt: last.sentAt,
    ),
    lastActivityAt: last.sentAt,
    lastMessageSeq: existingSeq <= 0 ? last.conversationSeq : existingSeq,
    unreadCount: existing?.unreadCount ?? 0,
  );
  await local.upsertConversation(space.spaceId, updated);

  ref.invalidate(conversationsProvider(space.spaceId));
  ref.invalidate(chatProvider((space.spaceId, chatId, false)));
}

Message _eventMessage({
  required String messageId,
  required String conversationId,
  required int conversationSeq,
  required String senderUserId,
  required DateTime sentAt,
  required String text,
  required String eventType,
}) {
  return Message(
    messageId: messageId,
    clientMsgId: messageId,
    conversationId: conversationId,
    conversationSeq: conversationSeq,
    senderUserId: senderUserId,
    type: MessageType.event,
    body: MessageBody(
      text: text,
      eventData: EventDto(
        type: eventType,
        text: text,
      ),
    ),
    sentAt: sentAt,
  );
}
