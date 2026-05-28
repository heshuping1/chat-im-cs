import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';

void main() {
  group('SiteLineManager', () {
    const hk1 = AppSiteLine(
      id: 'hk-1',
      name: '香港1',
      apiBaseUrl: 'https://hk1.example.com',
      configFileUrl: 'https://hk1.example.com/config.json',
    );
    const hk2 = AppSiteLine(
      id: 'hk-2',
      name: '香港2',
      apiBaseUrl: 'https://hk2.example.com',
      configFileUrl: 'https://hk2.example.com/config.json',
    );
    const hk3 = AppSiteLine(
      id: 'hk-3',
      name: '香港3',
      apiBaseUrl: 'https://hk3.example.com',
      configFileUrl: 'https://hk3.example.com/config.json',
    );

    test('uses only S3 configfile when current primary has no cached lines', () {
      final order = SiteLineManager.configFetchCandidates(
        currentSite: AppSiteLine.primary,
        cachedSwitchableSites: const [],
        fallbackS3ConfigFileUrl: 'https://s3.example.com/config.json',
      );

      expect(order, ['https://s3.example.com/config.json']);
    });

    test('uses cached lines then S3 when current site is primary', () {
      final order = SiteLineManager.configFetchCandidates(
        currentSite: AppSiteLine.primary,
        cachedSwitchableSites: const [hk1, hk2, hk3],
        fallbackS3ConfigFileUrl: 'https://s3.example.com/config.json',
      );

      expect(order, [
        'https://hk1.example.com/config.json',
        'https://hk2.example.com/config.json',
        'https://hk3.example.com/config.json',
        'https://s3.example.com/config.json',
      ]);
    });

    test('moves current cached line to the front before S3', () {
      final order = SiteLineManager.configFetchCandidates(
        currentSite: hk2,
        cachedSwitchableSites: const [hk1, hk2, hk3],
        fallbackS3ConfigFileUrl: 'https://s3.example.com/config.json',
      );

      expect(order, [
        'https://hk2.example.com/config.json',
        'https://hk1.example.com/config.json',
        'https://hk3.example.com/config.json',
        'https://s3.example.com/config.json',
      ]);
    });

    test('parses configfile and removes primary/fallback concepts', () {
      final sites = SiteLineManager.parseConfigFile({
        'data': {
          'configline': [
            {
              'id': 'sg-1',
              'name': '新加坡1',
              'baseUrl': 'sg1.example.com',
              'configfile': 'https://sg1.example.com/config.json',
            },
            {
              'id': 'main-1',
              'name': '主站1',
              'baseUrl': 'https://chat.hearteasechat.com',
            },
            {
              'id': 'sg-2',
              'title': '新加坡2',
              'apiBaseUrl': 'https://sg2.example.com/',
              'configFileUrl': 'https://sg2.example.com/config.json',
            },
          ],
        },
      });

      expect(sites.map((site) => site.id), ['sg-1', 'sg-2']);
      expect(sites.first.apiBaseUrl, 'https://sg1.example.com');
      expect(sites.last.apiBaseUrl, 'https://sg2.example.com');
    });

    test('selects the first available site from the overall list order',
        () async {
      final selected = await SiteLineManager.selectFirstAvailableSite(
        const [
          AppSiteLine.primary,
          AppSiteLine(
            id: 'sg-1',
            name: '新加坡1',
            apiBaseUrl: 'https://sg1.example.com',
          ),
          AppSiteLine(
            id: 'sg-2',
            name: '新加坡2',
            apiBaseUrl: 'https://sg2.example.com',
          ),
        ],
        probe: (site) async => site.id == 'sg-2',
      );

      expect(selected.id, 'sg-2');
    });
  });
}
