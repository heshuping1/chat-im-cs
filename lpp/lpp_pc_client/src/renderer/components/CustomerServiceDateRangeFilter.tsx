import { DayPicker, type DateRange, type Formatters } from "react-day-picker";
import "react-day-picker/style.css";

export type CustomerServiceDatePresetOption<TPreset extends string> = {
  label: string;
  value: TPreset;
};

type CustomerServiceDateRangeFilterProps<TPreset extends string> = {
  className?: string;
  fromTime: string;
  onPickerOpenChange: (open: boolean) => void;
  onPresetChange: (preset: TPreset) => void;
  onRangeChange: (range: DateRange | undefined) => void;
  onTimeChange: (side: "from" | "to", time: string) => void;
  pickerOpen: boolean;
  preset: TPreset;
  presetOptions: Array<CustomerServiceDatePresetOption<TPreset>>;
  range: DateRange;
  rangeLabel: (range: DateRange, fromTime: string, toTime: string) => string;
  toTime: string;
};

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const customerServiceDatePickerFormatters: Partial<Formatters> = {
  formatCaption: (month) => `${month.getFullYear()}年 ${month.getMonth() + 1}月`,
  formatMonthDropdown: (month) => `${month.getMonth() + 1}月`,
  formatWeekdayName: (weekday) => weekdayLabels[weekday.getDay()] ?? "",
  formatYearDropdown: (year) => `${year.getFullYear()}年`,
};

export function CustomerServiceDateRangeFilter<TPreset extends string>({
  className,
  fromTime,
  onPickerOpenChange,
  onPresetChange,
  onRangeChange,
  onTimeChange,
  pickerOpen,
  preset,
  presetOptions,
  range,
  rangeLabel,
  toTime,
}: CustomerServiceDateRangeFilterProps<TPreset>) {
  const rootClassName = ["cs-history-date-filter", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <div className="cs-history-filter-options">
        {presetOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={preset === option.value ? "active" : undefined}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="cs-history-date-custom">
          <button
            type="button"
            className="cs-history-date-trigger"
            onClick={() => onPickerOpenChange(true)}
          >
            {rangeLabel(range, fromTime, toTime)}
          </button>
          {pickerOpen && (
            <div className="cs-history-date-popover">
              <DayPicker
                captionLayout="label"
                formatters={customerServiceDatePickerFormatters}
                mode="range"
                navLayout="around"
                numberOfMonths={1}
                selected={range}
                weekStartsOn={1}
                onSelect={onRangeChange}
              />
              <div className="cs-history-time-grid">
                <label>
                  <span>开始</span>
                  <input
                    aria-label="开始时间"
                    type="time"
                    step={1}
                    value={fromTime}
                    disabled={!range.from}
                    onChange={(event) => onTimeChange("from", event.target.value)}
                  />
                </label>
                <label>
                  <span>结束</span>
                  <input
                    aria-label="结束时间"
                    type="time"
                    step={1}
                    value={toTime}
                    disabled={!range.to}
                    onChange={(event) => onTimeChange("to", event.target.value)}
                  />
                </label>
              </div>
              <footer>
                <button type="button" onClick={() => onRangeChange(undefined)}>
                  清空
                </button>
                <button type="button" className="primary" onClick={() => onPickerOpenChange(false)}>
                  完成
                </button>
              </footer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
