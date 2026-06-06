import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_network_image.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';
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
  final MessageBody body;
  final DateTime sentAt;

  const MessageSearchResult({
    required this.messageId,
    required this.conversationId,
    required this.conversationSeq,
    required this.senderUserId,
    required this.messageType,
    required this.body,
    required this.sentAt,
  });

  factory MessageSearchResult.fromJson(Map<String, dynamic> json) {
    final rawBody = json['body'];
    final body = rawBody is Map
        ? MessageBody.fromJson(Map<String, dynamic>.from(rawBody))
        : const MessageBody();
    return MessageSearchResult(
      messageId: json['messageId'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      conversationSeq: json['conversationSeq'] as int? ?? 0,
      senderUserId: json['senderUserId'] as String? ?? '',
      messageType: json['messageType'] as String? ?? 'text',
      body: body,
      sentAt:
          DateTime.tryParse(json['sentAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  String get searchableText => body.text ?? '';
}

enum _MessageSearchFilter { all, media, file, link }

class _MessageSearchQuery {
  final String keyword;
  final String? conversationId;
  final _MessageSearchFilter filter;
  final DateTime? date;

  const _MessageSearchQuery({
    required this.keyword,
    this.conversationId,
    this.filter = _MessageSearchFilter.all,
    this.date,
  });

  bool get isEmpty =>
      keyword.trim().isEmpty &&
      conversationId == null &&
      filter == _MessageSearchFilter.all &&
      date == null;

  @override
  bool operator ==(Object other) {
    return other is _MessageSearchQuery &&
        other.keyword == keyword &&
        other.conversationId == conversationId &&
        other.filter == filter &&
        other.date == date;
  }

  @override
  int get hashCode => Object.hash(keyword, conversationId, filter, date);
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
    FutureProvider.family<List<MessageSearchResult>, _MessageSearchQuery>(
        (ref, query) async {
  if (query.isEmpty) return [];
  final dio = ref.watch(dioProvider);
  final tzOffset = ref.watch(timezoneOffsetProvider);
  try {
    final params = <String, dynamic>{};
    if (query.keyword.trim().isNotEmpty) {
      params['keyword'] = query.keyword.trim();
    }
    final conversationId = query.conversationId;
    if (conversationId != null && conversationId.isNotEmpty) {
      params['conversationId'] = conversationId;
    }
    final resp = await dio.get(
      '/api/client/v1/search/messages',
      queryParameters: params,
    );
    final list = resp.data['data'] as List<dynamic>;
    final results = list
        .map((e) => MessageSearchResult.fromJson(e as Map<String, dynamic>))
        .toList();
    return results
        .where((item) => _matchesSearchFilter(item, query, tzOffset))
        .toList();
  } catch (_) {
    return [];
  }
});

bool _matchesSearchFilter(
  MessageSearchResult item,
  _MessageSearchQuery query,
  double tzOffset,
) {
  final date = query.date;
  if (date != null &&
      !const UserTimezoneFormatter().isOnCalendarDate(
        item.sentAt,
        date,
        offsetHours: tzOffset,
      )) {
    return false;
  }
  switch (query.filter) {
    case _MessageSearchFilter.all:
      return true;
    case _MessageSearchFilter.media:
      return item.messageType == 'image' || item.messageType == 'video';
    case _MessageSearchFilter.file:
      return item.messageType == 'file';
    case _MessageSearchFilter.link:
      final text = item.searchableText;
      return text.contains('http://') || text.contains('https://');
  }
}

// ---------------------------------------------------------------------------
// SearchPage
// ---------------------------------------------------------------------------
class SearchPage extends ConsumerStatefulWidget {
  final String? conversationId;
  final bool isGroup;
  final String? conversationTitle;

  const SearchPage({
    super.key,
    this.conversationId,
    this.isGroup = false,
    this.conversationTitle,
  });

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage>
    with SingleTickerProviderStateMixin {
  final _controller = TextEditingController();
  final _searchDebouncer = Debouncer();
  String _query = '';
  _MessageSearchFilter _activeFilter = _MessageSearchFilter.all;
  DateTime? _activeDate;
  late TabController _tabController;

  bool get _isConversationSearch =>
      widget.conversationId?.trim().isNotEmpty == true;

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
          if (!_isConversationSearch && _query.trim().isNotEmpty)
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
            child: _isConversationSearch
                ? _buildConversationSearchBody(l10n)
                : _query.trim().isEmpty
                    ? _buildEmptyState(l10n.searchHint)
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _UserSearchTab(query: _query, l10n: l10n),
                          _MessageSearchTab(
                            searchQuery: _MessageSearchQuery(keyword: _query),
                            l10n: l10n,
                            isGroup: false,
                          ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationSearchBody(AppLocalizations l10n) {
    if (_query.trim().isEmpty &&
        _activeFilter == _MessageSearchFilter.all &&
        _activeDate == null) {
      return _ConversationSearchShortcuts(
        onDate: _pickConversationSearchDate,
        onMedia: () => _activateShortcut(_MessageSearchFilter.media),
        onFile: () => _activateShortcut(_MessageSearchFilter.file),
        onLink: () => _activateShortcut(_MessageSearchFilter.link),
      );
    }
    return _MessageSearchTab(
      searchQuery: _MessageSearchQuery(
        keyword: _query,
        conversationId: widget.conversationId,
        filter: _activeFilter,
        date: _activeDate,
      ),
      l10n: l10n,
      isGroup: widget.isGroup,
    );
  }

  void _activateShortcut(_MessageSearchFilter filter) {
    _searchDebouncer.cancel();
    _controller.clear();
    setState(() {
      _query = '';
      _activeFilter = filter;
      _activeDate = null;
    });
  }

  Future<void> _pickConversationSearchDate() async {
    final now = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 10),
      lastDate: now,
    );
    if (selected == null || !mounted) return;
    _searchDebouncer.cancel();
    _controller.clear();
    setState(() {
      _query = '';
      _activeFilter = _MessageSearchFilter.all;
      _activeDate = selected;
    });
  }

  Widget _buildSearchHeader(BuildContext context, AppLocalizations l10n) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            _isConversationSearch ? 16 : 4,
            4,
            16,
            8,
          ),
          child: Row(
            children: [
              if (!_isConversationSearch)
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
                            hintText: _isConversationSearch
                                ? '搜索聊天内容'
                                : l10n.searchTitle,
                            hintStyle: TextStyle(
                                color: Colors.grey.shade400, fontSize: 15),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      if (_query.isNotEmpty ||
                          _activeFilter != _MessageSearchFilter.all ||
                          _activeDate != null)
                        GestureDetector(
                          onTap: () {
                            _searchDebouncer.cancel();
                            _controller.clear();
                            setState(() {
                              _query = '';
                              _activeFilter = _MessageSearchFilter.all;
                              _activeDate = null;
                            });
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
              if (_isConversationSearch) ...[
                const SizedBox(width: 12),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => context.pop(),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      '取消',
                      style: TextStyle(fontSize: 16, color: _text),
                    ),
                  ),
                ),
              ],
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

class _ConversationSearchShortcuts extends StatelessWidget {
  final VoidCallback onDate;
  final VoidCallback onMedia;
  final VoidCallback onFile;
  final VoidCallback onLink;

  const _ConversationSearchShortcuts({
    required this.onDate,
    required this.onMedia,
    required this.onFile,
    required this.onLink,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      _ConversationSearchShortcut(
        icon: Icons.calendar_today_outlined,
        label: '日期',
        onTap: onDate,
      ),
      _ConversationSearchShortcut(
        icon: Icons.photo_library_outlined,
        label: '图片及视频',
        onTap: onMedia,
      ),
      _ConversationSearchShortcut(
        icon: Icons.insert_drive_file_outlined,
        label: '文件',
        onTap: onFile,
      ),
      _ConversationSearchShortcut(
        icon: Icons.link_outlined,
        label: '链接',
        onTap: onLink,
      ),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 24),
      children: [
        const Text(
          '搜索指定内容',
          style: TextStyle(
            fontSize: 14,
            color: _secondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                items[i],
                if (i < items.length - 1)
                  Divider(
                    height: 1,
                    indent: 56,
                    color: Colors.grey.shade100,
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ConversationSearchShortcut extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ConversationSearchShortcut({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          children: [
            Icon(icon, size: 22, color: _primary),
            const SizedBox(width: 18),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 16, color: _text),
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade300),
          ],
        ),
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
  final _MessageSearchQuery searchQuery;
  final AppLocalizations l10n;
  final bool isGroup;

  const _MessageSearchTab({
    required this.searchQuery,
    required this.l10n,
    required this.isGroup,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(_messageSearchProvider(searchQuery));
    final myUserId = ref.watch(currentSpaceProvider)?.userId ?? '';
    final tzOffset = ref.watch(timezoneOffsetProvider);

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
        final groups = _groupMessagesByDate(results, tzOffset);
        if (searchQuery.filter == _MessageSearchFilter.media &&
            searchQuery.keyword.trim().isEmpty) {
          return _MessageMediaGrid(
            groups: groups,
            onOpen: _openMessage,
          );
        }
        return ListView(
          children: [
            for (final group in groups) ...[
              _SearchDateHeader(label: group.label),
              for (var i = 0; i < group.items.length; i++) ...[
                _MessageSearchResultTile(
                  message: group.items[i],
                  query: searchQuery.keyword,
                  isSelf: group.items[i].senderUserId == myUserId,
                  timeText: _formatTime(group.items[i].sentAt, tzOffset),
                  onTap: () => _openMessage(context, group.items[i]),
                ),
                if (i < group.items.length - 1)
                  Container(
                    height: 1,
                    margin: const EdgeInsets.only(left: 64),
                    color: Colors.grey.shade100,
                  ),
              ],
            ],
          ],
        );
      },
    );
  }

  void _openMessage(BuildContext context, MessageSearchResult msg) {
    context.push(
      '/chat/${msg.conversationId}',
      extra: {
        'isGroup': isGroup,
        'title': '',
        'scrollToMessageId': msg.messageId,
        if (msg.conversationSeq > 0) 'beforeSeq': msg.conversationSeq + 1,
      },
    );
  }

  String _formatTime(DateTime dt, double tzOffset) {
    return const UserTimezoneFormatter().clock(
      dt,
      offsetHours: tzOffset,
    );
  }
}

class _MessageDateGroup {
  final String label;
  final List<MessageSearchResult> items;

  const _MessageDateGroup({required this.label, required this.items});
}

List<_MessageDateGroup> _groupMessagesByDate(
  List<MessageSearchResult> messages,
  double tzOffset,
) {
  final groups = <_MessageDateGroup>[];
  for (final message in messages) {
    final label = _dateGroupLabel(message.sentAt, tzOffset);
    final last = groups.isNotEmpty ? groups.last : null;
    if (last != null && last.label == label) {
      last.items.add(message);
    } else {
      groups.add(_MessageDateGroup(label: label, items: [message]));
    }
  }
  return groups;
}

String _dateGroupLabel(DateTime time, double tzOffset) {
  const formatter = UserTimezoneFormatter();
  final local = formatter.convert(time, offsetHours: tzOffset);
  final now = formatter.convert(DateTime.now(), offsetHours: tzOffset);
  final todayStart = DateTime(now.year, now.month, now.day);
  final yesterdayStart = todayStart.subtract(const Duration(days: 1));
  final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));
  if (!local.isBefore(todayStart)) return '今天';
  if (!local.isBefore(yesterdayStart)) return '昨天';
  if (!local.isBefore(weekStart)) return '本周';
  return '${local.year}年${local.month}月${local.day}日';
}

class _SearchDateHeader extends StatelessWidget {
  final String label;

  const _SearchDateHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 13,
          color: _secondary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _MessageSearchResultTile extends StatelessWidget {
  final MessageSearchResult message;
  final String query;
  final bool isSelf;
  final String timeText;
  final VoidCallback onTap;

  const _MessageSearchResultTile({
    required this.message,
    required this.query,
    required this.isSelf,
    required this.timeText,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final preview = _messagePreview(message);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _MessageDirectionIcon(isSelf: isSelf),
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
                          color: _text,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        timeText,
                        style: const TextStyle(fontSize: 11, color: _secondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  _HighlightText(
                    text: preview.title,
                    query: query,
                    style: const TextStyle(fontSize: 14, color: _text),
                    maxLines: 2,
                  ),
                  if (preview.subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      preview.subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: _secondary),
                    ),
                  ],
                ],
              ),
            ),
            if (preview.media != null) ...[
              const SizedBox(width: 12),
              _SearchMediaThumb(
                key: ValueKey('message-search-media-${message.messageId}'),
                message: message,
                source: preview.media!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MessageDirectionIcon extends StatelessWidget {
  final bool isSelf;

  const _MessageDirectionIcon({required this.isSelf});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: isSelf ? const Color(0xFFDCF8C6) : Colors.grey.shade100,
        shape: BoxShape.circle,
      ),
      child: Icon(
        isSelf ? Icons.arrow_upward : Icons.arrow_downward,
        size: 18,
        color: isSelf ? _primary : _secondary,
      ),
    );
  }
}

class _MessagePreview {
  final String title;
  final String? subtitle;
  final _SearchMediaSource? media;

  const _MessagePreview({
    required this.title,
    this.subtitle,
    this.media,
  });
}

class _SearchMediaSource {
  final String url;
  final bool isVideo;
  final int? durationSeconds;

  const _SearchMediaSource({
    required this.url,
    required this.isVideo,
    this.durationSeconds,
  });
}

_MessagePreview _messagePreview(MessageSearchResult message) {
  final body = message.body;
  final text = body.text?.trim();
  switch (message.messageType) {
    case 'image':
      final media = body.image;
      return _MessagePreview(
        title: _nonEmpty(media?.fileName) ?? text ?? '图片消息',
        subtitle: _mediaSizeText(media?.sizeBytes),
        media: _imageSearchMedia(media, message.messageType),
      );
    case 'video':
      final media = body.video;
      final duration = media?.durationSeconds;
      final durationText = duration != null ? _formatDuration(duration) : null;
      return _MessagePreview(
        title: _nonEmpty(media?.fileName) ?? text ?? '视频消息',
        subtitle: durationText,
        media: _videoSearchMedia(media, message.messageType),
      );
    case 'file':
      final file = body.file;
      return _MessagePreview(
        title: _nonEmpty(file?.fileName) ?? '文件',
        subtitle: _fileSubtitle(file),
      );
    case 'voice':
      final duration = body.voice?.durationSeconds;
      return _MessagePreview(
        title: duration != null ? '语音 ${_formatDuration(duration)}' : '语音消息',
      );
    case 'location':
      return _MessagePreview(
        title: _nonEmpty(body.location?.title) ??
            _nonEmpty(body.location?.address) ??
            '位置消息',
        subtitle: _nonEmpty(body.location?.address),
      );
    case 'contact_card':
    case 'contactCard':
      return _MessagePreview(
        title: _nonEmpty(body.contactCard?.displayName) ?? '名片',
        subtitle: _nonEmpty(body.contactCard?.mobile) ??
            _nonEmpty(body.contactCard?.email),
      );
    case 'call_log':
    case 'callLog':
      final log = body.callLog;
      return _MessagePreview(
        title: log?.mediaMode == 'audioVideo' ? '视频通话' : '语音通话',
        subtitle: log != null && log.durationSeconds > 0
            ? _formatDuration(log.durationSeconds)
            : null,
      );
    case 'event':
      return _MessagePreview(title: text ?? body.event ?? '系统消息');
    case 'markdown':
    case 'text':
    default:
      return _MessagePreview(title: text ?? '文本消息');
  }
}

_SearchMediaSource? _imageSearchMedia(MediaResource? media, String type) {
  final url = _nonEmpty(media?.thumbnailUrl) ?? _nonEmpty(media?.url);
  if (url == null) return null;
  return _SearchMediaSource(url: url, isVideo: false);
}

_SearchMediaSource? _videoSearchMedia(MediaResource? media, String type) {
  final url = _nonEmpty(media?.thumbnailUrl);
  if (url == null) return null;
  return _SearchMediaSource(
    url: url,
    isVideo: true,
    durationSeconds: media?.durationSeconds,
  );
}

String? _fileSubtitle(MediaResource? file) {
  final size = _mediaSizeText(file?.sizeBytes);
  final mime = _nonEmpty(file?.mimeType);
  if (mime != null && size != null) return '$mime · $size';
  return size ?? mime;
}

String? _mediaSizeText(int? bytes) {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return '$bytes B';
  final kb = bytes / 1024;
  if (kb < 1024) return '${_trimNumber(kb)} KB';
  final mb = kb / 1024;
  return '${_trimNumber(mb)} MB';
}

String _trimNumber(double value) {
  final text = value.toStringAsFixed(value >= 10 ? 0 : 1);
  return text.endsWith('.0') ? text.substring(0, text.length - 2) : text;
}

String _formatDuration(int seconds) {
  final minutes = seconds ~/ 60;
  final rest = seconds % 60;
  return '${minutes.toString().padLeft(2, '0')}:${rest.toString().padLeft(2, '0')}';
}

String? _nonEmpty(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}

class _SearchMediaThumb extends StatelessWidget {
  final MessageSearchResult message;
  final _SearchMediaSource source;
  static const double _size = 58;

  const _SearchMediaThumb({
    super.key,
    required this.message,
    required this.source,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        width: _size,
        height: _size,
        child: Stack(
          fit: StackFit.expand,
          children: [
            AppNetworkImage(
              url: source.url,
              width: _size,
              height: _size,
              fit: BoxFit.cover,
              placeholderBuilder: _placeholder,
              errorBuilder: _placeholder,
            ),
            if (source.isVideo)
              Container(
                color: Colors.black.withValues(alpha: 0.10),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.play_circle_fill,
                  color: Colors.white,
                  size: 26,
                ),
              ),
            if (source.isVideo && source.durationSeconds != null)
              Positioned(
                right: 3,
                bottom: 3,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.62),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Text(
                    _formatDuration(source.durationSeconds!),
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(
        source.isVideo ? Icons.videocam_outlined : Icons.image_outlined,
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.35),
        size: 24,
      ),
    );
  }
}

class _MessageMediaGrid extends StatelessWidget {
  final List<_MessageDateGroup> groups;
  final void Function(BuildContext context, MessageSearchResult message) onOpen;

  const _MessageMediaGrid({
    required this.groups,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        for (final group in groups) ...[
          SliverToBoxAdapter(child: _SearchDateHeader(label: group.label)),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            sliver: SliverGrid.builder(
              itemCount: group.items.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 3,
                crossAxisSpacing: 3,
              ),
              itemBuilder: (context, index) {
                final message = group.items[index];
                final source = message.messageType == 'video'
                    ? _videoSearchMedia(message.body.video, message.messageType)
                    : _imageSearchMedia(
                        message.body.image, message.messageType);
                return _MediaGridTile(
                  message: message,
                  source: source,
                  onTap: () => onOpen(context, message),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _MediaGridTile extends StatelessWidget {
  final MessageSearchResult message;
  final _SearchMediaSource? source;
  final VoidCallback onTap;

  const _MediaGridTile({
    required this.message,
    required this.source,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final media = source;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        key: ValueKey('message-search-media-grid-${message.messageId}'),
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: media == null
            ? Icon(
                message.messageType == 'video'
                    ? Icons.videocam_outlined
                    : Icons.image_outlined,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.35),
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  AppNetworkImage(
                    url: media.url,
                    fit: BoxFit.cover,
                    placeholderBuilder: (context) =>
                        const ColoredBox(color: Color(0xFFE5E5EA)),
                    errorBuilder: (context) =>
                        const ColoredBox(color: Color(0xFFE5E5EA)),
                  ),
                  if (media.isVideo) ...[
                    Container(color: Colors.black.withValues(alpha: 0.10)),
                    const Center(
                      child: Icon(
                        Icons.play_circle_fill,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    if (media.durationSeconds != null)
                      Positioned(
                        right: 5,
                        bottom: 5,
                        child: Text(
                          _formatDuration(media.durationSeconds!),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ],
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Highlight Text
// ---------------------------------------------------------------------------
class _HighlightText extends StatelessWidget {
  final String text;
  final String query;
  final TextStyle? style;
  final int? maxLines;

  const _HighlightText({
    required this.text,
    required this.query,
    this.style,
    this.maxLines,
  });

  @override
  Widget build(BuildContext context) {
    final baseStyle = style ?? const TextStyle(fontSize: 15, color: _text);
    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();
    if (query.isEmpty ||
        lowerQuery.isEmpty ||
        !lowerText.contains(lowerQuery)) {
      return Text(
        text,
        style: baseStyle,
        maxLines: maxLines,
        overflow: maxLines == null ? null : TextOverflow.ellipsis,
      );
    }

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
      maxLines: maxLines,
      overflow: maxLines == null ? TextOverflow.clip : TextOverflow.ellipsis,
    );
  }
}
