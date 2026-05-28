import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/notice/domain/entities/notice.dart';
import 'package:lpp_mobile/features/profile/data/models/profile_models.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';
import 'package:lpp_mobile/features/settings/domain/entities/settings_entities.dart';

void main() {
  group('profile contracts', () {
    test('parses current user profile response', () {
      final profile = UserProfileModel.fromJson({
        'userId': 'u-1',
        'platformUserId': 'p-1',
        'lppId': 'lpp_001',
        'displayName': 'Alice',
        'avatarUrl': 'https://cdn.example.com/a.png',
        'signature': 'hello',
        'gender': 'female',
        'birthday': '1990-01-01',
        'location': 'Singapore',
        'bio': 'bio',
        'tapTapText': 'tap',
        'mobile': '+65****0001',
        'email': 'a***@example.com',
      });

      expect(profile.userId, 'u-1');
      expect(profile.platformUserId, 'p-1');
      expect(profile.lppId, 'lpp_001');
      expect(profile.displayName, 'Alice');
      expect(profile.avatarUrl, 'https://cdn.example.com/a.png');
      expect(profile.mobile, '+65****0001');
      expect(profile.email, 'a***@example.com');
    });

    test('serializes profile update request with only changed fields', () {
      final request = const UpdateProfileRequest(
        displayName: 'Alice Zhang',
        avatarUrl: 'https://cdn.example.com/a2.png',
        signature: 'updated',
      );

      expect(request.toJson(), {
        'displayName': 'Alice Zhang',
        'avatarUrl': 'https://cdn.example.com/a2.png',
        'signature': 'updated',
      });
    });

    test('parses and serializes privacy settings', () {
      final settings = ProfilePrivacySettings.fromJson({
        'searchableByMobile': false,
        'searchableByLppId': true,
        'allowFriendRequest': 'friends_of_friends',
        'profileVisibility': 'friends',
      });

      expect(settings.searchableByMobile, isFalse);
      expect(settings.searchableByLppId, isTrue);
      expect(settings.allowFriendRequest, 'friends_of_friends');
      expect(settings.profileVisibility, 'friends');
      expect(settings.toJson(), {
        'searchableByMobile': false,
        'searchableByLppId': true,
        'allowFriendRequest': 'friends_of_friends',
        'profileVisibility': 'friends',
      });
    });

    test('serializes feedback request and parses result', () {
      final request = const FeedbackRequest(
        type: 'bug',
        content: 'cannot open profile',
        contactInfo: 'alice@example.com',
        attachmentUrls: ['https://cdn.example.com/1.png'],
      );

      expect(request.toJson(), {
        'type': 'bug',
        'content': 'cannot open profile',
        'contactInfo': 'alice@example.com',
        'attachmentUrls': ['https://cdn.example.com/1.png'],
      });

      final result = FeedbackResult.fromJson({
        'feedbackId': 'fb-1',
        'submittedAt': '2026-05-23T10:00:00Z',
      });
      expect(result.feedbackId, 'fb-1');
      expect(result.submittedAt, DateTime.parse('2026-05-23T10:00:00Z'));
    });
  });

  group('settings contracts', () {
    test('parses and serializes notification settings', () {
      final settings = NotificationSettings.fromJson({
        'globalMute': true,
        'dndStartTime': '22:00',
        'dndEndTime': '08:00',
        'soundEnabled': false,
        'vibrationEnabled': false,
        'previewEnabled': true,
      });

      expect(settings.globalMute, isTrue);
      expect(settings.dndStartTime, '22:00');
      expect(settings.dndEndTime, '08:00');
      expect(settings.soundEnabled, isFalse);
      expect(settings.vibrationEnabled, isFalse);
      expect(settings.previewEnabled, isTrue);
      expect(settings.toJson(), {
        'globalMute': true,
        'dndStartTime': '22:00',
        'dndEndTime': '08:00',
        'soundEnabled': false,
        'vibrationEnabled': false,
        'previewEnabled': true,
      });
    });

    test('copyWith can clear dnd times explicitly', () {
      const settings = NotificationSettings(
        dndStartTime: '22:00',
        dndEndTime: '08:00',
      );

      final updated = settings.copyWith(
        globalMute: true,
        dndStartTime: null,
        dndEndTime: null,
      );

      expect(updated.globalMute, isTrue);
      expect(updated.dndStartTime, isNull);
      expect(updated.dndEndTime, isNull);
    });
  });

  group('notice contracts', () {
    test('parses announcement list/detail response', () {
      final notice = Notice.fromJson({
        'announcementId': 'a-1',
        'title': 'Maintenance',
        'content': 'System maintenance tonight',
        'summary': 'Maintenance summary',
        'coverImage': 'https://cdn.example.com/cover.png',
        'priority': 'important',
        'publishedAt': '2026-05-23T09:00:00Z',
        'expiresAt': '2026-05-24T09:00:00Z',
        'isRead': true,
        'isPinned': true,
      });

      expect(notice.noticeId, 'a-1');
      expect(notice.title, 'Maintenance');
      expect(notice.isImportant, isTrue);
      expect(notice.isRead, isTrue);
      expect(notice.isPinned, isTrue);
      expect(notice.publishedAt, DateTime.parse('2026-05-23T09:00:00Z'));
      expect(notice.expiresAt, DateTime.parse('2026-05-24T09:00:00Z'));
    });
  });
}
