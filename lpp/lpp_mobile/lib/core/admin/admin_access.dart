class AdminAccessibleTenant {
  static const managementRoleCodes = {
    'tenant_owner',
    'tenant_admin',
    'platform_admin',
    'ops_operator',
    'audit_operator',
    'config_operator',
  };

  final String tenantId;
  final String? tenantCode;
  final String tenantName;
  final List<String> roleCodes;

  const AdminAccessibleTenant({
    required this.tenantId,
    required this.tenantName,
    this.tenantCode,
    this.roleCodes = const [],
  });

  factory AdminAccessibleTenant.fromJson(Map<String, dynamic> json) {
    return AdminAccessibleTenant(
      tenantId: json['tenantId'] as String? ?? '',
      tenantCode: json['tenantCode'] as String?,
      tenantName: json['tenantName'] as String? ?? '',
      roleCodes: (json['roleCodes'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .where((code) => code.trim().isNotEmpty)
          .toList(growable: false),
    );
  }

  bool get canAccess => tenantId.isNotEmpty && roleCodes.isNotEmpty;

  bool get hasManagementConsoleAccess =>
      canAccess &&
      roleCodes
          .map((code) => code.trim().toLowerCase())
          .any(managementRoleCodes.contains);

  bool get hasAdminApiTokenAccess {
    if (hasManagementConsoleAccess) return true;
    return roleCodes
        .map((code) => code.trim().toLowerCase())
        .any((code) => code == 'customer_service');
  }

  bool get hasOwnerRole =>
      roleCodes.map((code) => code.trim().toLowerCase()).any(
            (code) => code == 'tenant_owner' || code == 'platform_admin',
          );

  bool get isCustomerServiceOnly {
    final normalized = roleCodes
        .map((code) => code.trim().toLowerCase())
        .where((code) => code.isNotEmpty)
        .toSet();
    return normalized.isNotEmpty &&
        normalized.difference({'customer_service'}).isEmpty;
  }
}
