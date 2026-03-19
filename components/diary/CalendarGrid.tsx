"use client";

import { memo, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  markedDates: string[];
  selectedDate?: string;
  today: string; // "YYYY-MM-DD"
  onDateClick: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** Optional className for the root element */
  className?: string;
  /** Font size class override (for MiniCalendar) */
  fontSizeClass?: string;
  /** Whether to use compact size (for MiniCalendar) */
  compact?: boolean;
}

function buildCalendarWeeks(year: number, month: number): (number | null)[][] {
  // month is 1-indexed
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // Fill to complete last row (6 rows total for consistent layout)
  while (cells.length < 42) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < 42; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

interface DayCellProps {
  year: number;
  month: number;
  day: number;
  isToday: boolean;
  isMarked: boolean;
  isSelected: boolean;
  onDateClick: (date: string) => void;
  compact: boolean;
}

const DayCell = memo(function DayCell({
  year,
  month,
  day,
  isToday,
  isMarked,
  isSelected,
  onDateClick,
  compact,
}: DayCellProps) {
  const dateStr = toDateString(year, month, day);

  const handleClick = useCallback(() => {
    onDateClick(dateStr);
  }, [onDateClick, dateStr]);

  return (
    <td
      className={`text-center ${compact ? "p-0" : "p-0.5"}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-current={isToday ? "date" : undefined}
        className={[
          "relative flex flex-col items-center justify-center mx-auto",
          compact
            ? "w-5 h-5 text-[9px]"
            : "w-8 h-8 text-sm",
          "rounded-full transition-colors",
          isToday
            ? "bg-primary text-primary-foreground font-bold"
            : isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {day}
        {isMarked && (
          <span
            data-testid={`diary-dot-${dateStr}`}
            aria-hidden="true"
            className={[
              "absolute bottom-0.5 left-1/2 -translate-x-1/2",
              "rounded-full bg-primary",
              compact ? "w-[3px] h-[3px]" : "w-1 h-1",
            ].join(" ")}
          />
        )}
      </button>
    </td>
  );
});

interface EmptyCellProps {
  compact: boolean;
}

function EmptyCell({ compact }: EmptyCellProps) {
  return <td className={`${compact ? "p-0" : "p-0.5"}`} />;
}

interface CalendarRowProps {
  week: (number | null)[];
  year: number;
  month: number;
  markedSet: Set<string>;
  selectedDate: string | undefined;
  today: string;
  onDateClick: (date: string) => void;
  compact: boolean;
}

const CalendarRow = memo(function CalendarRow({
  week,
  year,
  month,
  markedSet,
  selectedDate,
  today,
  onDateClick,
  compact,
}: CalendarRowProps) {
  return (
    <tr>
      {week.map((day, idx) => {
        if (day === null) {
          return <EmptyCell key={idx} compact={compact} />;
        }
        const dateStr = toDateString(year, month, day);
        return (
          <DayCell
            key={dateStr}
            year={year}
            month={month}
            day={day}
            isToday={dateStr === today}
            isMarked={markedSet.has(dateStr)}
            isSelected={dateStr === selectedDate}
            onDateClick={onDateClick}
            compact={compact}
          />
        );
      })}
    </tr>
  );
});

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export const CalendarGrid = memo(function CalendarGrid({
  year,
  month,
  markedDates,
  selectedDate,
  today,
  onDateClick,
  onPrevMonth,
  onNextMonth,
  className,
  fontSizeClass,
  compact = false,
}: CalendarGridProps) {
  const weeks = useMemo(
    () => buildCalendarWeeks(year, month),
    [year, month]
  );

  const markedSet = useMemo(() => new Set(markedDates), [markedDates]);

  const headerFontClass = fontSizeClass ?? (compact ? "text-[10px]" : "text-base");
  const dayLabelClass = compact ? "text-[9px]" : "text-xs";

  return (
    <div
      className={[
        "select-none",
        compact ? "w-[168px]" : "w-full max-w-[480px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header: prev / title / next */}
      <div className="flex items-center justify-between mb-1 px-1">
        <button
          type="button"
          aria-label="이전 달"
          onClick={onPrevMonth}
          className={[
            "rounded hover:bg-accent hover:text-accent-foreground",
            compact ? "p-0.5" : "p-1",
          ].join(" ")}
        >
          <ChevronLeft className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </button>

        <span className={`font-semibold ${headerFontClass}`}>
          {year}년 {pad2(month)}월
        </span>

        <button
          type="button"
          aria-label="다음 달"
          onClick={onNextMonth}
          className={[
            "rounded hover:bg-accent hover:text-accent-foreground",
            compact ? "p-0.5" : "p-1",
          ].join(" ")}
        >
          <ChevronRight className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            {DAY_LABELS.map((label) => (
              <th
                key={label}
                scope="col"
                className={`text-center font-medium text-muted-foreground ${dayLabelClass} ${compact ? "py-0.5" : "py-1"}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, rowIdx) => (
            <CalendarRow
              key={rowIdx}
              week={week}
              year={year}
              month={month}
              markedSet={markedSet}
              selectedDate={selectedDate}
              today={today}
              onDateClick={onDateClick}
              compact={compact}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
