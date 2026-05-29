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
  return /failed|error|cannot|unsupported|try again|失败|错误|无法|不支持|重试/i.test(text);
}
