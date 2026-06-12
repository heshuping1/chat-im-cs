import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';

enum MonitorLayoutMode {
  oneByOne,
  twoByOne,
  twoByTwo,
}

class CustomerServiceMonitorFilter {
  final String? staffUserId;
  final String? status;
  final String? threadType;

  const CustomerServiceMonitorFilter({
    this.staffUserId,
    this.status,
    this.threadType,
  });
}

class CustomerServiceMonitorSelectionResult {
  final String focusedThreadKey;
  final String replacementThreadKey;
  final bool replaced;
  final List<String> watchedThreadKeys;

  const CustomerServiceMonitorSelectionResult({
    required this.focusedThreadKey,
    required this.replacementThreadKey,
    required this.replaced,
    required this.watchedThreadKeys,
  });
}

int customerServiceMonitorLayoutCapacity(MonitorLayoutMode layoutMode) {
  return switch (layoutMode) {
    MonitorLayoutMode.oneByOne => 1,
    MonitorLayoutMode.twoByOne => 2,
    MonitorLayoutMode.twoByTwo => 4,
  };
}

String customerServiceMonitorThreadKey(CsThread thread) {
  final type = thread.threadType.trim().replaceAll('-', '_');
  return '${type.isEmpty ? 'temp_session' : type}:${thread.threadId.trim()}';
}

List<String> trimCustomerServiceMonitorWatchedKeys(
  List<String> watchedThreadKeys,
  MonitorLayoutMode layoutMode,
) {
  return _dedupeKeys(watchedThreadKeys)
      .take(customerServiceMonitorLayoutCapacity(layoutMode))
      .toList(growable: false);
}

CustomerServiceMonitorSelectionResult selectCustomerServiceMonitorWatchedKey({
  required List<String> watchedThreadKeys,
  required String threadKey,
  required String focusedThreadKey,
  required MonitorLayoutMode layoutMode,
}) {
  final key = threadKey.trim();
  final current =
      trimCustomerServiceMonitorWatchedKeys(watchedThreadKeys, layoutMode);
  if (key.isEmpty) {
    return CustomerServiceMonitorSelectionResult(
      focusedThreadKey: focusedThreadKey.trim(),
      replacementThreadKey: '',
      replaced: false,
      watchedThreadKeys: current,
    );
  }
  if (current.contains(key)) {
    return CustomerServiceMonitorSelectionResult(
      focusedThreadKey: key,
      replacementThreadKey: '',
      replaced: false,
      watchedThreadKeys: current,
    );
  }
  if (current.length < customerServiceMonitorLayoutCapacity(layoutMode)) {
    return CustomerServiceMonitorSelectionResult(
      focusedThreadKey: key,
      replacementThreadKey: '',
      replaced: false,
      watchedThreadKeys: [...current, key],
    );
  }
  final focused = focusedThreadKey.trim();
  if (focused.isNotEmpty && current.contains(focused)) {
    return CustomerServiceMonitorSelectionResult(
      focusedThreadKey: key,
      replacementThreadKey: '',
      replaced: true,
      watchedThreadKeys: current
          .map((item) => item == focused ? key : item)
          .toList(growable: false),
    );
  }
  return CustomerServiceMonitorSelectionResult(
    focusedThreadKey: '',
    replacementThreadKey: key,
    replaced: false,
    watchedThreadKeys: current,
  );
}

List<CsThread> filterCustomerServiceMonitorThreads(
  List<CsThread> threads,
  CustomerServiceMonitorFilter filter,
) {
  final staffUserId = filter.staffUserId?.trim();
  final status = filter.status?.trim().toLowerCase().replaceAll('-', '_');
  final threadType = filter.threadType?.trim().replaceAll('-', '_');
  return threads.where((thread) {
    if (staffUserId != null &&
        staffUserId.isNotEmpty &&
        thread.assignedStaffUserId != staffUserId) {
      return false;
    }
    if (status != null && status.isNotEmpty) {
      final threadStatus = normalizeCustomerServiceThreadStatus(thread.status);
      if (status == 'active') {
        if (thread.isTerminal || thread.isQueued) return false;
      } else if (threadStatus != status) {
        return false;
      }
    }
    if (threadType != null &&
        threadType.isNotEmpty &&
        thread.threadType.replaceAll('-', '_') != threadType) {
      return false;
    }
    return true;
  }).toList(growable: false);
}

List<CsThread> sortCustomerServiceMonitorThreadsByPriority(
  List<CsThread> threads, {
  Set<String> riskThreadKeys = const {},
}) {
  final sorted = [...threads];
  sorted.sort((left, right) {
    final priorityDelta = _monitorThreadPriority(right, riskThreadKeys)
        .compareTo(_monitorThreadPriority(left, riskThreadKeys));
    if (priorityDelta != 0) return priorityDelta;
    return _threadTime(right).compareTo(_threadTime(left));
  });
  return sorted;
}

int _monitorThreadPriority(CsThread thread, Set<String> riskThreadKeys) {
  var score = 0;
  if (riskThreadKeys.contains(customerServiceMonitorThreadKey(thread))) {
    score += 100;
  }
  if (thread.isQueued) score += 60;
  if (thread.assignedStaffUserId?.trim().isEmpty ?? true) score += 40;
  return score;
}

int _threadTime(CsThread thread) {
  return (thread.updatedAt ?? thread.lastMessageAt ?? thread.assignedAt)
          ?.millisecondsSinceEpoch ??
      0;
}

List<String> _dedupeKeys(List<String> keys) {
  final seen = <String>{};
  final result = <String>[];
  for (final key in keys) {
    final normalized = key.trim();
    if (normalized.isEmpty || seen.contains(normalized)) continue;
    seen.add(normalized);
    result.add(normalized);
  }
  return result;
}
