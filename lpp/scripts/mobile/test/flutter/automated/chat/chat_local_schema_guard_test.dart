import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';

void main() {
  group('chat local schema guard', () {
    test('treats duplicate column errors as idempotent schema success', () {
      final error = _FakeSqliteError(
        'DatabaseException(duplicate column name: last_message_is_self '
        '(code 1 SQLITE_ERROR): , while compiling: ALTER TABLE conversations '
        'ADD COLUMN last_message_is_self INTEGER NOT NULL DEFAULT 0)',
      );

      expect(
        isDuplicateColumnSqliteError(error, 'last_message_is_self'),
        isTrue,
      );
    });
  });
}

class _FakeSqliteError {
  final String message;

  const _FakeSqliteError(this.message);

  @override
  String toString() => message;
}
