import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/customer_service/data/datasources/customer_service_remote_datasource.dart';

void main() {
  group('Admin customer service datasource', () {
    test(
      'loads direct customer threads from documented admin endpoint',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = AdminCustomerServiceRemoteDataSource(dio);

        final items = await datasource.getDirectCustomerThreads(
          keyword: '客户',
          unassignedOnly: true,
        );

        expect(
          adapter.requests.single.path,
          '/api/admin/v1/customer-service/im-direct/threads',
        );
        expect(adapter.requests.single.queryParameters['keyword'], '客户');
        expect(adapter.requests.single.queryParameters['unassignedOnly'], true);
        expect(items, hasLength(1));
        expect(items.single.threadType, 'direct_customer');
        expect(items.single.title, '客户 A');
        expect(items.single.assignedStaffDisplayName, '客服 A');
        expect(items.single.unreadCount, 3);
      },
    );

    test('loads all center threads without thread type filter', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      final items = await datasource.getCenterThreads();

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/customer-service/center/threads',
      );
      expect(
        adapter.requests.single.queryParameters.containsKey('threadType'),
        isFalse,
      );
      expect(items, hasLength(2));
    });

    test(
      'loads temp session center threads with documented thread type',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = AdminCustomerServiceRemoteDataSource(dio);

        final items = await datasource.getCenterThreads(
          threadType: 'temp_session',
        );

        expect(
          adapter.requests.single.path,
          '/api/admin/v1/customer-service/center/threads',
        );
        expect(
          adapter.requests.single.queryParameters['threadType'],
          'temp_session',
        );
        expect(items.single.threadType, 'temp_session');
      },
    );

    test(
      'loads direct customer center threads with documented thread type',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = AdminCustomerServiceRemoteDataSource(dio);

        final items = await datasource.getCenterThreads(
          threadType: 'direct_customer',
        );

        expect(
          adapter.requests.single.path,
          '/api/admin/v1/customer-service/center/threads',
        );
        expect(
          adapter.requests.single.queryParameters['threadType'],
          'im_direct',
        );
        expect(items.single.threadType, 'direct_customer');
      },
    );

    test('loads audit logs from documented admin endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      final logs = await datasource.getAuditLogs(
        actionCode: 'customer_service.assign',
      );

      expect(adapter.requests.single.path, '/api/admin/v1/audit-logs');
      expect(
        adapter.requests.single.queryParameters['actionCode'],
        'customer_service.assign',
      );
      expect(logs, hasLength(1));
      expect(logs.single.actionName, '分配客服');
      expect(logs.single.actorDisplayName, '所有者');
      expect(logs.single.targetDisplayName, '客户 A');
    });

    test(
      'loads customers from documented customer management endpoint',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = AdminCustomerServiceRemoteDataSource(dio);

        final customers = await datasource.getCustomers(keyword: '客户 A');

        expect(
          adapter.requests.single.path,
          '/api/admin/v1/customer-management/customers',
        );
        expect(adapter.requests.single.queryParameters['assignment'], 'all');
        expect(adapter.requests.single.queryParameters['keyword'], '客户 A');
        expect(customers, hasLength(2));
        expect(customers.first.userId, 'customer-1');
        expect(customers.first.displayName, '客户 A');
        expect(customers.first.assignedStaffDisplayName, '客服 A');
        expect(customers.first.isUnassigned, isFalse);
        expect(customers.last.isUnassigned, isTrue);
      },
    );

    test('loads customers with enterprise tag filters', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      await datasource.getCustomers(
        keyword: '客户',
        tags: const ['VIP', '投诉'],
        tagMatch: 'any',
      );

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/customer-management/customers',
      );
      expect(adapter.requests.single.queryParameters['keyword'], '客户');
    });

    test('loads admin groups from documented admin endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      final groups = await datasource.getGroups();

      expect(adapter.requests.single.path, '/api/admin/v1/groups');
      expect(groups, hasLength(1));
      expect(groups.single.conversationId, 'group-1');
      expect(groups.single.title, 'VIP 客户群');
      expect(groups.single.memberCount, 12);
    });

    test('loads temp session stats from documented admin endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      final stats = await datasource.getTempSessionStats();

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/customer-service/temp-sessions/stats',
      );
      expect(stats.staffPerformance.single.displayName, '客服 A');
      expect(stats.staffPerformance.single.byChannel.last.channel, 'im_direct');
      expect(stats.staffPerformance.single.servedCountMatchesBreakdown, isTrue);
    });

    test('freezes group conversation from documented admin endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      await datasource.freezeConversation(
        conversationId: 'group-1',
        frozen: true,
        reason: '风险处理',
      );

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/groups/group-1/freeze',
      );
      expect(adapter.requests.single.method, 'POST');
      expect(adapter.requestBodies.single, {'frozen': true, 'reason': '风险处理'});
    });

    test('freezes customer service thread from center thread endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      await datasource.freezeConversation(
        conversationId: 'conversation-1',
        threadType: 'direct_customer',
        threadId: 'thread-1',
        frozen: true,
        reason: '风险处理',
      );

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/customer-service/center/threads/im_direct/thread-1/freeze',
      );
      expect(adapter.requests.single.method, 'POST');
      expect(adapter.requestBodies.single, {'reason': '风险处理'});
    });

    test('loads customer detail with assignable staff', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      final detail = await datasource.getCustomerDetail('customer-1');

      expect(adapter.requests.single.path, '/api/admin/v1/users/customer-1');
      expect(detail.customerService.assignedStaff?.displayName, '客服 A');
      expect(detail.assignedStaffUserId, 'staff-1');
      expect(detail.customerService.assignableStaff, hasLength(2));
      expect(detail.customerService.assignableStaff.last.displayName, '客服 B');
    });

    test('assigns customer service from documented endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      await datasource.assignCustomerService(
        customerUserId: 'customer-1',
        staffUserId: 'staff-2',
      );

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/users/customer-1/customer-service/assign',
      );
      expect(adapter.requestBodies.single, {
        'staffUserId': 'staff-2',
        'transferConversation': true,
      });
    });

    test('updates enterprise customer tags from documented endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = AdminCustomerServiceRemoteDataSource(dio);

      await datasource.updateCustomerTags(
        customerUserId: 'customer-1',
        tags: const ['VIP', '投诉'],
      );

      expect(
        adapter.requests.single.path,
        '/api/admin/v1/users/customer-1/tags',
      );
      expect(adapter.requests.single.method, 'PUT');
      expect(adapter.requestBodies.single, {
        'tags': ['VIP', '投诉'],
      });
    });

    test(
      'loads admin customer profile card from profile-card endpoint',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = AdminCustomerServiceRemoteDataSource(dio);

        final card = await datasource.getCustomerProfileCard('customer-1');

        expect(
          adapter.requests.single.path,
          '/api/admin/v1/customer-service/center/customers/customer-1/profile-card',
        );
        expect(card.identity.displayName, '客户 A');
        expect(card.account?.balance, 8560);
        expect(card.tickets.single.title, '出金审核咨询');
      },
    );
  });

  group('Customer service datasource', () {
    test('loads workbench customer profile card from client endpoint', () async {
      final adapter = _AdminApiAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      final datasource = CustomerServiceRemoteDataSource(dio);

      final card = await datasource.getCustomerProfileCard('customer-1');

      expect(
        adapter.requests.single.path,
        '/api/client/v1/customer-service/workbench/customers/customer-1/profile-card',
      );
      expect(card.identity.displayName, '客户 A');
      expect(card.trading?.totalOrders, 12);
    });

    test(
      'loads staff service history from dedicated client endpoint',
      () async {
        final adapter = _AdminApiAdapter();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
          ..httpClientAdapter = adapter;
        final datasource = CustomerServiceRemoteDataSource(dio);

        final items = await datasource.getStaffServiceHistory();

        expect(
          adapter.requests.single.path,
          '/api/client/v1/customer-service/staff/service-history',
        );
        expect(
          adapter.requests.single.queryParameters['threadType'],
          'temp_session',
        );
        expect(items, hasLength(1));
        expect(items.single.threadId, 'history-thread-1');
        expect(items.single.isTerminal, isTrue);
        expect(items.single.isTempSession, isTrue);
      },
    );
  });
}

class _AdminApiAdapter implements HttpClientAdapter {
  final List<RequestOptions> requests = [];
  final List<Map<String, dynamic>> requestBodies = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (requestStream != null) {
      final bytes = <int>[];
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
      if (bytes.isNotEmpty) {
        requestBodies.add(
          Map<String, dynamic>.from(jsonDecode(utf8.decode(bytes)) as Map),
        );
      }
    }
    if (options.path == '/api/admin/v1/customer-management/customers') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'items': [
            {
              'userId': 'customer-1',
              'loginName': 'customer_a',
              'displayName': '客户 A',
              'avatarUrl': 'https://example.com/customer-a.png',
              'status': 'active',
              'userType': 1,
              'membershipRole': 0,
              'assignedStaffUserId': 'staff-1',
              'assignedStaffDisplayName': '客服 A',
              'tags': ['VIP', '投诉'],
            },
            {
              'userId': 'customer-2',
              'loginName': 'customer_b',
              'displayName': '客户 B',
              'status': 'active',
              'userType': 1,
              'membershipRole': 0,
            },
          ],
        },
      });
    }
    if (options.path == '/api/admin/v1/groups') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'items': [
            {
              'conversationId': 'group-1',
              'title': 'VIP 客户群',
              'memberCount': 12,
              'lastMessagePreview': '欢迎',
              'updatedAt': '2026-05-23T10:30:00Z',
            },
          ],
        },
      });
    }
    if (options.path == '/api/admin/v1/customer-service/temp-sessions/stats') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'totalSessions': 24,
          'totalQueued': 3,
          'totalServed': 21,
          'avgFirstResponseSeconds': 58,
          'staffPerformance': [
            {
              'staffUserId': 'staff-1',
              'displayName': '客服 A',
              'sessionsServed': 10,
              'avgFirstResponseSeconds': 30,
              'avgDurationSeconds': 300,
              'avgRating': 4.9,
              'excellentRate': 0.92,
              'byChannel': [
                {'channel': 'widget', 'sessionsServed': 4},
                {'channel': 'im_direct', 'sessionsServed': 6},
              ],
            },
          ],
        },
      });
    }
    if (options.path == '/api/admin/v1/groups/group-1/freeze') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'conversationId': 'group-1', 'frozen': true},
      });
    }
    if (options.path ==
        '/api/admin/v1/customer-service/center/threads/im_direct/thread-1/freeze') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'threadId': 'thread-1', 'frozen': true},
      });
    }
    if (options.path == '/api/admin/v1/users/customer-1') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'userId': 'customer-1',
          'loginName': 'customer_a',
          'displayName': '客户 A',
          'status': 'active',
          'userType': 1,
          'membershipRole': 0,
          'tags': ['VIP'],
          'customerService': {
            'assignedStaff': {
              'userId': 'staff-1',
              'displayName': '客服 A',
              'loginName': 'staff_a',
              'lppId': 'staff_a_lpp',
            },
            'assignableStaff': [
              {
                'userId': 'staff-1',
                'displayName': '客服 A',
                'loginName': 'staff_a',
                'lppId': 'staff_a_lpp',
              },
              {
                'userId': 'staff-2',
                'displayName': '客服 B',
                'loginName': 'staff_b',
                'lppId': 'staff_b_lpp',
              },
            ],
          },
        },
      });
    }
    if (options.path ==
        '/api/admin/v1/users/customer-1/customer-service/assign') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'staffUserId': 'staff-2',
          'transferredConversationCount': 1,
          'skippedConversationCount': 0,
        },
      });
    }
    if (options.path == '/api/admin/v1/users/customer-1/tags') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'userId': 'customer-1',
          'tags': ['VIP', '投诉'],
        },
      });
    }
    if (options.path ==
            '/api/admin/v1/customer-service/center/customers/customer-1/profile-card' ||
        options.path ==
            '/api/client/v1/customer-service/workbench/customers/customer-1/profile-card') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': _profileCardPayload(),
      });
    }
    if (options.path ==
        '/api/client/v1/customer-service/staff/service-history') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'items': [
            {
              'threadType': 'temp_session',
              'threadId': 'history-thread-1',
              'status': 6,
              'closedAt': '2026-05-24T14:13:22Z',
              'lastMessageAt': '2026-05-24T14:08:20Z',
              'participation': 'current_owner',
            },
            {
              'threadType': 'temp_session',
              'threadId': 'active-thread-1',
              'status': 2,
              'lastMessageAt': '2026-05-24T14:08:20Z',
              'participation': 'current_owner',
            },
          ],
          'nextCursor': null,
        },
      });
    }
    if (options.path == '/api/admin/v1/customer-service/im-direct/threads') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'items': [
            {
              'threadId': 'thread-1',
              'conversationId': 'conversation-1',
              'customerUserId': 'customer-1',
              'customerDisplayName': '客户 A',
              'customerAvatarUrl': 'https://example.com/a.png',
              'status': 'active',
              'assignedStaffUserId': 'staff-1',
              'assignedStaffDisplayName': '客服 A',
              'lastMessagePreview': '您好',
              'unreadCount': 3,
            },
          ],
        },
      });
    }
    if (options.path == '/api/admin/v1/customer-service/center/threads' ||
        options.path == '/api/admin/v1/conversation-management/conversations') {
      final allItems = [
        {
          'threadType': 'temp_session',
          'threadId': 'temp-thread-1',
          'conversationId': 'temp-conversation-1',
          'status': 'queued',
          'title': '访客 A',
          'visitorId': 'visitor-1',
          'lastMessagePreview': '咨询订单',
          'unreadCount': 1,
        },
        {
          'threadType': 'direct_customer',
          'threadId': 'direct-thread-1',
          'conversationId': 'direct-conversation-1',
          'status': 'active',
          'title': '客户 A',
          'customerUserId': 'customer-1',
          'lastMessagePreview': '您好',
          'unreadCount': 3,
        },
      ];
      final type =
          (options.queryParameters['threadType'] ??
                  options.queryParameters['type'])
              as String?;
      final items = type == null
          ? allItems
          : allItems
                .where(
                  (item) => type == 'temp_session'
                      ? item['threadType'] == 'temp_session'
                      : item['threadType'] == 'direct_customer',
                )
                .toList();
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {'items': items},
      });
    }
    if (options.path == '/api/admin/v1/audit-logs') {
      return _json({
        'code': 'OK',
        'message': 'success',
        'data': {
          'items': [
            {
              'auditLogId': 'audit-1',
              'actionCode': 'customer_service.assign',
              'displayName': '分配客服',
              'actorDisplayName': '所有者',
              'targetType': 'customer',
              'targetDisplayName': '客户 A',
              'createdAt': '2026-05-17T01:30:00Z',
            },
          ],
        },
      });
    }
    return _json({
      'code': 'NOT_FOUND',
      'message': 'not found',
    }, statusCode: 404);
  }

  ResponseBody _json(Map<String, dynamic> body, {int statusCode = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> _profileCardPayload() {
  return {
    'identity': {
      'customerUserId': 'customer-1',
      'displayName': '客户 A',
      'registered': true,
      'level': 'VIP',
      'kycStatus': 'verified',
      'riskLevel': 'low',
      'language': 'zh-CN',
      'source': 'wechat',
      'assignedStaffDisplayName': '客服 A',
      'tags': ['VIP', '活跃用户'],
    },
    'account': {
      'balance': 8560,
      'totalDeposit': 28560,
      'netDeposit': 26560,
      'accountStatus': 'active',
      'registeredAt': '2023-05-01T00:00:00Z',
      'ibCode': 'IB-008',
    },
    'trading': {
      'totalOrders': 12,
      'products': ['XAU/USD', 'EUR/USD'],
      'winRate': 1,
      'lastTradeAt': '2026-05-18T13:10:00Z',
    },
    'tickets': [
      {
        'ticketId': 'ticket-1',
        'title': '出金审核咨询',
        'status': 'open',
        'priority': 'normal',
        'assigneeDisplayName': '客服 A',
        'updatedAt': '2026-05-18T14:00:00Z',
      },
    ],
  };
}
