import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/app/theme/theme.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/utils/validators.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/privacy_page.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/terms_page.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// 登录 Tab 枚举（3 个）
// ---------------------------------------------------------------------------

enum _LoginTab {
  mobile,
  email,
  loginName;
}

const _lastLoginTypeKey = 'auth_last_login_type';
const _lastLoginIdentifierKey = 'auth_last_login_identifier';
const _lastLoginIdentifierMobileKey = 'auth_last_login_identifier_mobile';
const _lastLoginIdentifierEmailKey = 'auth_last_login_identifier_email';
const _lastLoginIdentifierLppIdKey = 'auth_last_login_identifier_lpp_id';
const _enableQuickLogin =
    !kReleaseMode || bool.fromEnvironment('ENABLE_QUICK_LOGIN');

const _quickLoginAccounts = [
  _QuickLoginAccount(
    label: '所有者(4)',
    name: 'StartLink所有者',
    identifier: 'lpp_owner_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_owner_1776587541@test.com',
    mobile: null,
    lppId: 'lpp_aej69f2o',
  ),
  _QuickLoginAccount(
    label: '管理员(3)',
    name: 'StartLink管理员',
    identifier: 'lpp_admin2_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_admin2_1776587541@test.com',
    lppId: 'lpp_ktldhxlm',
  ),
  _QuickLoginAccount(
    label: '客服(2) 邮箱',
    name: 'StartLink客服',
    identifier: 'lpp_cs2_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cs2_1776587541@test.com',
  ),
  _QuickLoginAccount(
    label: '技术支持(1) 邮箱',
    name: 'StartLink技术支持',
    identifier: 'lpp_tech2_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_tech2_1776587541@test.com',
  ),
  _QuickLoginAccount(
    label: '普通员工(0) 邮箱',
    name: 'StartLink普通员工',
    identifier: 'lpp_member2_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_member2_1776587541@test.com',
  ),
  _QuickLoginAccount(
    label: '客户归属客服 星络号',
    name: '文档用户',
    identifier: 'lpp_hlty0ap2',
    password: '123123123',
    tab: _LoginTab.loginName,
    description: '星络号登录',
    lppId: 'lpp_hlty0ap2',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: 'StartLink客服',
  ),
  _QuickLoginAccount(
    label: '客服无归属 星络号',
    name: 'mouse客服',
    identifier: 'lpp_gs9fn2c7',
    password: '123123123',
    tab: _LoginTab.loginName,
    description: '星络号登录',
    lppId: 'lpp_gs9fn2c7',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户1 邮箱',
    name: 'StartLink客户1',
    identifier: 'lpp_cust1_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust1_1776587541@test.com',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户2 邮箱',
    name: 'StartLink客户2',
    identifier: 'lpp_cust2_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust2_1776587541@test.com',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户3 邮箱',
    name: 'StartLink客户3',
    identifier: 'lpp_cust3_1776618853@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust3_1776618853@test.com',
    enterprise: '-',
    assignedServiceStaff: '-',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户4 邮箱',
    name: 'StartLink客户4',
    identifier: 'lpp_cust4_1776618853@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust4_1776618853@test.com',
    enterprise: '-',
    assignedServiceStaff: '-',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户5 邮箱',
    name: 'StartLink客户5',
    identifier: 'lpp_cust5_1776618853@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust5_1776618853@test.com',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户6 邮箱',
    name: 'StartLink客户6',
    identifier: 'lpp_cust6_1776618853@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust6_1776618853@test.com',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: 'StartLink客户7 邮箱',
    name: 'StartLink客户7',
    identifier: 'lpp_cust7_1776618853@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '邮箱登录',
    email: 'lpp_cust7_1776618853@test.com',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: '测试客户A',
    name: '测试客户A',
    identifier: 'lpp_cust_a_1776700001@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: 'pending 申请中',
    email: 'lpp_cust_a_1776700001@test.com',
    lppId: 'lpp_2bbkgu37',
    enterprise: '申请中',
    assignedServiceStaff: '-',
  ),
  _QuickLoginAccount(
    label: '测试客户B',
    name: '测试客户B',
    identifier: 'lpp_cust_b_1776700001@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '已加入企业',
    email: 'lpp_cust_b_1776700001@test.com',
    lppId: 'lpp_5oubye2x',
    enterprise: 'Mouse 测试企业',
    assignedServiceStaff: '未分配',
  ),
  _QuickLoginAccount(
    label: '个人用户A 邮箱',
    name: '个人用户A',
    identifier: 'lpp_pa_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '个人空间/好友/通话',
    email: 'lpp_pa_1776587541@test.com',
  ),
  _QuickLoginAccount(
    label: '个人用户B 邮箱',
    name: '个人用户B',
    identifier: 'lpp_pb_1776587541@test.com',
    password: '123123123',
    tab: _LoginTab.email,
    description: '个人空间/好友/通话',
    email: 'lpp_pb_1776587541@test.com',
  ),
  _QuickLoginAccount(
    label: '企业专属用户',
    name: '企业专属用户',
    identifier: 'lpp_ent_1776587541',
    password: '123123123',
    tab: _LoginTab.loginName,
    description: '企业专属登录名',
    loginName: 'lpp_ent_1776587541',
  ),
  _QuickLoginAccount(
    label: '管理后台 admin',
    name: 'admin',
    identifier: 'admin',
    password: '123123123',
    tab: _LoginTab.loginName,
    description: '管理后台账号',
    loginName: 'admin',
  ),
];

class _QuickLoginAccount {
  final String label;
  final String name;
  final String identifier;
  final String password;
  final _LoginTab tab;
  final String description;
  final String? email;
  final String? mobile;
  final String? lppId;
  final String? loginName;
  final String? enterprise;
  final String? assignedServiceStaff;

  const _QuickLoginAccount({
    required this.label,
    required this.name,
    required this.identifier,
    required this.password,
    required this.tab,
    required this.description,
    this.email,
    this.mobile,
    this.lppId,
    this.loginName,
    this.enterprise,
    this.assignedServiceStaff,
  });
}

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  _LoginTab _tab = _LoginTab.email;

  // 手机/邮箱 Tab 内部：true=验证码，false=密码
  bool _mobileUseCode = false;
  bool _emailUseCode = false;

  // 国家/地区码
  _CountryCode _countryCode = _CountryCode.codes.first;

  final _identifierCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _identifierFocusNode = FocusNode(); // 主输入框焦点

  bool _agreedToTerms = false;
  bool _obscurePassword = true;

  int _countdown = 0;
  Timer? _countdownTimer;

  // 图形验证码
  String? _captchaToken;
  String? _captchaQuestion;
  bool _showCaptcha = false;
  final _captchaAnswerCtrl = TextEditingController();
  final _captchaAnswerFocusNode = FocusNode();
  final Map<_LoginTab, String> _rememberedIdentifiers = {};
  final Map<_LoginTab, String> _identifierDrafts = {};
  bool _syncingIdentifier = false;
  int _logoTapCount = 0;
  Timer? _logoTapResetTimer;

  @override
  void initState() {
    super.initState();
    _identifierCtrl.addListener(_onIdentifierChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _restoreLastLoginAccount();
      _checkCaptchaRequired();
      // 页面打开时自动聚焦主输入框（Mac 键盘需要）
      _identifierFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _identifierCtrl.removeListener(_onIdentifierChanged);
    _identifierCtrl.dispose();
    _passwordCtrl.dispose();
    _codeCtrl.dispose();
    _identifierFocusNode.dispose();
    _captchaAnswerCtrl.dispose();
    _captchaAnswerFocusNode.dispose();
    _countdownTimer?.cancel();
    _logoTapResetTimer?.cancel();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // 进入页面时检查是否需要验证码
  // ---------------------------------------------------------------------------

  Future<void> _checkCaptchaRequired() async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio
          .get<Map<String, dynamic>>('/api/client/v1/auth/captcha/check');
      final required = resp.data?['data']?['captchaRequired'] as bool? ?? false;
      if (required && mounted) {
        await _fetchCaptcha(showOverlayWhenUnsolved: true);
      }
    } catch (_) {}
  }

  Future<void> _restoreLastLoginAccount() async {
    try {
      final storage = ref.read(secureStorageProvider);
      final type = await storage.read(_lastLoginTypeKey);
      final mobile = await storage.read(_lastLoginIdentifierMobileKey);
      final email = await storage.read(_lastLoginIdentifierEmailKey);
      final legacyIdentifier = await storage.read(_lastLoginIdentifierKey);
      if (!mounted) return;

      _rememberedIdentifiers
        ..clear()
        ..addAll({
          if (mobile != null && mobile.isNotEmpty) _LoginTab.mobile: mobile,
          if (email != null && email.isNotEmpty) _LoginTab.email: email,
        });

      final tab = _tabFromLoginType(type);
      if (tab != null &&
          tab != _LoginTab.loginName &&
          !_rememberedIdentifiers.containsKey(tab) &&
          legacyIdentifier != null &&
          legacyIdentifier.isNotEmpty) {
        _rememberedIdentifiers[tab] = legacyIdentifier;
      }

      final targetTab = tab ?? _tab;
      final identifier = _rememberedIdentifiers[targetTab];

      setState(() {
        _tab = targetTab;
        _setIdentifierText(identifier ?? '');
        _passwordCtrl.clear();
        _codeCtrl.clear();
      });
    } catch (_) {}
  }

  Future<void> _rememberLastLoginAccount(_LoginTab tab, String id) async {
    try {
      final storage = ref.read(secureStorageProvider);
      _rememberedIdentifiers[tab] = id;
      _identifierDrafts[tab] = id;
      await storage.write(_lastLoginTypeKey, _loginTypeForTab(tab));
      await storage.write(_lastLoginIdentifierKey, id);
      await storage.write(_identifierStorageKeyForTab(tab), id);
    } catch (_) {}
  }

  String _identifierStorageKeyForTab(_LoginTab tab) {
    switch (tab) {
      case _LoginTab.mobile:
        return _lastLoginIdentifierMobileKey;
      case _LoginTab.email:
        return _lastLoginIdentifierEmailKey;
      case _LoginTab.loginName:
        return _lastLoginIdentifierLppIdKey;
    }
  }

  void _onIdentifierChanged() {
    if (_syncingIdentifier) return;
    _identifierDrafts[_tab] = _identifierCtrl.text;
  }

  void _setIdentifierText(String value) {
    _syncingIdentifier = true;
    _identifierCtrl.text = value;
    _identifierCtrl.selection = TextSelection.collapsed(offset: value.length);
    _syncingIdentifier = false;
  }

  String _identifierForTab(_LoginTab tab) {
    if (_identifierDrafts.containsKey(tab)) {
      return _identifierDrafts[tab] ?? '';
    }
    return _rememberedIdentifiers[tab] ?? '';
  }

  void _switchLoginTab(_LoginTab tab) {
    if (tab == _tab) return;
    _identifierDrafts[_tab] = _identifierCtrl.text;
    setState(() {
      _tab = tab;
      _setIdentifierText(_identifierForTab(tab));
      _passwordCtrl.clear();
      _codeCtrl.clear();
      _countdown = 0;
      _countdownTimer?.cancel();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _identifierFocusNode.requestFocus();
    });
  }

  String _loginTypeForTab(_LoginTab tab) {
    switch (tab) {
      case _LoginTab.mobile:
        return 'mobile';
      case _LoginTab.email:
        return 'email';
      case _LoginTab.loginName:
        return 'lpp_id';
    }
  }

  _LoginTab? _tabFromLoginType(String? type) {
    switch (type) {
      case 'mobile':
        return _LoginTab.mobile;
      case 'email':
        return _LoginTab.email;
      case 'lpp_id':
      case 'login_name':
        return _LoginTab.loginName;
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // 倒计时
  // ---------------------------------------------------------------------------

  void _startCountdown() {
    setState(() => _countdown = 60);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) {
        t.cancel();
        if (mounted) setState(() => _countdown = 0);
      } else {
        if (mounted) setState(() => _countdown--);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 发送验证码
  // ---------------------------------------------------------------------------

  String _tabLabel(_LoginTab tab) {
    final l10n = AppLocalizations.of(context);
    switch (tab) {
      case _LoginTab.mobile:
        return l10n.authTabMobile;
      case _LoginTab.email:
        return l10n.authTabEmail;
      case _LoginTab.loginName:
        return l10n.authTabLoginName;
    }
  }

  Future<void> _sendCode() async {
    final id = _identifierCtrl.text.trim();
    if (_tab == _LoginTab.mobile) {
      final err = Validators.validateMobile(id);
      if (err != null) {
        _showError(err);
        return;
      }
    } else {
      final err = Validators.validateEmail(id);
      if (err != null) {
        _showError(err);
        return;
      }
    }
    final channel = _tab == _LoginTab.email ? 'email' : 'sms';
    try {
      await ref.read(authProvider.notifier).sendVerificationCode(id, channel);
      _startCountdown();
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // 登录
  // ---------------------------------------------------------------------------

  Future<void> _login({
    String? captchaToken,
    String? captchaAnswer,
    bool allowAutoCaptcha = true,
  }) async {
    if (!_agreedToTerms) return;

    final id = _identifierCtrl.text.trim();
    final notifier = ref.read(authProvider.notifier);
    final l10n = AppLocalizations.of(context);
    final effectiveCaptchaToken = captchaToken ?? _captchaToken;
    final effectiveCaptchaAnswer = captchaAnswer ??
        (_captchaAnswerCtrl.text.trim().isEmpty
            ? null
            : _captchaAnswerCtrl.text.trim());

    try {
      switch (_tab) {
        case _LoginTab.mobile:
          final mErr = Validators.validateMobile(id);
          if (mErr != null) {
            _showError(mErr);
            return;
          }
          if (_mobileUseCode) {
            final code = _codeCtrl.text.trim();
            if (code.isEmpty) {
              _showError(l10n.authErrorEmptyCode);
              return;
            }
            await notifier.loginByCode(id, code, 'mobile',
                captchaToken: effectiveCaptchaToken,
                captchaAnswer: effectiveCaptchaAnswer);
          } else {
            final pw = _passwordCtrl.text;
            if (pw.isEmpty) {
              _showError(l10n.authErrorEmptyPassword);
              return;
            }
            await notifier.loginByPassword(id, pw, 'mobile',
                captchaToken: effectiveCaptchaToken,
                captchaAnswer: effectiveCaptchaAnswer);
          }

        case _LoginTab.email:
          final eErr = Validators.validateEmail(id);
          if (eErr != null) {
            _showError(eErr);
            return;
          }
          if (_emailUseCode) {
            final code = _codeCtrl.text.trim();
            if (code.isEmpty) {
              _showError(l10n.authErrorEmptyCode);
              return;
            }
            await notifier.loginByCode(id, code, 'email',
                captchaToken: effectiveCaptchaToken,
                captchaAnswer: effectiveCaptchaAnswer);
          } else {
            final pw = _passwordCtrl.text;
            if (pw.isEmpty) {
              _showError(l10n.authErrorEmptyPassword);
              return;
            }
            await notifier.loginByPassword(id, pw, 'email',
                captchaToken: effectiveCaptchaToken,
                captchaAnswer: effectiveCaptchaAnswer);
          }

        case _LoginTab.loginName:
          if (id.isEmpty) {
            _showError(l10n.authErrorEmptyLoginName);
            return;
          }
          final pw = _passwordCtrl.text;
          if (pw.isEmpty) {
            _showError(l10n.authErrorEmptyPassword);
            return;
          }
          await notifier.loginByPassword(id, pw, 'lpp_id',
              captchaToken: effectiveCaptchaToken,
              captchaAnswer: effectiveCaptchaAnswer);
      }
      await _rememberLastLoginAccount(_tab, id);
      _clearCaptcha();
      _passwordCtrl.clear();
    } catch (e) {
      if (_isCaptchaError(e) && allowAutoCaptcha) {
        final solved = await _fetchCaptcha(showOverlayWhenUnsolved: true);
        if (solved) {
          await _login(
            captchaToken: _captchaToken,
            captchaAnswer: _captchaAnswerCtrl.text.trim(),
            allowAutoCaptcha: false,
          );
        }
        return;
      }
      if (_isCaptchaError(e)) {
        await _fetchCaptcha(showOverlayWhenUnsolved: true);
        if (mounted) {
          _showError(l10n.authCaptchaHint);
        }
        return;
      }
      if (e is ServerError) {
        _showError(e.message);
      } else if (e is AuthError) {
        _showError('账号或密码错误');
      } else if (e is NetworkError) {
        _showError(e.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 图形验证码
  // ---------------------------------------------------------------------------

  Future<bool> _fetchCaptcha({required bool showOverlayWhenUnsolved}) async {
    final l10n = AppLocalizations.of(context);
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio
          .post<Map<String, dynamic>>('/api/client/v1/auth/captcha/generate');
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (data != null && mounted) {
        final question = (data['question'] as String?) ??
            (data['captchaQuestion'] as String?) ??
            l10n.authCaptchaHint;
        final autoAnswer = _solveCaptchaQuestion(question);
        setState(() {
          _captchaToken = data['token'] as String?;
          _captchaQuestion = question;
          _captchaAnswerCtrl.text = autoAnswer?.toString() ?? '';
          _showCaptcha = autoAnswer == null && showOverlayWhenUnsolved;
        });
        if (autoAnswer == null && showOverlayWhenUnsolved) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _showCaptcha) {
              _captchaAnswerFocusNode.requestFocus();
            }
          });
        }
        return autoAnswer != null && _captchaToken != null;
      }
    } catch (_) {
      _showError(l10n.authCaptchaFailed);
    }
    return false;
  }

  bool _isCaptchaError(Object e) {
    if (e is ServerError) {
      final code = e.code.toUpperCase();
      final message = e.message.toLowerCase();
      return code == 'AUTH_CAPTCHA_REQUIRED' ||
          code == 'AUTH_CAPTCHA_INVALID' ||
          message.contains('captcha') ||
          message.contains('图形验证码') ||
          message.contains('安全验证');
    }
    final text = e.toString().toLowerCase();
    return text.contains('auth_captcha_required') ||
        text.contains('auth_captcha_invalid') ||
        text.contains('captcha verification is required') ||
        text.contains('captcha') ||
        text.contains('图形验证码') ||
        text.contains('安全验证');
  }

  void _clearCaptcha() {
    if (!mounted) return;
    setState(() {
      _captchaToken = null;
      _captchaQuestion = null;
      _showCaptcha = false;
      _captchaAnswerCtrl.clear();
    });
  }

  int? _solveCaptchaQuestion(String? question) {
    if (question == null) return null;
    final normalized = question
        .replaceAll('＋', '+')
        .replaceAll('加', '+')
        .replaceAll('－', '-')
        .replaceAll('减', '-')
        .replaceAll('×', '*')
        .replaceAll('x', '*')
        .replaceAll('X', '*')
        .replaceAll('乘', '*')
        .replaceAll('÷', '/')
        .replaceAll('除以', '/')
        .replaceAll('除', '/');
    final match =
        RegExp(r'(-?\d+)\s*([+\-*/])\s*(-?\d+)').firstMatch(normalized);
    if (match == null) return null;
    final left = int.tryParse(match.group(1)!);
    final op = match.group(2);
    final right = int.tryParse(match.group(3)!);
    if (left == null || op == null || right == null) return null;
    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right == 0 || left % right != 0) return null;
        return left ~/ right;
    }
    return null;
  }

  Future<void> _submitWithCaptcha() async {
    final l10n = AppLocalizations.of(context);
    var answer = _captchaAnswerCtrl.text.trim();
    if (answer.isEmpty) {
      _showError(l10n.authCaptchaHint);
      return;
    }
    if (_captchaToken == null) {
      final solved = await _fetchCaptcha(showOverlayWhenUnsolved: true);
      if (!solved) return;
      answer = _captchaAnswerCtrl.text.trim();
    }
    _captchaAnswerFocusNode.unfocus();
    setState(() => _showCaptcha = false);
    await _login(
      captchaToken: _captchaToken,
      captchaAnswer: answer,
      allowAutoCaptcha: false,
    );
  }

  void _closeCaptchaOverlay() {
    _captchaAnswerFocusNode.unfocus();
    setState(() => _showCaptcha = false);
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _handleLogoTap() {
    if (!_enableQuickLogin) return;
    _logoTapResetTimer?.cancel();
    _logoTapResetTimer = Timer(const Duration(seconds: 2), () {
      _logoTapCount = 0;
    });
    _logoTapCount += 1;
    if (_logoTapCount < 3) return;
    _logoTapCount = 0;
    _logoTapResetTimer?.cancel();
    FocusScope.of(context).unfocus();
    _openQuickLoginPage();
  }

  Future<void> _quickLogin(_QuickLoginAccount account) async {
    if (!_enableQuickLogin) return;
    final tab = _loginTabForQuickAccount(account.identifier);
    FocusScope.of(context).unfocus();
    setState(() {
      _tab = tab;
      _setIdentifierText(account.identifier);
      _passwordCtrl.text = account.password;
      _codeCtrl.clear();
      _mobileUseCode = false;
      _emailUseCode = false;
      _agreedToTerms = true;
      _showCaptcha = false;
    });
    await _login();
  }

  _LoginTab _loginTabForQuickAccount(String identifier) {
    return identifier.contains('@') ? _LoginTab.email : _LoginTab.loginName;
  }

  void _openQuickLoginPage() {
    if (!_enableQuickLogin) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => _QuickLoginPage(
          accounts: _quickLoginAccounts,
          onLogin: _quickLogin,
        ),
      ),
    );
  }

  /// 账号注销冷静期弹窗：提示用户撤销注销
  void _showCancelDeactivationDialog(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(l10n.authDeactivatingTitle,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFFEF4444))),
        content: Text(
          l10n.authDeactivatingContent,
          style: const TextStyle(fontSize: 14, color: Color(0xFF86909C)),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go(AppRoutes.home);
            },
            child: Text(l10n.authContinueUse,
                style: const TextStyle(color: Color(0xFF8E8E93))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final dio = ref.read(dioProvider);
                await dio.post<Map<String, dynamic>>(
                  '/api/platform/v1/account/deactivate/cancel',
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.authDeactivationCancelled)));
                  context.go(AppRoutes.home);
                }
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(l10n.authDeactivationCancelFailed)));
                  context.go(AppRoutes.home);
                }
              }
            },
            child: Text(l10n.authCancelDeactivation,
                style: const TextStyle(color: Color(0xFF00B27A))),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AuthState>>(authProvider, (_, next) {
      next.whenOrNull(
        data: (s) {
          if (s.status == AuthStatus.authenticated) {
            if (s.isPendingDeactivation) {
              // 账号处于注销冷静期，提示撤销
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) return;
                _showCancelDeactivationDialog(context, ref);
              });
            } else {
              context.go(AppRoutes.home);
            }
          } else if (s.availableTenants.length > 1) {
            context.go(AppRoutes.tenantSelect);
          } else if (s.error != null) {
            _showError(s.error!);
          }
        },
        error: (e, _) {
          if (_isCaptchaError(e)) return;
          if (e is ServerError) {
            _showError(e.message);
          } else if (e is AuthError) {
            _showError('账号或密码错误');
          } else if (e is NetworkError) {
            _showError(e.message);
          } else {
            _showError(e.toString());
          }
        },
      );
    });

    final isLoading = ref.watch(authProvider).isLoading;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const SizedBox(height: 56),
                  _buildLogo(),
                  const SizedBox(height: 32),
                  _buildTabBar(),
                  const SizedBox(height: 24),
                  _buildForm(),
                  const SizedBox(height: 16),
                  _buildAgreementRow(),
                  const SizedBox(height: 24),
                  _buildLoginButton(isLoading),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('没有账号？', style: AppTextStyles.caption),
                      GestureDetector(
                        onTap: () => context.push('/register'),
                        child: Text('立即注册',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.primary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          if (_showCaptcha) _buildCaptchaOverlay(),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Logo
  // ---------------------------------------------------------------------------

  Widget _buildLogo() {
    final l10n = AppLocalizations.of(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _handleLogoTap,
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.asset(
              AppBrandAssets.appIcon,
              width: 72,
              height: 72,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 12),
          Text(l10n.authLoginTitle, style: AppTextStyles.headline2),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Tab 栏（3 个）
  // ---------------------------------------------------------------------------

  Widget _buildTabBar() {
    return Row(
      children: _LoginTab.values.map((tab) {
        final selected = tab == _tab;
        return Expanded(
          child: GestureDetector(
            onTap: () => _switchLoginTab(tab),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: selected ? AppColors.primary : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                _tabLabel(tab),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? AppColors.primary : AppColors.textSecondary,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ---------------------------------------------------------------------------
  // 表单
  // ---------------------------------------------------------------------------

  Widget _buildForm() {
    switch (_tab) {
      case _LoginTab.mobile:
        return _buildMobileForm();
      case _LoginTab.email:
        return _buildEmailForm();
      case _LoginTab.loginName:
        return _buildLoginNameForm();
    }
  }

  // 手机号表单：验证码 / 密码 切换
  Widget _buildMobileForm() {
    return Column(
      children: [
        _buildPhoneField(),
        const SizedBox(height: 8),
        _buildSubToggle(
          useCode: _mobileUseCode,
          onToggle: () => setState(() {
            _mobileUseCode = !_mobileUseCode;
            _codeCtrl.clear();
            _passwordCtrl.clear();
          }),
        ),
        const SizedBox(height: 8),
        if (_mobileUseCode) _buildCodeField() else _buildPasswordField(),
      ],
    );
  }

  // 邮箱表单：验证码 / 密码 切换
  Widget _buildEmailForm() {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        _buildInputField(
          controller: _identifierCtrl,
          hint: l10n.authHintEmail,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          focusNode: _identifierFocusNode,
        ),
        const SizedBox(height: 8),
        _buildSubToggle(
          useCode: _emailUseCode,
          onToggle: () => setState(() {
            _emailUseCode = !_emailUseCode;
            _codeCtrl.clear();
            _passwordCtrl.clear();
          }),
        ),
        const SizedBox(height: 8),
        if (_emailUseCode) _buildCodeField() else _buildPasswordField(),
      ],
    );
  }

  // 星络号表单：星络号 + 密码。登录不需要企业码；企业选择由平台登录结果决定。
  Widget _buildLoginNameForm() {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        _buildInputField(
          controller: _identifierCtrl,
          hint: l10n.authHintLoginName,
          focusNode: _identifierFocusNode,
        ),
        const SizedBox(height: 12),
        _buildPasswordField(),
      ],
    );
  }

  // 验证码/密码 切换小按钮
  Widget _buildSubToggle(
      {required bool useCode, required VoidCallback onToggle}) {
    final l10n = AppLocalizations.of(context);
    return Align(
      alignment: Alignment.centerRight,
      child: GestureDetector(
        onTap: onToggle,
        child: Text(
          useCode ? l10n.authUsePassword : l10n.authUseCode,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.primary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  // 手机号输入框（带国家码前缀，可点击切换）
  Widget _buildPhoneField() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: _showCountryPicker,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: const BoxDecoration(
                border: Border(right: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_countryCode.dial,
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 15,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_drop_down,
                      size: 18, color: AppColors.primary),
                ],
              ),
            ),
          ),
          Expanded(
            child: TextField(
              controller: _identifierCtrl,
              focusNode: _identifierFocusNode,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: AppColors.textPrimary),
              cursorColor: AppColors.primary,
              enableInteractiveSelection: true,
              contextMenuBuilder: (context, editableTextState) =>
                  AdaptiveTextSelectionToolbar.editableText(
                editableTextState: editableTextState,
              ),
              decoration: InputDecoration(
                hintText: AppLocalizations.of(context).authHintMobile,
                hintStyle: const TextStyle(color: AppColors.textSecondary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCountryPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CountryPickerSheet(
        selected: _countryCode,
        onSelect: (code) {
          setState(() => _countryCode = code);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  // 验证码输入框 + 发送按钮
  Widget _buildCodeField() {
    final l10n = AppLocalizations.of(context);
    return Row(
      children: [
        Expanded(
          child: _buildInputField(
            controller: _codeCtrl,
            hint: l10n.authHintCode,
            keyboardType: TextInputType.number,
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 112,
          height: 48,
          child: OutlinedButton(
            onPressed: _countdown > 0 ? null : _sendCode,
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                  color:
                      _countdown > 0 ? AppColors.disabled : AppColors.primary),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              padding: EdgeInsets.zero,
            ),
            child: Text(
              _countdown > 0
                  ? l10n.authResendCode(_countdown)
                  : l10n.authGetCode,
              style: TextStyle(
                  fontSize: 13,
                  color:
                      _countdown > 0 ? AppColors.disabled : AppColors.primary),
            ),
          ),
        ),
      ],
    );
  }

  // 密码输入框
  Widget _buildPasswordField() {
    final l10n = AppLocalizations.of(context);
    return _buildInputField(
      controller: _passwordCtrl,
      hint: l10n.authHintPassword,
      obscureText: _obscurePassword,
      suffix: IconButton(
        icon: Icon(
          _obscurePassword
              ? Icons.visibility_off_outlined
              : Icons.visibility_outlined,
          color: AppColors.textSecondary,
          size: 20,
        ),
        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
      ),
    );
  }

  // 通用输入框
  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    bool obscureText = false,
    TextInputType? keyboardType,
    Widget? suffix,
    List<String>? autofillHints,
    FocusNode? focusNode,
  }) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      style: const TextStyle(color: AppColors.textPrimary),
      cursorColor: AppColors.primary,
      enableInteractiveSelection: true,
      contextMenuBuilder: (context, editableTextState) =>
          AdaptiveTextSelectionToolbar.editableText(
        editableTextState: editableTextState,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textSecondary),
        suffixIcon: suffix,
        filled: true,
        fillColor: AppColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 用户协议
  // ---------------------------------------------------------------------------

  Widget _buildAgreementRow() {
    final l10n = AppLocalizations.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 20,
          height: 20,
          child: Checkbox(
            value: _agreedToTerms,
            onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
            activeColor: AppColors.primary,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text.rich(
            TextSpan(
              text: l10n.authAgreementPrefix,
              style: AppTextStyles.caption,
              children: [
                WidgetSpan(
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const TermsPage())),
                    child: Text(l10n.authTermsLink,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.primary)),
                  ),
                ),
                TextSpan(text: l10n.authAgreementAnd),
                WidgetSpan(
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const PrivacyPage())),
                    child: Text(l10n.authPrivacyLink,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.primary)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // 登录按钮
  // ---------------------------------------------------------------------------

  Widget _buildLoginButton(bool isLoading) {
    final l10n = AppLocalizations.of(context);
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: (_agreedToTerms && !isLoading) ? _login : null,
        style: ElevatedButton.styleFrom(
          backgroundColor:
              _agreedToTerms ? AppColors.primary : AppColors.disabled,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: isLoading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Theme.of(context).colorScheme.surface))
            : Text(l10n.authLoginButton, style: AppTextStyles.button),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 图形验证码遮罩
  // ---------------------------------------------------------------------------

  Widget _buildCaptchaOverlay() {
    final l10n = AppLocalizations.of(context);
    return Material(
      color: Colors.black54,
      child: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 32),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(l10n.authCaptchaTitle,
                    style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D2129))),
              ),
              if (_captchaQuestion != null)
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_captchaQuestion!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1D2129))),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: TextField(
                  controller: _captchaAnswerCtrl,
                  focusNode: _captchaAnswerFocusNode,
                  keyboardType: TextInputType.visiblePassword,
                  autofocus: true,
                  style: const TextStyle(color: AppColors.textPrimary),
                  cursorColor: AppColors.primary,
                  decoration: InputDecoration(
                    hintText: l10n.authCaptchaHint,
                    hintStyle: const TextStyle(color: AppColors.textSecondary),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: AppColors.divider),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: AppColors.divider),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                    ),
                  ),
                ),
              ),
              const Divider(height: 1),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: _closeCaptchaOverlay,
                      child: Text(l10n.commonCancel,
                          style: const TextStyle(color: Colors.grey)),
                    ),
                  ),
                  const SizedBox(
                      width: 1, height: 44, child: VerticalDivider(width: 1)),
                  Expanded(
                    child: TextButton(
                      onPressed: _submitWithCaptcha,
                      child: Text(l10n.commonConfirm,
                          style: const TextStyle(color: AppColors.primary)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 国家/地区码数据
// ---------------------------------------------------------------------------

class _CountryCode {
  final String name;
  final String dial;
  final String flag;

  const _CountryCode(
      {required this.name, required this.dial, required this.flag});

  static const List<_CountryCode> codes = [
    _CountryCode(name: '中国大陆', dial: '+86', flag: '🇨🇳'),
    _CountryCode(name: '中国香港', dial: '+852', flag: '🇭🇰'),
    _CountryCode(name: '中国澳门', dial: '+853', flag: '🇲🇴'),
    _CountryCode(name: '中国台湾', dial: '+886', flag: '🇹🇼'),
    _CountryCode(name: '美国', dial: '+1', flag: '🇺🇸'),
    _CountryCode(name: '英国', dial: '+44', flag: '🇬🇧'),
    _CountryCode(name: '日本', dial: '+81', flag: '🇯🇵'),
    _CountryCode(name: '韩国', dial: '+82', flag: '🇰🇷'),
    _CountryCode(name: '新加坡', dial: '+65', flag: '🇸🇬'),
    _CountryCode(name: '马来西亚', dial: '+60', flag: '🇲🇾'),
    _CountryCode(name: '澳大利亚', dial: '+61', flag: '🇦🇺'),
    _CountryCode(name: '加拿大', dial: '+1', flag: '🇨🇦'),
    _CountryCode(name: '德国', dial: '+49', flag: '🇩🇪'),
    _CountryCode(name: '法国', dial: '+33', flag: '🇫🇷'),
    _CountryCode(name: '印度', dial: '+91', flag: '🇮🇳'),
    _CountryCode(name: '泰国', dial: '+66', flag: '🇹🇭'),
    _CountryCode(name: '越南', dial: '+84', flag: '🇻🇳'),
    _CountryCode(name: '印度尼西亚', dial: '+62', flag: '🇮🇩'),
    _CountryCode(name: '菲律宾', dial: '+63', flag: '🇵🇭'),
  ];
}

// ---------------------------------------------------------------------------
// 国家/地区选择底部弹窗
// ---------------------------------------------------------------------------

class _CountryPickerSheet extends StatefulWidget {
  final _CountryCode selected;
  final ValueChanged<_CountryCode> onSelect;

  const _CountryPickerSheet({required this.selected, required this.onSelect});

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  String _query = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _CountryCode.codes
        .where((c) => c.name.contains(_query) || c.dial.contains(_query))
        .toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.65,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // 拖动条
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.outline,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Text('选择国家/地区',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
          // 搜索框
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: '搜索国家/地区',
                prefixIcon: const Icon(Icons.search,
                    size: 20, color: Color(0xFFAEAEB2)),
                filled: true,
                fillColor: const Color(0xFFF2F2F7),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final code = filtered[i];
                final isSelected = code.dial == widget.selected.dial &&
                    code.name == widget.selected.name;
                return InkWell(
                  onTap: () => widget.onSelect(code),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 14),
                    child: Row(
                      children: [
                        Text(code.flag, style: const TextStyle(fontSize: 22)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(code.name,
                              style: const TextStyle(fontSize: 15)),
                        ),
                        Text(code.dial,
                            style: TextStyle(
                                fontSize: 15,
                                color: isSelected
                                    ? AppColors.primary
                                    : const Color(0xFF8E8E93))),
                        if (isSelected) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.check,
                              size: 18, color: AppColors.primary),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickLoginPage extends StatefulWidget {
  final List<_QuickLoginAccount> accounts;
  final Future<void> Function(_QuickLoginAccount account) onLogin;

  const _QuickLoginPage({
    required this.accounts,
    required this.onLogin,
  });

  @override
  State<_QuickLoginPage> createState() => _QuickLoginPageState();
}

class _QuickLoginPageState extends State<_QuickLoginPage> {
  String? _loadingIdentifier;

  Future<void> _handleLogin(_QuickLoginAccount account) async {
    if (_loadingIdentifier != null) return;
    FocusScope.of(context).unfocus();
    setState(() => _loadingIdentifier = account.identifier);
    try {
      await widget.onLogin(account);
    } finally {
      if (mounted) {
        setState(() => _loadingIdentifier = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final loadingIdentifier = _loadingIdentifier;
    final accountGroups = _groupAccounts(widget.accounts);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          '快速登录',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(
              loadingIdentifier == null ? '测试入口，仅用于开发调试' : '正在登录，请稍候',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            for (final group in accountGroups.entries) ...[
              _QuickLoginGroupHeader(
                title: group.key,
                count: group.value.length,
              ),
              const SizedBox(height: 8),
              ...group.value.map(
                (account) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _QuickLoginAccountButton(
                    account: account,
                    enabled: loadingIdentifier == null,
                    loading: loadingIdentifier == account.identifier,
                    onTap: () => _handleLogin(account),
                  ),
                ),
              ),
              const SizedBox(height: 4),
            ],
          ],
        ),
      ),
    );
  }

  Map<String, List<_QuickLoginAccount>> _groupAccounts(
    List<_QuickLoginAccount> accounts,
  ) {
    const groupOrder = [
      '所有者',
      '管理员',
      '客服',
      '技术支持',
      '普通员工',
      '企业客户',
      '个人用户',
      '特殊账号',
    ];
    final groups = {
      for (final group in groupOrder) group: <_QuickLoginAccount>[],
    };

    for (final account in accounts) {
      groups[_quickLoginGroupName(account)]!.add(account);
    }
    groups.removeWhere((_, accounts) => accounts.isEmpty);
    return groups;
  }

  String _quickLoginGroupName(_QuickLoginAccount account) {
    final label = account.label;
    if (label.contains('所有者')) return '所有者';
    if (label.contains('企业专属') || label.contains('管理后台')) return '特殊账号';
    if (label.contains('管理员') || label.contains('admin')) return '管理员';
    if (label.contains('客服')) return '客服';
    if (label.contains('技术支持')) return '技术支持';
    if (label.contains('普通员工')) return '普通员工';
    if (label.contains('个人用户')) return '个人用户';
    return '企业客户';
  }
}

class _QuickLoginGroupHeader extends StatelessWidget {
  final String title;
  final int count;

  const _QuickLoginGroupHeader({
    required this.title,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$count 个用户',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickLoginAccountButton extends StatelessWidget {
  final _QuickLoginAccount account;
  final bool enabled;
  final bool loading;
  final VoidCallback onTap;

  const _QuickLoginAccountButton({
    required this.account,
    required this.enabled,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.divider),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '角色：${account.label}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '登录方式：${account.description}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '邮箱：${account.email ?? '-'}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '手机：${account.mobile ?? '-'}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '星络号：${account.lppId ?? '-'}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (account.loginName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '登录名：${account.loginName}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                    if (account.enterprise != null ||
                        account.assignedServiceStaff != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '企业：${account.enterprise ?? '-'}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '分配客服：${account.assignedServiceStaff ?? '-'}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (loading)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: AppColors.primary,
                  ),
                )
              else
                const Icon(
                  Icons.chevron_right,
                  color: AppColors.textSecondary,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
