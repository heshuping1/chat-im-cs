enum ChatCameraCaptureIntent { photo, startVideo, finishVideo }

const chatCameraMaxVideoDuration = Duration(seconds: 60);

ChatCameraCaptureIntent chatCameraCaptureIntentForTap() {
  return ChatCameraCaptureIntent.photo;
}

ChatCameraCaptureIntent chatCameraCaptureIntentForLongPressStart() {
  return ChatCameraCaptureIntent.startVideo;
}

ChatCameraCaptureIntent chatCameraCaptureIntentForLongPressEnd() {
  return ChatCameraCaptureIntent.finishVideo;
}
