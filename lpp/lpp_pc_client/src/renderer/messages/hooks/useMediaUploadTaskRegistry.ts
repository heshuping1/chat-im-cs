import { useCallback, useMemo, useRef } from "react";

import type { ConversationListItem } from "../../data/api-client";
import type { VideoPosterResult } from "../../lib/videoPoster";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export type MediaUploadConversationType = "direct" | "group";

export type MediaUploadReplyTarget = {
  messageId: string;
  sender: string;
  preview: string;
} | null;

export type LocalMediaUploadTask = {
  localTaskId: string;
  localMessageId: string;
  file: File;
  kind: ComposerMediaKind;
  conversation: ConversationListItem;
  conversationType: MediaUploadConversationType;
  body: Record<string, unknown>;
  reply: MediaUploadReplyTarget;
  localPreviewUrl?: string;
  videoPoster?: VideoPosterResult;
  videoPosterPromise?: Promise<VideoPosterResult | undefined>;
  controller?: AbortController;
  controlState?: "paused" | "canceled";
};

export function useMediaUploadTaskRegistry() {
  const tasksRef = useRef(new Map<string, LocalMediaUploadTask>());

  const getTask = useCallback((localTaskId: string) => tasksRef.current.get(localTaskId), []);
  const setTask = useCallback((task: LocalMediaUploadTask) => {
    tasksRef.current.set(task.localTaskId, task);
  }, []);
  const deleteTask = useCallback((localTaskId: string) => {
    tasksRef.current.delete(localTaskId);
  }, []);

  return useMemo(
    () => ({
      deleteTask,
      getTask,
      setTask,
    }),
    [deleteTask, getTask, setTask],
  );
}
