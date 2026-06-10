import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_map/flutter_map.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart' show LatLng;
import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/platform/local_video_poster.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/widgets/app_network_image.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/call/domain/entities/call_entities.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/audio_player_service.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_read_receipt_service.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_open_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/image_viewer_page.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_media_preview_model.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_upload_progress_model.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart' as p;
import 'package:url_launcher/url_launcher.dart';

class _C {
  static const selfBgLight = Color(0xFF95EC69); // 微信风格浅绿（亮色）
  static const selfBgDark = Color(0xFF3D7A4F); // 微信暗色深绿
  static const otherBgLight = Color(0xFFFFFFFF);
  static const otherBgDark = Color(0xFF2C2C2C); // 微信暗色对方气泡
  static const green = Color(0xFF07C160);
  static const textSecondary = Color(0xFF666666);

  static Color selfBg(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? selfBgDark : selfBgLight;
  }

  static Color otherBg(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? otherBgDark : otherBgLight;
  }
}

class MessageBubble extends ConsumerWidget {
  final Message message;
  final bool isSelf;
  final String? senderName;
  final String? senderAvatarUrl;
  final String? senderIdentityLabel;
  final IdentityBadgeTone? senderIdentityTone;
  final String? senderAvatarBadgeLabel;
  final IdentityBadgeTone? senderAvatarBadgeTone;
  final bool showSenderInfo;
  final VoidCallback? onAvatarTap;
  final VoidCallback? onConvertVoiceToText;
  final VoidCallback? onCallLogTap;

  /// 被引用的消息（用于显示引用块内容）
  final Message? replyMessage;

  /// 被引用消息的发送者名字
  final String? replySenderName;

  /// 群聊 ID（非空时不显示私聊阅读勾）
  final String? groupId;

  /// 发送失败时点击感叹号的回调
  final VoidCallback? onFailedTap;

  /// 是否显示时间戳（相邻消息时间差 < 5 分钟时隐藏）
  final bool showTimestamp;
  final bool showGroupReadReceipt;
  final VoidCallback? onGroupReadReceiptTap;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isSelf,
    this.senderName,
    this.senderAvatarUrl,
    this.senderIdentityLabel,
    this.senderIdentityTone,
    this.senderAvatarBadgeLabel,
    this.senderAvatarBadgeTone,
    this.showSenderInfo = false,
    this.onAvatarTap,
    this.onConvertVoiceToText,
    this.onCallLogTap,
    this.replyMessage,
    this.replySenderName,
    this.groupId,
    this.onFailedTap,
    this.showTimestamp = true,
    this.showGroupReadReceipt = true,
    this.onGroupReadReceiptTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tzOffset = ref.watch(timezoneOffsetProvider);
    if (message.isRecalled) {
      return _RecalledBubble(isSelf: isSelf, senderName: senderName);
    }

    // 系统事件消息：居中灰色文字，无头像无气泡；text 为空时不渲染
    if (message.type == MessageType.event) {
      if (message.body.text == null || message.body.text!.isEmpty) {
        return const SizedBox.shrink();
      }
      return _EventBubble(message: message);
    }

    return Padding(
      padding: EdgeInsets.only(
        left: isSelf ? 56 : 6,
        right: isSelf ? 6 : 56,
        top: 4,
        bottom: 4,
      ),
      child: Row(
        mainAxisAlignment:
            isSelf ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 对方头像（左侧，顶部对齐）
          if (!isSelf) ...[
            GestureDetector(
              onTap: onAvatarTap,
              child: _Avatar(
                url: senderAvatarUrl,
                name: senderName,
                badgeLabel: senderAvatarBadgeLabel,
                badgeTone: senderAvatarBadgeTone,
              ),
            ),
            const SizedBox(width: 8),
          ],
          // 消息内容区
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isSelf ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                // 对方名字（群聊或单聊都显示，在气泡上方）
                if (!isSelf && senderName != null && senderName!.isNotEmpty)
                  Padding(
                    padding: EdgeInsets.only(bottom: 3, left: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            senderName!,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.5),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (senderIdentityLabel != null &&
                            senderIdentityTone != null) ...[
                          const SizedBox(width: 4),
                          IdentityBadge(
                            label: senderIdentityLabel!,
                            tone: senderIdentityTone!,
                            compact: true,
                          ),
                        ],
                      ],
                    ),
                  ),
                // 气泡 + 极简投递/阅读状态
                Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (isSelf) ...[
                      _StatusIndicator(
                        status: message.status,
                        isReadByPeer: message.isReadByPeer,
                        showReadReceipt: groupId == null,
                        showSendingProgress: !_suppressesExternalSendProgress(
                          message,
                        ),
                        onFailedTap: onFailedTap,
                      ),
                      const SizedBox(width: 4),
                    ],
                    Flexible(
                      child: _BubbleContent(
                        message: message,
                        isSelf: isSelf,
                        onConvertVoiceToText: onConvertVoiceToText,
                        onCallLogTap: onCallLogTap,
                        replyMessage: replyMessage,
                        replySenderName: replySenderName,
                      ),
                    ),
                  ],
                ),
                if (_shouldShowGroupReadReceipt(
                  message,
                  isSelf: isSelf,
                  groupId: groupId,
                  showGroupReadReceipt: showGroupReadReceipt,
                  onTap: onGroupReadReceiptTap,
                ))
                  _GroupReadReceiptEntry(
                    readCount: message.readCount,
                    onTap: onGroupReadReceiptTap!,
                  ),
                // 时间戳（相邻消息时间差 < 5 分钟时隐藏）
                if (showTimestamp)
                  Padding(
                    padding: EdgeInsets.only(top: 3, left: 2, right: 2),
                    child: Text(
                      formatTimeWithTimezone(message.sentAt, tzOffset),
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.5),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // 自己头像（右侧）
          if (isSelf) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onAvatarTap,
              child: _Avatar(
                url: senderAvatarUrl,
                name: senderName,
                isMyAvatar: true,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Avatar — 圆角矩形（微信风格），轻阴影，40×40dp
// ---------------------------------------------------------------------------

class _Avatar extends StatelessWidget {
  final String? url;
  final String? name;
  final bool isMyAvatar;
  final String? badgeLabel;
  final IdentityBadgeTone? badgeTone;

  const _Avatar({
    this.url,
    this.name,
    this.isMyAvatar = false,
    this.badgeLabel,
    this.badgeTone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 2.0,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: PersonAvatarWithBadge(
        avatarUrl: url,
        name: name ?? '',
        size: 40,
        borderRadius: 8,
        isMyAvatar: isMyAvatar,
        showIdentity: badgeLabel != null && badgeTone != null,
        badgeLabel: badgeLabel,
        badgeTone: badgeTone,
        badgeSize: 16,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Status Indicator — 私聊用单/双勾表达阅读状态
// ---------------------------------------------------------------------------

class _StatusIndicator extends StatelessWidget {
  final MessageStatus status;
  final bool isReadByPeer;
  final bool showReadReceipt;
  final bool showSendingProgress;
  final VoidCallback? onFailedTap;
  const _StatusIndicator({
    required this.status,
    this.isReadByPeer = false,
    required this.showReadReceipt,
    this.showSendingProgress = true,
    this.onFailedTap,
  });

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case MessageStatus.sending:
        if (!showSendingProgress) return const SizedBox.shrink();
        return SizedBox(
          key: const ValueKey('message-text-send-progress'),
          width: 26,
          height: 26,
          child: Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.45),
              ),
            ),
          ),
        );
      case MessageStatus.sent:
      case MessageStatus.delivered:
        if (!showReadReceipt) return const SizedBox.shrink();
        return isReadByPeer
            ? const _DirectReadReceiptMark()
            : Icon(
                Icons.done,
                size: 16,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              );
      case MessageStatus.read:
        if (!showReadReceipt) return const SizedBox.shrink();
        return const _DirectReadReceiptMark();
      case MessageStatus.failed:
      case MessageStatus.rejected:
        return GestureDetector(
          onTap: onFailedTap,
          child: const Icon(Icons.error_outline, size: 20, color: Colors.red),
        );
      case MessageStatus.recalled:
      case MessageStatus.deletedLocal:
        return const SizedBox.shrink();
    }
  }
}

// ---------------------------------------------------------------------------

bool _suppressesExternalSendProgress(Message message) {
  if (message.type == MessageType.text ||
      message.type == MessageType.markdown) {
    return true;
  }
  if (message.type == MessageType.image) return false;
  final uploadState = message.localUploadState;
  if (uploadState != null && uploadState.isActive) return true;
  final url = switch (message.type) {
    MessageType.image => message.body.image?.url,
    MessageType.video => message.body.video?.url,
    _ => null,
  };
  if (url == null || url.isEmpty) return false;
  return url.startsWith('/') ||
      (!url.startsWith('http://') && !url.startsWith('https://'));
}

bool _shouldShowGroupReadReceipt(
  Message message, {
  required bool isSelf,
  required String? groupId,
  required bool showGroupReadReceipt,
  required VoidCallback? onTap,
}) {
  return showGroupReadReceipt &&
      onTap != null &&
      const MessageReadReceiptService().canShowGroupReadReceipt(
        message,
        isSelf: isSelf,
        isGroup: groupId != null,
      );
}

class _GroupReadReceiptEntry extends StatelessWidget {
  final int readCount;
  final VoidCallback onTap;

  const _GroupReadReceiptEntry({
    required this.readCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final text =
        readCount > 0 ? l10n.chatReadCount(readCount) : l10n.chatUnread;
    return Padding(
      padding: const EdgeInsets.only(top: 3, right: 2),
      child: Semantics(
        button: true,
        label: text,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Container(
            key: const ValueKey('message-group-read-receipt-entry'),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _GroupReadReceiptMark(ratio: readCount > 0 ? 0.42 : 0),
                const SizedBox(width: 3),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.onSurface.withValues(
                          alpha: 0.58,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DirectReadReceiptMark extends StatelessWidget {
  const _DirectReadReceiptMark();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 16,
      height: 16,
      child: CustomPaint(painter: _DirectReadReceiptPainter()),
    );
  }
}

class _GroupReadReceiptMark extends StatelessWidget {
  final double ratio;

  const _GroupReadReceiptMark({required this.ratio});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 14,
      height: 14,
      child: CustomPaint(
        painter: _GroupReadReceiptPainter(ratio: ratio),
      ),
    );
  }
}

class _DirectReadReceiptPainter extends CustomPainter {
  const _DirectReadReceiptPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.shortestSide / 14;
    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.35 * scale
      ..strokeCap = StrokeCap.round
      ..color = _C.green;
    canvas.drawCircle(size.center(Offset.zero), 5.45 * scale, ring);

    final check = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.45 * scale
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = _C.green;
    final path = Path()
      ..moveTo(4.45 * scale, 7.05 * scale)
      ..lineTo(6.12 * scale, 8.68 * scale)
      ..lineTo(9.58 * scale, 5.28 * scale);
    canvas.drawPath(path, check);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GroupReadReceiptPainter extends CustomPainter {
  final double ratio;

  const _GroupReadReceiptPainter({required this.ratio});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.shortestSide / 14;
    final center = size.center(Offset.zero);
    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.25 * scale
      ..color = _C.green;
    canvas.drawCircle(center, 5.35 * scale, ring);

    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1 * scale
      ..color = _C.green.withValues(alpha: 0.18);
    canvas.drawCircle(center, 3.25 * scale, track);

    final clamped = ratio.clamp(0.0, 1.0).toDouble();
    if (clamped <= 0) return;
    final fill = Paint()
      ..style = PaintingStyle.fill
      ..color = _C.green.withValues(alpha: 0.82);
    final rect = Rect.fromCircle(center: center, radius: 3.25 * scale);
    canvas.drawArc(rect, -math.pi / 2, clamped * math.pi * 2, true, fill);
  }

  @override
  bool shouldRepaint(covariant _GroupReadReceiptPainter oldDelegate) {
    return oldDelegate.ratio != ratio;
  }
}
// Recalled Bubble
// ---------------------------------------------------------------------------

class _RecalledBubble extends StatelessWidget {
  final bool isSelf;
  final String? senderName;
  _RecalledBubble({required this.isSelf, this.senderName});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final text = isSelf
        ? l10n.chatRecalledSelf
        : l10n.chatRecalledPeer(senderName ?? l10n.chatPeer);
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Text(text,
            style: TextStyle(
                fontSize: 12,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.5))),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Bubble Content dispatcher
// ---------------------------------------------------------------------------

class _BubbleContent extends StatelessWidget {
  final Message message;
  final bool isSelf;
  final VoidCallback? onConvertVoiceToText;
  final VoidCallback? onCallLogTap;
  final Message? replyMessage;
  final String? replySenderName;
  const _BubbleContent(
      {required this.message,
      required this.isSelf,
      this.onConvertVoiceToText,
      this.onCallLogTap,
      this.replyMessage,
      this.replySenderName});

  Color _bg(BuildContext context) =>
      isSelf ? _C.selfBg(context) : _C.otherBg(context);

  BorderRadius get _br => BorderRadius.only(
        topLeft: const Radius.circular(12),
        topRight: const Radius.circular(12),
        bottomLeft: Radius.circular(isSelf ? 12 : 4),
        bottomRight: Radius.circular(isSelf ? 4 : 12),
      );

  @override
  Widget build(BuildContext context) {
    final bg = _bg(context);
    switch (message.type) {
      case MessageType.text:
      case MessageType.markdown:
        return _TextBubble(
            message: message,
            bg: bg,
            br: _br,
            replyMessage: replyMessage,
            replySenderName: replySenderName);
      case MessageType.image:
        return _ImageBubble(message: message);
      case MessageType.voice:
        return _VoiceBubble(
          message: message,
          bg: bg,
          br: _br,
          isSelf: isSelf,
          onConvertVoiceToText: onConvertVoiceToText,
        );
      case MessageType.video:
        return _VideoBubble(message: message);
      case MessageType.file:
        return _FileBubble(message: message, br: _br);
      case MessageType.event:
        return _EventBubble(message: message);
      case MessageType.contactCard:
        return _ContactCardBubble(card: message.body.contactCard);
      case MessageType.callLog:
        return _CallLogBubble(
          log: message.body.callLog,
          bg: bg,
          br: _br,
          onTap: onCallLogTap,
        );
      case MessageType.location:
        return _LocationBubble(loc: message.body.location, bg: bg, br: _br);
    }
  }
}

// ---------------------------------------------------------------------------
// Text Bubble — 支持回复引用 + 翻译显示
// ---------------------------------------------------------------------------

class _TextBubble extends StatelessWidget {
  final Message message;
  final Color bg;
  final BorderRadius br;
  final Message? replyMessage;
  final String? replySenderName;
  const _TextBubble(
      {required this.message,
      required this.bg,
      required this.br,
      this.replyMessage,
      this.replySenderName});

  /// 从消息中提取预览文字
  static String _previewOf(BuildContext context, Message msg) {
    if (msg.body.text != null && msg.body.text!.isNotEmpty)
      return msg.body.text!;
    final l10n = AppLocalizations.of(context);
    switch (msg.type) {
      case MessageType.image:
        return l10n.chatImageMessage;
      case MessageType.video:
        return l10n.chatVideoMessage;
      case MessageType.voice:
        return l10n.chatVoiceMessage;
      case MessageType.file:
        return l10n.chatFileMessage;
      default:
        return l10n.chatGenericMessage;
    }
  }

  @override
  Widget build(BuildContext context) {
    // 微信风格：正文气泡 + 下方引用块（分离显示）
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 正文气泡
        Container(
          constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.70),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: message.replyToMessageId != null
                ? BorderRadius.only(
                    topLeft: br.topLeft,
                    topRight: br.topRight,
                    // 有引用时底部直角，与引用块无缝连接
                    bottomLeft: Radius.zero,
                    bottomRight: Radius.zero,
                  )
                : br,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.06),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 正文
              _MentionAwareText(message: message),
              // 翻译
              if (message.isTranslating)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.only(top: 8),
                  decoration: BoxDecoration(
                    border: Border(
                        top: BorderSide(color: Colors.black.withOpacity(0.1))),
                  ),
                  child: const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 1.5),
                  ),
                )
              else if (message.translation != null &&
                  message.translation!.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.only(top: 8),
                  decoration: BoxDecoration(
                    border: Border(
                        top: BorderSide(color: Colors.black.withOpacity(0.1))),
                  ),
                  child: Text(
                    AppLocalizations.of(context)
                        .chatTranslationPrefix(message.translation!),
                    style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7)),
                  ),
                ),
            ],
          ),
        ),
        // 微信风格引用块：在气泡下方，灰色背景
        if (message.replyToMessageId != null)
          Container(
            constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.70),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.only(
                bottomLeft: br.bottomLeft,
                bottomRight: br.bottomRight,
              ),
            ),
            child: _buildReplyBlock(context),
          ),
      ],
    );
  }

  Widget _buildReplyBlock(BuildContext context) {
    if (replyMessage == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(AppLocalizations.of(context).chatMessageDeleted,
            style: const TextStyle(fontSize: 12, color: Color(0xFF999999))),
      );
    }

    final sender = replySenderName ?? AppLocalizations.of(context).chatPeer;
    final isImage = replyMessage!.type == MessageType.image;
    final imageUrl = replyMessage!.body.image?.url;

    if (isImage && imageUrl != null) {
      // 图片引用：显示缩略图，可点击查看
      return GestureDetector(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ImageViewerPage(imageUrls: [imageUrl]),
          ),
        ),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$sender：',
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5))),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: AppNetworkImage(
                  url: imageUrl,
                  width: 40,
                  height: 40,
                  fit: BoxFit.cover,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Text(
        '$sender：${_previewOf(context, replyMessage!)}',
        style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Image Bubble
// ---------------------------------------------------------------------------

class _ImageBubble extends ConsumerWidget {
  final Message message;
  const _ImageBubble({required this.message});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final media = message.body.image;
    final viewerUrl = imageBubbleVisualSource(media);
    final size = imageBubbleSize(media);

    return GestureDetector(
      onTap: viewerUrl != null && media != null
          ? () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ImageViewerPage(
                    imageUrls: [viewerUrl],
                    items: [
                      ImageViewerItem.fromMessage(
                        message: message,
                        media: media,
                      ),
                    ],
                  ),
                ),
              )
          : null,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              key: const ValueKey('message-image-frame'),
              width: size.width,
              height: size.height,
              child: _ImageVisualFrame(
                media: media,
                size: size,
                placeholderBuilder: _placeholder,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(BuildContext ctx, MediaBubbleSize size) => Container(
        width: size.width,
        height: size.height,
        color: Theme.of(ctx).colorScheme.surfaceContainerHighest,
        child: Icon(Icons.image,
            size: 48,
            color: Theme.of(ctx).colorScheme.onSurface.withOpacity(0.4)),
      );
}

class _ImageVisualFrame extends StatefulWidget {
  final MediaResource? media;
  final MediaBubbleSize size;
  final Widget Function(BuildContext, MediaBubbleSize) placeholderBuilder;

  const _ImageVisualFrame({
    required this.media,
    required this.size,
    required this.placeholderBuilder,
  });

  @override
  State<_ImageVisualFrame> createState() => _ImageVisualFrameState();
}

class _ImageVisualFrameState extends State<_ImageVisualFrame> {
  String? _checkedLocalPreviewUrl;
  bool _skipLocalPreview = false;

  @override
  void initState() {
    super.initState();
    _verifyLocalPreviewAvailability();
  }

  @override
  void didUpdateWidget(_ImageVisualFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.media?.localPreviewUrl != widget.media?.localPreviewUrl ||
        oldWidget.media?.url != widget.media?.url ||
        oldWidget.media?.thumbnailUrl != widget.media?.thumbnailUrl) {
      _checkedLocalPreviewUrl = null;
      _skipLocalPreview = false;
      _verifyLocalPreviewAvailability();
    }
  }

  void _verifyLocalPreviewAvailability() {
    final previewUrl = widget.media?.localPreviewUrl?.trim();
    if (previewUrl == null || previewUrl.isEmpty) return;
    if (!isLocalVisualMediaUrl(previewUrl)) return;
    if (_checkedLocalPreviewUrl == previewUrl) return;
    _checkedLocalPreviewUrl = previewUrl;

    unawaited(() async {
      final exists = await localFileExists(localPathFromUriOrPath(previewUrl));
      if (!mounted || widget.media?.localPreviewUrl?.trim() != previewUrl) {
        return;
      }
      if (!exists) {
        setState(() => _skipLocalPreview = true);
      }
    }());
  }

  @override
  Widget build(BuildContext context) {
    final url = imageBubbleVisualSource(
      widget.media,
      skipLocalPreview: _skipLocalPreview,
    );
    if (url == null) {
      return widget.placeholderBuilder(context, widget.size);
    }

    final isLocalFile = isLocalVisualMediaUrl(url) &&
        !url.startsWith('/media') &&
        !url.startsWith('/api');
    if (isLocalFile) {
      return localImageWidget(
        localPathFromUriOrPath(url),
        width: widget.size.width,
        height: widget.size.height,
        fit: BoxFit.cover,
      );
    }
    return AppNetworkImage(
      url: url,
      width: widget.size.width,
      height: widget.size.height,
      fit: BoxFit.cover,
      placeholderBuilder: (context) =>
          widget.placeholderBuilder(context, widget.size),
      errorBuilder: (context) =>
          widget.placeholderBuilder(context, widget.size),
    );
  }
}

// ---------------------------------------------------------------------------
// Voice Bubble — AudioPlayerService 互斥播放 + 未听红点 + 转文字按钮
// ---------------------------------------------------------------------------

class _VoiceBubble extends ConsumerStatefulWidget {
  final Message message;
  final Color bg;
  final BorderRadius br;
  final bool isSelf;
  final VoidCallback? onConvertVoiceToText;

  const _VoiceBubble({
    required this.message,
    required this.bg,
    required this.br,
    required this.isSelf,
    this.onConvertVoiceToText,
  });

  @override
  ConsumerState<_VoiceBubble> createState() => _VoiceBubbleState();
}

class _VoiceBubbleState extends ConsumerState<_VoiceBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  StreamSubscription<PlayerState>? _playerSub;
  bool _listened = false;
  bool _showText = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    final svc = ref.read(audioPlayerServiceProvider);
    _playerSub = svc.playerStateStream.listen((state) {
      if (!mounted || svc.currentlyPlayingId != widget.message.messageId) {
        return;
      }
      if (!state.playing &&
          state.processingState == ProcessingState.completed) {
        _ctrl.stop();
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _playerSub?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  bool get _isPlaying {
    final svc = ref.read(audioPlayerServiceProvider);
    return svc.currentlyPlayingId == widget.message.messageId && svc.isPlaying;
  }

  Future<void> _togglePlay() async {
    final svc = ref.read(audioPlayerServiceProvider);
    final url = widget.message.body.voice?.url.trim();
    if (url == null || url.isEmpty) return;

    if (svc.currentlyPlayingId == widget.message.messageId && svc.isPlaying) {
      await svc.pause();
      _ctrl.stop();
    } else {
      try {
        final token = ref.read(currentSpaceProvider)?.accessToken;
        final spaceId = ref.read(currentSpaceProvider)?.spaceId;
        final media = widget.message.body.voice;
        final source = spaceId == null || media == null
            ? url
            : await ref.read(mediaOpenControllerProvider(spaceId)).localPathFor(
                  MediaOpenRequest.fromResource(
                    message: widget.message,
                    mediaKind: MediaKind.voice,
                    variant: MediaVariant.voiceSource,
                    resource: media,
                    fallbackName: 'voice.m4a',
                  ),
                );
        await svc.play(widget.message.messageId, source, token: token);
        _ctrl.repeat(reverse: true);
        setState(() => _listened = true);
      } catch (error) {
        debugPrint('[VoiceBubble] playback failed: $error');
        _ctrl.stop();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(AppLocalizations.of(context).commonOperationFailed),
          ));
        }
      }
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    // Listen to player state to update UI
    ref.listen(audioPlayerServiceProvider, (_, __) {
      if (mounted) setState(() {});
    });

    final duration = widget.message.body.voice?.durationSeconds ?? 0;
    final isPlaying = _isPlaying;
    final hasVoiceText = widget.message.translation?.isNotEmpty == true;
    final showVoiceText = _showText && hasVoiceText;

    // 气泡宽度随时长变化（最小 96，最大 200）
    final bubbleWidth = (96.0 + duration * 6.0).clamp(96.0, 200.0);

    return Column(
      crossAxisAlignment:
          widget.isSelf ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: _togglePlay,
              child: Container(
                width: bubbleWidth,
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: widget.bg,
                  borderRadius: widget.br,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: widget.isSelf
                      ? [
                          Text(
                            '$duration"',
                            style: const TextStyle(
                              fontSize: 18,
                              color: Color(0xFF111111),
                              height: 1,
                            ),
                          ),
                          const Spacer(),
                          _buildAnimatedSpeaker(isPlaying),
                        ]
                      : [
                          _buildAnimatedSpeaker(isPlaying),
                          const Spacer(),
                          Text(
                            '$duration"',
                            style: const TextStyle(
                              fontSize: 18,
                              color: Color(0xFF111111),
                              height: 1,
                            ),
                          ),
                        ],
                ),
              ),
            ),
            if (!widget.isSelf && !_listened) ...[
              const SizedBox(width: 10),
              Container(
                key: const ValueKey('message-voice-unread-dot'),
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF4D4F),
                  shape: BoxShape.circle,
                ),
              ),
            ],
            if (!widget.isSelf) ...[
              const SizedBox(width: 14),
              _VoiceConvertChip(
                isTranslating: widget.message.isTranslating,
                showVoiceText: showVoiceText,
                onTap: () {
                  if (showVoiceText) {
                    setState(() => _showText = false);
                  } else if (hasVoiceText) {
                    setState(() => _showText = true);
                  } else {
                    widget.onConvertVoiceToText?.call();
                    setState(() => _showText = true);
                  }
                },
              ),
            ],
          ],
        ),
        // 转文字内容
        if (showVoiceText)
          Container(
            margin: EdgeInsets.only(top: 4),
            padding: EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: widget.bg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              widget.message.translation!,
              style: TextStyle(
                  fontSize: 13,
                  color:
                      Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
            ),
          ),
      ],
    );
  }

  /// 微信风格的声波动画图标（三条弧线）
  Widget _buildAnimatedSpeaker(bool isPlaying) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return SizedBox(
          width: 22,
          height: 22,
          child: CustomPaint(
            painter: _SpeakerPainter(
              progress: isPlaying ? _ctrl.value : 1.0,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        );
      },
    );
  }
} // end _VoiceBubbleState

class _VoiceConvertChip extends StatelessWidget {
  final bool isTranslating;
  final bool showVoiceText;
  final VoidCallback onTap;

  const _VoiceConvertChip({
    required this.isTranslating,
    required this.showVoiceText,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const ValueKey('message-voice-convert-chip'),
      onTap: onTap,
      child: Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFE6E6E6),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Center(
          child: isTranslating
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 1.5),
                )
              : Text(
                  showVoiceText
                      ? AppLocalizations.of(context).chatVoiceHideText
                      : AppLocalizations.of(context).chatVoiceShowText,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF8A8A8A),
                    height: 1,
                  ),
                ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Speaker Painter — 微信风格声波图标（三条弧线，播放时动画）
// ---------------------------------------------------------------------------

class _SpeakerPainter extends CustomPainter {
  final double progress; // 0~1，播放时动画进度
  final Color color;

  const _SpeakerPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;

    final cx = size.width * 0.35;
    final cy = size.height * 0.5;

    // 喇叭主体（梯形）
    final bodyPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(cx - 3, cy - 4)
      ..lineTo(cx + 2, cy - 7)
      ..lineTo(cx + 2, cy + 7)
      ..lineTo(cx - 3, cy + 4)
      ..close();
    canvas.drawPath(path, bodyPaint);

    // 三条弧线（从小到大）
    final arcs = [
      (size.width * 0.55, size.height * 0.25),
      (size.width * 0.68, size.height * 0.38),
      (size.width * 0.82, size.height * 0.50),
    ];

    for (int i = 0; i < arcs.length; i++) {
      final (rx, ry) = arcs[i];
      // 播放时，弧线依次点亮（动画效果）
      final threshold = (i + 1) / arcs.length;
      final arcColor = progress >= threshold ? color : color.withOpacity(0.25);
      paint.color = arcColor;
      canvas.drawArc(
        Rect.fromCenter(
            center: Offset(cx + 2, cy), width: rx * 2, height: ry * 2),
        -math.pi * 0.4,
        math.pi * 0.8,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_SpeakerPainter old) =>
      old.progress != progress || old.color != color;
}

// ---------------------------------------------------------------------------
// Video Bubble
// ---------------------------------------------------------------------------

class _VideoBubble extends ConsumerWidget {
  final Message message;
  const _VideoBubble({required this.message});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final posterUrl = videoBubblePosterSource(message.body.video);
    final duration = message.body.video?.durationSeconds;
    final size = videoBubbleSize(message.body.video);
    final uploadPresentation =
        videoMessageUploadPresentation(message.localUploadState);
    final isLocalPoster = isLocalVisualMediaUrl(posterUrl) &&
        posterUrl != null &&
        !posterUrl.startsWith('/media') &&
        !posterUrl.startsWith('/api');

    return GestureDetector(
      onTap: uploadPresentation.active
          ? null
          : () => _openMediaResource(
                context,
                ref,
                message,
                MediaKind.video,
                MediaVariant.videoSource,
                message.body.video,
                fallbackName: 'video.mp4',
              ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              key: const ValueKey('message-video-poster-frame'),
              width: size.width,
              height: size.height,
              child: _VideoPosterFrame(
                message: message,
                media: message.body.video,
                posterUrl: posterUrl,
                isLocalPoster: isLocalPoster,
                width: size.width,
                height: size.height,
                placeholderBuilder: _placeholder,
              ),
            ),
            if (uploadPresentation.active)
              _MediaUploadOverlay(
                key: const ValueKey('message-video-upload-progress'),
                uploadPresentation: uploadPresentation,
              )
            else
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    shape: BoxShape.circle),
                child: Icon(Icons.play_arrow,
                    color: Theme.of(context).colorScheme.surface, size: 28),
              ),
            if (duration != null)
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(4)),
                  child: Text(_fmt(duration),
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.surface,
                          fontSize: 11)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(BuildContext context, double width, double height) =>
      Container(
        width: width,
        height: height,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.videocam,
          size: 42,
          color:
              Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.34),
        ),
      );

  String _fmt(int s) =>
      '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}

class _VideoPosterFrame extends ConsumerStatefulWidget {
  final Message message;
  final MediaResource? media;
  final String? posterUrl;
  final bool isLocalPoster;
  final double width;
  final double height;
  final Widget Function(BuildContext, double, double) placeholderBuilder;

  const _VideoPosterFrame({
    required this.message,
    required this.media,
    required this.posterUrl,
    required this.isLocalPoster,
    required this.width,
    required this.height,
    required this.placeholderBuilder,
  });

  @override
  ConsumerState<_VideoPosterFrame> createState() => _VideoPosterFrameState();
}

class _VideoPosterFrameState extends ConsumerState<_VideoPosterFrame> {
  static final Map<String, String> _generatedPosterCache = {};

  String? _generatedPosterPath;
  String? _generatingForUrl;
  String? _checkedLocalPosterUrl;
  bool _skipLocalPoster = false;

  @override
  void initState() {
    super.initState();
    _restoreGeneratedPosterFromCache();
    _verifyLocalPosterAvailability();
    _maybeGeneratePoster();
  }

  @override
  void didUpdateWidget(_VideoPosterFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.posterUrl != widget.posterUrl ||
        oldWidget.media?.url != widget.media?.url ||
        oldWidget.message.messageId != widget.message.messageId) {
      _generatedPosterPath = null;
      _checkedLocalPosterUrl = null;
      _skipLocalPoster = false;
      _restoreGeneratedPosterFromCache();
      _verifyLocalPosterAvailability();
      _maybeGeneratePoster();
    }
  }

  void _restoreGeneratedPosterFromCache() {
    final videoUrl = widget.media?.url.trim();
    if (videoUrl == null || videoUrl.isEmpty) return;
    _generatedPosterPath = _generatedPosterCache[videoUrl];
  }

  void _maybeGeneratePoster() {
    final availablePoster = videoBubblePosterSource(
      widget.media,
      generatedPosterUrl: _generatedPosterPath,
      skipLocalPoster: _skipLocalPoster,
    );
    if (availablePoster?.trim().isNotEmpty == true) {
      return;
    }
    final videoUrl = widget.media?.url.trim();
    if (videoUrl == null || videoUrl.isEmpty || videoUrl == _generatingForUrl) {
      return;
    }
    _generatingForUrl = videoUrl;
    unawaited(_generatePoster(videoUrl));
  }

  void _verifyLocalPosterAvailability() {
    final posterUrl = widget.posterUrl?.trim();
    if (posterUrl == null || posterUrl.isEmpty) return;
    if (!isLocalVisualMediaUrl(posterUrl)) return;
    if (_checkedLocalPosterUrl == posterUrl) return;
    _checkedLocalPosterUrl = posterUrl;

    unawaited(() async {
      final exists = await localFileExists(localPathFromUriOrPath(posterUrl));
      if (!mounted || widget.posterUrl?.trim() != posterUrl) return;
      if (!exists) {
        setState(() => _skipLocalPoster = true);
        _maybeGeneratePoster();
      }
    }());
  }

  Future<void> _generatePoster(String videoUrl) async {
    try {
      final cachedPosterPath = await cachedLocalVideoPosterPath(videoUrl);
      if (cachedPosterPath?.trim().isNotEmpty == true) {
        if (!mounted || _generatingForUrl != videoUrl) return;
        _generatedPosterCache[videoUrl] = cachedPosterPath!;
        setState(() => _generatedPosterPath = cachedPosterPath);
        return;
      }
      final localVideoPath = _isLocalMediaPath(videoUrl)
          ? localPathFromUriOrPath(videoUrl)
          : await _localVideoPathForPoster();
      if (localVideoPath == null || localVideoPath.trim().isEmpty) {
        if (!mounted || _generatingForUrl != videoUrl) return;
        setState(() => _generatedPosterPath = null);
        return;
      }
      final posterPath = await generateLocalVideoPoster(
        localVideoPath,
        cacheKey: videoUrl,
      );
      if (!mounted || _generatingForUrl != videoUrl) return;
      if (posterPath?.trim().isNotEmpty == true) {
        _generatedPosterCache[videoUrl] = posterPath!;
      }
      setState(() => _generatedPosterPath = posterPath);
    } catch (error) {
      debugPrint('[MessageBubble] generate video poster failed: $error');
    }
  }

  Future<String?> _localVideoPathForPoster() async {
    final media = widget.media;
    if (media == null) throw StateError('Video media is empty');
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId == null) throw StateError('Current space is empty');
    return ref.read(mediaOpenControllerProvider(spaceId)).cachedLocalPathFor(
          MediaOpenRequest.fromResource(
            message: widget.message,
            mediaKind: MediaKind.video,
            variant: MediaVariant.videoSource,
            resource: media,
            fallbackName: media.fileName ?? 'video.mp4',
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final source = videoBubblePosterSource(
      widget.media,
      generatedPosterUrl: _generatedPosterPath,
      skipLocalPoster: _skipLocalPoster,
    );
    if (source == null || source.trim().isEmpty) {
      return widget.placeholderBuilder(context, widget.width, widget.height);
    }

    final isLocal = (!_skipLocalPoster && widget.isLocalPoster) ||
        isLocalVisualMediaUrl(source);
    if (isLocal) {
      return localImageWidget(
        localPathFromUriOrPath(source),
        width: widget.width,
        height: widget.height,
        fit: BoxFit.cover,
      );
    }
    return AppNetworkImage(
      url: source,
      width: widget.width,
      height: widget.height,
      fit: BoxFit.cover,
      cacheInMemory: true,
      placeholderBuilder: (context) =>
          widget.placeholderBuilder(context, widget.width, widget.height),
      errorBuilder: (context) =>
          widget.placeholderBuilder(context, widget.width, widget.height),
    );
  }
}

class _MediaUploadOverlay extends StatelessWidget {
  final MessageUploadPresentation uploadPresentation;

  const _MediaUploadOverlay({
    super.key,
    required this.uploadPresentation,
  });

  @override
  Widget build(BuildContext context) {
    final progress = uploadPresentation.progress.clamp(0, 100).toInt();
    final color =
        uploadPresentation.failed ? Colors.redAccent : const Color(0xFFFFFFFF);
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.58),
        shape: BoxShape.circle,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 54,
            height: 54,
            child: CustomPaint(
              painter: _UploadRingPainter(
                progress: progress,
                color: color,
                trackColor: Colors.white.withValues(alpha: 0.22),
                strokeWidth: 3,
              ),
            ),
          ),
          if (uploadPresentation.failed)
            const Icon(Icons.error_outline, size: 24, color: Colors.redAccent)
          else
            Text(
              '$progress%',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                height: 1,
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// File Bubble
// ---------------------------------------------------------------------------

class _FileBubble extends ConsumerWidget {
  final Message message;
  final BorderRadius br;
  const _FileBubble({required this.message, required this.br});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final file = message.body.file;
    final name = file?.fileName ?? l10n.chatFileDefaultName;
    final size = file?.sizeBytes;
    final uploadPresentation =
        fileMessageUploadPresentation(message.localUploadState);
    final fileType = _FileTypeStyle.from(file: file, fallbackName: name);
    final statusText = _fileStatusText(
      context: context,
      sizeBytes: size,
      file: file,
      uploadPresentation: uploadPresentation,
    );
    final cardWidth = math.min(
      286.0,
      math.max(244.0, MediaQuery.sizeOf(context).width - 112),
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: uploadPresentation.active
            ? null
            : () => _openMediaResource(
                  context,
                  ref,
                  message,
                  MediaKind.file,
                  MediaVariant.attachment,
                  file,
                  fallbackName: name,
                ),
        borderRadius: br,
        child: ConstrainedBox(
          constraints: BoxConstraints.tightFor(width: cardWidth),
          child: Ink(
            key: const ValueKey('message-file-card'),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: br,
              border: Border.all(color: const Color(0xFFE8EAED)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            height: 1.18,
                            color: Color(0xFF1D2129),
                            fontWeight: FontWeight.w600,
                          )),
                      const SizedBox(height: 8),
                      Text(statusText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.1,
                            color: Color(0xFF9AA0A6),
                          )),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                _FileIconWithUploadProgress(
                  fileType: fileType,
                  uploadPresentation: uploadPresentation,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _fileStatusText({
    required BuildContext context,
    required int? sizeBytes,
    required MediaResource? file,
    required MessageUploadPresentation uploadPresentation,
  }) {
    final l10n = AppLocalizations.of(context);
    final status = uploadPresentation.failed
        ? l10n.chatFileStatusUploadFailed
        : uploadPresentation.active
            ? uploadPresentation.showPercent
                ? '${l10n.chatFileStatusUploading} '
                    '${uploadPresentation.progress}%'
                : l10n.chatFileStatusUploading
            : _hasLocalFileCandidate(file)
                ? l10n.chatFileStatusDownloaded
                : l10n.chatFileStatusNotDownloaded;
    final sizeText = _fmtSize(sizeBytes);
    return sizeText == null ? status : '$sizeText $status';
  }

  bool _hasLocalFileCandidate(MediaResource? file) {
    if (file == null) return false;
    final url = file.url.trim();
    if (url.isNotEmpty && _isLocalMediaPath(url)) return true;
    final localPreviewUrl = file.localPreviewUrl?.trim();
    return localPreviewUrl != null &&
        localPreviewUrl.isNotEmpty &&
        _isLocalMediaPath(localPreviewUrl);
  }

  String? _fmtSize(int? bytes) {
    if (bytes == null) return null;
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return _fmtUnit(bytes / 1024, 'KB');
    if (bytes < 1024 * 1024 * 1024) {
      return _fmtUnit(bytes / (1024 * 1024), 'MB');
    }
    return _fmtUnit(bytes / (1024 * 1024 * 1024), 'GB');
  }

  String _fmtUnit(double value, String unit) {
    final rounded = value.roundToDouble();
    final compact = value >= 100 || value == rounded
        ? rounded.toInt().toString()
        : value.toStringAsFixed(1);
    return '$compact$unit';
  }
}

class _FileTypeStyle {
  final String label;
  final Color color;

  const _FileTypeStyle({required this.label, required this.color});

  factory _FileTypeStyle.from({
    required MediaResource? file,
    required String fallbackName,
  }) {
    final ext = _fileExtension(file, fallbackName);
    switch (ext) {
      case 'pdf':
        return const _FileTypeStyle(label: 'PDF', color: Color(0xFFE94343));
      case 'doc':
      case 'docx':
        return const _FileTypeStyle(label: 'DOC', color: Color(0xFF3478F6));
      case 'xls':
      case 'xlsx':
      case 'csv':
        return const _FileTypeStyle(label: 'XLS', color: Color(0xFF22A06B));
      case 'ppt':
      case 'pptx':
        return const _FileTypeStyle(label: 'PPT', color: Color(0xFFFF8A34));
      case 'zip':
      case 'rar':
      case '7z':
        return const _FileTypeStyle(label: 'ZIP', color: Color(0xFF7A8599));
      case 'mp3':
        return const _FileTypeStyle(label: 'MP3', color: Color(0xFF8E64D8));
      case 'txt':
        return const _FileTypeStyle(label: 'TXT', color: Color(0xFF6B778C));
      default:
        final label = ext.isEmpty ? 'FILE' : ext.toUpperCase();
        return _FileTypeStyle(
          label: label.length > 4 ? label.substring(0, 4) : label,
          color: const Color(0xFF7A8599),
        );
    }
  }

  static String _fileExtension(MediaResource? file, String fallbackName) {
    final fromName = p.extension(file?.fileName ?? fallbackName).toLowerCase();
    if (fromName.isNotEmpty) return fromName.substring(1);

    switch (file?.mimeType?.trim().toLowerCase()) {
      case 'application/pdf':
        return 'pdf';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'doc';
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'text/csv':
        return 'xls';
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'ppt';
      case 'application/zip':
      case 'application/vnd.rar':
      case 'application/x-7z-compressed':
        return 'zip';
      case 'audio/mpeg':
        return 'mp3';
      case 'text/plain':
        return 'txt';
      default:
        return '';
    }
  }
}

class _FileIconWithUploadProgress extends StatelessWidget {
  final _FileTypeStyle fileType;
  final MessageUploadPresentation uploadPresentation;

  const _FileIconWithUploadProgress({
    required this.fileType,
    required this.uploadPresentation,
  });

  @override
  Widget build(BuildContext context) {
    final tone = uploadPresentation.failed ? Colors.redAccent : fileType.color;
    return SizedBox(
      key: const ValueKey('message-file-type-icon'),
      width: 54,
      height: 58,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _FileDocumentPainter(color: tone),
            ),
          ),
          Text(
            uploadPresentation.failed ? '!' : fileType.label,
            maxLines: 1,
            overflow: TextOverflow.clip,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              height: 1,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (uploadPresentation.active)
            SizedBox(
              key: const ValueKey('message-file-upload-progress'),
              width: 52,
              height: 52,
              child: CustomPaint(
                painter: _UploadRingPainter(
                  progress: uploadPresentation.progress,
                  color: Colors.white,
                  trackColor: Colors.white.withValues(alpha: 0.32),
                  strokeWidth: 2.6,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FileDocumentPainter extends CustomPainter {
  final Color color;

  const _FileDocumentPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final fold = size.width * 0.28;
    final body = Path()
      ..moveTo(4, 0)
      ..lineTo(size.width - fold, 0)
      ..lineTo(size.width, fold)
      ..lineTo(size.width, size.height - 4)
      ..quadraticBezierTo(size.width, size.height, size.width - 4, size.height)
      ..lineTo(4, size.height)
      ..quadraticBezierTo(0, size.height, 0, size.height - 4)
      ..lineTo(0, 4)
      ..quadraticBezierTo(0, 0, 4, 0)
      ..close();

    canvas.drawPath(body, Paint()..color = color);

    final foldPath = Path()
      ..moveTo(size.width - fold, 0)
      ..lineTo(size.width - fold, fold)
      ..lineTo(size.width, fold)
      ..close();
    canvas.drawPath(
      foldPath,
      Paint()..color = Colors.white.withValues(alpha: 0.34),
    );
  }

  @override
  bool shouldRepaint(covariant _FileDocumentPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _UploadRingPainter extends CustomPainter {
  final int progress;
  final Color color;
  final Color trackColor;
  final double strokeWidth;

  const _UploadRingPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final inset = strokeWidth / 2;
    final arcRect = rect.deflate(inset);
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    final meterPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(arcRect, -math.pi / 2, math.pi * 2, false, trackPaint);
    canvas.drawArc(
      arcRect,
      -math.pi / 2,
      math.pi * 2 * (progress.clamp(0, 100).toDouble() / 100),
      false,
      meterPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _UploadRingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.trackColor != trackColor ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

Future<void> _openMediaResource(
  BuildContext context,
  WidgetRef ref,
  Message message,
  MediaKind mediaKind,
  MediaVariant variant,
  MediaResource? resource, {
  required String fallbackName,
}) async {
  final media = resource;
  if (media == null) return;
  final rawUrl = media.url.trim();
  if (rawUrl.isEmpty) return;

  try {
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId == null || spaceId.isEmpty) {
      throw StateError('Current space is empty');
    }
    final path =
        await ref.read(mediaOpenControllerProvider(spaceId)).localPathFor(
              MediaOpenRequest.fromResource(
                message: message,
                mediaKind: mediaKind,
                variant: variant,
                resource: media,
                fallbackName: fallbackName,
              ),
            );
    final result = await OpenFilex.open(path, type: media.mimeType);
    if (result.type != ResultType.done && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(AppLocalizations.of(context).commonOperationFailed),
      ));
    }
  } catch (error) {
    debugPrint('[MessageBubble] open media failed: $error');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(AppLocalizations.of(context).commonOperationFailed),
      ));
    }
  }
}

bool _isLocalMediaPath(String url) {
  final uri = Uri.tryParse(url);
  if (uri != null && uri.scheme == 'file') return true;
  if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
    return false;
  }
  return !url.startsWith('/media') &&
      !url.startsWith('/api') &&
      !url.startsWith('/uploads') &&
      !url.startsWith('/files');
}

// ---------------------------------------------------------------------------
// Event Bubble
// ---------------------------------------------------------------------------

class _EventBubble extends StatelessWidget {
  final Message message;
  const _EventBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 4),
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(message.body.text ?? '',
            style: TextStyle(
                fontSize: 12,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.5))),
      ),
    );
  }
}

class _MentionAwareText extends StatelessWidget {
  final Message message;

  const _MentionAwareText({required this.message});

  @override
  Widget build(BuildContext context) {
    final text = message.body.text ?? '';
    final baseStyle = TextStyle(
      fontSize: 15,
      color: Theme.of(context).colorScheme.onSurface,
      height: 1.4,
    );
    final mentions = message.mentions
            ?.where(
              (mention) =>
                  mention.offset >= 0 &&
                  mention.length > 0 &&
                  mention.offset + mention.length <= text.length,
            )
            .toList(growable: false) ??
        const <Mention>[];
    if (mentions.isEmpty) return Text(text, style: baseStyle);

    final sorted = [...mentions]..sort((a, b) => a.offset.compareTo(b.offset));
    final spans = <TextSpan>[];
    var cursor = 0;
    for (final mention in sorted) {
      if (mention.offset < cursor) continue;
      if (mention.offset > cursor) {
        spans.add(TextSpan(text: text.substring(cursor, mention.offset)));
      }
      spans.add(
        TextSpan(
          text: text.substring(mention.offset, mention.offset + mention.length),
          style: baseStyle.copyWith(
            color: const Color(0xFF2F6FED),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
      cursor = mention.offset + mention.length;
    }
    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor)));
    }

    return RichText(
      text: TextSpan(style: baseStyle, children: spans),
    );
  }
}

// ---------------------------------------------------------------------------
// Contact Card Bubble — 对照 API ContactCardDto
// ---------------------------------------------------------------------------

class _ContactCardBubble extends StatelessWidget {
  final ContactCardDto? card;
  const _ContactCardBubble({required this.card});

  @override
  Widget build(BuildContext context) {
    final name = card?.displayName ??
        AppLocalizations.of(context).chatContactDefaultName;
    final avatarUrl = card?.avatarUrl;
    final userId = card?.userId ?? '';

    return GestureDetector(
      onTap: userId.isNotEmpty ? () => context.push('/profile/$userId') : null,
      child: Container(
        width: 200,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Theme.of(context).colorScheme.outline),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: avatarUrl != null && avatarUrl.isNotEmpty
                        ? AuthNetworkImage(
                            url: avatarUrl,
                            width: 36,
                            height: 36,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                _avatarFallback(name, 36),
                          )
                        : _avatarFallback(name, 36),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      name,
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Theme.of(context).colorScheme.onSurface),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(Icons.chevron_right,
                      size: 16,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5)),
                ],
              ),
            ),
            Divider(height: 1, color: Color(0xFFE5E6EB)),
            Padding(
              padding: EdgeInsets.fromLTRB(10, 4, 10, 6),
              child: Text(AppLocalizations.of(context).chatContactCardTitle,
                  style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatarFallback(String name, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xFF4A90E2),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Center(
          child: Text(
            name.isNotEmpty ? name[0] : '?',
            style: TextStyle(color: Colors.white, fontSize: size * 0.4),
          ),
        ),
      );
}

// ---------------------------------------------------------------------------
// Call Log Bubble — 对照 API CallLogDto
// ---------------------------------------------------------------------------

class _CallLogBubble extends StatelessWidget {
  final CallLogDto? log;
  final Color bg;
  final BorderRadius br;
  final VoidCallback? onTap;
  const _CallLogBubble({
    required this.log,
    required this.bg,
    required this.br,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isVideo = CallDisplay.isVideoMediaMode(log?.mediaMode ?? 'audio');
    final endReason = CallDisplay.normalizeReason(log?.endReason);
    final duration = log?.durationSeconds ?? 0;
    final isCaller = log?.isCaller ?? false;
    final display = CallDisplay.ended(
      isVideo: isVideo,
      isCaller: isCaller,
      durationSeconds: duration,
      endReason: endReason,
    );

    IconData icon;
    Color iconColor;

    switch (endReason) {
      case 'missed':
      case 'timeout':
        icon = Icons.phone_missed;
        iconColor = Colors.red;
      case 'cancelled':
        icon = Icons.phone_disabled;
        iconColor = Theme.of(context).colorScheme.onSurface.withOpacity(0.5);
      case 'rejected':
        icon = Icons.phone_disabled;
        iconColor = Theme.of(context).colorScheme.onSurface.withOpacity(0.5);
      case 'connection_lost':
        icon = Icons.signal_wifi_connected_no_internet_4;
        iconColor = Colors.orange;
      case 'admin_force_end':
        icon = Icons.phone_disabled;
        iconColor = Theme.of(context).colorScheme.onSurface.withOpacity(0.5);
      case 'failed':
      case 'busy':
      case 'node_offline':
        icon = Icons.phone_disabled;
        iconColor = Colors.red;
      default:
        icon = isVideo ? Icons.videocam : Icons.phone;
        iconColor = _C.green;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: br,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 180),
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(color: bg, borderRadius: br),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: iconColor, size: 22),
                ),
                SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      CallDisplay.mediaTitle(isVideo: isVideo),
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                    const SizedBox(height: 2),
                    Text(
                        duration > 0
                            ? '${display.status} · ${display.detail}'
                            : display.status,
                        style: TextStyle(
                            fontSize: 12,
                            color:
                                endReason == 'missed' || endReason == 'timeout'
                                    ? Colors.red
                                    : _C.textSecondary)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Location Bubble — 对照 API LocationDto
// ---------------------------------------------------------------------------

class _LocationBubble extends StatelessWidget {
  final LocationDto? loc;
  final Color bg;
  final BorderRadius br;
  const _LocationBubble(
      {required this.loc, required this.bg, required this.br});

  @override
  Widget build(BuildContext context) {
    final title =
        loc?.title ?? AppLocalizations.of(context).chatLocationDefaultTitle;
    final address = loc?.address ?? '';
    final point = loc == null ? null : LatLng(loc!.latitude, loc!.longitude);

    return InkWell(
      borderRadius: br,
      onTap: loc == null ? null : () => _openSystemMap(context, loc!, title),
      child: Container(
        width: 240,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: br,
          boxShadow: const [
            BoxShadow(
              color: Color(0x14000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: _C.green.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.location_on,
                      color: _C.green,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.onSurface),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(
                          address.isNotEmpty
                              ? address
                              : point == null
                                  ? ''
                                  : '${point.latitude.toStringAsFixed(6)}, ${point.longitude.toStringAsFixed(6)}',
                          style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.55)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 96,
              width: double.infinity,
              child: point == null
                  ? Container(
                      color: const Color(0xFFEAF3EF),
                      child: const Center(
                        child: Icon(
                          Icons.map_outlined,
                          size: 30,
                          color: _C.green,
                        ),
                      ),
                    )
                  : Stack(
                      alignment: Alignment.center,
                      children: [
                        IgnorePointer(
                          child: FlutterMap(
                            options: MapOptions(
                              initialCenter: point,
                              initialZoom: (loc?.zoomLevel ?? 16).toDouble(),
                              interactionOptions: const InteractionOptions(
                                flags: InteractiveFlag.none,
                              ),
                            ),
                            children: [
                              TileLayer(
                                urlTemplate:
                                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.lpp.mobile',
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.location_pin,
                          size: 34,
                          color: Color(0xFFE53935),
                          shadows: [
                            Shadow(
                              color: Color(0x66000000),
                              blurRadius: 6,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        Positioned(
                          right: 8,
                          bottom: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.92),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              '地图',
                              style: TextStyle(
                                fontSize: 10,
                                color: Color(0xFF4E5969),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
            Container(
              height: 28,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              alignment: Alignment.centerLeft,
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest
                    .withOpacity(0.5),
              ),
              child: Row(
                children: [
                  const Icon(Icons.near_me, size: 13, color: _C.green),
                  const SizedBox(width: 4),
                  Text(
                    AppLocalizations.of(context).chatLocationMessage,
                    style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.55),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openSystemMap(
    BuildContext context,
    LocationDto location,
    String title,
  ) async {
    final encodedTitle = Uri.encodeComponent(title);
    final lat = location.latitude;
    final lng = location.longitude;
    final candidates = PlatformCapabilities.isIOS
        ? <Uri>[
            Uri.parse('https://maps.apple.com/?ll=$lat,$lng&q=$encodedTitle'),
            Uri.parse(
                'https://www.google.com/maps/search/?api=1&query=$lat,$lng'),
          ]
        : <Uri>[
            Uri.parse('geo:$lat,$lng?q=$lat,$lng($encodedTitle)'),
            Uri.parse(
                'https://www.google.com/maps/search/?api=1&query=$lat,$lng'),
          ];

    for (final uri in candidates) {
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        return;
      }
    }

    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(AppLocalizations.of(context).commonOperationFailed),
    ));
  }
}
