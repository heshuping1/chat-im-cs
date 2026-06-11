import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/space/data/models/enterprise_join_models.dart';
import 'package:lpp_mobile/features/space/presentation/providers/enterprise_join_provider.dart';

// ---------------------------------------------------------------------------
// 查询结果模型
// ---------------------------------------------------------------------------

enum _ResultType { invitation, tenant }

class _SearchResult {
  final _ResultType type;
  final String tenantId;
  final String tenantCode;
  final String tenantName;
  final String? logoUrl;
  final String? industry;
  final int? memberCount;
  final String? description;
  final bool alreadyMember;
  final bool codeOnly;
  // 邀请码专属
  final bool? identityMatched;
  final int? targetMembershipRole;
  final String? targetHint;

  const _SearchResult({
    required this.type,
    required this.tenantId,
    required this.tenantCode,
    required this.tenantName,
    this.logoUrl,
    this.industry,
    this.memberCount,
    this.description,
    this.alreadyMember = false,
    this.codeOnly = false,
    this.identityMatched,
    this.targetMembershipRole,
    this.targetHint,
  });

  bool get canJoinByTenantId =>
      type == _ResultType.tenant && tenantId.isNotEmpty && tenantCode.isEmpty;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

class JoinCompanyPage extends ConsumerStatefulWidget {
  const JoinCompanyPage({super.key, this.initialCode});

  final String? initialCode;

  @override
  ConsumerState<JoinCompanyPage> createState() => _JoinCompanyPageState();
}

class _JoinCompanyPageState extends ConsumerState<JoinCompanyPage> {
  final _codeCtrl = TextEditingController();
  final _messageCtrl = TextEditingController(text: '希望加入贵组织');
  final _focusNode = FocusNode();

  bool _searching = false;
  bool _joining = false;
  _SearchResult? _result;
  String? _searchError;

  @override
  void dispose() {
    _codeCtrl.dispose();
    _messageCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    final initialCode = widget.initialCode?.trim();
    if (initialCode != null && initialCode.isNotEmpty) {
      _codeCtrl.text = initialCode;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _search();
      });
    }
  }

  // -------------------------------------------------------------------------
  // 查询
  // -------------------------------------------------------------------------

  Future<void> _search() async {
    final code = _codeCtrl.text.trim();
    if (code.isEmpty || _searching) return;

    _focusNode.unfocus();
    setState(() {
      _searching = true;
      _result = null;
      _searchError = null;
    });

    try {
      final platformToken = ref.read(authProvider).valueOrNull?.platformToken;
      if (platformToken == null) {
        setState(() => _searchError = '请先登录后再查询企业');
        return;
      }
      final dataSource = ref.read(platformTenantDataSourceProvider);

      // 1. 先尝试邀请码预览
      try {
        final preview = await dataSource.previewInvitation(
          platformToken: platformToken,
          code: code,
        );
        setState(() {
          _result = _SearchResult(
            type: _ResultType.invitation,
            tenantId: preview.tenantId,
            tenantCode:
                preview.tenantCode.isNotEmpty ? preview.tenantCode : code,
            tenantName: preview.tenantName,
            logoUrl: preview.logoUrl,
            industry: preview.industry,
            description: preview.description,
            alreadyMember: preview.alreadyMember,
            identityMatched: preview.identityMatched,
            targetMembershipRole: preview.targetMembershipRole,
            targetHint: preview.targetHint,
          );
        });
        return;
      } on AppError {
        // 不是有效邀请码时，继续按企业码/关键词搜索。
      }

      // 2. 搜索企业（按 tenantCode 精确匹配或关键词）
      final list = await dataSource.searchTenants(
        platformToken: platformToken,
        keyword: code,
      );

      if (list.isEmpty) {
        setState(() {
          _result = _SearchResult(
            type: _ResultType.tenant,
            tenantId: '',
            tenantCode: code,
            tenantName: '企业码 $code',
            description: '未搜索到公开企业信息，可直接用企业码提交加入申请。',
            codeOnly: true,
          );
        });
        return;
      }

      // 优先精确匹配 tenantCode
      final matched = list.firstWhere(
        (t) => t.tenantCode.toLowerCase() == code.toLowerCase(),
        orElse: () => list.first,
      );

      setState(() {
        _result = _SearchResult(
          type: _ResultType.tenant,
          tenantId: matched.tenantId,
          tenantCode: matched.tenantCode.isNotEmpty ? matched.tenantCode : code,
          tenantName: matched.tenantName,
          logoUrl: matched.logoUrl,
          industry: matched.industry,
          memberCount: matched.memberCount,
          description: matched.description,
          alreadyMember: matched.alreadyMember,
          codeOnly: false,
        );
      });
    } on AppError catch (e) {
      setState(() => _searchError = _errorMessage(e, fallback: '查询失败，请重试'));
    } catch (_) {
      setState(() => _searchError = '查询失败，请重试');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  // -------------------------------------------------------------------------
  // 申请加入
  // -------------------------------------------------------------------------

  Future<void> _join() async {
    final result = _result;
    if (result == null || _joining) return;

    setState(() => _joining = true);
    try {
      final platformToken = ref.read(authProvider).valueOrNull?.platformToken;
      if (platformToken == null) {
        _showSnack('请先登录后再申请加入企业');
        return;
      }
      final dataSource = ref.read(platformTenantDataSourceProvider);

      late final PlatformJoinResult joinResult;
      if (result.type == _ResultType.invitation) {
        joinResult = await dataSource.acceptInvitation(
          platformToken: platformToken,
          code: _codeCtrl.text.trim(),
        );
      } else if (result.canJoinByTenantId) {
        joinResult = await dataSource.submitJoinRequest(
          platformToken: platformToken,
          tenantId: result.tenantId,
          message: _messageCtrl.text.trim(),
        );
      } else {
        joinResult = await dataSource.joinByCode(
          platformToken: platformToken,
          tenantCode: result.tenantCode,
          message: _messageCtrl.text.trim(),
        );
      }

      if (!mounted) return;
      if (joinResult.isJoined && joinResult.tenantAuth != null) {
        await _enterJoinedTenant(
          joinResult.tenantAuth!,
          TenantSummary(
            tenantId: joinResult.tenantAuth!.tenantId.isNotEmpty
                ? joinResult.tenantAuth!.tenantId
                : result.tenantId,
            tenantName: result.tenantName,
            tenantCode: result.tenantCode,
            logoUrl: result.logoUrl,
            membershipRole: result.targetMembershipRole ?? 0,
          ),
        );
        if (!mounted) return;
        _showSnack('已成功加入企业');
        context.go('/');
      } else {
        ref.invalidate(myJoinRequestsProvider);
        _showSnack('申请已提交，等待管理员审核');
      }
    } on AppError catch (e) {
      _showSnack(_errorMessage(e, fallback: '提交失败，请重试'));
    } catch (_) {
      _showSnack('提交失败，请重试');
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _enterJoinedTenant(
    TenantAuthResult tenantAuth,
    TenantSummary tenant,
  ) async {
    if (tenantAuth.tenantId.isEmpty) return;
    await ref
        .read(authProvider.notifier)
        .enterTenantFromJoinResult(tenantAuth, tenant: tenant);
  }

  Future<void> _cancelRequest(String requestId) async {
    final platformToken = ref.read(authProvider).valueOrNull?.platformToken;
    if (platformToken == null) {
      _showSnack('请先登录后再操作');
      return;
    }
    try {
      await ref.read(platformTenantDataSourceProvider).cancelJoinRequest(
            platformToken: platformToken,
            requestId: requestId,
          );
      ref.invalidate(myJoinRequestsProvider);
      _showSnack('申请已撤销');
    } on AppError catch (e) {
      _showSnack(_errorMessage(e, fallback: '撤销失败，请重试'));
    } catch (_) {
      _showSnack('撤销失败，请重试');
    }
  }

  void _pickTenant(JoinableTenant tenant) {
    _codeCtrl.text = tenant.tenantCode;
    setState(() {
      _searchError = null;
      _result = _SearchResult(
        type: _ResultType.tenant,
        tenantId: tenant.tenantId,
        tenantCode: tenant.tenantCode,
        tenantName: tenant.tenantName,
        logoUrl: tenant.logoUrl,
        industry: tenant.industry,
        memberCount: tenant.memberCount,
        description: tenant.description,
        alreadyMember: tenant.alreadyMember,
        codeOnly: false,
      );
    });
  }

  String _errorMessage(AppError error, {required String fallback}) {
    return switch (error) {
      ServerError(:final message) => message,
      NetworkError(:final message) => message,
      AuthError() => '登录状态已失效，请重新登录',
    };
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final recommendedAsync = ref.watch(recommendedTenantsProvider);
    final requestsAsync = ref.watch(myJoinRequestsProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
              size: 20, color: Color(0xFF1D2129)),
          onPressed: () => context.pop(),
        ),
        title: const Text('加入企业',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D2129))),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            // Logo
            Container(
              width: 96,
              height: 96,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF00B27A), Color(0xFF00D68F)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Center(
                  child: Text('🫧', style: TextStyle(fontSize: 48))),
            ),
            const SizedBox(height: 16),
            const Text('星络',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D2129))),
            const SizedBox(height: 6),
            const Text('企业私域营销平台',
                style: TextStyle(fontSize: 14, color: Color(0xFF8E8E93))),
            const SizedBox(height: 36),

            // 搜索框
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _codeCtrl,
                    focusNode: _focusNode,
                    onChanged: (_) => setState(() {
                      _result = null;
                      _searchError = null;
                    }),
                    onSubmitted: (_) => _search(),
                    decoration: InputDecoration(
                      hintText: '输入企业代码或邀请码',
                      hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
                      prefixIcon: const Icon(Icons.search,
                          color: Color(0xFFAEAEB2), size: 20),
                      filled: true,
                      fillColor: const Color(0xFFE6F7F2),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 72,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: (_codeCtrl.text.trim().isNotEmpty && !_searching)
                        ? _search
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00B27A),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFFD1D5DB),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: _searching
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Theme.of(context).colorScheme.surface))
                        : const Text('查询',
                            style: TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w500)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            if (_result == null && _searchError == null)
              _buildRecommendedSection(recommendedAsync),

            // 错误提示
            if (_searchError != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0F0),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: Color(0xFFEF4444), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_searchError!,
                          style: const TextStyle(
                              fontSize: 13, color: Color(0xFFEF4444))),
                    ),
                  ],
                ),
              ),

            // 查询结果卡片
            if (_result != null) _buildResultCard(_result!),

            if (_result != null && _result!.type == _ResultType.tenant) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _messageCtrl,
                minLines: 1,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: '申请说明（可选）',
                  hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
                  filled: true,
                  fillColor: const Color(0xFFF7F7F7),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // 申请加入按钮
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed:
                    (_result != null && !_result!.alreadyMember && !_joining)
                        ? _join
                        : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00B27A),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFAEAEB2),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: _joining
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).colorScheme.surface))
                    : Text(
                        _joinButtonLabel(_result),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w500),
                      ),
              ),
            ),

            const SizedBox(height: 14),
            const Text('支持企业代码（需管理员审批）或邀请码（直接加入）',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFF8E8E93))),

            const SizedBox(height: 24),
            _buildMyRequestsSection(requestsAsync),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendedSection(
    AsyncValue<List<JoinableTenant>> recommendedAsync,
  ) {
    return recommendedAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 18),
        child: CircularProgressIndicator(
          color: Color(0xFF00B27A),
          strokeWidth: 2,
        ),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (tenants) {
        if (tenants.isEmpty) return const SizedBox.shrink();
        return _Section(
          title: '推荐企业',
          child: ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: tenants.length > 5 ? 5 : tenants.length,
            itemBuilder: (context, index) {
              final tenant = tenants[index];
              return _TenantRow(
                tenant: tenant,
                onTap: () => _pickTenant(tenant),
              );
            },
          ),
        );
      },
    );
  }

  String _joinButtonLabel(_SearchResult? result) {
    if (result?.alreadyMember == true) return '已加入';
    if (result?.type == _ResultType.invitation) return '接受邀请';
    return '申请加入';
  }

  Widget _buildMyRequestsSection(
    AsyncValue<List<MyJoinRequest>> requestsAsync,
  ) {
    return requestsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (requests) {
        if (requests.isEmpty) return const SizedBox.shrink();
        return _Section(
          title: '我的申请',
          child: ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final request = requests[index];
              return _JoinRequestRow(
                request: request,
                onCancel: request.isPending
                    ? () => _cancelRequest(request.requestId)
                    : null,
              );
            },
          ),
        );
      },
    );
  }

  // -------------------------------------------------------------------------
  // 结果卡片
  // -------------------------------------------------------------------------

  Widget _buildResultCard(_SearchResult r) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FFFE),
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: const Color(0xFF00B27A).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // 企业 logo
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: r.logoUrl != null && r.logoUrl!.isNotEmpty
                    ? UserAvatar(
                        avatarUrl: r.logoUrl,
                        name: r.tenantName,
                        size: 52,
                        borderRadius: 10)
                    : Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF00B27A), Color(0xFF00D68F)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Text(
                            r.tenantName.isNotEmpty ? r.tenantName[0] : '企',
                            style: TextStyle(
                                fontSize: 22,
                                color: Theme.of(context).colorScheme.surface,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(r.tenantName,
                              style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1D2129))),
                        ),
                        if (r.alreadyMember) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F8EF),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('已加入',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF00B27A),
                                    fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('企业码：${r.tenantCode}',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF8E8E93))),
                  ],
                ),
              ),
              // 类型 badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: r.type == _ResultType.invitation
                      ? const Color(0xFFFFF7E6)
                      : const Color(0xFFE6F7F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  r.type == _ResultType.invitation ? '邀请码' : '企业码',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: r.type == _ResultType.invitation
                        ? const Color(0xFFD97706)
                        : const Color(0xFF00B27A),
                  ),
                ),
              ),
            ],
          ),

          // 详情信息
          if (r.industry != null ||
              r.memberCount != null ||
              r.description != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFE5E5EA)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 6,
              children: [
                if (r.industry != null)
                  _InfoChip(icon: Icons.business_outlined, label: r.industry!),
                if (r.memberCount != null)
                  _InfoChip(
                      icon: Icons.people_outline, label: '${r.memberCount} 人'),
              ],
            ),
            if (r.description != null && r.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(r.description!,
                  style: const TextStyle(
                      fontSize: 13, color: Color(0xFF4B5563), height: 1.5),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis),
            ],
          ],

          // 邀请入企角色提示
          if (r.type == _ResultType.invitation) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.badge_outlined,
                      size: 14, color: Color(0xFF2563EB)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '将以 ${_targetMembershipRoleLabel(r.targetMembershipRole)} 身份加入',
                      style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF2563EB),
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // 定向邀请提示
          if (r.type == _ResultType.invitation && r.targetHint != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline,
                      size: 14, color: Color(0xFFD97706)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text('此邀请码定向发送给：${r.targetHint}',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFFD97706))),
                  ),
                ],
              ),
            ),
          ],

          // 身份不匹配警告
          if (r.identityMatched == false) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F0),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_outlined,
                      size: 14, color: Color(0xFFEF4444)),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text('此邀请码不是发给您的，加入可能会失败',
                        style:
                            TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

String _targetMembershipRoleLabel(int? role) {
  return switch (role) {
    3 => '管理员',
    2 => '客服',
    1 => '技术',
    _ => '普通成员',
  };
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFFFF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF121212),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _TenantRow extends StatelessWidget {
  final JoinableTenant tenant;
  final VoidCallback onTap;

  const _TenantRow({required this.tenant, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            UserAvatar(
              avatarUrl: tenant.logoUrl,
              name: tenant.tenantName,
              size: 44,
              borderRadius: 10,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tenant.tenantName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF121212),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      if (tenant.tenantCode.isNotEmpty)
                        '企业码 ${tenant.tenantCode}',
                      if (tenant.memberCount != null) '${tenant.memberCount} 人',
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(fontSize: 12, color: Color(0xFF666666)),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              '加入',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF07C160),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _JoinRequestRow extends StatelessWidget {
  final MyJoinRequest request;
  final VoidCallback? onCancel;

  const _JoinRequestRow({required this.request, this.onCancel});

  @override
  Widget build(BuildContext context) {
    final status = _requestStatus(request.status);
    final tenantName = _tenantName(request);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          UserAvatar(
            avatarUrl: request.logoUrl,
            name: tenantName,
            size: 40,
            borderRadius: 10,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(
                        tenantName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF121212),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: status.background,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: status.color,
                        ),
                      ),
                    ),
                  ],
                ),
                if (request.message.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    request.message,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(fontSize: 12, color: Color(0xFF666666)),
                  ),
                ],
                if (request.rejectReason != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '拒绝原因：${request.rejectReason}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(fontSize: 12, color: Color(0xFFEF4444)),
                  ),
                ],
              ],
            ),
          ),
          if (onCancel != null) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: onCancel,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF666666),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(44, 32),
              ),
              child: const Text('撤销'),
            ),
          ],
        ],
      ),
    );
  }

  static String _tenantName(MyJoinRequest request) {
    if (request.tenantName.trim().isNotEmpty) return request.tenantName;
    if (request.tenantCode.trim().isNotEmpty) return request.tenantCode;
    if (request.tenantId.length >= 8) {
      return '企业 ${request.tenantId.substring(0, 8)}';
    }
    return '企业申请';
  }

  static _RequestStatus _requestStatus(String status) {
    return switch (status) {
      'approved' => const _RequestStatus(
          label: '已通过',
          color: Color(0xFF07C160),
          background: Color(0xFFE8F8EF),
        ),
      'rejected' => const _RequestStatus(
          label: '已拒绝',
          color: Color(0xFFEF4444),
          background: Color(0xFFFFF0F0),
        ),
      'cancelled' => const _RequestStatus(
          label: '已撤销',
          color: Color(0xFF8E8E93),
          background: Color(0xFFF2F2F2),
        ),
      _ => const _RequestStatus(
          label: '待审批',
          color: Color(0xFFD97706),
          background: Color(0xFFFFF7E6),
        ),
    };
  }
}

class _RequestStatus {
  final String label;
  final Color color;
  final Color background;

  const _RequestStatus({
    required this.label,
    required this.color,
    required this.background,
  });
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon,
            size: 13,
            color:
                Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E93))),
      ],
    );
  }
}
