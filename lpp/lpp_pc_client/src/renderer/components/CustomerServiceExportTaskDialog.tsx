import { Download, X } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { PanelState } from "./PanelState";

export type CustomerServiceExportDialogTask = {
  canDownload: boolean;
  completedAtLabel?: string;
  createdAtLabel: string;
  key: string;
  payload?: unknown;
  recordCountLabel?: string;
  serverSynced?: boolean;
  status: string;
  statusLabel: string;
  title: string;
};

type ExportConditionEditor = ReactNode | ((createAction: ReactNode) => ReactNode);

export function CustomerServiceExportTaskDialog({
  createDisabled,
  createDisabledReason,
  createPending,
  createPendingLabel = "正在创建",
  createText = "创建导出任务",
  conditionEditor,
  description,
  downloadPending,
  emptyText = "暂无导出任务。",
  errorText,
  loading,
  notice,
  onClose,
  onCreate,
  onDownload,
  tasks,
  title,
}: {
  createDisabled?: boolean;
  createDisabledReason?: string;
  createPending?: boolean;
  createPendingLabel?: string;
  createText?: string;
  conditionEditor?: ExportConditionEditor;
  description?: string[];
  downloadPending?: boolean;
  emptyText?: string;
  errorText?: string;
  loading?: boolean;
  notice?: string;
  onClose: () => void;
  onCreate: () => void;
  onDownload: (task: CustomerServiceExportDialogTask) => void;
  tasks: CustomerServiceExportDialogTask[];
  title: string;
}) {
  const dragStateRef = useRef<{
    originX: number;
    originY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const primaryDisabled = Boolean(createDisabled || createPending);
  const primaryText = createText;
  const noticeIsError = Boolean(notice && /失败|错误|error/i.test(notice));
  const dialogStyle: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  };
  const createAction = (
    <button
      type="button"
      disabled={primaryDisabled}
      onClick={onCreate}
      title={primaryDisabled ? createDisabledReason : undefined}
    >
      {createPending ? createPendingLabel : primaryText}
    </button>
  );
  const customConditionEditor = typeof conditionEditor === "function";
  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, input, select, textarea, a")) {
      return;
    }
    dragStateRef.current = {
      originX: event.clientX,
      originY: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };
    setDragging(true);
    event.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const moveDialog = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const maxX = Math.max(0, (window.innerWidth - 160) / 2);
      const maxY = Math.max(0, (window.innerHeight - 120) / 2);
      const nextX = dragState.startX + event.clientX - dragState.originX;
      const nextY = dragState.startY + event.clientY - dragState.originY;
      setOffset({
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      });
    };
    const stopDrag = () => {
      dragStateRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", moveDialog);
    window.addEventListener("pointerup", stopDrag, { once: true });
    window.addEventListener("pointercancel", stopDrag, { once: true });
    return () => {
      window.removeEventListener("pointermove", moveDialog);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [dragging]);

  return (
    <section className="cs-stats-export-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cs-stats-export-backdrop" onClick={onClose} />
      <div className={`cs-stats-export-modal${dragging ? " dragging" : ""}`} style={dialogStyle}>
        <header onPointerDown={startDrag}>
          <div>
            <h2>{title}</h2>
            {description?.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <section className="cs-stats-export-primary single">
          <div className="cs-stats-export-current-filter">
            {customConditionEditor
              ? conditionEditor(createAction)
              : conditionEditor}
            {!customConditionEditor && (
              <div className="cs-stats-export-form-actions">
                {createAction}
              </div>
            )}
          </div>
        </section>

        <section className="cs-stats-export-tasks">
          {noticeIsError && <p className="cs-stats-export-task-notice">{notice}</p>}
          {errorText && <PanelState tone="error" text={errorText} />}
          {!errorText && loading && <PanelState text="正在加载导出任务..." />}
          {!errorText && !loading && tasks.length === 0 && <PanelState text={emptyText} />}
          {!errorText && !loading && tasks.length > 0 && (
            <ExportTaskScrollArea>
              <div className="cs-stats-export-task-head" aria-hidden="true">
                <span>文件名</span>
                <span>记录数</span>
                <span>创建时间</span>
                <span>完成时间</span>
                <span>状态 / 操作</span>
              </div>
              <ExportTaskList
                downloadPending={downloadPending}
                onDownload={onDownload}
                tasks={tasks}
              />
            </ExportTaskScrollArea>
          )}
        </section>

        <footer>
          <button type="button" onClick={onClose}>
            关闭，后台继续生成
          </button>
        </footer>
      </div>
    </section>
  );
}

function ExportTaskScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className="cs-stats-export-task-scroll-shell">
      <div className="cs-stats-export-task-list">
        {children}
      </div>
    </div>
  );
}

function ExportTaskList({
  downloadPending,
  onDownload,
  tasks,
}: {
  downloadPending?: boolean;
  onDownload: (task: CustomerServiceExportDialogTask) => void;
  tasks: CustomerServiceExportDialogTask[];
}) {
  if (tasks.length === 0) return null;
  return (
    <>
      {tasks.map((task) => {
        const running = isRunningExportStatus(task.status);
        const failed = isFailedExportStatus(task.status);
        const completed = isCompletedExportStatus(task.status);
        return (
          <article
            className={[
              running ? "running" : "",
              completed ? "completed" : "",
              failed ? "failed" : "",
            ].filter(Boolean).join(" ")}
            key={task.key}
          >
            <div className="cs-stats-export-task-main-cell">
              <strong title={task.title}>
                {compactTaskTitle(task.title)}
              </strong>
            </div>
            <div className="cs-stats-export-task-count-cell">
              <span>
                {task.recordCountLabel || ""}
              </span>
            </div>
            <div className="cs-stats-export-task-meta-cell">
              <span>
                {task.createdAtLabel}
              </span>
            </div>
            <div className="cs-stats-export-task-meta-cell">
              <span>
                {task.completedAtLabel || ""}
              </span>
            </div>
            <div
              className="cs-stats-export-task-actions"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {completed && (
                <button
                  type="button"
                  disabled={!task.canDownload || downloadPending}
                  onClick={() => onDownload(task)}
                >
                  <Download size={14} />
                  下载
                </button>
              )}
              {!completed && (
                <span className={`cs-stats-export-status-pill ${taskStatusTone(task.status)}`}>
                  {task.statusLabel}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}

function compactTaskTitle(title: string) {
  if (title.length <= 42) return title;
  const extensionIndex = title.lastIndexOf(".");
  if (extensionIndex > 0) {
    return `${title.slice(0, 18)}...${title.slice(Math.max(extensionIndex - 8, 18))}`;
  }
  return `${title.slice(0, 24)}...${title.slice(-12)}`;
}

function isRunningExportStatus(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "pending" || normalized === "processing";
}

function isCompletedExportStatus(status?: string | null) {
  return String(status ?? "").toLowerCase() === "completed";
}

function isFailedExportStatus(status?: string | null) {
  return String(status ?? "").toLowerCase() === "failed";
}

function taskStatusTone(status?: string | null) {
  if (isCompletedExportStatus(status)) return "completed";
  if (isFailedExportStatus(status)) return "failed";
  if (isRunningExportStatus(status)) return "running";
  return "idle";
}
