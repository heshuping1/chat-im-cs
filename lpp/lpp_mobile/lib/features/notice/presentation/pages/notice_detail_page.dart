import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/notice/domain/entities/notice.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final noticeDetailProvider =
    FutureProvider.family<Notice, String>((ref, noticeId) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/api/client/v1/announcements/$noticeId');
  return Notice.fromJson(resp.data['data'] as Map<String, dynamic>);
});

// ---------------------------------------------------------------------------
// NoticeDetailPage
// ---------------------------------------------------------------------------

class NoticeDetailPage extends ConsumerWidget {
  final String noticeId;
  final Notice? preloadedNotice;

  const NoticeDetailPage({
    super.key,
    required this.noticeId,
    this.preloadedNotice,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (preloadedNotice != null) {
      return _buildScaffold(context, ref, preloadedNotice!);
    }

    final noticeAsync = ref.watch(noticeDetailProvider(noticeId));
    return noticeAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, size: 20),
            onPressed: () => context.pop(),
          ),
          title: const Text('公告详情'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, size: 20),
            onPressed: () => context.pop(),
          ),
          title: const Text('公告详情'),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('加载失败'),
              TextButton(
                onPressed: () => ref.invalidate(noticeDetailProvider(noticeId)),
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),
      data: (notice) => _buildScaffold(context, ref, notice),
    );
  }

  Widget _buildScaffold(BuildContext context, WidgetRef ref, Notice notice) {
    final tzOffset = ref.watch(timezoneOffsetProvider);
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '公告详情',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1D2129),
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Priority badge
            if (notice.isImportant)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF3B30).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  '重要公告',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFFFF3B30),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            // Title
            Text(
              notice.title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1D2129),
                height: 1.3,
              ),
            ),
            const SizedBox(height: 12),
            // Meta info
            Row(
              children: [
                const Icon(Icons.access_time,
                    size: 14, color: Color(0xFFAEAEB2)),
                const SizedBox(width: 4),
                Text(
                  formatChineseFullMinuteWithTimezone(
                    notice.publishedAt,
                    tzOffset,
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFFAEAEB2),
                  ),
                ),
                if (notice.isPinned) ...[
                  const SizedBox(width: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00B27A).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      '置顶',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF00B27A),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFF2F2F7)),
            const SizedBox(height: 16),
            // Cover image
            if (notice.coverImage != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AuthNetworkImage(
                  url: notice.coverImage!,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 180,
                    color: Theme.of(context).colorScheme.outline,
                    child: const Icon(Icons.image_not_supported,
                        color: Colors.grey, size: 40),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            // Content
            _NoticeContent(content: notice.content),
            const SizedBox(height: 32),
            // Footer
            Center(
              child: Text(
                '本服务由绿泡泡提供安全加密技术支持',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[400],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Content renderer
// ---------------------------------------------------------------------------

class _NoticeContent extends StatelessWidget {
  final String content;

  const _NoticeContent({required this.content});

  @override
  Widget build(BuildContext context) {
    final lines = content.split('\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        if (line.startsWith('**') && line.endsWith('**')) {
          return Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 6),
            child: Text(
              line.replaceAll('**', ''),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1D2129),
              ),
            ),
          );
        }
        if (line.startsWith('•') || line.startsWith('-')) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 6, left: 8),
            child: Text(
              line,
              style: const TextStyle(
                fontSize: 15,
                color: Color(0xFF4E5969),
                height: 1.6,
              ),
            ),
          );
        }
        if (line.trim().isEmpty) {
          return const SizedBox(height: 8);
        }
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            line,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF4E5969),
              height: 1.7,
            ),
          ),
        );
      }).toList(),
    );
  }
}
