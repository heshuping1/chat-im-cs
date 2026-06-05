export function ChatToastNotice({ text }: { text: string }) {
  return (
    <div
      className={`pc-chat-toast${isNoticeErrorText(text) ? " error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}

export function isNoticeErrorText(text: string) {
  return /failed|error|cannot|unsupported|try again|\u5931\u8d25|\u9519\u8bef|\u65e0\u6cd5|\u4e0d\u652f\u6301|\u91cd\u8bd5/i.test(text);
}
