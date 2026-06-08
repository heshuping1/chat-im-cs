import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/asr_service.dart';
import 'package:lpp_mobile/features/chat/domain/services/mention_composer.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/chat_camera_capture_page.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_picked_media.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/emoji_picker_panel.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/voice_recorder.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/chat_input_settings_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
import 'package:path/path.dart' as p;

enum _InputMode { text, voice, emoji, tools }

class ChatMentionCandidate {
  final String userId;
  final String displayName;
  final String? avatarUrl;

  const ChatMentionCandidate({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
  });
}

class ChatTextSendRequest {
  final String text;
  final List<Mention>? mentions;

  const ChatTextSendRequest({
    required this.text,
    this.mentions,
  });
}

class ChatInputToolbar extends ConsumerStatefulWidget {
  final String conversationId;
  final bool isGroup;
  final String? initialDraft; // 进入会话时恢复的草稿

  /// 群全员禁言时为 true
  final bool isMuted;

  /// 当前用户是否可以发言（管理员/群主不受禁言限制）
  final bool canSpeak;

  /// 当前不可发言时展示在输入框里的原因。
  final String? muteReason;

  final FutureOr<bool> Function(String text) onSendText;
  final FutureOr<bool> Function(ChatTextSendRequest request)? onSendTextRequest;
  final FutureOr<bool> Function(String text, DateTime scheduledAt)?
      onScheduleText;
  final Function(String filePath, int duration) onSendVoice;
  final FutureOr<void> Function(List<ChatPickedMedia> media) onSendMedia;
  final FutureOr<void> Function(
          String filePath, String fileName, String mimeType, int sizeBytes)?
      onSendFile;
  final VoidCallback? onVoiceCall;
  final VoidCallback? onVideoCall;
  final VoidCallback? onLocation;
  final VoidCallback? onFavorite;
  final VoidCallback? onSendContactCard;
  final String? quickReplyScope;
  final String? aiReplyContextText;
  final String? externalInsertText;
  final int externalInsertToken;
  final List<ChatMentionCandidate> mentionCandidates;
  final bool canMentionAll;
  final VoiceRecordingBackend? voiceRecordingBackend;
  final AsrService? voiceAsrService;
  final ChatGalleryPicker? galleryPicker;

  const ChatInputToolbar({
    super.key,
    required this.conversationId,
    required this.isGroup,
    this.initialDraft,
    this.isMuted = false,
    this.canSpeak = true,
    this.muteReason,
    required this.onSendText,
    this.onSendTextRequest,
    this.onScheduleText,
    required this.onSendVoice,
    required this.onSendMedia,
    this.onSendFile,
    this.onVoiceCall,
    this.onVideoCall,
    this.onLocation,
    this.onFavorite,
    this.onSendContactCard,
    this.quickReplyScope,
    this.aiReplyContextText,
    this.externalInsertText,
    this.externalInsertToken = 0,
    this.mentionCandidates = const [],
    this.canMentionAll = false,
    this.voiceRecordingBackend,
    this.voiceAsrService,
    this.galleryPicker,
  });

  @override
  ConsumerState<ChatInputToolbar> createState() => _ChatInputToolbarState();
}

class _ChatInputToolbarState extends ConsumerState<ChatInputToolbar> {
  _InputMode _mode = _InputMode.text;
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  late final ChatGalleryPicker _galleryPicker;
  MentionComposerDraft _mentionDraft = const MentionComposerDraft.empty();
  Timer? _draftTimer;
  bool _sendingText = false;
  DateTime? _scheduledSendAt;
  int? _lastMentionPromptTextLength;

  bool get _isMutedForUser => widget.isMuted && !widget.canSpeak;

  @override
  void initState() {
    super.initState();
    _galleryPicker = widget.galleryPicker ?? ImagePickerChatGalleryPicker();
    // 恢复草稿
    if (widget.initialDraft != null && widget.initialDraft!.isNotEmpty) {
      _textController.text = widget.initialDraft!;
      _mentionDraft = MentionComposerDraft(
        text: widget.initialDraft!,
        tokens: const [],
      );
      _textController.selection = TextSelection.fromPosition(
        TextPosition(offset: widget.initialDraft!.length),
      );
    }
  }

  @override
  void didUpdateWidget(covariant ChatInputToolbar oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextDraft = widget.initialDraft;
    if (nextDraft != oldWidget.initialDraft &&
        nextDraft != null &&
        nextDraft.isNotEmpty &&
        _textController.text.isEmpty) {
      _textController.text = nextDraft;
      _mentionDraft = MentionComposerDraft(
        text: nextDraft,
        tokens: const [],
      );
      _textController.selection = TextSelection.fromPosition(
        TextPosition(offset: nextDraft.length),
      );
    }
    if (widget.externalInsertToken == oldWidget.externalInsertToken) return;
    final text = widget.externalInsertText?.trim();
    if (text == null || text.isEmpty || _isMutedForUser) return;
    _insertTextAtCursor(text);
    _setMode(_InputMode.text);
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _draftTimer?.cancel();
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  /// 防抖保存草稿：输入停止 500ms 后调用 API
  void _scheduleDraftSave(String text) {
    _draftTimer?.cancel();
    _draftTimer = Timer(const Duration(milliseconds: 500), () {
      _saveDraft(text);
    });
  }

  Future<void> _saveDraft(String text) async {
    await ref.read(conversationActionsControllerProvider).saveDraft(
          widget.conversationId,
          isGroup: widget.isGroup,
          text: text,
        );
  }

  void _setMode(_InputMode mode) {
    if (_isMutedForUser) {
      _focusNode.unfocus();
      if (_mode != _InputMode.text) {
        setState(() => _mode = _InputMode.text);
      }
      return;
    }
    setState(() => _mode = mode);
    if (mode == _InputMode.text) {
      _focusNode.requestFocus();
    } else {
      _focusNode.unfocus();
    }
  }

  Future<void> _sendText() async {
    if (_isMutedForUser) return;
    if (_sendingText) return;
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    final request = ChatTextSendRequest(
      text: text,
      mentions: widget.isGroup ? _mentionDraft.mentions : null,
    );
    final scheduledAt = _scheduledSendAt;
    setState(() => _sendingText = true);
    _textController.clear();
    _mentionDraft = const MentionComposerDraft.empty();
    _draftTimer?.cancel();
    try {
      final sent = scheduledAt == null
          ? await Future.sync(
              () =>
                  widget.onSendTextRequest?.call(request) ??
                  widget.onSendText(text),
            ).then((value) => value).catchError((_) => false)
          : await Future.sync(
              () => widget.onScheduleText?.call(text, scheduledAt) ?? false,
            ).then((value) => value).catchError((_) => false);
      if (sent) {
        if (scheduledAt != null && mounted) {
          setState(() => _scheduledSendAt = null);
        }
        await _saveDraft('');
      } else {
        await _saveDraft(text);
      }
    } finally {
      if (mounted) {
        setState(() => _sendingText = false);
      }
    }
  }

  Future<void> _openSchedulePicker() async {
    if (_isMutedForUser) return;
    final selected = await showModalBottomSheet<DateTime>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => const _ScheduledMessageTimeSheet(),
    );
    if (selected == null || !mounted) return;
    setState(() => _scheduledSendAt = selected);
    _setMode(_InputMode.text);
    _focusNode.requestFocus();
  }

  void _clearScheduledSendAt() {
    setState(() => _scheduledSendAt = null);
  }

  bool _isPlainEnter(KeyEvent event) {
    if (event is! KeyDownEvent) return false;
    final key = event.logicalKey;
    if (key != LogicalKeyboardKey.enter &&
        key != LogicalKeyboardKey.numpadEnter) {
      return false;
    }
    final pressed = HardwareKeyboard.instance.logicalKeysPressed;
    return !pressed.contains(LogicalKeyboardKey.shiftLeft) &&
        !pressed.contains(LogicalKeyboardKey.shiftRight) &&
        !pressed.contains(LogicalKeyboardKey.controlLeft) &&
        !pressed.contains(LogicalKeyboardKey.controlRight) &&
        !pressed.contains(LogicalKeyboardKey.altLeft) &&
        !pressed.contains(LogicalKeyboardKey.altRight) &&
        !pressed.contains(LogicalKeyboardKey.metaLeft) &&
        !pressed.contains(LogicalKeyboardKey.metaRight);
  }

  Future<void> _pickMediaFromGallery() async {
    if (_isMutedForUser) return;
    try {
      final files = await _galleryPicker.pickMedia();
      if (files.isNotEmpty) {
        await _sendPickedFiles(files, allowFileAttachments: false);
      }
    } catch (e) {
      // 部分系统相册能力不可用时降级为单张选图，至少保留旧体验。
      try {
        final file = await _galleryPicker.pickFallbackImage();
        if (file != null) {
          await _sendPickedFiles([file], allowFileAttachments: false);
        }
      } catch (_) {
        // 静默失败
      }
    }
  }

  Future<void> _openCameraPicker() async {
    if (_isMutedForUser) return;
    final result = await Navigator.of(context).push<ChatCameraCaptureResult>(
      MaterialPageRoute(builder: (_) => const ChatCameraCapturePage()),
    );
    if (result == null || !mounted) return;
    await _sendCapturedMedia(result);
  }

  Future<void> _sendCapturedMedia(ChatCameraCaptureResult result) async {
    int? sizeBytes;
    try {
      sizeBytes = await XFile(result.path).length();
    } catch (_) {
      sizeBytes = null;
    }
    final media = result.kind == ChatCameraCaptureKind.video
        ? ChatPickedMedia.video(
            path: result.path,
            fileName: result.name,
            mimeType: result.mimeType,
            sizeBytes: sizeBytes,
          )
        : ChatPickedMedia.image(
            path: result.path,
            fileName: result.name,
            mimeType: result.mimeType,
            sizeBytes: sizeBytes,
          );
    await Future.sync(() => widget.onSendMedia([media]));
  }

  Future<void> _sendPickedFiles(
    List<XFile> files, {
    bool allowFileAttachments = true,
  }) async {
    final dispatch = await classifyChatPickedFiles(
      files,
      allowFileAttachments: allowFileAttachments,
    );
    for (final file in dispatch.files) {
      await Future.sync(
        () => widget.onSendFile?.call(
          file.filePath,
          file.fileName,
          file.mimeType,
          file.sizeBytes,
        ),
      );
    }
    if (dispatch.oversizedFiles.isNotEmpty) {
      if (mounted) {
        AppToast.error(context, AppLocalizations.of(context).chatFileTooLarge);
      }
    }
    if (dispatch.unsupportedFiles.isNotEmpty && mounted) {
      AppToast.error(context, _unsupportedFileTypeText(context));
    }
    if (dispatch.media.isEmpty) return;
    await Future.sync(() => widget.onSendMedia(dispatch.media));
  }

  Future<void> _pickFile() async {
    if (_isMutedForUser) return;
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: chatFilePickerAllowedExtensions,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.single;
    final pickedFile = ChatPickedFileAttachment.fromPlatformFile(file);
    if (pickedFile == null ||
        !isChatFileAttachmentExtension(pickedFile.extension)) {
      if (mounted) {
        AppToast.error(context, _unsupportedFileTypeText(context));
      }
      return;
    }
    if (pickedFile.sizeBytes > chatFileAttachmentMaxSizeBytes) {
      if (mounted) {
        AppToast.error(context, AppLocalizations.of(context).chatFileTooLarge);
      }
      return;
    }
    await Future.sync(
      () => widget.onSendFile?.call(
        pickedFile.filePath,
        pickedFile.fileName,
        pickedFile.mimeType,
        pickedFile.sizeBytes,
      ),
    );
  }

  String _unsupportedFileTypeText(BuildContext context) {
    final languageCode = Localizations.localeOf(context).languageCode;
    if (languageCode == 'en') return 'This file type is not supported yet';
    if (languageCode == 'ja') return 'このファイル形式はまだ対応していません';
    if (languageCode == 'ko') return '아직 지원하지 않는 파일 형식입니다';
    if (languageCode == 'vi') return 'Chưa hỗ trợ loại tệp này';
    return '暂不支持发送此类型文件';
  }

  void _insertEmoji(String emoji) {
    if (_isMutedForUser) return;
    _insertTextAtCursor(emoji);
  }

  void _insertTextAtCursor(String insertedText) {
    final text = _textController.text;
    final sel = _textController.selection;
    final start = sel.start < 0 ? text.length : sel.start;
    final end = sel.end < 0 ? text.length : sel.end;
    final newText = text.replaceRange(start, end, insertedText);
    _mentionDraft = MentionComposerDraft(
      text: newText,
      tokens: _mentionDraft.tokens,
    );
    _textController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + insertedText.length),
    );
    _scheduleDraftSave(newText);
    setState(() {}); // 触发重建，更新发送按钮状态
  }

  void _handleTextChanged(String text) {
    _mentionDraft = MentionComposerDraft(
      text: text,
      tokens: _mentionDraft.tokens,
    );
    _scheduleDraftSave(text);
    if (!widget.isGroup || _isMutedForUser) {
      _lastMentionPromptTextLength = null;
      return;
    }
    if (!_endsWithMentionTrigger(text)) {
      _lastMentionPromptTextLength = null;
      return;
    }
    if (_lastMentionPromptTextLength == text.length) return;
    _lastMentionPromptTextLength = text.length;
    unawaited(_openMentionPicker(replaceTypedAt: true));
  }

  bool _endsWithMentionTrigger(String text) {
    return text.endsWith('@') || text.endsWith('＠');
  }

  bool _isMentionTriggerChar(String text) {
    return text == '@' || text == '＠';
  }

  Future<void> _openMentionPicker({bool replaceTypedAt = false}) async {
    if (_isMutedForUser || !widget.isGroup) return;
    final selected = await showModalBottomSheet<_MentionPickResult>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _MentionPickerSheet(
        candidates: widget.mentionCandidates,
        canMentionAll: widget.canMentionAll,
      ),
    );
    if (selected == null || selected.items.isEmpty || !mounted) return;
    final selection = _textController.selection;
    var start =
        selection.start < 0 ? _textController.text.length : selection.start;
    var end = selection.end < 0 ? _textController.text.length : selection.end;
    if (replaceTypedAt && start > 0 && end == start) {
      final text = _textController.text;
      if (_isMentionTriggerChar(text.substring(start - 1, start))) {
        start -= 1;
      }
    }
    var draft = _mentionDraft;
    var cursor = start;
    for (var index = 0; index < selected.items.length; index++) {
      final item = selected.items[index];
      final selectionStart = index == 0 ? start : cursor;
      final selectionEnd = index == 0 ? end : cursor;
      if (item.isAll) {
        draft = draft.insertAll(
          selectionStart: selectionStart,
          selectionEnd: selectionEnd,
        );
        cursor += '@所有人 '.length;
      } else {
        draft = draft.insertUser(
          userId: item.userId!,
          displayName: item.displayName!,
          selectionStart: selectionStart,
          selectionEnd: selectionEnd,
        );
        cursor += '@${item.displayName} '.length;
      }
    }
    _mentionDraft = draft;
    _textController.value = TextEditingValue(
      text: draft.text,
      selection: TextSelection.collapsed(offset: cursor),
    );
    _scheduleDraftSave(draft.text);
    _setMode(_InputMode.text);
    _focusNode.requestFocus();
  }

  Future<void> _openQuickReplies() async {
    if (_isMutedForUser || widget.quickReplyScope == null) return;
    final selected = await showModalBottomSheet<CsQuickReply>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _QuickReplyPickerSheet(scope: widget.quickReplyScope),
    );
    if (selected == null || !mounted) return;
    _insertTextAtCursor(selected.content);
    _setMode(_InputMode.text);
    _focusNode.requestFocus();
  }

  Future<void> _openAiReplySuggestions() async {
    if (_isMutedForUser) return;
    final selected = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _AiReplySuggestionSheet(
        contextText: widget.aiReplyContextText,
      ),
    );
    if (selected == null || !mounted) return;
    _insertTextAtCursor(selected);
    _setMode(_InputMode.text);
    _focusNode.requestFocus();
  }

  void _deleteLastChar() {
    final text = _textController.text;
    if (text.isEmpty) return;
    final sel = _textController.selection;
    final pos = sel.start < 0 ? text.length : sel.start;
    if (pos == 0) return;
    // 用 Characters 正确处理 emoji（多字节字符）
    final chars = text.substring(0, pos).characters;
    if (chars.isEmpty) return;
    final newPrefix = chars.skipLast(1).string;
    final newText = newPrefix + text.substring(pos);
    _textController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: newPrefix.length),
    );
    setState(() {}); // 更新发送按钮状态
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Divider(
              height: 0.5,
              thickness: 0.5,
              color: Theme.of(context).dividerColor),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 左：麦克风 / 键盘
                _CircleIconButton(
                  icon: _mode == _InputMode.voice
                      ? Icons.keyboard_alt_outlined
                      : Icons.mic_none_rounded,
                  onTap: _isMutedForUser
                      ? null
                      : () => _setMode(
                            _mode == _InputMode.voice
                                ? _InputMode.text
                                : _InputMode.voice,
                          ),
                ),
                const SizedBox(width: 8),
                // 中：输入框 / 按住说话（同一个容器样式）
                Expanded(child: _buildInputArea()),
                const SizedBox(width: 8),
                // 右：表情
                _CircleIconButton(
                  icon: _mode == _InputMode.emoji
                      ? Icons.keyboard_alt_outlined
                      : Icons.mood,
                  showBorder: false,
                  onTap: _isMutedForUser
                      ? null
                      : () => _setMode(
                            _mode == _InputMode.emoji
                                ? _InputMode.text
                                : _InputMode.emoji,
                          ),
                ),
                const SizedBox(width: 8),
                // 右：+，发送交给键盘右下角的 send action
                _buildMoreButton(),
              ],
            ),
          ),
          if (_scheduledSendAt != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
              child: _ScheduledSendBanner(
                scheduledAt: _scheduledSendAt!,
                onClear: _clearScheduledSendAt,
              ),
            ),
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: _buildExpandedPanel(bottomPadding),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    final inputColor = Theme.of(context).colorScheme.surfaceContainerHighest;
    final enterToSend = ref.watch(chatEnterToSendProvider);
    if (_isMutedForUser) {
      final textColor = Theme.of(context).colorScheme.onSurfaceVariant;
      return Container(
        height: 40,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: inputColor,
          borderRadius: BorderRadius.circular(6),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            widget.muteReason ??
                AppLocalizations.of(context).chatInputMutedAdminOnly,
            maxLines: 1,
            style: TextStyle(fontSize: 14, color: textColor),
          ),
        ),
      );
    }

    if (_mode == _InputMode.voice) {
      // 语音模式：VoiceRecorder 内部已有 height:36 的按住说话按钮
      return VoiceRecorder(
        onSendVoice: widget.onSendVoice,
        onSendText: widget.onSendText,
        onCancel: () => setState(() => _mode = _InputMode.voice),
        recordingBackend: widget.voiceRecordingBackend,
        asrService: widget.voiceAsrService,
      );
    }

    // 文字模式：和"按住说话"完全相同的 Container 结构
    return Container(
      width: double.infinity,
      height: 36,
      decoration: BoxDecoration(
        color: inputColor,
        borderRadius: BorderRadius.circular(6),
      ),
      alignment: Alignment.center,
      child: Focus(
        onKeyEvent: (node, event) {
          if (!enterToSend) return KeyEventResult.ignored;
          if (!_isPlainEnter(event)) return KeyEventResult.ignored;
          unawaited(_sendText());
          return KeyEventResult.handled;
        },
        child: TextField(
          controller: _textController,
          focusNode: _focusNode,
          maxLines: 1,
          textInputAction: TextInputAction.send,
          onEditingComplete: () {},
          onSubmitted: (_) => _sendText(),
          onChanged: _handleTextChanged,
          onTap: () {
            if (_mode != _InputMode.text) {
              setState(() => _mode = _InputMode.text);
            }
          },
          textAlignVertical: TextAlignVertical.center,
          cursorColor: Theme.of(context).colorScheme.onSurface,
          decoration: InputDecoration(
            hintText: AppLocalizations.of(context).chatInputHint,
            hintStyle: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 15,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            isCollapsed: true,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
          ),
          style: TextStyle(
            fontSize: 15,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }

  Widget _buildMoreButton() {
    return _CircleIconButton(
      icon: _mode == _InputMode.tools
          ? Icons.close_rounded
          : Icons.add_circle_outline_rounded,
      showBorder: false,
      onTap: _isMutedForUser
          ? null
          : () => _setMode(
                _mode == _InputMode.tools ? _InputMode.text : _InputMode.tools,
              ),
    );
  }

  Widget _buildExpandedPanel(double bottomPadding) {
    if (_mode == _InputMode.emoji && !_isMutedForUser) {
      return EmojiPickerPanel(
        onEmojiSelected: _insertEmoji,
        onDelete: _deleteLastChar,
        onSend: _sendText,
        hasSendContent: _textController.text.trim().isNotEmpty,
      );
    }

    if (_mode == _InputMode.tools && !_isMutedForUser) {
      return _ToolsPanel(
        isGroup: widget.isGroup,
        bottomPadding: bottomPadding,
        onPickImages: _pickMediaFromGallery,
        onTakePhoto: _openCameraPicker,
        onPickFile: _pickFile,
        onVoiceCall: widget.onVoiceCall ?? () {},
        onVideoCall: widget.onVideoCall ?? () {},
        onLocation: widget.onLocation ?? () {},
        onFavorite: widget.onFavorite,
        onSendContactCard: widget.onSendContactCard,
        onScheduleMessage: _openSchedulePicker,
        onQuickReply: widget.quickReplyScope == null ? null : _openQuickReplies,
        onAiReply:
            widget.quickReplyScope == null ? null : _openAiReplySuggestions,
      );
    }

    return const SizedBox.shrink();
  }
}

const chatFileAttachmentMaxSizeBytes = 100 * 1024 * 1024;
const chatFilePickerAllowedExtensions = chatFileAttachmentAllowedExtensions;

abstract class ChatGalleryPicker {
  Future<List<XFile>> pickMedia();
  Future<XFile?> pickFallbackImage();
}

class ImagePickerChatGalleryPicker implements ChatGalleryPicker {
  final ImagePicker _imagePicker;

  ImagePickerChatGalleryPicker({ImagePicker? imagePicker})
      : _imagePicker = imagePicker ?? ImagePicker();

  @override
  Future<List<XFile>> pickMedia() {
    return _imagePicker.pickMultipleMedia();
  }

  @override
  Future<XFile?> pickFallbackImage() {
    return _imagePicker.pickImage(source: ImageSource.gallery);
  }
}

class ChatPickedFileAttachment {
  final String filePath;
  final String fileName;
  final String extension;
  final String mimeType;
  final int sizeBytes;

  const ChatPickedFileAttachment({
    required this.filePath,
    required this.fileName,
    required this.extension,
    required this.mimeType,
    required this.sizeBytes,
  });

  factory ChatPickedFileAttachment.fromXFile(
    XFile file, {
    required int sizeBytes,
  }) {
    final fileName = _pickedFileName(file.name, file.path);
    final extension = _fileExtension(fileName, file.path);
    return ChatPickedFileAttachment(
      filePath: file.path,
      fileName: fileName,
      extension: extension,
      mimeType: chatFileAttachmentMimeType(extension),
      sizeBytes: sizeBytes,
    );
  }

  static ChatPickedFileAttachment? fromPlatformFile(PlatformFile file) {
    final path = file.path;
    if (path == null || path.trim().isEmpty) return null;
    final fileName = _pickedFileName(file.name, path);
    final extension = _fileExtension(fileName, path);
    return ChatPickedFileAttachment(
      filePath: path,
      fileName: fileName,
      extension: extension,
      mimeType: chatFileAttachmentMimeType(extension),
      sizeBytes: file.size,
    );
  }
}

class ChatPickedFilesDispatch {
  final List<ChatPickedMedia> media;
  final List<ChatPickedFileAttachment> files;
  final List<ChatPickedFileAttachment> oversizedFiles;
  final List<XFile> unsupportedFiles;

  const ChatPickedFilesDispatch({
    required this.media,
    required this.files,
    required this.oversizedFiles,
    required this.unsupportedFiles,
  });
}

Future<ChatPickedFilesDispatch> classifyChatPickedFiles(
  List<XFile> files, {
  int maxFileSizeBytes = chatFileAttachmentMaxSizeBytes,
  bool allowFileAttachments = true,
}) async {
  final media = <ChatPickedMedia>[];
  final attachments = <ChatPickedFileAttachment>[];
  final oversized = <ChatPickedFileAttachment>[];
  final unsupported = <XFile>[];
  for (final file in files) {
    final sizeBytes = await _xFileSize(file);
    final picked = ChatPickedMedia.tryFromPickedFile(
      path: file.path,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: sizeBytes,
    );
    if (picked != null) {
      media.add(picked);
      continue;
    }
    if (!allowFileAttachments) {
      unsupported.add(file);
      continue;
    }
    final attachment = ChatPickedFileAttachment.fromXFile(
      file,
      sizeBytes: sizeBytes ?? 0,
    );
    if (!isChatFileAttachmentExtension(attachment.extension)) {
      unsupported.add(file);
      continue;
    }
    if (attachment.sizeBytes > maxFileSizeBytes) {
      oversized.add(attachment);
      continue;
    }
    attachments.add(attachment);
  }
  return ChatPickedFilesDispatch(
    media: media,
    files: attachments,
    oversizedFiles: oversized,
    unsupportedFiles: unsupported,
  );
}

Future<int?> _xFileSize(XFile file) async {
  try {
    return await file.length();
  } catch (_) {
    return null;
  }
}

String _pickedFileName(String fileName, String filePath) {
  final trimmed = fileName.trim();
  if (trimmed.isNotEmpty) return trimmed;
  final basename = p.basename(filePath);
  return basename.isEmpty ? 'file' : basename;
}

String _fileExtension(String fileName, String filePath) {
  final fromName = p.extension(fileName).replaceFirst('.', '');
  if (fromName.trim().isNotEmpty) return fromName;
  return p.extension(filePath).replaceFirst('.', '');
}

// ---------------------------------------------------------------------------
// 圆圈图标按钮（对照微信：白底圆形 + 细边框）
// ---------------------------------------------------------------------------

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final bool showBorder;

  const _CircleIconButton({
    required this.icon,
    required this.onTap,
    this.showBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: disabled ? 0.38 : 1,
        child: Container(
          width: 36,
          height: 36,
          decoration: showBorder
              ? BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: Theme.of(context).dividerColor, width: 0.8),
                )
              : null,
          alignment: Alignment.center,
          child: Icon(
            icon,
            size: 26,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _ScheduledSendBanner extends StatelessWidget {
  final DateTime scheduledAt;
  final VoidCallback onClear;

  const _ScheduledSendBanner({
    required this.scheduledAt,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      height: 40,
      padding: const EdgeInsets.only(left: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Text(
            '发送时间：',
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
          Expanded(
            child: Text(
              _formatScheduledSendAt(scheduledAt),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF2F6FED),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onClear,
            icon: Icon(
              Icons.close_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduledMessageTimeSheet extends StatefulWidget {
  const _ScheduledMessageTimeSheet();

  @override
  State<_ScheduledMessageTimeSheet> createState() =>
      _ScheduledMessageTimeSheetState();
}

class _ScheduledMessageTimeSheetState
    extends State<_ScheduledMessageTimeSheet> {
  late final List<DateTime> _dates;
  late int _selectedDateIndex;
  late int _selectedHour;
  late int _selectedMinute;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final nextHour = now.add(const Duration(hours: 1));
    final defaultTime =
        DateTime(nextHour.year, nextHour.month, nextHour.day, nextHour.hour);
    _dates = List.generate(
      14,
      (index) =>
          DateTime(now.year, now.month, now.day).add(Duration(days: index)),
    );
    _selectedDateIndex = defaultTime.difference(_dates.first).inDays;
    _selectedHour = defaultTime.hour;
    _selectedMinute = defaultTime.minute;
  }

  DateTime get _selectedAt {
    final date = _dates[_selectedDateIndex];
    return DateTime(
      date.year,
      date.month,
      date.day,
      _selectedHour,
      _selectedMinute,
    );
  }

  bool get _isValid => _selectedAt.isAfter(
        DateTime.now().add(const Duration(minutes: 1)),
      );

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 378,
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(top: 8, bottom: 10),
            decoration: BoxDecoration(
              color: colorScheme.onSurface.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                const SizedBox(width: 48),
                Expanded(
                  child: Center(
                    child: Text(
                      '选择时间',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: Theme.of(context).dividerColor),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 5,
                  child: CupertinoPicker(
                    scrollController: FixedExtentScrollController(
                      initialItem: _selectedDateIndex,
                    ),
                    itemExtent: 46,
                    magnification: 1.06,
                    useMagnifier: true,
                    onSelectedItemChanged: (index) {
                      setState(() => _selectedDateIndex = index);
                    },
                    children: _dates
                        .map(
                          (date) => Center(
                            child: Text(
                              _formatSchedulePickerDate(date),
                              maxLines: 1,
                              style: const TextStyle(fontSize: 18),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: CupertinoPicker(
                    scrollController: FixedExtentScrollController(
                      initialItem: _selectedHour,
                    ),
                    itemExtent: 46,
                    magnification: 1.06,
                    useMagnifier: true,
                    onSelectedItemChanged: (index) {
                      setState(() => _selectedHour = index);
                    },
                    children: List.generate(
                      24,
                      (hour) => Center(
                        child: Text(
                          hour.toString().padLeft(2, '0'),
                          style: const TextStyle(fontSize: 20),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: CupertinoPicker(
                    scrollController: FixedExtentScrollController(
                      initialItem: _selectedMinute,
                    ),
                    itemExtent: 46,
                    magnification: 1.06,
                    useMagnifier: true,
                    onSelectedItemChanged: (index) {
                      setState(() => _selectedMinute = index);
                    },
                    children: List.generate(
                      60,
                      (minute) => Center(
                        child: Text(
                          minute.toString().padLeft(2, '0'),
                          style: const TextStyle(fontSize: 20),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: _isValid
                    ? () => Navigator.of(context).pop(_selectedAt)
                    : null,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2F6FED),
                  disabledBackgroundColor:
                      colorScheme.onSurface.withValues(alpha: 0.12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  '保存',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatScheduledSendAt(DateTime dateTime) {
  final minute = dateTime.minute.toString().padLeft(2, '0');
  return '${dateTime.month}月${dateTime.day}日（${_weekdayText(dateTime)}） '
      '${dateTime.hour.toString().padLeft(2, '0')}:$minute';
}

String _formatSchedulePickerDate(DateTime date) {
  return '${date.month}月${date.day}日 ${_weekdayText(date)}';
}

String _weekdayText(DateTime date) {
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return weekdays[date.weekday - 1];
}

class _MentionPickResult {
  final List<_MentionPickItem> items;

  const _MentionPickResult.all() : items = const [_MentionPickItem.all()];

  _MentionPickResult.user({
    required String userId,
    required String displayName,
  }) : items = [
          _MentionPickItem.user(userId: userId, displayName: displayName)
        ];

  _MentionPickResult.multiple(this.items);
}

class _MentionPickItem {
  final bool isAll;
  final String? userId;
  final String? displayName;

  const _MentionPickItem.all()
      : isAll = true,
        userId = null,
        displayName = null;

  const _MentionPickItem.user({
    required this.userId,
    required this.displayName,
  }) : isAll = false;
}

class _MentionPickerSheet extends StatefulWidget {
  final List<ChatMentionCandidate> candidates;
  final bool canMentionAll;

  const _MentionPickerSheet({
    required this.candidates,
    required this.canMentionAll,
  });

  @override
  State<_MentionPickerSheet> createState() => _MentionPickerSheetState();
}

class _MentionPickerSheetState extends State<_MentionPickerSheet> {
  final _searchController = TextEditingController();
  final _selectedUserIds = <String>{};
  bool _multiSelect = false;
  bool _selectedAll = false;
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<ChatMentionCandidate> get _visibleCandidates {
    final query = _query.trim().toLowerCase();
    final candidates = widget.candidates
        .where((candidate) => candidate.displayName.trim().isNotEmpty)
        .where((candidate) {
      if (query.isEmpty) return true;
      return candidate.displayName.toLowerCase().contains(query) ||
          candidate.userId.toLowerCase().contains(query);
    }).toList(growable: false);
    return [...candidates]..sort((left, right) {
        final leftInitial = _mentionCandidateInitial(left);
        final rightInitial = _mentionCandidateInitial(right);
        final groupCompare = leftInitial.compareTo(rightInitial);
        if (groupCompare != 0) return groupCompare;
        return left.displayName.compareTo(right.displayName);
      });
  }

  int get _selectedCount => _selectedUserIds.length + (_selectedAll ? 1 : 0);

  List<_MentionPickItem> get _selectedItems {
    final items = <_MentionPickItem>[];
    if (_selectedAll) items.add(const _MentionPickItem.all());
    for (final candidate in widget.candidates) {
      if (!_selectedUserIds.contains(candidate.userId)) continue;
      items.add(
        _MentionPickItem.user(
          userId: candidate.userId,
          displayName: candidate.displayName,
        ),
      );
    }
    return items;
  }

  void _toggleMultiSelect() {
    setState(() {
      _multiSelect = true;
    });
  }

  void _cancelMultiSelect() {
    setState(() {
      _multiSelect = false;
      _selectedAll = false;
      _selectedUserIds.clear();
    });
  }

  void _toggleAll() {
    if (!_multiSelect) {
      Navigator.of(context).pop(const _MentionPickResult.all());
      return;
    }
    setState(() {
      _selectedAll = !_selectedAll;
    });
  }

  void _toggleCandidate(ChatMentionCandidate candidate) {
    if (!_multiSelect) {
      Navigator.of(context).pop(
        _MentionPickResult.user(
          userId: candidate.userId,
          displayName: candidate.displayName,
        ),
      );
      return;
    }
    setState(() {
      if (_selectedUserIds.contains(candidate.userId)) {
        _selectedUserIds.remove(candidate.userId);
      } else {
        _selectedUserIds.add(candidate.userId);
      }
    });
  }

  void _completeMultiSelect() {
    final items = _selectedItems;
    if (items.isEmpty) return;
    Navigator.of(context).pop(_MentionPickResult.multiple(items));
  }

  Map<String, List<ChatMentionCandidate>> _groupCandidates(
    List<ChatMentionCandidate> candidates,
  ) {
    final groups = <String, List<ChatMentionCandidate>>{};
    for (final candidate in candidates) {
      final initial = _mentionCandidateInitial(candidate);
      groups.putIfAbsent(initial, () => []).add(candidate);
    }
    return groups;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final visibleCandidates = _visibleCandidates;
    final groupedCandidates = _groupCandidates(visibleCandidates);
    final groupKeys = groupedCandidates.keys.toList(growable: false);
    return SafeArea(
      top: false,
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.72,
        child: Column(
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(top: 8, bottom: 10),
              decoration: BoxDecoration(
                color: colorScheme.onSurface.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              child: Row(
                children: [
                  SizedBox(
                    width: 72,
                    child: _multiSelect
                        ? TextButton(
                            onPressed: _cancelMultiSelect,
                            child: const Text('取消'),
                          )
                        : IconButton(
                            visualDensity: VisualDensity.compact,
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.close_rounded),
                          ),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        '选择提醒的人',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 72,
                    child: _multiSelect
                        ? FilledButton(
                            onPressed: _selectedCount > 0
                                ? _completeMultiSelect
                                : null,
                            style: FilledButton.styleFrom(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              backgroundColor: const Color(0xFF16C06E),
                              disabledBackgroundColor:
                                  colorScheme.onSurface.withValues(alpha: 0.12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: Text('完成 ($_selectedCount)'),
                          )
                        : TextButton(
                            onPressed: _toggleMultiSelect,
                            child: const Text('多选'),
                          ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: _MentionSearchField(
                controller: _searchController,
                selectedCandidates: widget.candidates
                    .where((candidate) =>
                        _selectedUserIds.contains(candidate.userId))
                    .toList(growable: false),
                selectedAll: _selectedAll,
                onChanged: (value) => setState(() => _query = value),
              ),
            ),
            if (widget.canMentionAll && _query.trim().isEmpty)
              _MentionTile(
                icon: Icons.campaign_outlined,
                title: '@所有人',
                subtitle: '提醒群内全部成员',
                selected: _selectedAll,
                multiSelect: _multiSelect,
                onTap: _toggleAll,
              ),
            Expanded(
              child: visibleCandidates.isEmpty
                  ? Center(
                      child: Text(
                        _query.trim().isEmpty ? '暂无可提醒成员' : '未找到相关成员',
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface.withValues(alpha: 0.56),
                        ),
                      ),
                    )
                  : Stack(
                      children: [
                        ListView.builder(
                          padding: EdgeInsets.only(bottom: 12 + bottomPadding),
                          itemCount: groupKeys.length,
                          itemBuilder: (context, groupIndex) {
                            final key = groupKeys[groupIndex];
                            final members = groupedCandidates[key]!;
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding:
                                      const EdgeInsets.fromLTRB(18, 14, 0, 6),
                                  child: Text(
                                    key,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: colorScheme.onSurface
                                          .withValues(alpha: 0.56),
                                    ),
                                  ),
                                ),
                                ...members.map(
                                  (candidate) => _MentionTile(
                                    avatarUrl: candidate.avatarUrl,
                                    title: candidate.displayName,
                                    selected: _selectedUserIds
                                        .contains(candidate.userId),
                                    multiSelect: _multiSelect,
                                    onTap: () => _toggleCandidate(candidate),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        Positioned(
                          top: 16,
                          right: 4,
                          bottom: 16 + bottomPadding,
                          child: _MentionIndexRail(labels: groupKeys),
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

String _mentionCandidateInitial(ChatMentionCandidate candidate) {
  final name = candidate.displayName.trim();
  if (name.isEmpty) return '#';
  final first = name.characters.first;
  final codeUnit = first.codeUnitAt(0);
  if (codeUnit >= 65 && codeUnit <= 90) return first;
  if (codeUnit >= 97 && codeUnit <= 122) return first.toUpperCase();
  const pinyinInitials = {
    '阿': 'A',
    '艾': 'A',
    '安': 'A',
    '昂': 'A',
    '邦': 'B',
    '半': 'B',
    '保': 'B',
    '别': 'B',
    '波': 'B',
    '蔡': 'C',
    '曹': 'C',
    '陈': 'C',
    '程': 'C',
    '戴': 'D',
    '邓': 'D',
    '丁': 'D',
    '董': 'D',
    '方': 'F',
    '范': 'F',
    '冯': 'F',
    '傅': 'F',
    '高': 'G',
    '郭': 'G',
    '何': 'H',
    '韩': 'H',
    '胡': 'H',
    '黄': 'H',
    '贾': 'J',
    '姜': 'J',
    '蒋': 'J',
    '李': 'L',
    '梁': 'L',
    '林': 'L',
    '刘': 'L',
    '卢': 'L',
    '吕': 'L',
    '罗': 'L',
    '马': 'M',
    '潘': 'P',
    '彭': 'P',
    '任': 'R',
    '沈': 'S',
    '石': 'S',
    '宋': 'S',
    '苏': 'S',
    '孙': 'S',
    '唐': 'T',
    '田': 'T',
    '王': 'W',
    '魏': 'W',
    '吴': 'W',
    '汪': 'W',
    '夏': 'X',
    '谢': 'X',
    '许': 'X',
    '徐': 'X',
    '薛': 'X',
    '杨': 'Y',
    '姚': 'Y',
    '叶': 'Y',
    '余': 'Y',
    '于': 'Y',
    '袁': 'Y',
    '张': 'Z',
    '赵': 'Z',
    '郑': 'Z',
    '钟': 'Z',
    '周': 'Z',
    '朱': 'Z',
  };
  final initial = pinyinInitials[first];
  if (initial != null) return initial;
  return '#';
}

class _MentionSearchField extends StatelessWidget {
  final TextEditingController controller;
  final List<ChatMentionCandidate> selectedCandidates;
  final bool selectedAll;
  final ValueChanged<String> onChanged;

  const _MentionSearchField({
    required this.controller,
    required this.selectedCandidates,
    required this.selectedAll,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final selectedItems = [
      if (selectedAll)
        const ChatMentionCandidate(userId: '__all__', displayName: '所有人'),
      ...selectedCandidates,
    ];
    return Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          if (selectedItems.isEmpty)
            Icon(
              Icons.search_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.36),
            )
          else
            ...selectedItems.take(5).map(
                  (candidate) => Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: _MentionAvatar(
                      icon: candidate.userId == '__all__'
                          ? Icons.campaign_outlined
                          : null,
                      avatarUrl: candidate.avatarUrl,
                      title: candidate.displayName,
                      radius: 18,
                    ),
                  ),
                ),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: InputDecoration(
                hintText: '搜索',
                hintStyle: TextStyle(
                  color: colorScheme.onSurface.withValues(alpha: 0.38),
                  fontSize: 16,
                ),
                isCollapsed: true,
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MentionTile extends StatelessWidget {
  final IconData? icon;
  final String? avatarUrl;
  final String title;
  final String? subtitle;
  final bool selected;
  final bool multiSelect;
  final VoidCallback onTap;

  const _MentionTile({
    this.icon,
    this.avatarUrl,
    required this.title,
    this.subtitle,
    this.selected = false,
    this.multiSelect = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        height: subtitle == null ? 56 : 64,
        child: Row(
          children: [
            const SizedBox(width: 16),
            if (multiSelect) ...[
              _MentionCheckbox(selected: selected),
              const SizedBox(width: 12),
            ],
            _MentionAvatar(icon: icon, avatarUrl: avatarUrl, title: title),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 16,
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (subtitle != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: colorScheme.onSurface.withValues(alpha: 0.56),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (!multiSelect)
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.28),
              ),
            const SizedBox(width: 12),
          ],
        ),
      ),
    );
  }
}

class _MentionCheckbox extends StatelessWidget {
  final bool selected;

  const _MentionCheckbox({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? const Color(0xFF16C06E) : Colors.transparent,
        border: selected
            ? null
            : Border.all(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.28),
                width: 1.4,
              ),
      ),
      alignment: Alignment.center,
      child: selected
          ? Icon(
              Icons.check_rounded,
              size: 18,
              color: Theme.of(context).colorScheme.surface,
            )
          : null,
    );
  }
}

class _MentionIndexRail extends StatelessWidget {
  final List<String> labels;

  const _MentionIndexRail({required this.labels});

  @override
  Widget build(BuildContext context) {
    if (labels.isEmpty) return const SizedBox.shrink();
    final colorScheme = Theme.of(context).colorScheme;
    return IgnorePointer(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_rounded,
            size: 14,
            color: colorScheme.onSurface.withValues(alpha: 0.54),
          ),
          ...labels.map(
            (label) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 1),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: label == labels.first
                      ? const Color(0xFF16C06E)
                      : colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MentionAvatar extends StatelessWidget {
  final IconData? icon;
  final String? avatarUrl;
  final String title;
  final double radius;

  const _MentionAvatar({
    this.icon,
    this.avatarUrl,
    required this.title,
    this.radius = 20,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final size = radius * 2;
    if (icon == null) {
      return UserAvatar(
        avatarUrl: avatarUrl,
        name: title,
        size: size,
        borderRadius: radius * 0.3,
      );
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
      child: Icon(icon, size: radius + 1, color: colorScheme.primary),
    );
  }
}

// ---------------------------------------------------------------------------
// 更多工具面板
// ---------------------------------------------------------------------------

class _ToolsPanel extends StatelessWidget {
  final bool isGroup;
  final double bottomPadding;
  final VoidCallback onPickImages;
  final VoidCallback onTakePhoto;
  final VoidCallback onPickFile;
  final VoidCallback onVoiceCall;
  final VoidCallback onVideoCall;
  final VoidCallback onLocation;
  final VoidCallback? onFavorite;
  final VoidCallback? onSendContactCard;
  final VoidCallback onScheduleMessage;
  final VoidCallback? onQuickReply;
  final VoidCallback? onAiReply;

  const _ToolsPanel({
    required this.isGroup,
    required this.bottomPadding,
    required this.onPickImages,
    required this.onTakePhoto,
    required this.onPickFile,
    required this.onVoiceCall,
    required this.onVideoCall,
    required this.onLocation,
    required this.onFavorite,
    this.onSendContactCard,
    required this.onScheduleMessage,
    this.onQuickReply,
    this.onAiReply,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tools = [
      _ToolItem(
          icon: Icons.photo_library_outlined,
          label: l10n.chatToolPhotos,
          onTap: onPickImages),
      _ToolItem(
          icon: Icons.camera_alt_outlined,
          label: l10n.chatToolCamera,
          onTap: onTakePhoto),
      _ToolItem(
          icon: Icons.insert_drive_file_outlined,
          label: l10n.chatToolFile,
          onTap: onPickFile),
      _ToolItem(
        icon: Icons.schedule_send_outlined,
        label: '定时消息',
        onTap: onScheduleMessage,
      ),
      _ToolItem(
          icon: Icons.location_on_outlined,
          label: l10n.chatToolLocation,
          onTap: onLocation),
      _ToolItem(
          icon: Icons.contact_page_outlined,
          label: l10n.chatToolContactCard,
          onTap: () {
            onSendContactCard?.call();
          }),
      if (onQuickReply != null)
        _ToolItem(
          icon: Icons.quickreply_outlined,
          label: '话术',
          onTap: onQuickReply!,
        ),
      if (onAiReply != null)
        _ToolItem(
          icon: Icons.auto_awesome_outlined,
          label: 'AI回复',
          onTap: onAiReply!,
        ),
      if (!isGroup) ...[
        _ToolItem(
            icon: Icons.phone_outlined,
            label: l10n.chatToolVoiceCall,
            onTap: onVoiceCall),
        _ToolItem(
            icon: Icons.videocam_outlined,
            label: l10n.chatToolVideoCall,
            onTap: onVideoCall),
      ],
      if (onFavorite != null)
        _ToolItem(
            icon: Icons.star_border_rounded,
            label: l10n.chatToolFavorites,
            onTap: onFavorite!),
    ];

    final pages = <List<_ToolItem>>[];
    for (var i = 0; i < tools.length; i += 8) {
      pages.add(tools.skip(i).take(8).toList(growable: false));
    }

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottomPadding),
      child: SizedBox(
        height: 178,
        child: PageView.builder(
          itemCount: pages.length,
          physics: pages.length > 1
              ? const PageScrollPhysics()
              : const NeverScrollableScrollPhysics(),
          itemBuilder: (context, pageIndex) {
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 6,
                crossAxisSpacing: 10,
                mainAxisExtent: 82,
              ),
              itemCount: pages[pageIndex].length,
              itemBuilder: (context, index) =>
                  _ToolCell(item: pages[pageIndex][index]),
            );
          },
        ),
      ),
    );
  }
}

class _AiReplySuggestionSheet extends StatelessWidget {
  final String? contextText;

  const _AiReplySuggestionSheet({required this.contextText});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final suggestions = _buildSuggestions(contextText);
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.56,
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(top: 8, bottom: 8),
            decoration: BoxDecoration(
              color: colorScheme.onSurface.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.auto_awesome_outlined,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'AI回复',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          if (contextText?.trim().isNotEmpty == true)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '参考客户消息：${contextText!.trim()}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  height: 1.35,
                  color: colorScheme.onSurface.withValues(alpha: 0.56),
                ),
              ),
            ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
              itemCount: suggestions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, index) {
                final suggestion = suggestions[index];
                return _AiReplySuggestionTile(text: suggestion);
              },
            ),
          ),
        ],
      ),
    );
  }

  List<String> _buildSuggestions(String? rawContext) {
    final context = rawContext?.trim() ?? '';
    final lower = context.toLowerCase();
    final suggestions = <String>[];

    if (context.contains('退款') || context.contains('退货')) {
      suggestions.add('您好，关于退款/退货问题我先帮您核实订单状态。麻烦您提供一下订单号，我确认后给您处理方案。');
    } else if (context.contains('订单') || context.contains('物流')) {
      suggestions.add('您好，我先帮您查询订单和物流状态。麻烦您发一下订单号，我确认后马上回复您。');
    } else if (context.contains('价格') ||
        context.contains('多少钱') ||
        context.contains('报价')) {
      suggestions.add('您好，价格会根据具体方案和数量有所不同。我先了解一下您的需求，再给您准确报价。');
    } else if (context.contains('投诉') || context.contains('不满意')) {
      suggestions.add('您好，非常抱歉给您带来不好的体验。我先记录并核实情况，会尽快给您一个明确处理结果。');
    } else if (lower.contains('hello') || lower.contains('hi')) {
      suggestions.add('您好，我在的。请问有什么可以帮您处理？');
    }

    suggestions.addAll([
      '您好，我已收到您的消息。我先帮您核实一下具体情况，稍后给您回复。',
      '收到，为了更快帮您处理，麻烦您补充一下订单号或相关截图。',
      '理解您的情况，我会尽快帮您跟进处理，处理进展会在这里同步给您。',
    ]);

    final seen = <String>{};
    return suggestions.where(seen.add).take(4).toList();
  }
}

class _AiReplySuggestionTile extends StatelessWidget {
  final String text;

  const _AiReplySuggestionTile({required this.text});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).pop(text),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.auto_awesome_outlined,
                size: 18,
                color: AppColors.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.38,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.add_rounded,
                size: 18,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickReplyPickerSheet extends ConsumerStatefulWidget {
  final String? scope;

  const _QuickReplyPickerSheet({required this.scope});

  @override
  ConsumerState<_QuickReplyPickerSheet> createState() =>
      _QuickReplyPickerSheetState();
}

class _QuickReplyPickerSheetState
    extends ConsumerState<_QuickReplyPickerSheet> {
  final _searchController = TextEditingController();
  final _searchDebouncer = Debouncer();
  String _query = '';

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final repliesAsync =
        ref.watch(customerServiceQuickRepliesProvider(widget.scope));
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.62,
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(top: 8, bottom: 8),
            decoration: BoxDecoration(
              color: colorScheme.onSurface.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                Text(
                  '常用话术',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: _QuickReplySheetSearchField(
              controller: _searchController,
              query: _query,
              onChanged: _onSearchChanged,
              onClear: () => setState(() {
                _searchDebouncer.cancel();
                _searchController.clear();
                _query = '';
              }),
            ),
          ),
          Expanded(
            child: repliesAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (_, __) => _QuickReplyStateView(
                icon: Icons.cloud_off_outlined,
                title: '话术加载失败',
                subtitle: '请稍后重试',
                onRetry: () => ref
                    .read(customerServiceQuickRepliesProvider(widget.scope)
                        .notifier)
                    .refresh(),
              ),
              data: (replies) {
                final filtered = _filterQuickReplyPickerItems(replies, _query);
                if (replies.isEmpty) {
                  return const _QuickReplyStateView(
                    icon: Icons.quickreply_outlined,
                    title: '暂无话术',
                    subtitle: '话术库启用后会显示在这里',
                  );
                }
                if (filtered.isEmpty) {
                  return const _QuickReplyStateView(
                    icon: Icons.search_off_outlined,
                    title: '没有匹配的话术',
                    subtitle: '换个关键词试试',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, index) {
                    final reply = filtered[index];
                    return _QuickReplyPickerTile(reply: reply);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickReplySheetSearchField extends StatelessWidget {
  final TextEditingController controller;
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _QuickReplySheetSearchField({
    required this.controller,
    required this.query,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: '搜索话术',
        prefixIcon: Icon(
          Icons.search,
          color: colorScheme.onSurface.withValues(alpha: 0.42),
        ),
        suffixIcon: query.trim().isEmpty
            ? null
            : IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: onClear,
                icon: Icon(
                  Icons.cancel,
                  size: 18,
                  color: colorScheme.onSurface.withValues(alpha: 0.38),
                ),
              ),
        filled: true,
        fillColor: Theme.of(context).scaffoldBackgroundColor,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

List<CsQuickReply> _filterQuickReplyPickerItems(
  List<CsQuickReply> replies,
  String query,
) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return replies;
  return replies.where((reply) {
    final searchable = [
      reply.title,
      reply.content,
      reply.category,
      reply.scopeLabel,
      ...reply.tags,
    ].join(' ').toLowerCase();
    return searchable.contains(q);
  }).toList(growable: false);
}

class _QuickReplyPickerTile extends StatelessWidget {
  final CsQuickReply reply;

  const _QuickReplyPickerTile({required this.reply});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).pop(reply),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      reply.title.isNotEmpty ? reply.title : '未命名话术',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    reply.category,
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withValues(alpha: 0.46),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                reply.content,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.35,
                  color: colorScheme.onSurface.withValues(alpha: 0.78),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickReplyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onRetry;

  const _QuickReplyStateView({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 44,
              color: colorScheme.onSurface.withValues(alpha: 0.28),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 13,
                color: colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: onRetry, child: const Text('重试')),
            ],
          ],
        ),
      ),
    );
  }
}

class _ToolItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _ToolItem(
      {required this.icon, required this.label, required this.onTap});
}

class _ToolCell extends StatelessWidget {
  final _ToolItem item;
  const _ToolCell({required this.item});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: item.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.divider),
            ),
            child: Icon(item.icon,
                size: 28, color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 4),
          Text(
            item.label,
            style: const TextStyle(
              fontSize: 11,
              height: 1.15,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
