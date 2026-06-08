import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/pages/customer_service_page.dart';

void main() {
  group('Customer service API contract', () {
    test('parses quick replies from documented client API payload', () {
      final reply = CsQuickReply.fromJson({
        'quickReplyId': '019e-quick-1',
        'scope': 'direct_customer',
        'locale': 'zh-CN',
        'category': '售后',
        'title': '发货咨询',
        'content': '您好，我帮您查询一下订单状态。',
        'tags': ['订单', '物流'],
        'sortOrder': 20,
        'enabled': true,
        'createdAt': '2026-05-15T01:00:00Z',
        'updatedAt': '2026-05-15T02:00:00Z',
      });

      expect(reply.quickReplyId, '019e-quick-1');
      expect(reply.scope, 'direct_customer');
      expect(reply.scopeLabel, '聊天');
      expect(reply.category, '售后');
      expect(reply.title, '发货咨询');
      expect(reply.content, '您好，我帮您查询一下订单状态。');
      expect(reply.tags, ['订单', '物流']);
      expect(reply.sortOrder, 20);
      expect(reply.enabled, isTrue);
      expect(reply.updatedAt, isNotNull);
    });

    test(
      'keeps dashboard online count as server-maintained status summary',
      () {
        final dashboard = CsDashboardData.fromJson({
          'queuedTotalCount': 3,
          'totalActiveCount': 5,
          'onlineStaffCount': 2,
          'directUnreadCount': 7,
        });

        expect(dashboard.onlineStaffCount, 2);
        expect(dashboard.directUnreadCount, 7);
      },
    );

    test('parses admin customer service dashboard type breakdown', () {
      final dashboard = AdminCustomerServiceDashboard.fromJson({
        'queuedTempCount': 3,
        'queuedDirectCount': 4,
        'queuedTotalCount': 7,
        'activeTempCount': 5,
        'activeDirectCount': 6,
        'totalActiveCount': 11,
        'onlineStaffCount': 2,
        'busyStaffCount': 1,
      });

      expect(dashboard.queuedTempCount, 3);
      expect(dashboard.queuedDirectCount, 4);
      expect(dashboard.queuedTotalCount, 7);
      expect(dashboard.activeTempCount, 5);
      expect(dashboard.activeDirectCount, 6);
      expect(dashboard.totalActiveCount, 11);
      expect(dashboard.onlineStaffCount, 2);
      expect(dashboard.busyStaffCount, 1);
      expect(dashboard.idleStaffCount, 1);
      expect(dashboard.todaySessions, isNull);
      expect(dashboard.todayServed, isNull);
      expect(dashboard.avgWaitSeconds, isNull);
    });

    test('keeps admin dashboard optional today stats when present', () {
      final dashboard = AdminCustomerServiceDashboard.fromJson({
        'onlineStaffCount': 1,
        'busyStaffCount': 3,
        'todaySessions': 0,
        'todayServed': 8,
        'avgWaitSeconds': 12,
      });

      expect(dashboard.idleStaffCount, 0);
      expect(dashboard.todaySessions, 0);
      expect(dashboard.todayServed, 8);
      expect(dashboard.avgWaitSeconds, 12);
    });

    test('parses admin temp session stats with cross-channel staff KPI', () {
      final stats = AdminTempSessionStats.fromJson({
        'totalSessions': 24,
        'totalQueued': 3,
        'totalServed': 21,
        'avgWaitSeconds': 42,
        'avgFirstResponseSeconds': 58,
        'avgDurationSeconds': 360,
        'avgRating': 4.8,
        'channelDistribution': [
          {'label': 'app', 'value': 8},
          {'label': 'web', 'value': 16},
        ],
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
              {
                'channel': 'widget',
                'sessionsServed': 4,
                'avgFirstResponseSeconds': 40,
                'avgDurationSeconds': 260,
                'avgRating': 4.8,
                'excellentRate': 0.9,
              },
              {
                'channel': 'im_direct',
                'sessionsServed': 6,
                'avgFirstResponseSeconds': 24,
                'avgDurationSeconds': 326,
                'avgRating': 5,
                'excellentRate': 0.94,
              },
            ],
          },
        ],
      });

      expect(stats.totalSessions, 24);
      expect(stats.avgRating, 4.8);
      expect(stats.channelDistribution.first.label, 'app');
      expect(stats.staffPerformance.single.sessionsServed, 10);
      expect(stats.staffPerformance.single.servedCountMatchesBreakdown, isTrue);
      expect(stats.staffPerformance.single.byChannel, hasLength(2));
      expect(stats.staffPerformance.single.byChannel.last.channel, 'im_direct');
      expect(stats.staffPerformance.single.byChannel.last.channelLabel, '注册客户');
    });

    test('parses reception status from documented client API payload', () {
      final status = CsReceptionStatus.fromJson({
        'staffUserId': 'staff-1',
        'displayName': '客服 A',
        'serviceStatus': 'busy',
        'queueAcceptEnabled': false,
        'maxConcurrentSessions': 5,
        'reservedSessionCount': 1,
        'activeSessionCount': 3,
        'lastOnlineAt': '2026-05-17T01:00:00Z',
        'lastAssignedAt': '2026-05-17T01:20:00Z',
        'lastHeartbeatAt': '2026-05-17T01:25:00Z',
        'statusChangedAt': '2026-05-17T01:30:00Z',
      });

      expect(status.staffUserId, 'staff-1');
      expect(status.displayName, '客服 A');
      expect(status.serviceStatus, 'busy');
      expect(status.isBusy, isTrue);
      expect(status.label, '忙碌');
      expect(status.queueAcceptEnabled, isFalse);
      expect(status.maxConcurrentSessions, 5);
      expect(status.activeSessionCount, 3);
      expect(status.statusChangedAt, isNotNull);
    });

    test('keeps thread reception state when detail refreshes', () {
      final thread = CsThread.fromJson({
        'threadType': 'temp_session',
        'threadId': 'session-1',
        'conversationId': 'conversation-1',
        'status': 'active',
        'title': '访客 A',
        'currentResponderType': 'ai',
        'ai': {'status': 'bot_active'},
      });
      final detail = CsThreadDetail.fromJson({
        'threadType': 'temp-session',
        'threadId': 'session-1',
        'conversationId': 'conversation-1',
        'status': 'active',
        'title': '访客 A',
        'assignedStaffUserId': 'staff-1',
        'assignedStaffDisplayName': '客服 A',
        'currentResponderType': 'staff',
        'aiStatus': 'human_serving',
      });

      final refreshed = thread.fromDetail(detail);

      expect(thread.isAiHandled, isTrue);
      expect(detail.currentResponderType, 'staff');
      expect(refreshed.currentResponderType, 'staff');
      expect(refreshed.aiStatus, 'human_serving');
      expect(refreshed.isManualHandled, isTrue);
      expect(refreshed.isAiHandled, isFalse);
    });

    test('online service view keeps only visitor temp sessions', () {
      final data = CsThreadsData.fromJson({
        'summary': {
          'allCount': 4,
          'queuedCount': 1,
          'activeCount': 3,
          'vipCount': 2,
        },
        'queueItems': [
          {
            'threadType': 'temp_session',
            'threadId': 'temp-queue',
            'conversationId': 'conv-temp-queue',
            'status': 'queued',
            'title': '访客排队',
          },
        ],
        'activeItems': [
          {
            'threadType': 'temp_session',
            'threadId': 'temp-active',
            'conversationId': 'conv-temp-active',
            'status': 'active',
            'title': '访客进行中',
            'isVip': true,
          },
          {
            'threadType': 'direct_customer',
            'threadId': 'direct-active',
            'conversationId': 'conv-direct-active',
            'status': 'active',
            'title': '客户 IM',
            'isVip': true,
          },
          {
            'threadType': 'im_direct',
            'threadId': 'im-direct-active',
            'conversationId': 'conv-im-direct-active',
            'status': 'active',
            'title': '客户直连',
          },
        ],
      });

      final online = data.tempSessionOnly;

      expect(online.queueItems.map((item) => item.threadId), ['temp-queue']);
      expect(online.activeItems.map((item) => item.threadId), ['temp-active']);
      expect(online.allCount, 2);
      expect(online.queueCount, 1);
      expect(online.myActiveCount, 1);
      expect(online.vipCount, 1);
    });

    test('maps outbound direct customer response for broadcast send flow', () {
      final thread = CsThread.fromImDirectJson({
        'threadId': 'thread-1',
        'conversationId': 'conversation-1',
        'threadStatus': 'active',
        'customerUserId': 'customer-1',
        'customerDisplayName': '客户 A',
        'customerAvatarUrl': 'https://example.com/a.png',
        'staffUserId': 'staff-1',
      });

      expect(thread.threadType, 'direct_customer');
      expect(thread.routeType, 'direct-customer');
      expect(thread.threadId, 'thread-1');
      expect(thread.conversationId, 'conversation-1');
      expect(thread.customerUserId, 'customer-1');
      expect(thread.title, '客户 A');
      expect(thread.isManualHandled, isTrue);
    });

    test('parses customer service broadcast preview response', () {
      final preview = CsBroadcastPreview.fromJson({
        'targetType': 2,
        'recipientCount': 128,
        'groupTitle': 'VIP群',
        'sampleDisplayNames': ['张三', '李四', '王五'],
      });

      expect(preview.targetType, 2);
      expect(preview.recipientCount, 128);
      expect(preview.groupTitle, 'VIP群');
      expect(preview.sampleDisplayNames, ['张三', '李四', '王五']);
    });

    test('parses customer service broadcast task progress', () {
      final task = CsBroadcastTask.fromJson({
        'taskId': 'task-1',
        'status': 2,
        'totalCount': 10,
        'sentCount': 8,
        'failedCount': 1,
        'skippedCount': 1,
        'failedRecipients': [
          {
            'targetUserId': 'user-1',
            'displayName': '客户 A',
            'status': 2,
            'errorCode': 'CS_BROADCAST_GROUP_FORBIDDEN',
            'retryCount': 1,
          },
        ],
      });

      expect(task.taskId, 'task-1');
      expect(task.statusLabel, '已完成');
      expect(task.isCompleted, isTrue);
      expect(task.totalCount, 10);
      expect(task.sentCount, 8);
      expect(task.failedCount, 1);
      expect(task.skippedCount, 1);
      expect(task.failedRecipients.single.targetUserId, 'user-1');
      expect(
        task.failedRecipients.single.errorCode,
        'CS_BROADCAST_GROUP_FORBIDDEN',
      );
      expect(task.failedRecipients.single.retryCount, 1);
    });

    test(
      'distinguishes broadcast admin permission and group membership errors',
      () {
        DioException dioError(int status, Map<String, dynamic> body) {
          final options = RequestOptions(
            path: '/api/admin/v1/customer-service/broadcasts/preview',
          );
          return DioException(
            requestOptions: options,
            response: Response<Map<String, dynamic>>(
              requestOptions: options,
              statusCode: status,
              data: body,
            ),
          );
        }

        expect(
          broadcastFriendlyError(
            dioError(403, {'code': 'CS_BROADCAST_GROUP_FORBIDDEN'}),
          ),
          '不是该群成员，无法群内群发',
        );
        expect(
          broadcastFriendlyError(dioError(403, {'code': 'PERMISSION_DENIED'})),
          '缺少群发所需的管理端权限',
        );
        expect(
          broadcastFriendlyError(StateError('当前账号没有该企业的管理后台接口权限')),
          '缺少群发所需的管理端权限',
        );
      },
    );

    test('maps admin im-direct thread item for customer management', () {
      final thread = CsThread.fromImDirectJson({
        'threadId': 'direct-thread-1',
        'conversationId': 'conversation-2',
        'customerUserId': 'customer-2',
        'customerDisplayName': '客户 B',
        'customerAvatarUrl': 'https://example.com/b.png',
        'status': 'active',
        'assignedStaffUserId': 'staff-2',
        'assignedStaffDisplayName': '客服 B',
        'lastMessagePreview': '您好',
        'unreadCount': 2,
      });

      expect(thread.threadType, 'direct_customer');
      expect(thread.customerUserId, 'customer-2');
      expect(thread.title, '客户 B');
      expect(thread.avatarUrl, 'https://example.com/b.png');
      expect(thread.assignedStaffDisplayName, '客服 B');
      expect(thread.lastMessagePreview, '您好');
      expect(thread.unreadCount, 2);
    });

    test(
      'maps admin im-direct staff aliases for customer assignment status',
      () {
        final thread = CsThread.fromImDirectJson({
          'threadId': 'direct-thread-2',
          'conversationId': 'conversation-3',
          'customerUserId': 'customer-3',
          'customerDisplayName': '客户 C',
          'status': 'active',
          'staffUserId': 'staff-3',
          'staffDisplayName': '客服 C',
        });

        expect(thread.assignedStaffUserId, 'staff-3');
        expect(thread.assignedStaffDisplayName, '客服 C');
      },
    );

    test('parses admin customer list item from admin users payload', () {
      final customer = AdminCustomer.fromJson({
        'userId': 'customer-1',
        'loginName': 'customer_a',
        'lppId': 'lpp_customer_a',
        'displayName': '客户 A',
        'avatarUrl': 'https://example.com/customer-a.png',
        'status': 'active',
        'userType': 1,
        'membershipRole': 0,
        'assignedStaffDisplayName': '客服 A',
        'assignedCustomerCount': 0,
        'tags': ['VIP', '投诉'],
      });

      expect(customer.userId, 'customer-1');
      expect(customer.displayName, '客户 A');
      expect(customer.userType, 1);
      expect(customer.assignedStaffDisplayName, '客服 A');
      expect(customer.tags, ['VIP', '投诉']);
      expect(customer.isUnassigned, isFalse);
    });

    test('parses admin customer tag aliases from admin users payload', () {
      final customer = AdminCustomer.fromJson({
        'userId': 'customer-tag-alias',
        'loginName': 'customer_alias',
        'displayName': '客户标签别名',
        'status': 'active',
        'userType': 1,
        'customerTags': ['高价值', '复购'],
      });
      final labelsCustomer = AdminCustomer.fromJson({
        'userId': 'customer-labels',
        'loginName': 'customer_labels',
        'displayName': '客户标签兜底',
        'status': 'active',
        'userType': 1,
        'labels': '投诉，重点',
      });

      expect(customer.tags, ['高价值', '复购']);
      expect(labelsCustomer.tags, ['投诉', '重点']);
    });

    test('parses admin customer detail service assignment context', () {
      final customer = AdminCustomerDetail.fromJson({
        'userId': 'customer-2',
        'loginName': 'customer_b',
        'displayName': '客户 B',
        'status': 'active',
        'userType': 1,
        'membershipRole': 0,
        'tags': ['VIP'],
        'customerService': {
          'assignedStaff': {
            'userId': 'staff-1',
            'displayName': '客服 A',
            'loginName': 'staff_a',
          },
          'assignableStaff': [
            {
              'userId': 'staff-1',
              'displayName': '客服 A',
              'loginName': 'staff_a',
            },
          ],
        },
      });

      expect(customer.assignedStaffUserId, 'staff-1');
      expect(customer.assignedStaffDisplayName, '客服 A');
      expect(customer.tags, ['VIP']);
      expect(customer.customerService.assignableStaff.single.userId, 'staff-1');
    });

    test('parses registered customer profile card with tickets', () {
      final card = CustomerProfileCard.fromJson({
        'identity': {
          'customerUserId': 'customer-1',
          'displayName': '张明',
          'registered': true,
          'level': 'VIP',
          'kycStatus': 'verified',
          'riskLevel': 'low',
          'language': 'zh-CN',
          'source': 'wechat',
          'assignedStaffDisplayName': '客服 A',
          'tags': ['VIP', '活跃用户', '黄金客户'],
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
          'temporaryOrders': [
            {
              'orderId': 'TMP-001',
              'symbol': 'GBP/USD',
              'side': 'buy',
              'lots': 1.5,
              'openPrice': 1.268,
              'floatingProfit': 128.5,
              'status': 'open',
              'openTime': '2026-05-18T13:20:00Z',
            },
          ],
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
        'visibility': {
          'maskedFields': ['balance'],
        },
      });

      expect(card.isRegisteredCustomer, isTrue);
      expect(card.identity.displayName, '张明');
      expect(card.identity.tags, ['VIP', '活跃用户', '黄金客户']);
      expect(card.account?.balance, 8560);
      expect(card.trading?.products, ['XAU/USD', 'EUR/USD']);
      expect(card.temporaryOrders.single.orderId, 'TMP-001');
      expect(card.temporaryOrders.single.product, 'GBP/USD');
      expect(card.temporaryOrders.single.volume, 1.5);
      expect(card.temporaryOrders.single.floatingProfit, 128.5);
      expect(card.tickets.single.title, '出金审核咨询');
      expect(card.isMasked('balance'), isTrue);
    });

    test(
      'parses visitor-only profile card when customer is not registered',
      () {
        final card = CustomerProfileCard.fromJson({
          'identity': {
            'displayName': '访客-陈伟',
            'registered': false,
            'language': 'zh-CN',
            'source': '官网',
          },
          'visitor': {
            'visitorId': 'visitor-1',
            'sourceUrl': 'https://example.com/pricing',
            'locale': 'zh-CN',
            'totalSessions': 3,
          },
        });

        expect(card.isRegisteredCustomer, isFalse);
        expect(card.identity.displayName, '访客-陈伟');
        expect(card.visitor?.visitorId, 'visitor-1');
        expect(card.account, isNull);
        expect(card.tickets, isEmpty);
      },
    );

    test(
      'parses visitor acquisition fields without inventing missing values',
      () {
        final card = CustomerProfileCard.fromJson({
          'identity': {'displayName': '访客-来源', 'registered': false},
          'visitor': {
            'visitorId': 'visitor-acquisition',
            'sourceUrl': 'https://example.com/landing',
            'locale': 'zh-CN',
            'totalSessions': 2,
            'acquisition': {
              'applicationId': 'landing-app',
              'sourcePlatform': 'h5',
              'chatTool': 'wechat',
              'deviceType': 'mobile',
              'os': 'android',
              'utmSource': 'google',
              'utmCampaign': 'summer',
              'appVersion': '1.2.3',
              'timezone': 'Asia/Shanghai',
            },
          },
        });

        final acquisition = card.visitor?.acquisition;

        expect(acquisition?.sourcePlatform, 'h5');
        expect(acquisition?.chatToolLabel, '微信');
        expect(acquisition?.deviceTypeLabel, '移动端');
        expect(
          acquisition?.displayItems.map((item) => item.label),
          contains('UTM来源'),
        );
        expect(
          acquisition?.displayItems.map((item) => item.value),
          contains('google'),
        );
        expect(acquisition?.utmMedium, isNull);
      },
    );

    test('maps owner staff aliases from unified thread item', () {
      final thread = CsThread.fromJson({
        'threadType': 'temp_session',
        'threadId': 'thread-3',
        'conversationId': 'conversation-4',
        'title': '访客 D',
        'status': 'active',
        'currentOwnerStaffUserId': 'staff-4',
        'currentOwnerStaffDisplayName': '客服 D',
      });

      expect(thread.assignedStaffUserId, 'staff-4');
      expect(thread.assignedStaffDisplayName, '客服 D');
    });

    test('parses admin center dashboard aliases from admin API payload', () {
      final dashboard = AdminCustomerServiceDashboard.fromJson({
        'queuedCount': 4,
        'activeCount': 8,
        'onlineStaffCount': 3,
        'busyStaffCount': 1,
        'todaySessions': 16,
        'todayServed': 14,
        'avgWaitSeconds': 45,
      });

      expect(dashboard.queuedTotalCount, 4);
      expect(dashboard.totalActiveCount, 8);
      expect(dashboard.onlineStaffCount, 3);
      expect(dashboard.busyStaffCount, 1);
      expect(dashboard.todaySessions, 16);
      expect(dashboard.avgWaitSeconds, 45);
    });

    test('parses admin staff status payload', () {
      final status = AdminStaffStatus.fromJson({
        'staffUserId': 'staff-2',
        'staffDisplayName': '客服 B',
        'status': 'online',
        'currentSessionCount': 2,
        'maxConcurrentSessions': 6,
        'lastHeartbeatAt': '2026-05-17T01:25:00Z',
        'statusChangedAt': '2026-05-17T01:30:00Z',
      });

      expect(status.staffUserId, 'staff-2');
      expect(status.displayName, '客服 B');
      expect(status.serviceStatus, 'online');
      expect(status.label, '在线');
      expect(status.activeSessionCount, 2);
      expect(status.maxConcurrentSessions, 6);
      expect(status.statusChangedAt, isNotNull);
    });

    test('parses admin audit log payload flexibly', () {
      final log = AdminAuditLog.fromJson({
        'auditLogId': 'audit-1',
        'actionCode': 'customer_service.assign',
        'displayName': '分配客服',
        'actorUserId': 'owner-1',
        'actorDisplayName': '所有者',
        'targetType': 'customer',
        'targetId': 'customer-1',
        'targetDisplayName': '客户 A',
        'createdAt': '2026-05-17T01:30:00Z',
      });

      expect(log.auditLogId, 'audit-1');
      expect(log.actionCode, 'customer_service.assign');
      expect(log.actionName, '分配客服');
      expect(log.actorDisplayName, '所有者');
      expect(log.targetDisplayName, '客户 A');
      expect(log.createdAt, isNotNull);
    });
  });
}
