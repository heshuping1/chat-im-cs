import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

const String kPrimarySiteId = 'main-1';
const String kPrimarySiteName = '主站1';
const String kPrimarySiteBaseUrl = 'https://chat.hearteasechat.com';

const String _kCachedSwitchableSitesKey = 'site_line_cached_switchable_sites_v1';
const String _kCurrentSiteIdKey = 'site_line_current_site_id_v1';

/// S3 is a fallback configfile only. It is intentionally not rendered in the
/// user-facing line switcher.
const String _kFallbackS3ConfigFileUrl = String.fromEnvironment(
  'LPP_S3_CONFIGFILE_URL',
  defaultValue: '',
);

typedef SiteProbe = Future<bool> Function(AppSiteLine site);
typedef ConfigFetcher = Future<List<AppSiteLine>> Function(String configFileUrl);

@immutable
class AppSiteLine {
  final String id;
  final String name;
  final String apiBaseUrl;
  final String? adminBaseUrl;
  final String? configFileUrl;
  final bool isPrimary;

  const AppSiteLine({
    required this.id,
    required this.name,
    required this.apiBaseUrl,
    this.adminBaseUrl,
    this.configFileUrl,
    this.isPrimary = false,
  });

  static const primary = AppSiteLine(
    id: kPrimarySiteId,
    name: kPrimarySiteName,
    apiBaseUrl: kPrimarySiteBaseUrl,
    isPrimary: true,
  );

  String get effectiveAdminBaseUrl {
    final explicit = adminBaseUrl?.trim();
    if (explicit != null && explicit.isNotEmpty) return explicit;
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null) return apiBaseUrl;
    final host = uri.host.startsWith('chat.')
        ? uri.host.replaceFirst('chat.', 'admin.')
        : uri.host;
    return uri.replace(host: host).toString().replaceFirst(RegExp(r'/$'), '');
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'apiBaseUrl': apiBaseUrl,
        if (adminBaseUrl != null) 'adminBaseUrl': adminBaseUrl,
        if (configFileUrl != null) 'configFileUrl': configFileUrl,
        'isPrimary': isPrimary,
      };

  factory AppSiteLine.fromJson(Map<String, dynamic> json) {
    String? pick(List<String> keys) {
      for (final key in keys) {
        final value = json[key];
        if (value is String && value.trim().isNotEmpty) {
          return value.trim();
        }
      }
      return null;
    }

    final apiBaseUrl = _normalizeBaseUrl(
      pick(['apiBaseUrl', 'baseUrl', 'chatUrl', 'url', 'domain', 'host']) ??
          '',
    );
    final id = pick(['id', 'siteId', 'code', 'key']) ?? apiBaseUrl;
    return AppSiteLine(
      id: id,
      name: pick(['name', 'title', 'label', 'displayName']) ?? id,
      apiBaseUrl: apiBaseUrl,
      adminBaseUrl:
          _normalizeNullableBaseUrl(pick(['adminBaseUrl', 'adminUrl'])),
      configFileUrl:
          pick(['configFileUrl', 'configfile', 'configFile', 'configUrl']),
      isPrimary: json['isPrimary'] == true || id == kPrimarySiteId,
    );
  }

  static String _normalizeBaseUrl(String raw) {
    var value = raw.trim();
    if (value.isEmpty) return value;
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      value = 'https://$value';
    }
    return value.replaceFirst(RegExp(r'/$'), '');
  }

  static String? _normalizeNullableBaseUrl(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    return _normalizeBaseUrl(raw);
  }
}

@immutable
class SiteLineBootstrapResult {
  final AppSiteLine currentSite;
  final List<AppSiteLine> switchableSites;
  final bool refreshedConfig;
  final String? selectedFromConfigFile;

  const SiteLineBootstrapResult({
    required this.currentSite,
    required this.switchableSites,
    required this.refreshedConfig,
    this.selectedFromConfigFile,
  });
}

class SiteLineManager extends ChangeNotifier {
  SiteLineManager._();

  static final SiteLineManager instance = SiteLineManager._();

  final Dio _probeDio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 4),
      followRedirects: false,
      validateStatus: (_) => true,
    ),
  );

  SecureStorageService? _storage;
  AppSiteLine _currentSite = AppSiteLine.primary;
  List<AppSiteLine> _switchableSites = const [];
  bool _initialized = false;

  AppSiteLine get currentSite => _currentSite;

  String get apiBaseUrl => _currentSite.apiBaseUrl;

  String get adminBaseUrl => _currentSite.effectiveAdminBaseUrl;

  List<AppSiteLine> get switcherSites => [
        AppSiteLine.primary,
        ..._switchableSites.where((site) => !site.isPrimary),
      ];

  bool get initialized => _initialized;

  Future<SiteLineBootstrapResult> bootstrap(
    SecureStorageService storage, {
    SiteProbe? probe,
    ConfigFetcher? fetchConfig,
  }) async {
    _storage = storage;
    _switchableSites = await _readCachedSwitchableSites(storage);
    _currentSite = _siteById(
          await storage.read(_kCurrentSiteIdKey),
          _switchableSites,
        ) ??
        AppSiteLine.primary;

    final candidates = configFetchCandidates(
      currentSite: _currentSite,
      cachedSwitchableSites: _switchableSites,
      fallbackS3ConfigFileUrl: _kFallbackS3ConfigFileUrl,
    );

    var refreshed = false;
    String? successfulConfigFile;
    final effectiveFetcher = fetchConfig ?? _fetchConfigFile;
    for (final configFileUrl in candidates) {
      try {
        final fetched = await effectiveFetcher(configFileUrl);
        final normalized = _dedupeSwitchableSites(fetched);
        if (normalized.isEmpty) continue;
        _switchableSites = normalized;
        await _writeCachedSwitchableSites(storage, normalized);
        refreshed = true;
        successfulConfigFile = configFileUrl;
        break;
      } catch (error) {
        debugPrint('[SiteLine] configfile failed: $configFileUrl $error');
      }
    }

    final selected = await selectFirstAvailableSite(
      [AppSiteLine.primary, ..._switchableSites],
      probe: probe ?? _probeSite,
    );
    await _setCurrentSite(selected, persist: true);
    _initialized = true;
    notifyListeners();

    return SiteLineBootstrapResult(
      currentSite: _currentSite,
      switchableSites: _switchableSites,
      refreshedConfig: refreshed,
      selectedFromConfigFile: successfulConfigFile,
    );
  }

  Future<void> selectSite(AppSiteLine site) => _setCurrentSite(site);

  Future<void> _setCurrentSite(AppSiteLine site, {bool persist = true}) async {
    _currentSite = site;
    if (persist) {
      await _storage?.write(_kCurrentSiteIdKey, site.id);
    }
    notifyListeners();
  }

  List<String> configFetchOrderForDebug() => configFetchCandidates(
        currentSite: _currentSite,
        cachedSwitchableSites: _switchableSites,
        fallbackS3ConfigFileUrl: _kFallbackS3ConfigFileUrl,
      );

  static List<String> configFetchCandidates({
    required AppSiteLine currentSite,
    required List<AppSiteLine> cachedSwitchableSites,
    required String fallbackS3ConfigFileUrl,
  }) {
    final orderedSites = <AppSiteLine>[
      if (!currentSite.isPrimary) currentSite,
      ...cachedSwitchableSites.where((site) => site.id != currentSite.id),
    ];
    final seen = <String>{};
    final urls = <String>[];
    for (final site in orderedSites) {
      final url = site.configFileUrl?.trim();
      if (url == null || url.isEmpty || !seen.add(url)) continue;
      urls.add(url);
    }
    final fallback = fallbackS3ConfigFileUrl.trim();
    if (fallback.isNotEmpty && seen.add(fallback)) urls.add(fallback);
    return urls;
  }

  static Future<AppSiteLine> selectFirstAvailableSite(
    List<AppSiteLine> sites, {
    required SiteProbe probe,
  }) async {
    for (final site in _dedupeSites(sites)) {
      try {
        if (await probe(site)) return site;
      } catch (_) {}
    }
    return sites.isEmpty ? AppSiteLine.primary : sites.first;
  }

  Future<List<AppSiteLine>> _fetchConfigFile(String configFileUrl) async {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 8),
        validateStatus: (status) =>
            status != null && status >= 200 && status < 300,
      ),
    );
    final response = await dio.get<dynamic>(configFileUrl);
    return parseConfigFile(response.data);
  }

  static List<AppSiteLine> parseConfigFile(dynamic body) {
    final decoded = body is String ? jsonDecode(body) : body;
    final rawItems = _extractSiteItems(decoded);
    return _dedupeSwitchableSites(
      rawItems
          .whereType<Map>()
          .map((item) => AppSiteLine.fromJson(Map<String, dynamic>.from(item)))
          .where((site) => site.apiBaseUrl.isNotEmpty)
          .toList(),
    );
  }

  static List<dynamic> _extractSiteItems(dynamic decoded) {
    if (decoded is List) return decoded;
    if (decoded is! Map) return const [];
    final map = Map<String, dynamic>.from(decoded);
    for (final key in const [
      'sites',
      'siteList',
      'configline',
      'configLine',
      'lines',
      'data',
    ]) {
      final value = map[key];
      if (value is List) return value;
      if (value is Map) {
        final nested = _extractSiteItems(value);
        if (nested.isNotEmpty) return nested;
      }
    }
    return const [];
  }

  Future<bool> _probeSite(AppSiteLine site) async {
    try {
      final response = await _probeDio.get<dynamic>(site.apiBaseUrl);
      final status = response.statusCode ?? 0;
      return status > 0 && status < 500;
    } catch (_) {
      return false;
    }
  }

  static Future<List<AppSiteLine>> _readCachedSwitchableSites(
    SecureStorageService storage,
  ) async {
    final raw = await storage.read(_kCachedSwitchableSitesKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return _dedupeSwitchableSites(
        decoded
            .whereType<Map>()
            .map((item) => AppSiteLine.fromJson(Map<String, dynamic>.from(item)))
            .where((site) => site.apiBaseUrl.isNotEmpty)
            .toList(),
      );
    } catch (_) {
      return const [];
    }
  }

  static Future<void> _writeCachedSwitchableSites(
    SecureStorageService storage,
    List<AppSiteLine> sites,
  ) {
    return storage.write(
      _kCachedSwitchableSitesKey,
      jsonEncode(sites.map((site) => site.toJson()).toList()),
    );
  }

  static AppSiteLine? _siteById(String? id, List<AppSiteLine> switchableSites) {
    if (id == null || id.isEmpty || id == AppSiteLine.primary.id) {
      return AppSiteLine.primary;
    }
    for (final site in switchableSites) {
      if (site.id == id) return site;
    }
    return null;
  }

  static List<AppSiteLine> _dedupeSwitchableSites(List<AppSiteLine> sites) {
    return _dedupeSites(
      sites.where((site) => site.id != kPrimarySiteId && !site.isPrimary),
    );
  }

  static List<AppSiteLine> _dedupeSites(Iterable<AppSiteLine> sites) {
    final seen = <String>{};
    final result = <AppSiteLine>[];
    for (final site in sites) {
      final key = site.id.isNotEmpty ? site.id : site.apiBaseUrl;
      if (!seen.add(key)) continue;
      result.add(site);
    }
    return result;
  }
}
