import {
  createContractIssue,
  type ContractIssue,
} from "../api-contract/contract-result";
import type { CustomerServiceSessionNoteDto } from "../api/types";

export interface CustomerServiceSessionNoteViewModel {
  noteId: string;
  content: string;
  authorName?: string;
  createdAtText?: string;
  isPinned: boolean;
  contractIssues: ContractIssue[];
}

export interface CustomerServiceSessionNotesViewModelInput {
  notes: CustomerServiceSessionNoteDto[];
  formatCreatedAt?: (value?: string | null) => string;
}

export function createCustomerServiceSessionNotesViewModel(
  input: CustomerServiceSessionNotesViewModelInput,
): CustomerServiceSessionNoteViewModel[] {
  return [...input.notes]
    .sort(compareCustomerServiceSessionNotes)
    .map((note) => createCustomerServiceSessionNoteViewModel(note, input));
}

export function createCustomerServiceSessionNoteViewModel(
  note: CustomerServiceSessionNoteDto,
  input: Pick<CustomerServiceSessionNotesViewModelInput, "formatCreatedAt"> = {},
): CustomerServiceSessionNoteViewModel {
  const contractIssues: ContractIssue[] = [];
  const authorName = note.staffDisplayName.trim();
  const createdAt = note.createdAt?.trim() || null;

  if (!authorName) {
    contractIssues.push(
      createContractIssue("cs.session_note.staff_display_name_missing", "warning", {
        field: "staffDisplayName",
        message: "Customer service session note is missing staffDisplayName.",
      }),
    );
  }

  if (!createdAt) {
    contractIssues.push(
      createContractIssue("cs.session_note.created_at_missing", "warning", {
        field: "createdAt",
        message: "Customer service session note is missing createdAt.",
      }),
    );
  }

  return {
    noteId: note.noteId,
    content: note.content,
    authorName: authorName || undefined,
    createdAtText: createdAt
      ? input.formatCreatedAt?.(createdAt) ?? createdAt
      : undefined,
    isPinned: Boolean(note.isPinned),
    contractIssues,
  };
}

function compareCustomerServiceSessionNotes(
  left: CustomerServiceSessionNoteDto,
  right: CustomerServiceSessionNoteDto,
) {
  if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
    return left.isPinned ? -1 : 1;
  }
  const rightTime = Date.parse(right.createdAt ?? "");
  const leftTime = Date.parse(left.createdAt ?? "");
  return (Number.isFinite(rightTime) ? rightTime : 0) -
    (Number.isFinite(leftTime) ? leftTime : 0);
}
