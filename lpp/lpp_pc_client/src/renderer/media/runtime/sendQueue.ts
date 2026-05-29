export type ComposerSendPart<Attachment> =
  | { type: "text"; text: string }
  | { type: "attachment"; attachment: Attachment };

export type ComposerSendFailure<Attachment> = {
  error: unknown;
  part: ComposerSendPart<Attachment>;
};

export async function sendComposerPartsInOrder<Attachment>({
  onFailure,
  parts,
  sendAttachment,
  sendText,
}: {
  onFailure?: (failure: ComposerSendFailure<Attachment>) => void;
  parts: ComposerSendPart<Attachment>[];
  sendAttachment: (attachment: Attachment) => void | Promise<void>;
  sendText: (text: string) => void | Promise<void>;
}) {
  for (const part of parts) {
    try {
      if (part.type === "text") {
        await Promise.resolve(sendText(part.text));
      } else {
        await Promise.resolve(sendAttachment(part.attachment));
      }
    } catch (error) {
      onFailure?.({ error, part });
    }
  }
}
