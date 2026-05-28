import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _primary = Color(0xFF00B27A);
const _text = Color(0xFF2C2C2C);
const _secondary = Color(0xFF8E8E93);

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
class SearchResult {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? lppId;
  final String? signature;
  final int userType;
  final String? matchType;

  const SearchResult({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.lppId,
    this.signature,
    this.userType = 0,
    this.matchType,
  });

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      userId: json['userId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      lppId: json['lppId'] as String?,
      signature: json['signature'] as String?,
      userType: json['userType'] as int? ?? 0,
      matchType: json['matchType'] as String?,
    );
  }
}

class MessageSearchResult {
  final String messageId;
  final String conversationId;
  final int conversationSeq;
  final String senderUserId;
  final String messageType;
  final String? text;
  final DateTime sentAt;

  const MessageSearchResult({
    required this.messageId,
    required this.conversationId,
    required this.conversationSeq,
    required this.senderUserId,
    required this.messageType,
    this.text,
    required this.sentAt,
  });

  factory MessageSearchResult.fromJson(Map<String, dynamic> json) {
    final body = json['body'] as Map<String, dynamic>?;
    return MessageSearchResult(
      messageId: json['messageId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      conversationSeq: json['conversationSeq'] as int? ?? 0,
      senderUserId: json['senderUserId'] as String? ?? '',
      messageType: json['messageType'] as String? ?? 'text',
      text: body?['text'] as String?,
      sentAt:
          DateTime.tryParse(json['sentAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
final _userSearchProvider =
    FutureProvider.family<List<SearchResult>, String>((ref, keyword) async {
  if (keyword.trim().isEmpty) return [];
  final dio = ref.watch(dioProvider);
  try {
    final resp = await dio.get(
      '/api/client/v1/search/users',
      queryParameters: {'keyword': keyword},
    );
    final list = resp.data['data'] as List<dynamic>;
    return list
        .map((e) => SearchResult.fromJson(e as Map<String, dynamic>))
        .toList();
  } catch (_) {
    return [];
  }
});

final _messageSearchProvider =
    FutureProvider.family<List<MessageSearchResult>, String>(
        (ref, keyword) async {
  if (keyword.trim().isEmpty) return [];
  final dio = ref.watch(dioProvider);
  try {
    final resp = await dio.get(
      '/api/client/v1/search/messages',
      queryParameters: {'keyword': keyword},
    );
    final list = resp.data['data'] as List<dynamic>;
    return list
        .map((e) => MessageSearchResult.fromJson(e as Map<String, dynamic>))
        .toList();
  } catch (_) {
    return [];
  }
});

// ---------------------------------------------------------------------------
// SearchPage
// ---------------------------------------------------------------------------
class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage>
    with SingleTickerProviderStateMixin {
  final _controller = TextEditingController();
  final _searchDebouncer = Debouncer();
  String _query = '';
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _controller.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Column(
        children: [
          _buildSearchHeader(context, l10n),
          if (_query.trim().isNotEmpty)
            Container(
              color: Theme.of(context).colorScheme.surface,
              child: TabBar(
                controller: _tabController,
                labelColor: _primary,
                unselectedLabelColor: _secondary,
                indicatorColor: _primary,
                indicatorWeight: 2,
                labelStyle:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                tabs: [
                  Tab(text: l10n.searchUsers),
                  Tab(text: l10n.searchMessages),
                ],
              ),
            ),
          Expanded(
            child: _query.trim().isEmpty
                ? _buildEmptyState(l10n.searchHint)
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _UserSearchTab(query: _query, l10n: l10n),
                      _MessageSearchTab(query: _query, l10n: l10n),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchHeader(BuildContext context, AppLocalizations l10n) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 16, 8),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: _text, size: 22),
                onPressed: () => context.pop(),
              ),
              Expanded(
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 10),
                      Icon(Icons.search, size: 18, color: Colors.grey.shade400),
                      const SizedBox(width: 6),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          autofocus: true,
                          onChanged: _onSearchChanged,
                          style: const TextStyle(fontSize: 15, color: _text),
                          decoration: InputDecoration(
                            hintText: l10n.searchTitle,
                            hintStyle: TextStyle(
                                color: Colors.grey.shade400, fontSize: 15),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      if (_query.isNotEmpty)
                        GestureDetector(
                          onTap: () {
                            _searchDebouncer.cancel();
                            _controller.clear();
                            setState(() => _query = '');
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: Icon(Icons.cancel,
                                size: 16, color: Colors.grey.shade500),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search, size: 48, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text(message,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade400)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// User Search Tab
// ---------------------------------------------------------------------------
class _UserSearchTab extends ConsumerWidget {
  final String query;
  final AppLocalizations l10n;

  const _UserSearchTab({required this.query, required this.l10n});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(_userSearchProvider(query));

    return resultsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child:
            Text(l10n.searchFailed, style: const TextStyle(color: _secondary)),
      ),
      data: (results) {
        if (results.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.person_search,
                    size: 48, color: Colors.grey.shade300),
                const SizedBox(height: 12),
                Text(l10n.searchNoResults,
                    style:
                        TextStyle(fontSize: 14, color: Colors.grey.shade400)),
              ],
            ),
          );
        }
        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, i) {
            final result = results[i];
            String? matchLabel;
            switch (result.matchType) {
              case 'mobile':
                matchLabel = l10n.friendMatchTypeMobile;
              case 'email':
                matchLabel = l10n.friendMatchTypeEmail;
              case 'lppId':
                matchLabel = l10n.friendMatchTypeLppId;
            }
            return Column(
              children: [
                InkWell(
                  onTap: () => context.push('/profile/${result.userId}'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        UserAvatar(
                          avatarUrl: result.avatarUrl,
                          name: result.displayName,
                          size: 48,
                          borderRadius: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _HighlightText(
                                  text: result.displayName, query: query),
                              if (result.lppId != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                    '${l10n.profilePageLppId}: ${result.lppId}',
                                    style: const TextStyle(
                                        fontSize: 12, color: _secondary)),
                              ],
                              if (result.signature?.isNotEmpty == true) ...[
                                const SizedBox(height: 2),
                                Text(result.signature!,
                                    style: const TextStyle(
                                        fontSize: 12, color: _secondary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis),
                              ],
                              if (matchLabel != null) ...[
                                const SizedBox(height: 2),
                                Text(matchLabel,
                                    style: const TextStyle(
                                        fontSize: 11, color: _primary)),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (i < results.length - 1)
                  Container(
                      height: 1,
                      margin: const EdgeInsets.only(left: 76),
                      color: Colors.grey.shade100),
              ],
            );
          },
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Message Search Tab
// ---------------------------------------------------------------------------
class _MessageSearchTab extends ConsumerWidget {
  final String query;
  final AppLocalizations l10n;

  const _MessageSearchTab({required this.query, required this.l10n});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(_messageSearchProvider(query));
    final myUserId = ref.watch(currentSpaceProvider)?.userId ?? '';

    return resultsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child:
            Text(l10n.searchFailed, style: const TextStyle(color: _secondary)),
      ),
      data: (results) {
        if (results.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.chat_bubble_outline,
                    size: 48, color: Colors.grey.shade300),
                const SizedBox(height: 12),
                Text(l10n.searchNoResults,
                    style:
                        TextStyle(fontSize: 14, color: Colors.grey.shade400)),
              ],
            ),
          );
        }
        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, i) {
            final msg = results[i];
            final isSelf = msg.senderUserId == myUserId;
            final timeStr = _formatTime(msg.sentAt);

            return Column(
              children: [
                InkWell(
                  onTap: () {
                    // 跳转到对应会话，并定位到该消息
                    context.push(
                      '/chat/${msg.conversationId}',
                      extra: {
                        'isGroup': false,
                        'title': '',
                        'scrollToMessageId': msg.messageId,
                        if (msg.conversationSeq > 0)
                          'beforeSeq': msg.conversationSeq + 1,
                      },
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 消息方向图标
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isSelf
                                ? const Color(0xFFDCF8C6)
                                : Colors.grey.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isSelf ? Icons.arrow_upward : Icons.arrow_downward,
                            size: 18,
                            color: isSelf ? _primary : _secondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    isSelf ? '我' : '对方',
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: _text),
                                  ),
                                  const Spacer(),
                                  Text(timeStr,
                                      style: const TextStyle(
                                          fontSize: 11, color: _secondary)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              _HighlightText(
                                text: msg.text ??
                                    _messageTypeLabel(msg.messageType),
                                query: query,
                                style: const TextStyle(
                                    fontSize: 14, color: _secondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (i < results.length - 1)
                  Container(
                      height: 1,
                      margin: const EdgeInsets.only(left: 64),
                      color: Colors.grey.shade100),
              ],
            );
          },
        );
      },
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt).inDays;
    if (diff == 0) return DateFormat('HH:mm').format(dt);
    if (diff == 1) return '昨天';
    if (diff < 7) return DateFormat('E', 'zh_CN').format(dt);
    return DateFormat('MM/dd').format(dt);
  }

  String _messageTypeLabel(String type) {
    switch (type) {
      case 'image':
        return '[图片]';
      case 'video':
        return '[视频]';
      case 'voice':
        return '[语音]';
      case 'file':
        return '[文件]';
      default:
        return '[消息]';
    }
  }
}

// ---------------------------------------------------------------------------
// Highlight Text
// ---------------------------------------------------------------------------
class _HighlightText extends StatelessWidget {
  final String text;
  final String query;
  final TextStyle? style;

  const _HighlightText({required this.text, required this.query, this.style});

  @override
  Widget build(BuildContext context) {
    final baseStyle = style ?? const TextStyle(fontSize: 15, color: _text);
    if (query.isEmpty) return Text(text, style: baseStyle);

    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();
    final spans = <TextSpan>[];
    int start = 0;

    while (true) {
      final idx = lowerText.indexOf(lowerQuery, start);
      if (idx == -1) {
        spans.add(TextSpan(text: text.substring(start)));
        break;
      }
      if (idx > start) spans.add(TextSpan(text: text.substring(start, idx)));
      spans.add(TextSpan(
        text: text.substring(idx, idx + query.length),
        style: const TextStyle(color: _primary, fontWeight: FontWeight.w600),
      ));
      start = idx + query.length;
    }

    return RichText(
      text: TextSpan(style: baseStyle, children: spans),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }
}
