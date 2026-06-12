import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/domain/customer_service_monitor_wall.dart';

void main() {
  test('monitor layout capacity trims and deduplicates watched threads', () {
    expect(customerServiceMonitorLayoutCapacity(MonitorLayoutMode.twoByOne), 2);

    final keys = trimCustomerServiceMonitorWatchedKeys(
      const ['temp_session:a', 'temp_session:a', 'im_direct:b', 'im_direct:c'],
      MonitorLayoutMode.twoByOne,
    );

    expect(keys, const ['temp_session:a', 'im_direct:b']);
  });

  test('select watched thread replaces focused slot when wall is full', () {
    final result = selectCustomerServiceMonitorWatchedKey(
      watchedThreadKeys: const ['temp_session:a', 'temp_session:b'],
      threadKey: 'temp_session:c',
      focusedThreadKey: 'temp_session:b',
      layoutMode: MonitorLayoutMode.twoByOne,
    );

    expect(result.replaced, isTrue);
    expect(result.focusedThreadKey, 'temp_session:c');
    expect(
        result.watchedThreadKeys, const ['temp_session:a', 'temp_session:c']);
  });

  test('filter monitor threads by staff status and thread type', () {
    final filtered = filterCustomerServiceMonitorThreads(
      [
        _thread('a',
            threadType: 'temp_session',
            status: 'active',
            assignedStaffUserId: 'staff-1'),
        _thread('b',
            threadType: 'im_direct',
            status: 'queued',
            assignedStaffUserId: 'staff-2'),
        _thread('c',
            threadType: 'temp_session',
            status: 'closed',
            assignedStaffUserId: 'staff-1'),
      ],
      const CustomerServiceMonitorFilter(
        staffUserId: 'staff-1',
        status: 'active',
        threadType: 'temp_session',
      ),
    );

    expect(filtered.map((thread) => thread.threadId), const ['a']);
  });

  test('sort monitor threads by risk queue and recent activity', () {
    final sorted = sortCustomerServiceMonitorThreadsByPriority(
      [
        _thread('normal',
            status: 'active',
            updatedAt: DateTime.parse('2026-06-12T08:00:00Z')),
        _thread('queued',
            status: 'queued',
            updatedAt: DateTime.parse('2026-06-12T07:00:00Z')),
        _thread('risk',
            status: 'active',
            updatedAt: DateTime.parse('2026-06-12T06:00:00Z')),
      ],
      riskThreadKeys: {'temp_session:risk'},
    );

    expect(
      sorted.map((thread) => thread.threadId),
      const ['risk', 'queued', 'normal'],
    );
  });
}

CsThread _thread(
  String id, {
  String threadType = 'temp_session',
  String status = 'active',
  String? assignedStaffUserId,
  DateTime? updatedAt,
}) {
  return CsThread(
    threadType: threadType,
    threadId: id,
    conversationId: 'conv-$id',
    status: status,
    title: '客户 $id',
    assignedStaffUserId: assignedStaffUserId,
    updatedAt: updatedAt,
  );
}
