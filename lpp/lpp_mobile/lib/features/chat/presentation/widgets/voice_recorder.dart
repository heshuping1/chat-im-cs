import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/chat/domain/services/asr_service.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class VoiceRecorder extends StatefulWidget {
  final Function(String filePath, int durationSeconds) onSendVoice;
  final FutureOr<bool> Function(String text) onSendText;
  final VoidCallback onCancel;

  const VoiceRecorder({
    super.key,
    required this.onSendVoice,
    required this.onSendText,
    required this.onCancel,
  });

  @override
  State<VoiceRecorder> createState() => _VoiceRecorderState();
}

class _VoiceRecorderState extends State<VoiceRecorder>
    with TickerProviderStateMixin {
  final _recorder = AudioRecorder();
  final _asr = deviceAsrService; // 真实设备端 ASR

  bool _isRecording = false;
  int _durationSeconds = 0;
  Timer? _timer;
  String? _recordedFilePath;

  // 实时 ASR 识别结果
  String _liveAsrText = '';
  double _liveAsrConfidence = 0.8;

  // 声波动画控制器（5 根竖条）
  late final List<AnimationController> _waveControllers;
  late final List<Animation<double>> _waveAnimations;

  // 转文字弹窗状态
  bool _isTranscribing = false;
  String _convertedText = '';
  int _recordedDuration = 0;

  // 时长不足提示
  bool _showTooShortTip = false;
  Timer? _tipTimer;
  OverlayEntry? _recordingOverlayEntry;
  OverlayEntry? _convertSheetOverlayEntry;

  @override
  void initState() {
    super.initState();
    _waveControllers = List.generate(5, (i) {
      final ctrl = AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 400 + i * 80),
      );
      ctrl.repeat(reverse: true);
      return ctrl;
    });

    final heights = [0.4, 0.8, 1.0, 0.7, 0.5];
    _waveAnimations = List.generate(5, (i) {
      return Tween<double>(begin: 0.15, end: heights[i]).animate(
        CurvedAnimation(parent: _waveControllers[i], curve: Curves.easeInOut),
      );
    });
  }

  @override
  void dispose() {
    for (final c in _waveControllers) {
      c.dispose();
    }
    _timer?.cancel();
    _tipTimer?.cancel();
    _hideRecordingOverlay();
    _hideConvertSheetOverlay();
    _recorder.dispose();
    super.dispose();
  }

  void _showRecordingOverlay() {
    if (_recordingOverlayEntry != null) return;
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
    _recordingOverlayEntry = OverlayEntry(
      builder: (_) => _RecordingOverlay(
        durationSeconds: _durationSeconds,
        waveAnimations: _waveAnimations,
        onCancel: () => _stopRecording(cancel: true, convertToText: false),
        onConvertToText: () =>
            _stopRecording(cancel: false, convertToText: true),
      ),
    );
    overlay.insert(_recordingOverlayEntry!);
  }

  void _hideRecordingOverlay() {
    _recordingOverlayEntry?.remove();
    _recordingOverlayEntry = null;
  }

  void _showConvertSheetOverlay() {
    if (_convertSheetOverlayEntry != null) {
      _convertSheetOverlayEntry!.markNeedsBuild();
      return;
    }
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
    _convertSheetOverlayEntry = OverlayEntry(
      builder: (_) => _ConvertSheet(
        isTranscribing: _isTranscribing,
        text: _convertedText,
        confidence: _liveAsrConfidence,
        onTextChanged: (t) {
          setState(() => _convertedText = t);
          _convertSheetOverlayEntry?.markNeedsBuild();
        },
        onSendText: () {
          final text = _convertedText.trim();
          if (text.isNotEmpty) {
            unawaited(Future.sync(() => widget.onSendText(text)));
            _closeConvertSheet();
          }
        },
        onSendVoice: () {
          if (_recordedFilePath != null) {
            widget.onSendVoice(_recordedFilePath!, _recordedDuration);
          }
          _closeConvertSheet();
        },
        onCancel: () {
          _closeConvertSheet();
          widget.onCancel();
        },
      ),
    );
    overlay.insert(_convertSheetOverlayEntry!);
  }

  void _hideConvertSheetOverlay() {
    _convertSheetOverlayEntry?.remove();
    _convertSheetOverlayEntry = null;
  }

  Future<void> _startRecording() async {
    final hasPermission = await _recorder.hasPermission();
    if (!hasPermission) {
      if (mounted) {
        AppToast.error(context, '需要麦克风权限');
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    final path =
        '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 44100,
        bitRate: 128000,
      ),
      path: path,
    );

    // 同步启动实时 ASR
    _liveAsrText = '';
    _liveAsrConfidence = 0.8;
    await _asr.startListening(
      onResult: (text, confidence) {
        if (mounted) {
          setState(() {
            _liveAsrText = text;
            _liveAsrConfidence = confidence;
          });
        }
      },
    );

    setState(() {
      _isRecording = true;
      _durationSeconds = 0;
      _recordedFilePath = path;
    });
    _showRecordingOverlay();

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _durationSeconds++);
      _recordingOverlayEntry?.markNeedsBuild();
      // 60 秒自动停止
      if (_durationSeconds >= 60) {
        _stopRecording(cancel: false, convertToText: false);
      }
    });
  }

  Future<void> _stopRecording({
    required bool cancel,
    required bool convertToText,
  }) async {
    if (!_isRecording) return;
    _timer?.cancel();
    final path = await _recorder.stop();
    await _asr.stopListening(); // 停止实时 ASR

    if (!mounted) return;
    _hideRecordingOverlay();
    setState(() => _isRecording = false);

    if (cancel || path == null) {
      widget.onCancel();
      return;
    }

    if (_durationSeconds < 1) {
      if (convertToText) {
        _showTooShort();
      }
      widget.onCancel();
      return;
    }

    if (convertToText) {
      // 使用实时识别结果，不需要再次调用 transcribe
      setState(() {
        _isTranscribing = false;
        _recordedDuration = _durationSeconds;
        _convertedText = _liveAsrText;
      });
      _showConvertSheetOverlay();
    } else {
      widget.onSendVoice(path, _durationSeconds);
    }
  }

  void _showTooShort() {
    setState(() => _showTooShortTip = true);
    _tipTimer?.cancel();
    _tipTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _showTooShortTip = false);
    });
  }

  void _closeConvertSheet() {
    _hideConvertSheetOverlay();
    setState(() {
      _convertedText = '';
      _recordedDuration = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 按住说话按钮
        GestureDetector(
          onLongPressStart: (_) => _startRecording(),
          onLongPressEnd: (_) =>
              _stopRecording(cancel: false, convertToText: false),
          onLongPressMoveUpdate: (details) {
            // 上滑超过 50dp 取消录音
            if (details.offsetFromOrigin.dy < -50 && _isRecording) {
              _stopRecording(cancel: true, convertToText: false);
            }
          },
          child: Container(
            width: double.infinity,
            height: 36,
            decoration: BoxDecoration(
              color: _isRecording ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color:
                    _isRecording ? AppColors.primary : const Color(0xFFD9D9D9),
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              _isRecording ? '录音中...' : '按住 说话',
              style: TextStyle(
                fontSize: 15,
                color: _isRecording ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ),

        // 时长不足提示
        if (_showTooShortTip)
          Positioned(
            top: -60,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '录音时长不足1秒',
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.surface,
                      fontSize: 13),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 录音覆盖层（全屏）
// ---------------------------------------------------------------------------

class _RecordingOverlay extends StatelessWidget {
  final int durationSeconds;
  final List<Animation<double>> waveAnimations;
  final VoidCallback onCancel;
  final VoidCallback onConvertToText;

  const _RecordingOverlay({
    required this.durationSeconds,
    required this.waveAnimations,
    required this.onCancel,
    required this.onConvertToText,
  });

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.75),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            // 声波 + 时长
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surface
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                children: [
                  // 5 根声波竖条
                  SizedBox(
                    height: 64,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: List.generate(5, (i) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: AnimatedBuilder(
                            animation: waveAnimations[i],
                            builder: (_, __) {
                              return Container(
                                width: 6,
                                height: 64 * waveAnimations[i].value,
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .surface
                                      .withValues(alpha: 0.85),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              );
                            },
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _formatDuration(durationSeconds),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.surface,
                      fontSize: 24,
                      fontWeight: FontWeight.w500,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            // 底部按钮
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _OverlayButton(
                          label: '取消',
                          onTap: onCancel,
                          color: Theme.of(context)
                              .colorScheme
                              .surface
                              .withValues(alpha: 0.15),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _OverlayButton(
                          label: '转文字',
                          onTap: onConvertToText,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '松开发送语音',
                    style: TextStyle(
                      color: Theme.of(context)
                          .colorScheme
                          .surface
                          .withValues(alpha: 0.7),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverlayButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final Color color;

  const _OverlayButton({
    required this.label,
    required this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: Theme.of(context).colorScheme.surface,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 转文字编辑弹窗
// ---------------------------------------------------------------------------

class _ConvertSheet extends StatelessWidget {
  final bool isTranscribing;
  final String text;
  final double confidence;
  final ValueChanged<String> onTextChanged;
  final VoidCallback onSendText;
  final VoidCallback onSendVoice;
  final VoidCallback onCancel;

  const _ConvertSheet({
    required this.isTranscribing,
    required this.text,
    required this.confidence,
    required this.onTextChanged,
    required this.onSendText,
    required this.onSendVoice,
    required this.onCancel,
  });

  bool get _isLowConf => confidence < 0.7 && confidence > 0;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.5),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(24),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 标题栏
                  Row(
                    children: [
                      const Text(
                        '编辑转换文字',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: onCancel,
                        child: const Icon(Icons.close,
                            size: 22, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // 低置信度警告
                  if (_isLowConf) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7E6),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFFD591)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded,
                              size: 16, color: Color(0xFFFA8C16)),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '识别可能不准确，请确认后再发送',
                              style: TextStyle(
                                  fontSize: 12, color: Color(0xFFD46B08)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  // 文本输入区
                  Container(
                    height: 140,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F5F5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: isTranscribing
                        ? const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                              strokeWidth: 2,
                            ),
                          )
                        : TextField(
                            controller: TextEditingController(text: text)
                              ..selection =
                                  TextSelection.collapsed(offset: text.length),
                            onChanged: onTextChanged,
                            maxLines: null,
                            expands: true,
                            decoration: const InputDecoration(
                              contentPadding: EdgeInsets.all(12),
                              border: InputBorder.none,
                              hintText: '语音转文字内容...',
                              hintStyle: TextStyle(
                                  color: AppColors.textSecondary, fontSize: 15),
                            ),
                            style: const TextStyle(
                                fontSize: 15, color: AppColors.textPrimary),
                          ),
                  ),
                  const SizedBox(height: 12),
                  // 操作按钮
                  Row(
                    children: [
                      Expanded(
                        child: _SheetButton(
                          label: '取消',
                          onTap: onCancel,
                          backgroundColor: const Color(0xFFF0F0F0),
                          textColor: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SheetButton(
                          label: '发送语音',
                          onTap: onSendVoice,
                          backgroundColor: Colors.blue,
                          textColor: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SheetButton(
                          label: '发送文字',
                          onTap: text.trim().isNotEmpty ? onSendText : null,
                          backgroundColor: text.trim().isNotEmpty
                              ? AppColors.primary
                              : const Color(0xFFF0F0F0),
                          textColor: text.trim().isNotEmpty
                              ? Colors.white
                              : AppColors.disabled,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SheetButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color textColor;

  const _SheetButton({
    required this.label,
    required this.onTap,
    required this.backgroundColor,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
      ),
    );
  }
}
