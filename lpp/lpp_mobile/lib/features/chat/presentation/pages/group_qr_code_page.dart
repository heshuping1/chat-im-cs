import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/group_conversation_avatar.dart';
import 'package:qr_flutter/qr_flutter.dart';

const _bg = Color(0xFFF2F2F7);
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);

class GroupQrCodePage extends ConsumerWidget {
  final String groupId;

  const GroupQrCodePage({super.key, required this.groupId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(groupDetailProvider(groupId));

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '群二维码',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: _text,
          ),
        ),
        centerTitle: true,
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _ErrorState(
          onRetry: () => ref.invalidate(groupDetailProvider(groupId)),
        ),
        data: (detail) => _GroupQrContent(groupId: groupId, detail: detail),
      ),
    );
  }
}

class _GroupQrContent extends StatelessWidget {
  final String groupId;
  final GroupDetail detail;

  const _GroupQrContent({required this.groupId, required this.detail});

  @override
  Widget build(BuildContext context) {
    final payload = _buildGroupQrPayload(detail);
    final disabled = !detail.allowQrCodeJoin;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 26, 24, 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          GroupConversationAvatar(
                            groupId: groupId,
                            size: 52,
                            borderRadius: 10,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  detail.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w600,
                                    color: _text,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  '${detail.memberCount}人',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: _secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(
                                color: const Color(0xFFE5E7EB),
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Opacity(
                              opacity: disabled ? 0.24 : 1,
                              child: QrImageView(
                                data: payload,
                                version: QrVersions.auto,
                                size: 236,
                                backgroundColor: Colors.white,
                                eyeStyle: const QrEyeStyle(
                                  eyeShape: QrEyeShape.square,
                                  color: _text,
                                ),
                                dataModuleStyle: const QrDataModuleStyle(
                                  dataModuleShape: QrDataModuleShape.square,
                                  color: _text,
                                ),
                              ),
                            ),
                          ),
                          if (disabled)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.72),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: const Text(
                                '二维码进群已关闭',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Text(
                        disabled
                            ? '群主或管理员已关闭二维码进群'
                            : detail.requireApproval
                                ? '扫一扫上面的二维码，提交入群申请'
                                : '扫一扫上面的二维码，加入群聊',
                        style: const TextStyle(
                          fontSize: 13,
                          color: _secondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE5E5EA))),
          ),
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          child: Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => context.push('/scan'),
                  child: const Text(
                    '扫一扫',
                    style: TextStyle(fontSize: 15, color: _primary),
                  ),
                ),
              ),
              Container(width: 1, height: 16, color: const Color(0xFFE5E5EA)),
              Expanded(
                child: TextButton(
                  onPressed: () => _copyPayload(context, payload),
                  child: const Text(
                    '复制内容',
                    style: TextStyle(fontSize: 15, color: _primary),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static String _buildGroupQrPayload(GroupDetail detail) {
    return Uri(
      scheme: 'ztchat',
      host: 'group-invite',
      queryParameters: {
        'groupId': detail.groupId,
        'title': detail.title,
        if (detail.avatarUrl?.isNotEmpty == true)
          'avatarUrl': detail.avatarUrl!,
        'memberCount': detail.memberCount.toString(),
        'allowQrCodeJoin': detail.allowQrCodeJoin.toString(),
        'requireApproval': detail.requireApproval.toString(),
      },
    ).toString();
  }

  static Future<void> _copyPayload(BuildContext context, String payload) async {
    await Clipboard.setData(ClipboardData(text: payload));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已复制二维码内容')),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            '群二维码加载失败',
            style: TextStyle(fontSize: 15, color: _secondary),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onRetry,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }
}
