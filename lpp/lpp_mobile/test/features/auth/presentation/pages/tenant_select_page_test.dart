import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/auth/presentation/pages/tenant_select_page.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

void main() {
  testWidgets('shows personal space when registration has no tenants',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(
            () => _TenantSelectAuthNotifier(
              const AuthState(
                status: AuthStatus.unauthenticated,
                platformToken: 'platform-token',
              ),
            ),
          ),
        ],
        child: const MaterialApp(home: TenantSelectPage()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('个人空间'), findsOneWidget);
    expect(find.text('暂无可用组织'), findsNothing);
  });
}

class _TenantSelectAuthNotifier extends AuthNotifier {
  _TenantSelectAuthNotifier(this._state);

  final AuthState _state;

  @override
  Future<AuthState> build() async => _state;
}
