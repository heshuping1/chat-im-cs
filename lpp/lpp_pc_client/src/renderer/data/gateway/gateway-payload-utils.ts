import {
  customerServiceThreadId,
  isCustomerServiceGatewayPayload,
  isCustomerServiceStatus,
  isSelfCustomerServiceGatewayMessage,
  normalizeThreadType,
} from "./gateway-cs-payload-utils";

export {
  asRecord,
  booleanField,
  eventPayload,
  firstRecord,
  normalizeType,
  numberField,
  stringField,
} from "./gateway-record-utils";
export {
  conversationRecord,
  fallbackConversationIdFromPeer,
  gatewayMessage,
  imConversationId,
  imCoreEventFromGatewayMessageForTest,
  imCoreEventFromGatewayReadForTest,
  inferImConversationType,
  messageRecord,
  readReceiptReaderIds,
} from "./gateway-im-payload-utils";
export {
  customerServiceThreadId,
  isCustomerServiceGatewayPayload,
  isCustomerServiceStatus,
  isSelfCustomerServiceGatewayMessage,
  normalizeThreadType,
};
