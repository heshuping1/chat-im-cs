import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_camera_capture_interaction.dart';

void main() {
  group('chat camera capture interaction', () {
    test('uses a single WeChat-style shutter interaction', () {
      expect(chatCameraCaptureIntentForTap(), ChatCameraCaptureIntent.photo);
      expect(
        chatCameraCaptureIntentForLongPressStart(),
        ChatCameraCaptureIntent.startVideo,
      );
      expect(
        chatCameraCaptureIntentForLongPressEnd(),
        ChatCameraCaptureIntent.finishVideo,
      );
    });

    test('keeps video recording duration bounded for chat sending', () {
      expect(chatCameraMaxVideoDuration, const Duration(seconds: 60));
    });
  });
}
