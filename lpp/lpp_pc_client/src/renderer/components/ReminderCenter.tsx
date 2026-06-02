import { Clock, Headphones, MessageSquare, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useDismissRealtimeReminder,
  useRealtimeReminders,
} from "../data/reminder/reminder-store";
import type { ModuleKey } from "../data/types";
import {
  useSetActiveImConversation,
  useSetContactFilter,
  useSetActiveModule,
  useOpenCustomerServiceThread,
  useSetServiceThreadFilter,
} from "../data/workspace-ui/workspace-ui-store";

type ReminderSeverity = "info" | "warning" | "critical";

interface ReminderItem {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  avatarLabel?: string;
  avatarUrl?: string | null;
  severity: ReminderSeverity;
  targetModule: ModuleKey;
  targetId?: string;
  icon: "contacts" | "im" | "service" | "sla";
}

export function ReminderCenter() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const setActiveModule = useSetActiveModule();
  const openCustomerServiceThread = useOpenCustomerServiceThread();
  const setFilter = useSetServiceThreadFilter();
  const setContactFilter = useSetContactFilter();
  const setActiveImConversation = useSetActiveImConversation();
  const realtimeReminders = useRealtimeReminders();
  const dismissRealtimeReminder = useDismissRealtimeReminder();

  const reminders = useMemo(
    () => [
      ...realtimeReminders.map((item) => ({
        ...item,
        actionLabel:
          item.targetModule === "messages"
            ? "查看消息"
            : item.targetModule === "contacts"
              ? "处理申请"
              : "查看会话",
        severity: item.severity ?? "info",
        icon:
          item.icon ??
          (item.targetModule === "messages"
            ? "im"
            : item.targetModule === "contacts"
              ? "contacts"
              : "service"),
      })),
      ...buildReminders(),
    ] satisfies ReminderItem[],
    [realtimeReminders],
  );
  const visibleReminders = reminders.filter((item) => !dismissed.has(item.id));

  if (visibleReminders.length === 0) return null;

  const openReminder = (item: ReminderItem) => {
    if (item.targetModule === "messages" && item.targetId) {
      setActiveImConversation(item.targetId);
    } else if (item.targetModule === "contacts") {
      setContactFilter("requests");
      setActiveModule("contacts");
    } else {
      if (item.targetId) openCustomerServiceThread(item.targetId, "reminder");
      if (item.id === "service-queue") setFilter("queued");
      if (item.id === "service-sla") setFilter("serving");
      setActiveModule(item.targetModule);
    }
    dismissRealtimeReminder(item.id);
    setDismissed((current) => new Set(current).add(item.id));
  };

  return (
    <aside className="reminder-stack" role="region" aria-label="提醒中心">
      {visibleReminders.slice(0, 3).map((item) => {
        const Icon =
          item.icon === "im"
            ? MessageSquare
            : item.icon === "sla"
              ? Clock
              : item.icon === "contacts"
                ? UserPlus
                : Headphones;
        return (
          <article
            className={`reminder-card ${item.severity} ${item.icon === "service" ? "service" : ""}`}
            key={item.id}
          >
            <span className="reminder-icon">
              {item.icon === "service" && (item.avatarUrl || item.avatarLabel) ? (
                item.avatarUrl ? (
                  <img alt="" src={item.avatarUrl} />
                ) : (
                  <em>{item.avatarLabel}</em>
                )
              ) : (
                <Icon size={15} />
              )}
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <button
                type="button"
                onClick={() => openReminder(item)}
                aria-label={`查看 ${item.title}`}
              >
                {item.actionLabel}
              </button>
            </div>
            <button
              className="reminder-close"
              type="button"
              aria-label={`关闭 ${item.title}`}
              onClick={() => {
                dismissRealtimeReminder(item.id);
                setDismissed((current) => new Set(current).add(item.id));
              }}
            >
              <X size={13} />
            </button>
          </article>
        );
      })}
    </aside>
  );
}

function buildReminders(): ReminderItem[] {
  const reminders: ReminderItem[] = [];
  return reminders;
}
