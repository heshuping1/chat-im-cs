import 'package:lpp_mobile/features/customer_service/data/datasources/customer_service_remote_datasource.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class CustomerServiceRepository {
  final CustomerServiceRemoteDataSource _remote;

  const CustomerServiceRepository(this._remote);

  Future<CsThreadsData> getThreads() => _remote.getThreads();

  Future<CsDashboardData> getDashboard() => _remote.getDashboard();

  Future<List<CsThread>> getStaffServiceHistory({
    String threadType = 'temp_session',
    int limit = 50,
    String? cursor,
  }) =>
      _remote.getStaffServiceHistory(
        threadType: threadType,
        limit: limit,
        cursor: cursor,
      );

  Future<CsReceptionStatus> getReceptionStatus() =>
      _remote.getReceptionStatus();

  Future<CsReceptionStatus> updateReceptionStatus({
    required String serviceStatus,
    bool? queueAcceptEnabled,
    int? maxConcurrentSessions,
  }) =>
      _remote.updateReceptionStatus(
        serviceStatus: serviceStatus,
        queueAcceptEnabled: queueAcceptEnabled,
        maxConcurrentSessions: maxConcurrentSessions,
      );

  Future<List<CsQuickReply>> getQuickReplies({String? scope}) =>
      _remote.getQuickReplies(scope: scope);

  Future<CsThreadDetail> getThread(CsThread thread) =>
      _remote.getThread(thread);

  Future<CustomerProfileCard> getCustomerProfileCard(
    String customerUserId, {
    String? threadType,
    String? threadId,
  }) =>
      _remote.getCustomerProfileCard(
        customerUserId,
        threadType: threadType,
        threadId: threadId,
      );

  Future<Message> sendThreadMessage({
    required String threadType,
    required String threadId,
    required String conversationId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    String? senderUserId,
  }) =>
      _remote.sendThreadMessage(
        threadType: threadType,
        threadId: threadId,
        conversationId: conversationId,
        clientMsgId: clientMsgId,
        type: type,
        body: body,
        replyToMessageId: replyToMessageId,
        senderUserId: senderUserId,
      );

  Future<CsThreadDetail> claimThread(CsThread thread) =>
      _remote.claimThread(thread);

  Future<CsThreadDetail> takeoverThread(CsThread thread) =>
      _remote.takeoverThread(thread);

  Future<void> closeThread(CsThread thread) => _remote.closeThread(thread);

  Future<CsThread> outboundDirectCustomer({
    required String customerUserId,
    String? reason,
    int priority = 0,
    String? fallbackTitle,
    String? fallbackAvatarUrl,
  }) =>
      _remote.outboundDirectCustomer(
        customerUserId: customerUserId,
        reason: reason,
        priority: priority,
        fallbackTitle: fallbackTitle,
        fallbackAvatarUrl: fallbackAvatarUrl,
      );

  Future<CsThread> transferDirectCustomer({
    required String threadId,
    required String toStaffUserId,
    String? reason,
    String? fallbackTitle,
    String? fallbackAvatarUrl,
  }) =>
      _remote.transferDirectCustomer(
        threadId: threadId,
        toStaffUserId: toStaffUserId,
        reason: reason,
        fallbackTitle: fallbackTitle,
        fallbackAvatarUrl: fallbackAvatarUrl,
      );

  Future<List<CsKnowledgeSearchResult>> searchKnowledge({
    required String query,
    int topK = 8,
    String? knowledgeBaseId,
  }) =>
      _remote.searchKnowledge(
        query: query,
        topK: topK,
        knowledgeBaseId: knowledgeBaseId,
      );

  Future<List<CsKnowledgeBase>> getKnowledgeBases() =>
      _remote.getKnowledgeBases();

  Future<List<CsKnowledgeDocument>> getKnowledgeDocuments(
    String knowledgeBaseId,
  ) =>
      _remote.getKnowledgeDocuments(knowledgeBaseId);

  Future<CsAiSuggestion> createAiSuggestion({
    required String threadType,
    required String threadId,
    String? customerMessageId,
  }) =>
      _remote.createAiSuggestion(
        threadType: threadType,
        threadId: threadId,
        customerMessageId: customerMessageId,
      );

  Future<List<CsAiSuggestion>> getAiSuggestions({
    required String threadType,
    required String threadId,
    int limit = 10,
  }) =>
      _remote.getAiSuggestions(
        threadType: threadType,
        threadId: threadId,
        limit: limit,
      );

  Future<void> adoptAiSuggestion(String suggestionId) =>
      _remote.adoptAiSuggestion(suggestionId);
}

class AdminCustomerServiceRepository {
  final AdminCustomerServiceRemoteDataSource _remote;

  const AdminCustomerServiceRepository(this._remote);

  Future<AdminCustomerServiceDashboard> getCenterDashboard() =>
      _remote.getCenterDashboard();

  Future<List<AdminStaffStatus>> getStaffStatuses() =>
      _remote.getStaffStatuses();

  Future<List<AdminGroup>> getGroups() => _remote.getGroups();

  Future<CsBroadcastPreview> previewBroadcast({
    required int targetType,
    String? groupId,
  }) =>
      _remote.previewBroadcast(
        targetType: targetType,
        groupId: groupId,
      );

  Future<CsBroadcastTask> createBroadcast({
    required int targetType,
    String? groupId,
    required String messageType,
    required Map<String, Object?> body,
    String? auditReason,
    String? officialAccountId,
  }) =>
      _remote.createBroadcast(
        targetType: targetType,
        groupId: groupId,
        messageType: messageType,
        body: body,
        auditReason: auditReason,
        officialAccountId: officialAccountId,
      );

  Future<CsBroadcastTask> getBroadcastTask(
    String taskId, {
    int failedLimit = 20,
  }) =>
      _remote.getBroadcastTask(taskId, failedLimit: failedLimit);

  Future<CsBroadcastRetryResult> retryBroadcastFailed(String taskId) =>
      _remote.retryBroadcastFailed(taskId);

  Future<List<CsBroadcastTask>> getBroadcastTasks({int limit = 20}) =>
      _remote.getBroadcastTasks(limit: limit);

  Future<void> cancelBroadcast(String taskId) =>
      _remote.cancelBroadcast(taskId);

  Future<void> freezeConversation({
    required String conversationId,
    required bool frozen,
    String? reason,
    String? threadType,
    String? threadId,
  }) =>
      _remote.freezeConversation(
        conversationId: conversationId,
        frozen: frozen,
        reason: reason,
        threadType: threadType,
        threadId: threadId,
      );

  Future<List<AdminCustomer>> getCustomers({
    String? keyword,
    String? status,
    String? assignedStaffUserId,
    List<String> tags = const [],
    String tagMatch = 'any',
  }) =>
      _remote.getCustomers(
        keyword: keyword,
        status: status,
        assignedStaffUserId: assignedStaffUserId,
        tags: tags,
        tagMatch: tagMatch,
      );

  Future<AdminCustomerDetail> getCustomerDetail(String customerUserId) =>
      _remote.getCustomerDetail(customerUserId);

  Future<CustomerProfileCard> getCustomerProfileCard(String customerUserId) =>
      _remote.getCustomerProfileCard(customerUserId);

  Future<void> updateCustomerTags({
    required String customerUserId,
    required List<String> tags,
  }) =>
      _remote.updateCustomerTags(
        customerUserId: customerUserId,
        tags: tags,
      );

  Future<void> assignCustomerService({
    required String customerUserId,
    required String? staffUserId,
    bool transferConversation = true,
  }) =>
      _remote.assignCustomerService(
        customerUserId: customerUserId,
        staffUserId: staffUserId,
        transferConversation: transferConversation,
      );

  Future<List<CsThread>> getCenterThreads({
    String? keyword,
    String? status,
    String? threadType,
  }) =>
      _remote.getCenterThreads(
        keyword: keyword,
        status: status,
        threadType: threadType,
      );

  Future<List<CsThread>> getDirectCustomerThreads({
    String? keyword,
    String? status,
    bool? unassignedOnly,
  }) =>
      _remote.getDirectCustomerThreads(
        keyword: keyword,
        status: status,
        unassignedOnly: unassignedOnly,
      );

  Future<List<AdminAuditLog>> getAuditLogs({
    String? actionCode,
    String? targetType,
  }) =>
      _remote.getAuditLogs(actionCode: actionCode, targetType: targetType);
}
