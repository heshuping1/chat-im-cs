import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/utils/validators.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/space/data/datasources/platform_tenant_datasource.dart';

// ---------------------------------------------------------------------------
// 颜色常量
// ---------------------------------------------------------------------------
const _primary = Color(0xFF07C160);
const _card = Color(0xFFFFFFFF);
const _divider = Color(0xFFE5E5E5);
const _txtMain = Color(0xFF121212);
const _txtGray = Color(0xFF666666);
const _tagBg = Color(0xFFF2F2F2);

// ---------------------------------------------------------------------------
// 注册页
// ---------------------------------------------------------------------------

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

enum _IdMode { mobile, email }

enum _JoinCredentialKind { tenantCode, invitationCode }

class _RegisterPageState extends ConsumerState<RegisterPage> {
  _IdMode _idMode = _IdMode.email;

  final _displayNameCtrl = TextEditingController();
  final _identifierCtrl = TextEditingController(); // 手机号或邮箱
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _codeCtrl = TextEditingController(); // 短信/邮件验证码
  final _enterpriseCtrl = TextEditingController(); // 企业码（可选）
  final _enterpriseFocusNode = FocusNode(); // 企业码输入框焦点

  bool _showEnterpriseField = false; // 是否展开企业字段
  bool _searchingEnterprise = false; // 搜索中
  String? _foundEnterpriseName; // 搜索到的企业名
  String? _foundTenantId; // 搜索到的 tenantId
  _JoinCredentialKind? _foundJoinKind;
  bool _agreedToTerms = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  // 验证码设置
  bool _smsEnabled = true;
  bool _emailEnabled = true;
  bool _verificationRequired = false;
  Map<String, dynamic>? _settingsData;

  // 图形验证码
  String? _captchaToken;
  final _captchaAnswerCtrl = TextEditingController();

  // 发送倒计时
  int _countdown = 0;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _loadVerificationSettings();
  }

  @override
  void dispose() {
    _displayNameCtrl.dispose();
    _identifierCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    _codeCtrl.dispose();
    _enterpriseCtrl.dispose();
    _enterpriseFocusNode.dispose();
    _captchaAnswerCtrl.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  // ── 加载验证码设置 ─────────────────────────────────────────────────────────

  Future<void> _loadVerificationSettings() async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/platform/v1/auth/verification/settings',
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      if (!mounted || data == null) return;
      final smsEnabled = data['smsEnabled'] as bool? ?? true;
      final emailEnabled = data['emailEnabled'] as bool? ?? true;
      _IdMode mode = _idMode;
      if (_idMode == _IdMode.mobile && !smsEnabled && emailEnabled) {
        mode = _IdMode.email;
      } else if (_idMode == _IdMode.email && !emailEnabled && smsEnabled) {
        mode = _IdMode.mobile;
      }
      setState(() {
        _settingsData = data;
        _smsEnabled = smsEnabled;
        _emailEnabled = emailEnabled;
        _idMode = mode;
      });
      _refreshVerificationRequired();
    } catch (_) {}
  }

  void _refreshVerificationRequired() {
    if (_settingsData == null) return;
    final required = _idMode == _IdMode.mobile
        ? _settingsData!['smsRequired'] as bool? ?? false
        : _settingsData!['emailRequired'] as bool? ?? false;
    setState(() => _verificationRequired = required);
  }

  // ── 发送验证码 ─────────────────────────────────────────────────────────────

  Future<void> _sendCode() async {
    final identifier = _identifierCtrl.text.trim();
    if (_idMode == _IdMode.mobile) {
      final err = Validators.validateMobile(identifier);
      if (err != null) {
        _showError(err);
        return;
      }
    } else {
      final err = Validators.validateEmail(identifier);
      if (err != null) {
        _showError(err);
        return;
      }
    }
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/api/platform/v1/auth/verification/send', data: {
        'identifier': identifier,
        'channel': _idMode == _IdMode.mobile ? 'sms' : 'email',
        'purpose': 'register',
      });
      _startCountdown();
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      _showError(err is ServerError ? err.message : '发送失败，请重试');
    }
  }

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

  // ── 图形验证码 ─────────────────────────────────────────────────────────────

  Future<bool> _checkAndHandleCaptcha() async {
    try {
      final dio = ref.read(dioProvider);
      final checkResp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/auth/captcha/check',
      );
      final required =
          checkResp.data?['data']?['captchaRequired'] as bool? ?? false;
      if (!required) return true;

      final genResp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/captcha/generate',
      );
      final token = genResp.data?['data']?['token'] as String?;
      final question = genResp.data?['data']?['question'] as String?;
      if (token == null || question == null) return true;

      _captchaToken = token;
      _captchaAnswerCtrl.clear();
      if (!mounted) return false;
      final answer = await _showCaptchaDialog(question);
      if (answer == null || answer.isEmpty) return false;
      _captchaAnswerCtrl.text = answer;
      return true;
    } catch (_) {
      return true;
    }
  }

  Future<String?> _showCaptchaDialog(String question) {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('图形验证码',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: _tagBg, borderRadius: BorderRadius.circular(8)),
            child: Text(question,
                style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 4),
                textAlign: TextAlign.center),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _captchaAnswerCtrl,
            autofocus: true,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: '请输入答案',
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消', style: TextStyle(color: _txtGray)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, _captchaAnswerCtrl.text.trim()),
            child: const Text('确认', style: TextStyle(color: _primary)),
          ),
        ],
      ),
    );
  }

  // ── 注册逻辑 ───────────────────────────────────────────────────────────────

  Future<void> _register() async {
    if (!_agreedToTerms || _isLoading) return;

    final displayName = _displayNameCtrl.text.trim();
    final identifier = _identifierCtrl.text.trim();
    final password = _passwordCtrl.text;
    final confirm = _confirmCtrl.text;
    final joinCredential = _enterpriseCtrl.text.trim(); // 企业码或邀请码
    final isInvitationCode = _isInvitationCode(joinCredential);

    // 基础校验
    if (displayName.isEmpty) {
      _showError('请输入昵称');
      return;
    }

    if (identifier.isEmpty) {
      _showError(_idMode == _IdMode.mobile ? '请输入手机号' : '请输入邮箱');
      return;
    }
    if (_idMode == _IdMode.mobile) {
      final err = Validators.validateMobile(identifier);
      if (err != null) {
        _showError(err);
        return;
      }
    } else {
      final err = Validators.validateEmail(identifier);
      if (err != null) {
        _showError(err);
        return;
      }
    }
    if (password.length < 6) {
      _showError('密码至少6位');
      return;
    }
    if (password != confirm) {
      _showError('两次密码不一致');
      return;
    }
    if (_verificationRequired && _codeCtrl.text.trim().isEmpty) {
      _showError('请先获取并填写验证码');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final canProceed = await _checkAndHandleCaptcha();
      if (!canProceed) {
        setState(() => _isLoading = false);
        return;
      }

      final captchaAnswer = _captchaAnswerCtrl.text.trim();
      final notifier = ref.read(authProvider.notifier);

      if (joinCredential.isNotEmpty && !isInvitationCode) {
        // 企业注册：填了企业码，用搜索到的 tenantId（或直接用输入值）
        final tenantIdOrCode = _foundTenantId ?? joinCredential;
        await notifier.registerEnterprise(
          tenantIdOrCode: tenantIdOrCode,
          password: password,
          displayName: displayName,
          loginType: _currentLoginType(),
          email: _idMode == _IdMode.email ? identifier : null,
          mobile: _idMode == _IdMode.mobile ? identifier : null,
          verificationCode:
              _verificationRequired ? _codeCtrl.text.trim() : null,
          captchaToken: _captchaToken,
          captchaAnswer: captchaAnswer.isNotEmpty ? captchaAnswer : null,
        );
      } else {
        // 平台注册：未填企业码，或填的是邀请码。
        await notifier.registerPlatform(
          displayName: displayName,
          password: password,
          loginType: _currentLoginType(),
          mobile: _idMode == _IdMode.mobile ? identifier : null,
          email: _idMode == _IdMode.email ? identifier : null,
          verificationCode:
              _verificationRequired ? _codeCtrl.text.trim() : null,
          captchaToken: _captchaToken,
          captchaAnswer: captchaAnswer.isNotEmpty ? captchaAnswer : null,
          invitationCode: isInvitationCode ? joinCredential : null,
        );
      }
      // 注册+登录成功，router 自动跳转
    } catch (e) {
      if (!mounted) return;
      String msg = '注册失败，请重试';
      if (e is DioException) {
        final err = ErrorHandler.fromDioException(e);
        if (err is ServerError) {
          if (err.code == 'AUTH_CAPTCHA_REQUIRED') {
            setState(() => _isLoading = false);
            final ok = await _checkAndHandleCaptcha();
            if (ok) _register();
            return;
          }
          if (err.code == 'AUTH_VERIFICATION_REQUIRED') {
            setState(() => _verificationRequired = true);
            msg = '请先获取并填写验证码';
          } else {
            msg = err.message;
          }
        }
      } else if (e is ServerError) {
        if (e.code == 'AUTH_CAPTCHA_REQUIRED') {
          setState(() => _isLoading = false);
          final ok = await _checkAndHandleCaptcha();
          if (ok) _register();
          return;
        }
        msg = e.message;
      }
      _showError(msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  bool _isInvitationCode(String value) {
    return RegExp(r'^[0-9A-Fa-f]{12,}$').hasMatch(value.trim());
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

  String _currentLoginType() {
    return switch (_idMode) {
      _IdMode.mobile => 'mobile',
      _IdMode.email => 'email',
    };
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AuthState>>(authProvider, (_, next) {
      next.whenOrNull(
        data: (s) {
          if (s.status == AuthStatus.authenticated) {
            context.go(AppRoutes.home);
            return;
          }
          if (authStateNeedsSpaceSelection(s)) {
            context.go(AppRoutes.tenantSelect);
          }
        },
        error: (e, _) {
          if (_isCaptchaError(e)) return;
          if (e is ServerError) {
            _showError(e.message);
          } else if (e is AuthError) {
            _showError('微界号或密码错误');
          } else if (e is NetworkError) {
            _showError(e.message);
          } else {
            _showError(e.toString());
          }
        },
      );
    });

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20, color: _txtMain),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('注册',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w600, color: _txtMain)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              // 昵称
              _buildLabel('昵称'),
              _buildInput(controller: _displayNameCtrl, hint: '设置昵称'),
              const SizedBox(height: 16),

              // 手机/邮箱切换（始终显示）
              _buildIdModeTabs(),
              const SizedBox(height: 8),

              // 手机号或邮箱输入
              if (_idMode == _IdMode.mobile) ...[
                _buildLabel('手机号'),
                _buildPhoneInput(),
              ] else ...[
                _buildLabel('邮箱'),
                _buildInput(
                  controller: _identifierCtrl,
                  hint: '请输入邮箱',
                  keyboardType: TextInputType.emailAddress,
                ),
              ],
              const SizedBox(height: 16),

              // 验证码（按需显示）
              if (_verificationRequired) ...[
                _buildLabel('验证码'),
                _buildCodeRow(),
                const SizedBox(height: 16),
              ],

              // 密码
              _buildLabel('密码'),
              _buildInput(
                controller: _passwordCtrl,
                hint: '设置密码（至少6位）',
                obscure: _obscurePassword,
                suffix: _eyeBtn(_obscurePassword,
                    () => setState(() => _obscurePassword = !_obscurePassword)),
              ),
              const SizedBox(height: 16),
              _buildLabel('确认密码'),
              _buildInput(
                controller: _confirmCtrl,
                hint: '再次输入密码',
                obscure: _obscureConfirm,
                suffix: _eyeBtn(_obscureConfirm,
                    () => setState(() => _obscureConfirm = !_obscureConfirm)),
              ),
              const SizedBox(height: 20),

              // 企业ID/邀请码（可选，折叠）
              _buildEnterpriseSection(),
              const SizedBox(height: 20),

              // 协议
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: Checkbox(
                    value: _agreedToTerms,
                    onChanged: (v) =>
                        setState(() => _agreedToTerms = v ?? false),
                    activeColor: _primary,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(3)),
                  ),
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('我已阅读并同意《用户协议》和《隐私政策》',
                      style: TextStyle(fontSize: 13, color: _txtGray)),
                ),
              ]),
              const SizedBox(height: 24),

              // 注册按钮
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: (_agreedToTerms && !_isLoading) ? _register : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        _agreedToTerms ? _primary : const Color(0xFFCCCCCC),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _isLoading
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Theme.of(context).colorScheme.surface))
                      : const Text('注册并登录',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 16),

              // 去登录
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: const Text.rich(TextSpan(
                    text: '已有微界号？',
                    style: TextStyle(fontSize: 14, color: _txtGray),
                    children: [
                      TextSpan(
                          text: '去登录',
                          style: TextStyle(
                              color: _primary, fontWeight: FontWeight.w500)),
                    ],
                  )),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // ── 手机/邮箱切换 Tab ─────────────────────────────────────────────────────

  Widget _buildIdModeTabs() {
    return Row(children: [
      if (_emailEnabled) ...[
        _idTab('邮箱', _IdMode.email),
        const SizedBox(width: 16),
      ],
      if (_smsEnabled) ...[
        _idTab('手机号', _IdMode.mobile),
        const SizedBox(width: 16),
      ],
    ]);
  }

  Widget _idTab(String label, _IdMode mode) {
    final selected = _idMode == mode;
    return GestureDetector(
      onTap: () {
        if (_idMode == mode) return;
        setState(() {
          _idMode = mode;
          _identifierCtrl.clear();
          _codeCtrl.clear();
          _countdown = 0;
          _countdownTimer?.cancel();
        });
        _refreshVerificationRequired();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
            border: Border(
                bottom: BorderSide(
                    color: selected ? _primary : Colors.transparent,
                    width: 2))),
        child: Text(label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: selected ? _primary : _txtGray,
            )),
      ),
    );
  }

  // ── 手机号输入（带区号） ───────────────────────────────────────────────────

  Widget _buildPhoneInput() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _divider),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: _divider))),
          child: const Text('+86',
              style: TextStyle(
                  color: _primary, fontSize: 15, fontWeight: FontWeight.w500)),
        ),
        Expanded(
          child: TextField(
            controller: _identifierCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              hintText: '请输入手机号',
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
        ),
      ]),
    );
  }

  // ── 验证码行 ───────────────────────────────────────────────────────────────

  Widget _buildCodeRow() {
    return Row(children: [
      Expanded(
        child: _buildInput(
          controller: _codeCtrl,
          hint: '请输入验证码',
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
                color: _countdown > 0 ? const Color(0xFFCCCCCC) : _primary),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: EdgeInsets.zero,
          ),
          child: Text(
            _countdown > 0 ? '${_countdown}s 后重发' : '获取验证码',
            style: TextStyle(
                fontSize: 13,
                color: _countdown > 0 ? const Color(0xFFCCCCCC) : _primary),
          ),
        ),
      ),
    ]);
  }

  // ── 企业码（可选，折叠区，带搜索） ──────────────────────────────────────────

  Future<void> _searchEnterprise() async {
    final code = _enterpriseCtrl.text.trim();
    if (code.isEmpty) {
      _showError('请输入企业码或邀请码');
      return;
    }
    if (_isInvitationCode(code)) {
      await _previewInvitation(code);
      return;
    }
    setState(() {
      _searchingEnterprise = true;
      _foundEnterpriseName = null;
      _foundTenantId = null;
      _foundJoinKind = null;
    });
    try {
      final dio = ref.read(dioProvider);
      // 使用无需鉴权的注册专用搜索接口（公开接口，不需要 token）
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/platform/v1/tenants/search-for-register',
        queryParameters: {'keyword': code},
      );
      final list = resp.data?['data'] as List<dynamic>? ?? [];
      final match = list.firstWhere(
        (t) => (t as Map<String, dynamic>)['tenantCode'] == code,
        orElse: () => list.isNotEmpty ? list.first : null,
      );
      if (match != null) {
        final m = match as Map<String, dynamic>;
        setState(() {
          _foundEnterpriseName = m['tenantName'] as String?;
          _foundTenantId = m['tenantId'] as String?;
          _foundJoinKind = _JoinCredentialKind.tenantCode;
        });
      } else {
        setState(() => _foundEnterpriseName = '');
        _showError('未找到企业「$code」，请确认企业码是否正确');
      }
    } on DioException catch (e) {
      // 403 = 企业绑定模式未启用，降级到 /tenants/search
      if (e.response?.statusCode == 403) {
        await _searchEnterpriseByPublicApi(code);
      } else {
        _showError('搜索失败，请重试');
      }
    } catch (_) {
      _showError('搜索失败，请重试');
    } finally {
      if (mounted) setState(() => _searchingEnterprise = false);
    }
  }

  Future<void> _previewInvitation(String code) async {
    setState(() {
      _searchingEnterprise = true;
      _foundEnterpriseName = null;
      _foundTenantId = null;
      _foundJoinKind = null;
    });
    try {
      final preview = await PlatformTenantDataSource(ref.read(dioProvider))
          .previewInvitation(code: code);
      setState(() {
        _foundEnterpriseName = preview.tenantName;
        _foundTenantId = null;
        _foundJoinKind = _JoinCredentialKind.invitationCode;
      });
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      _showError(_joinPreviewErrorMessage(err));
      setState(() => _foundEnterpriseName = '');
    } catch (_) {
      _showError('邀请码无效，请确认后重试');
      setState(() => _foundEnterpriseName = '');
    } finally {
      if (mounted) setState(() => _searchingEnterprise = false);
    }
  }

  String _joinPreviewErrorMessage(AppError error) {
    if (error is ServerError) return error.message;
    if (error is NetworkError) return error.message;
    return '邀请码无效，请确认后重试';
  }

  /// 降级：用需要 platformToken 的 /tenants/search 接口搜索
  /// 仅在企业绑定模式未启用时调用（此时 search-for-register 返回 403）
  Future<void> _searchEnterpriseByPublicApi(String code) async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/platform/v1/tenants/search',
        queryParameters: {'keyword': code},
      );
      final list = resp.data?['data'] as List<dynamic>? ?? [];
      final match = list.firstWhere(
        (t) => (t as Map<String, dynamic>)['tenantCode'] == code,
        orElse: () => list.isNotEmpty ? list.first : null,
      );
      if (match != null) {
        final m = match as Map<String, dynamic>;
        setState(() {
          _foundEnterpriseName = m['tenantName'] as String?;
          _foundTenantId = m['tenantId'] as String?;
          _foundJoinKind = _JoinCredentialKind.tenantCode;
        });
      } else {
        setState(() => _foundEnterpriseName = '');
        _showError('未找到企业「$code」，请确认企业码是否正确');
      }
    } on DioException catch (e) {
      // 401/403：没有 token，无法搜索，直接用输入的企业码注册
      final status = e.response?.statusCode ?? 0;
      if (status == 401 || status == 403) {
        // 直接用输入的企业码，注册时服务端会验证
        setState(() {
          _foundEnterpriseName = code;
          _foundTenantId = null; // 用 tenantCode 注册
          _foundJoinKind = _JoinCredentialKind.tenantCode;
        });
      } else {
        _showError('搜索失败，请重试');
      }
    } catch (_) {
      _showError('搜索失败，请重试');
    }
  }

  Widget _buildEnterpriseSection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      GestureDetector(
        onTap: () {
          setState(() {
            _showEnterpriseField = !_showEnterpriseField;
            if (!_showEnterpriseField) {
              _enterpriseCtrl.clear();
              _foundEnterpriseName = null;
              _foundTenantId = null;
              _foundJoinKind = null;
            }
          });
          // 展开时自动聚焦企业码输入框
          if (_showEnterpriseField) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _enterpriseFocusNode.requestFocus();
            });
          }
        },
        child: Row(children: [
          Icon(
            _showEnterpriseField
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_down_rounded,
            size: 18,
            color: _txtGray,
          ),
          const SizedBox(width: 4),
          Text(
            _showEnterpriseField ? '收起加入信息' : '加入企业？输入企业码/邀请码（可选）',
            style: const TextStyle(fontSize: 13, color: _txtGray),
          ),
        ]),
      ),
      if (_showEnterpriseField) ...[
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: _buildInput(
              controller: _enterpriseCtrl,
              focusNode: _enterpriseFocusNode,
              hint: '请输入企业码或邀请码',
              onChanged: (_) => _clearJoinLookup(),
              suffix: _foundJoinKind != null
                  ? const Icon(Icons.check_circle, color: _primary, size: 20)
                  : null,
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 48,
            child: OutlinedButton(
              onPressed: _searchingEnterprise ? null : _searchEnterprise,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: _primary),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              child: _searchingEnterprise
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: _primary))
                  : const Text('搜索',
                      style: TextStyle(color: _primary, fontSize: 14)),
            ),
          ),
        ]),
        if (_foundEnterpriseName != null &&
            _foundEnterpriseName!.isNotEmpty) ...[
          const SizedBox(height: 6),
          Row(children: [
            const Icon(Icons.business_outlined, size: 14, color: _primary),
            const SizedBox(width: 4),
            Text(
                _foundJoinKind == _JoinCredentialKind.invitationCode
                    ? '邀请码有效：$_foundEnterpriseName'
                    : '找到企业：$_foundEnterpriseName',
                style: const TextStyle(fontSize: 12, color: _primary)),
          ]),
        ] else if (_foundEnterpriseName == '') ...[
          const SizedBox(height: 6),
          const Text('未找到该企业或邀请码无效',
              style: TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
        ] else ...[
          const SizedBox(height: 4),
          const Text('填写企业码或邀请码后点击搜索验证，注册后将自动加入该企业',
              style: TextStyle(fontSize: 12, color: _txtGray)),
        ],
      ],
    ]);
  }

  void _clearJoinLookup() {
    if (_foundEnterpriseName == null &&
        _foundTenantId == null &&
        _foundJoinKind == null) {
      return;
    }
    setState(() {
      _foundEnterpriseName = null;
      _foundTenantId = null;
      _foundJoinKind = null;
    });
  }

  // ── 通用输入框 ─────────────────────────────────────────────────────────────

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: const TextStyle(
              fontSize: 14, color: _txtGray, fontWeight: FontWeight.w400)),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    bool obscure = false,
    TextInputType? keyboardType,
    Widget? suffix,
    FocusNode? focusNode,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      obscureText: obscure,
      keyboardType: keyboardType,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFFBBBBBB), fontSize: 15),
        suffixIcon: suffix,
        filled: true,
        fillColor: _card,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _divider)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _divider)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: _primary, width: 1.5)),
      ),
    );
  }

  Widget _eyeBtn(bool obscure, VoidCallback onTap) {
    return IconButton(
      icon: Icon(
          obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          color: _txtGray,
          size: 20),
      onPressed: onTap,
    );
  }
}
