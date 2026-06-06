import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

enum MentionComposerTokenType { user, all }

class MentionComposerToken {
  final MentionComposerTokenType type;
  final String? userId;
  final String label;

  const MentionComposerToken._({
    required this.type,
    required this.userId,
    required this.label,
  });

  const MentionComposerToken.user({
    required String userId,
    required String label,
  }) : this._(
          type: MentionComposerTokenType.user,
          userId: userId,
          label: label,
        );

  const MentionComposerToken.all({
    required String label,
  }) : this._(
          type: MentionComposerTokenType.all,
          userId: null,
          label: label,
        );

  Mention toMention(int offset) {
    if (type == MentionComposerTokenType.all) {
      return Mention.all(offset: offset, length: label.length);
    }
    return Mention.user(
      userId: userId ?? '',
      offset: offset,
      length: label.length,
    );
  }
}

class MentionComposerDraft {
  final String text;
  final List<MentionComposerToken> tokens;

  const MentionComposerDraft({
    required this.text,
    required this.tokens,
  });

  const MentionComposerDraft.empty() : this(text: '', tokens: const []);

  List<Mention> get mentions {
    final result = <Mention>[];
    var searchStart = 0;
    for (final token in tokens) {
      final offset = text.indexOf(token.label, searchStart);
      if (offset < 0) continue;
      result.add(token.toMention(offset));
      searchStart = offset + token.label.length;
    }
    return result;
  }

  MentionComposerDraft insertUser({
    required String userId,
    required String displayName,
    required int selectionStart,
    required int selectionEnd,
  }) {
    final label = '@$displayName';
    return _insert(
      insertedText: '$label ',
      token: MentionComposerToken.user(userId: userId, label: label),
      selectionStart: selectionStart,
      selectionEnd: selectionEnd,
    );
  }

  MentionComposerDraft insertAll({
    required int selectionStart,
    required int selectionEnd,
  }) {
    const label = '@所有人';
    return _insert(
      insertedText: '$label ',
      token: const MentionComposerToken.all(label: label),
      selectionStart: selectionStart,
      selectionEnd: selectionEnd,
    );
  }

  MentionComposerDraft _insert({
    required String insertedText,
    required MentionComposerToken token,
    required int selectionStart,
    required int selectionEnd,
  }) {
    final start = selectionStart < 0 ? text.length : selectionStart;
    final end = selectionEnd < 0 ? text.length : selectionEnd;
    final safeStart = start.clamp(0, text.length);
    final safeEnd = end.clamp(safeStart, text.length);
    return MentionComposerDraft(
      text: text.replaceRange(safeStart, safeEnd, insertedText),
      tokens: [...tokens, token],
    );
  }
}
