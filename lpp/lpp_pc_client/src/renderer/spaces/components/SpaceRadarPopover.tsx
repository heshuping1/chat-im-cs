import { useMemo, useState } from "react";
import { AlertCircle, BellRing, Building2, Check, ChevronRight, Search } from "lucide-react";

import { formatBadgeCount, formatError } from "../../lib/format";
import { PcAvatar } from "../../components/PcAvatar";
import { useI18n } from "../../i18n/useI18n";
import {
  spaceRadarItemReminderPresentation,
  spaceRadarNewReminderSummary,
  type SpaceRadarItem,
  type SpaceRadarViewModel,
} from "../models/spaceRadarModel";
import { targetForSpaceRadarItem } from "../hooks/useSpaceRadarController";
import type { SpaceSwitchTarget } from "../hooks/useSpaceSwitchController";

type SpaceRadarFilter = "alerts" | "all" | "recent";
type SpaceRadarTranslate = (key: string, params?: Record<string, string | number>) => string;

export function SpaceRadarPopover({
  canSwitch,
  currentSpaceBadgeCount = 0,
  onManageSpaces,
  onSwitchSpace,
  spacesError,
  spacesLoading,
  switchError,
  switchingIdentityKey,
  unreadSummaryError,
  unreadSummaryLoading,
  viewModel,
}: {
  canSwitch: boolean;
  currentSpaceBadgeCount?: number;
  onManageSpaces: () => void;
  onSwitchSpace: (target: SpaceSwitchTarget) => void;
  spacesError: unknown;
  spacesLoading: boolean;
  switchError: unknown;
  switchingIdentityKey: string;
  unreadSummaryError: unknown;
  unreadSummaryLoading: boolean;
  viewModel: SpaceRadarViewModel;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<SpaceRadarFilter>("all");
  const [keyword, setKeyword] = useState("");
  const visibleItems = useMemo(
    () => filterSpaceRadarItems(viewModel.items, filter, keyword),
    [filter, keyword, viewModel.items],
  );
  const newReminderSummary = spaceRadarNewReminderSummary(viewModel);
  const hasCrossSpaceAlerts = Boolean(newReminderSummary);
  const totalReminderText = formatBadgeCount(newReminderSummary?.totalNewReminderCount ?? 0);

  return (
    <div
      className="sidebar-status-popover sidebar-space-status-popover sidebar-space-radar-popover"
      role="dialog"
      aria-label={t("spaceRadar.title")}
    >
      <header className="space-radar-head">
        <div className="space-radar-title">
          <BellRing size={16} aria-hidden="true" />
          <div>
            <strong>{t("spaceRadar.title")}</strong>
            <span>{t("spaceRadar.subtitle")}</span>
          </div>
        </div>
        {newReminderSummary && (
          <div className="space-radar-totals" aria-label={t("spaceRadar.newReminderAria", { count: totalReminderText })}>
            <b>{totalReminderText}</b>
            <em>{t("spaceRadar.spaceCount", { count: newReminderSummary.reminderSpaceCount })}</em>
          </div>
        )}
      </header>

      {newReminderSummary && (
        <div className="space-radar-alert-strip" role="status">
          <BellRing size={14} aria-hidden="true" />
          <strong>{t("spaceRadar.crossSpaceNewMessages", { count: totalReminderText })}</strong>
          <span>{t("spaceRadar.switchToViewDetail")}</span>
        </div>
      )}

      {!canSwitch && (
        <p className="space-radar-inline-state error">
          {t("spaceRadar.missingPlatformSession")}
        </p>
      )}
      {Boolean(unreadSummaryError) && (
        <p className="space-radar-inline-state error">
          {t("spaceRadar.unreadSyncFailed", { error: String(formatError(unreadSummaryError)) })}
        </p>
      )}
      {Boolean(spacesError) && (
        <p className="space-radar-inline-state error">
          {t("spaceRadar.spacesSyncFailed", { error: String(formatError(spacesError)) })}
        </p>
      )}
      {Boolean(switchError) && (
        <p className="space-radar-inline-state error">
          {t("spaceRadar.switchFailed", { error: String(formatError(switchError)) })}
        </p>
      )}
      {unreadSummaryLoading && (
        <p className="space-radar-inline-state">{t("spaceRadar.syncingUnread")}</p>
      )}

      <div className="space-radar-filters" role="tablist" aria-label={t("spaceRadar.filterAria")}>
        <SpaceRadarFilterButton active={filter === "alerts"} onClick={() => setFilter("alerts")}>
          {t("spaceRadar.filter.alerts")}
        </SpaceRadarFilterButton>
        <SpaceRadarFilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          {t("spaceRadar.filter.all")}
        </SpaceRadarFilterButton>
        <SpaceRadarFilterButton active={filter === "recent"} onClick={() => setFilter("recent")}>
          {t("spaceRadar.filter.recent")}
        </SpaceRadarFilterButton>
      </div>

      <label className="space-radar-search">
        <Search size={14} aria-hidden="true" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("spaceRadar.searchPlaceholder")}
        />
      </label>

      <div className="space-radar-list" role="list">
        {spacesLoading && <p className="space-radar-inline-state">{t("spaceRadar.loadingSpaces")}</p>}
        {visibleItems.length === 0 ? (
          <div className="space-radar-empty">
            <Building2 size={17} />
            <strong>
              {spaceRadarEmptyTitle({
                filter,
                hasCrossSpaceAlerts,
                keyword,
                t,
              })}
            </strong>
            <span>
              {spaceRadarEmptyDetail({
                filter,
                hasCrossSpaceAlerts,
                keyword,
                t,
              })}
            </span>
          </div>
        ) : (
          visibleItems.map((item) => (
            <SpaceRadarRow
              item={item}
              currentSpaceBadgeCount={currentSpaceBadgeCount}
              key={item.identityKey}
              onManageSpaces={onManageSpaces}
              onSwitchSpace={onSwitchSpace}
              switching={switchingIdentityKey === item.identityKey}
              t={t}
            />
          ))
        )}
      </div>

      <footer className="space-radar-actions">
        <button type="button" onClick={onManageSpaces}>
          {t("spaceRadar.manageSpaces")}
        </button>
      </footer>
    </div>
  );
}

function SpaceRadarRow({
  currentSpaceBadgeCount,
  item,
  onManageSpaces,
  onSwitchSpace,
  switching,
  t,
}: {
  currentSpaceBadgeCount: number;
  item: SpaceRadarItem;
  onManageSpaces: () => void;
  onSwitchSpace: (target: SpaceSwitchTarget) => void;
  switching: boolean;
  t: SpaceRadarTranslate;
}) {
  const target = targetForSpaceRadarItem(item);
  const canSwitch = item.canSwitch && Boolean(target) && !item.current;
  const reminderPresentation = spaceRadarItemReminderPresentation(item, {
    currentSpaceBadgeCount,
  });

  return (
    <article
      className={`space-radar-row ${item.current ? "current" : ""} ${
        item.hasNewReminder ? "has-unread" : ""
      } attention-${item.attentionLevel}`}
      role="listitem"
    >
      <PcAvatar
        avatarUrl={item.logoUrl}
        className="sidebar-space-logo space-radar-logo"
        iconSize={16}
        kind={item.spaceType === 1 ? "person" : "tenant"}
        name={item.displayCode !== "--" ? item.displayCode : item.displayName}
      />
      <div className="space-radar-main">
        <strong>{item.displayName}</strong>
        <em>{[item.displayCode, item.roleLabel].filter(Boolean).join(" · ")}</em>
        <span className="space-radar-badges">
          <b className={reminderPresentation.live ? "danger is-live" : ""}>
            {reminderPresentation.text}
          </b>
          {item.syncState === "error" && (
            <b className="warning">
              <AlertCircle size={11} />
              {t("spaceRadar.syncFailed")}
            </b>
          )}
        </span>
      </div>
      {item.current ? (
        <span className="space-radar-current" aria-label={t("spaceRadar.currentSpace")}>
          <Check size={14} />
        </span>
      ) : (
        <button
          className="space-radar-switch"
          type="button"
          disabled={switching}
          onClick={() => {
            if (canSwitch && target) {
              onSwitchSpace(target);
              return;
            }
            onManageSpaces();
          }}
        >
          {switching ? t("spaceRadar.switching") : canSwitch ? t("spaceRadar.switch") : t("spaceRadar.manage")}
          <ChevronRight size={13} />
        </button>
      )}
    </article>
  );
}

function SpaceRadarFilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function filterSpaceRadarItems(
  items: SpaceRadarItem[],
  filter: SpaceRadarFilter,
  keyword: string,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === "alerts" && (item.current || !item.hasNewReminder)) {
      return false;
    }
    if (!normalizedKeyword) return true;
    return `${item.displayName} ${item.displayCode}`.toLowerCase().includes(normalizedKeyword);
  });
}

function spaceRadarEmptyTitle({
  filter,
  hasCrossSpaceAlerts,
  keyword,
  t,
}: {
  filter: SpaceRadarFilter;
  hasCrossSpaceAlerts: boolean;
  keyword: string;
  t: SpaceRadarTranslate;
}) {
  if (keyword.trim()) return t("spaceRadar.noMatch");
  if (filter === "alerts") return t("spaceRadar.noCrossSpaceNewMessages");
  return hasCrossSpaceAlerts ? t("spaceRadar.noMatch") : t("spaceRadar.noSpaceReminders");
}

function spaceRadarEmptyDetail({
  filter,
  hasCrossSpaceAlerts,
  keyword,
  t,
}: {
  filter: SpaceRadarFilter;
  hasCrossSpaceAlerts: boolean;
  keyword: string;
  t: SpaceRadarTranslate;
}) {
  if (keyword.trim() || hasCrossSpaceAlerts) return t("spaceRadar.tryAnotherKeyword");
  return filter === "alerts"
    ? t("spaceRadar.noCrossSpaceNewMessagesDetail")
    : t("spaceRadar.switchToViewSpace");
}
