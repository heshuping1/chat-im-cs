import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_camera_capture_interaction.dart';

enum ChatCameraCaptureKind { photo, video }

class ChatCameraCaptureResult {
  final String path;
  final String name;
  final String? mimeType;
  final ChatCameraCaptureKind kind;

  const ChatCameraCaptureResult({
    required this.path,
    required this.name,
    required this.kind,
    this.mimeType,
  });
}

class ChatCameraCapturePage extends StatefulWidget {
  const ChatCameraCapturePage({super.key});

  @override
  State<ChatCameraCapturePage> createState() => _ChatCameraCapturePageState();
}

class _ChatCameraCapturePageState extends State<ChatCameraCapturePage> {
  CameraController? _controller;
  Future<void>? _initializeFuture;
  Timer? _maxDurationTimer;
  bool _recording = false;
  bool _busy = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _initializeFuture = _initializeCamera();
  }

  @override
  void dispose() {
    _maxDurationTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _errorText = '相机不可用');
        return;
      }
      final camera = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: true,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _errorText = null;
      });
    } catch (_) {
      if (mounted) setState(() => _errorText = '相机启动失败，请检查权限后重试');
    }
  }

  Future<void> _takePhoto() async {
    final controller = _controller;
    if (_busy ||
        _recording ||
        controller == null ||
        !controller.value.isInitialized) {
      return;
    }
    setState(() => _busy = true);
    try {
      final file = await controller.takePicture();
      if (!mounted) return;
      Navigator.of(context).pop(
        ChatCameraCaptureResult(
          path: file.path,
          name: file.name,
          mimeType: file.mimeType ?? 'image/jpeg',
          kind: ChatCameraCaptureKind.photo,
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startVideoRecording() async {
    final controller = _controller;
    if (_busy ||
        _recording ||
        controller == null ||
        !controller.value.isInitialized) {
      return;
    }
    setState(() {
      _busy = true;
      _recording = true;
    });
    try {
      await controller.startVideoRecording();
      _maxDurationTimer?.cancel();
      _maxDurationTimer =
          Timer(chatCameraMaxVideoDuration, _finishVideoRecording);
    } catch (_) {
      if (mounted) {
        setState(() {
          _recording = false;
          _busy = false;
        });
      }
    }
  }

  Future<void> _finishVideoRecording() async {
    final controller = _controller;
    if (!_recording || controller == null) return;
    _maxDurationTimer?.cancel();
    try {
      final file = await controller.stopVideoRecording();
      if (!mounted) return;
      Navigator.of(context).pop(
        ChatCameraCaptureResult(
          path: file.path,
          name: file.name,
          mimeType: file.mimeType ?? 'video/mp4',
          kind: ChatCameraCaptureKind.video,
        ),
      );
    } catch (_) {
      if (mounted) {
        setState(() {
          _recording = false;
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: FutureBuilder<void>(
          future: _initializeFuture,
          builder: (context, snapshot) {
            final controller = _controller;
            final ready = controller != null &&
                controller.value.isInitialized &&
                _errorText == null;
            return Stack(
              children: [
                Positioned.fill(
                  child: ready
                      ? Center(
                          child: CameraPreview(controller),
                        )
                      : _CameraCaptureStateView(errorText: _errorText),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.close_rounded, color: Colors.white),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 24,
                  child: _CameraCaptureControls(
                    recording: _recording,
                    enabled: ready && !_busy || _recording,
                    onTap: () {
                      if (chatCameraCaptureIntentForTap() ==
                          ChatCameraCaptureIntent.photo) {
                        unawaited(_takePhoto());
                      }
                    },
                    onLongPressStart: () {
                      if (chatCameraCaptureIntentForLongPressStart() ==
                          ChatCameraCaptureIntent.startVideo) {
                        unawaited(_startVideoRecording());
                      }
                    },
                    onLongPressEnd: () {
                      if (chatCameraCaptureIntentForLongPressEnd() ==
                          ChatCameraCaptureIntent.finishVideo) {
                        unawaited(_finishVideoRecording());
                      }
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CameraCaptureStateView extends StatelessWidget {
  final String? errorText;

  const _CameraCaptureStateView({this.errorText});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        errorText ?? '相机启动中',
        style: const TextStyle(color: Colors.white70, fontSize: 15),
      ),
    );
  }
}

class _CameraCaptureControls extends StatelessWidget {
  final bool recording;
  final bool enabled;
  final VoidCallback onTap;
  final VoidCallback onLongPressStart;
  final VoidCallback onLongPressEnd;

  const _CameraCaptureControls({
    required this.recording,
    required this.enabled,
    required this.onTap,
    required this.onLongPressStart,
    required this.onLongPressEnd,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          recording ? '松开发送' : '轻触拍照，长按摄像',
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        const SizedBox(height: 14),
        GestureDetector(
          onTap: enabled ? onTap : null,
          onLongPressStart: enabled ? (_) => onLongPressStart() : null,
          onLongPressEnd: enabled ? (_) => onLongPressEnd() : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 140),
            width: recording ? 84 : 72,
            height: recording ? 84 : 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: recording ? const Color(0xFFE53935) : Colors.white,
                width: 5,
              ),
            ),
            alignment: Alignment.center,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              width: recording ? 34 : 56,
              height: recording ? 34 : 56,
              decoration: BoxDecoration(
                color: recording ? const Color(0xFFE53935) : Colors.white,
                borderRadius: BorderRadius.circular(recording ? 8 : 999),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
