import { useMemo, useState } from "react";
import { AlertCircle, BellRing, Building2, Check, ChevronRight, Search } from "lucide-react";

import { formatBadgeCount, formatError } from "../../lib/format";
import { PcAvatar } from "../../components/PcAvatar";
import {
  spaceRadarItemReminderPresentation,
  spaceRadarNewReminderSummary,
  type SpaceRadarItem,
  type SpaceRadarViewModel,
} from "../models/spaceRadarModel";
import { targetForSpaceRadarItem } from "../hooks/useSpaceRadarController";
import type { SpaceSwitchTarget } from "../hooks/useSpaceSwitchController";

type SpaceRadarFilter = "alerts" | "all" | "recent";

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
  const [filter, setFilter] = useState<SpaceRadarFilter>("all");
  const [keyword, setKeyword] = useState("");
  const visibleItems = useMemo(
    () => filterSpaceRadarItems(viewModel.items, filter, keyword),
    [filter, keyword, viewModel.items],
  );
  const hasAlerts = viewModel.items.some((item) => item.hasNewReminder);
  const newReminderSummary = spaceRadarNewReminderSummary(viewModel);
  const totalReminderText = formatBadgeCount(newReminderSummary?.totalNewReminderCount ?? 0);

  return (
    <div
      className="sidebar-status-popover sidebar-space-status-popover sidebar-space-radar-popover"
      role="dialog"
      aria-label="空间"
    >
      <header className="space-radar-head">
        <div className="space-radar-title">
          <BellRing size={16} aria-hidden="true" />
          <div>
            <strong>空间</strong>
            <span>查看各空间消息提醒，切换后查看详情</span>
          </div>
        </div>
        {newReminderSummary && (
          <div className="space-radar-totals" aria-label={`新提醒 ${totalReminderText}`}>
            <b>{totalReminderText}</b>
            <em>{newReminderSummary.reminderSpaceCount} 个空间</em>
          </div>
        )}
      </header>

      {newReminderSummary && (
        <div className="space-radar-alert-strip" role="status">
          <BellRing size={14} aria-hidden="true" />
          <strong>{totalReminderText} 条跨空间新消息</strong>
          <span>切换空间后查看消息详情</span>
        </div>
      )}

      {!canSwitch && (
        <p className="space-radar-inline-state error">
          当前登录未保留平台会话，请重新登录后切换空间。
        </p>
      )}
      {Boolean(unreadSummaryError) && (
        <p className="space-radar-inline-state error">
          跨空间未读同步失败：{String(formatError(unreadSummaryError))}
        </p>
      )}
      {Boolean(spacesError) && (
        <p className="space-radar-inline-state error">
          空间列表同步失败：{String(formatError(spacesError))}
        </p>
      )}
      {Boolean(switchError) && (
        <p className="space-radar-inline-state error">
          空间切换失败：{String(formatError(switchError))}
        </p>
      )}
      {unreadSummaryLoading && (
        <p className="space-radar-inline-state">正在同步跨空间红点...</p>
      )}

      <div className="space-radar-filters" role="tablist" aria-label="空间筛选">
        <SpaceRadarFilterButton active={filter === "alerts"} onClick={() => setFilter("alerts")}>
          新消息
        </SpaceRadarFilterButton>
        <SpaceRadarFilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          全部
        </SpaceRadarFilterButton>
        <SpaceRadarFilterButton active={filter === "recent"} onClick={() => setFilter("recent")}>
          最近
        </SpaceRadarFilterButton>
      </div>

      <label className="space-radar-search">
        <Search size={14} aria-hidden="true" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索空间 / 企业码"
        />
      </label>

      <div className="space-radar-list" role="list">
        {spacesLoading && <p className="space-radar-inline-state">正在读取空间列表...</p>}
        {visibleItems.length === 0 ? (
          <div className="space-radar-empty">
            <Building2 size={17} />
            <strong>{hasAlerts ? "未找到匹配空间" : "暂无新消息"}</strong>
            <span>{hasAlerts ? "换个关键词试试。" : "切换空间后查看对应空间详情。"}</span>
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
            />
          ))
        )}
      </div>

      <footer className="space-radar-actions">
        <button type="button" onClick={onManageSpaces}>
          加入 / 管理空间
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
}: {
  currentSpaceBadgeCount: number;
  item: SpaceRadarItem;
  onManageSpaces: () => void;
  onSwitchSpace: (target: SpaceSwitchTarget) => void;
  switching: boolean;
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
              同步失败
            </b>
          )}
        </span>
      </div>
      {item.current ? (
        <span className="space-radar-current" aria-label="当前空间">
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
          {switching ? "切换中" : canSwitch ? "切换" : "管理"}
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
    if (filter === "alerts" && !item.hasNewReminder) {
      return false;
    }
    if (!normalizedKeyword) return true;
    return `${item.displayName} ${item.displayCode}`.toLowerCase().includes(normalizedKeyword);
  });
}
