import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CustomerServiceSessionNoteDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { invalidateCustomerServiceQueries } from "../../data/customer-service/cs-cache-adapter";
import { pcQueryKeys } from "../../data/query-keys";
import { createApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError, formatMonthDayTime } from "../../lib/format";
import { PanelState } from "../../components/PanelState";

const maxSessionNoteLength = 2000;

export function CustomerServiceSessionNotesPanel({
  sessionId,
}: {
  sessionId: string;
}) {
  const { t } = useI18n();
  const authSession = useAuthSession();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pinnedDraft, setPinnedDraft] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const client = useMemo(
    () => (authSession ? createApiClient(authSession) : null),
    [authSession],
  );
  const queryBaseKey = [authSession?.apiBaseUrl, authSession?.tenantToken] as const;
  const notesQueryKey = pcQueryKeys.customerServiceTempSessionNotes(
    ...queryBaseKey,
    sessionId,
  );
  const notesQuery = useQuery({
    queryKey: notesQueryKey,
    enabled: Boolean(client && sessionId),
    queryFn: async () => client!.getTempSessionNotes(sessionId),
  });

  useEffect(() => {
    setAdding(false);
    setDraft("");
    setPinnedDraft(false);
    setNotice(null);
  }, [sessionId]);

  const refreshSessionNoteQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notesQueryKey }),
      queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreadDetail(
          ...queryBaseKey,
          "temp_session",
          sessionId,
        ),
      }),
      invalidateCustomerServiceQueries(queryClient),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error(t("auth.login"));
      const content = draft.trim();
      if (!content) throw new Error(t("customerService.sessionNotes.contentRequired"));
      if (content.length > maxSessionNoteLength) {
        throw new Error(
          t("customerService.sessionNotes.contentTooLong", {
            max: maxSessionNoteLength,
          }),
        );
      }
      return client.createTempSessionNote(sessionId, {
        content,
        isPinned: pinnedDraft,
      });
    },
    onSuccess: async () => {
      setAdding(false);
      setDraft("");
      setPinnedDraft(false);
      setNotice(t("customerService.sessionNotes.created"));
      await refreshSessionNoteQueries();
    },
    onError: (error) => {
      setNotice(t("customerService.sessionNotes.createFailed", {
        error: formatError(error),
      }));
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (note: CustomerServiceSessionNoteDto) => {
      if (!client) throw new Error(t("auth.login"));
      return client.setTempSessionNotePinned(sessionId, note.noteId, !note.isPinned);
    },
    onSuccess: async () => {
      setNotice(t("customerService.sessionNotes.pinUpdated"));
      await refreshSessionNoteQueries();
    },
    onError: (error) => {
      setNotice(t("customerService.sessionNotes.pinFailed", {
        error: formatError(error),
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (note: CustomerServiceSessionNoteDto) => {
      if (!client) throw new Error(t("auth.login"));
      await client.deleteTempSessionNote(sessionId, note.noteId);
      return note;
    },
    onSuccess: async () => {
      setNotice(t("customerService.sessionNotes.deleted"));
      await refreshSessionNoteQueries();
    },
    onError: (error) => {
      setNotice(t("customerService.sessionNotes.deleteFailed", {
        error: formatError(error),
      }));
    },
  });

  const notes = notesQuery.data ?? [];
  const pending =
    createMutation.isPending ||
    pinMutation.isPending ||
    deleteMutation.isPending;

  return (
    <section className="customer-profile-block cs-session-notes-panel">
      <header className="cs-session-notes-head">
        <h3>
          <span>
            <Pin size={16} />
            {t("customerService.sessionNotes.title")}
          </span>
          <em>{t("customerService.sessionNotes.count", { count: notes.length })}</em>
        </h3>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setAdding((current) => !current);
            setNotice(null);
          }}
        >
          {adding ? <X size={14} /> : <Plus size={14} />}
          {adding
            ? t("common.cancel")
            : t("customerService.sessionNotes.add")}
        </button>
      </header>

      {adding && (
        <div className="cs-session-note-editor">
          <textarea
            aria-label={t("customerService.sessionNotes.editorLabel")}
            disabled={pending}
            maxLength={maxSessionNoteLength}
            placeholder={t("customerService.sessionNotes.placeholder")}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <footer>
            <label>
              <input
                type="checkbox"
                checked={pinnedDraft}
                disabled={pending}
                onChange={(event) => setPinnedDraft(event.target.checked)}
              />
              {t("customerService.sessionNotes.createPinned")}
            </label>
            <span>
              {draft.trim().length}/{maxSessionNoteLength}
            </span>
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={() => createMutation.mutate()}
            >
              <Check size={14} />
              {t("common.save")}
            </button>
          </footer>
        </div>
      )}

      {notice && (
        <p className="cs-session-notes-notice" role="status">
          {notice}
        </p>
      )}

      {notesQuery.isLoading && (
        <PanelState text={t("customerService.sessionNotes.loading")} />
      )}
      {notesQuery.error && (
        <PanelState
          tone="error"
          text={t("customerService.sessionNotes.loadFailed", {
            error: formatError(notesQuery.error),
          })}
        />
      )}
      {!notesQuery.isLoading && !notesQuery.error && notes.length === 0 && (
        <PanelState text={t("customerService.sessionNotes.empty")} />
      )}
      {notes.length > 0 && (
        <div className="cs-session-note-list">
          {notes.map((note) => (
            <article
              className="cs-session-note-item"
              data-pinned={Boolean(note.isPinned)}
              key={note.noteId}
            >
              <header>
                <strong>
                  {note.staffDisplayName ||
                    t("customerService.sessionNotes.unknownStaff")}
                </strong>
                <span>
                  {note.createdAt
                    ? formatMonthDayTime(note.createdAt)
                    : t("customerService.sessionNotes.unknownTime")}
                </span>
              </header>
              <p>{note.content}</p>
              <footer>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pinMutation.mutate(note)}
                >
                  {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                  {note.isPinned
                    ? t("customerService.sessionNotes.unpin")
                    : t("customerService.sessionNotes.pin")}
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(t("customerService.sessionNotes.deleteConfirm"))) {
                      deleteMutation.mutate(note);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  {t("customerService.sessionNotes.delete")}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
