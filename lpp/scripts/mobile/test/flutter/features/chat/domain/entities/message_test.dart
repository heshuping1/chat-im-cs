import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

void main() {
  group('MessageBody event parsing', () {
    test('uses explicit event text when present', () {
      final body = MessageBody.fromJson({
        'event': {
          'type': 'tap_tap',
          'text': '小李 拍了拍 小王',
        },
      });

      expect(body.text, '小李 拍了拍 小王');
      expect(body.eventData?.type, 'tap_tap');
    });

    test('formats tap tap event when text preview is missing', () {
      final body = MessageBody.fromJson({
        'event': {
          'type': 'tap_tap',
          'actorDisplayName': '小李',
          'targetDisplayName': '小王',
        },
      });

      expect(body.text, '小李 拍了拍 小王');
      expect(body.event, '小李 拍了拍 小王');
    });

    test('uses custom tap tap text from profile settings', () {
      final body = MessageBody.fromJson({
        'event': {
          'type': 'tapTap',
          'actorDisplayName': '小李',
          'targetDisplayName': '小王',
          'tapTapText': '拍了拍你的肩膀',
        },
      });

      expect(body.text, '小李 拍了拍你的肩膀');
    });
  });

  group('MessageBody location serialization', () {
    test('serializes location body with API contract fields', () {
      const body = MessageBody(
        location: LocationDto(
          latitude: 31.2304,
          longitude: 121.4737,
          title: '上海市',
          address: '上海市黄浦区南京东路',
          zoomLevel: 15,
        ),
      );

      expect(body.toJson(), {
        'location': {
          'latitude': 31.2304,
          'longitude': 121.4737,
          'title': '上海市',
          'address': '上海市黄浦区南京东路',
          'zoomLevel': 15,
        },
      });
    });

    test('parses zoomLevel from numeric json values', () {
      final body = MessageBody.fromJson({
        'location': {
          'latitude': 31.2304,
          'longitude': 121.4737,
          'title': '上海市',
          'address': '上海市黄浦区南京东路',
          'zoomLevel': 15.0,
        },
      });

      expect(body.location?.latitude, 31.2304);
      expect(body.location?.longitude, 121.4737);
      expect(body.location?.zoomLevel, 15);
    });
  });
}
