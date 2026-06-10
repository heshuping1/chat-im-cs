class PeerReadStatus {
  final int peerLastReadSeq;
  final DateTime? peerLastReadAt;

  const PeerReadStatus({
    required this.peerLastReadSeq,
    this.peerLastReadAt,
  });
}

abstract class DirectReadStatusReader {
  Future<PeerReadStatus> getDirectReadStatus(String conversationId);
}
