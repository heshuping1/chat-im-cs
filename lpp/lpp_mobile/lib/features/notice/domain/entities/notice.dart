class Notice {
  final String noticeId;
  final String title;
  final String content;
  final String? summary;
  final String? coverImage;
  final String priority; // 'important' / 'normal'
  final DateTime publishedAt;
  final DateTime? expiresAt;
  final bool isRead;
  final bool isPinned;

  const Notice({
    required this.noticeId,
    required this.title,
    required this.content,
    this.summary,
    this.coverImage,
    required this.priority,
    required this.publishedAt,
    this.expiresAt,
    required this.isRead,
    required this.isPinned,
  });

  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());

  bool get isImportant => priority == 'important';

  Notice copyWith({bool? isRead}) {
    return Notice(
      noticeId: noticeId,
      title: title,
      content: content,
      summary: summary,
      coverImage: coverImage,
      priority: priority,
      publishedAt: publishedAt,
      expiresAt: expiresAt,
      isRead: isRead ?? this.isRead,
      isPinned: isPinned,
    );
  }

  factory Notice.fromJson(Map<String, dynamic> json) {
    return Notice(
      noticeId: json['noticeId'] as String? ??
          json['announcementId'] as String? ??
          '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      summary: json['summary'] as String?,
      coverImage: json['coverImage'] as String?,
      priority: json['priority'] as String? ?? 'normal',
      publishedAt: json['publishedAt'] != null
          ? DateTime.parse(json['publishedAt'] as String)
          : DateTime.now(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
      isRead: json['isRead'] as bool? ?? false,
      isPinned: json['isPinned'] as bool? ?? false,
    );
  }
}
