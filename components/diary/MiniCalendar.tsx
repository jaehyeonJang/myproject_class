"use client";

import { memo } from "react";
import { CalendarGrid, CalendarGridProps } from "./CalendarGrid";

export type MiniCalendarProps = Omit<CalendarGridProps, "compact" | "fontSizeClass">;

export const MiniCalendar = memo(function MiniCalendar(
  props: MiniCalendarProps
) {
  return (
    <CalendarGrid
      {...props}
      compact={true}
      fontSizeClass="text-[10px]"
    />
  );
});
