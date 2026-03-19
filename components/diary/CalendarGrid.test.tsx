import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarGrid } from "./CalendarGrid";
import { MiniCalendar } from "./MiniCalendar";

const DEFAULT_PROPS = {
  year: 2025,
  month: 3,
  markedDates: [],
  today: "2025-03-19",
  onDateClick: vi.fn(),
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
};

describe("CalendarGrid", () => {
  it("renders the correct month/year header", () => {
    render(<CalendarGrid {...DEFAULT_PROPS} />);
    expect(screen.getByText(/2025년 03월/)).toBeInTheDocument();
  });

  it("renders all 7 day-of-week labels", () => {
    render(<CalendarGrid {...DEFAULT_PROPS} />);
    for (const label of ["일", "월", "화", "수", "목", "금", "토"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders day buttons for all days in the month (March 2025 = 31 days)", () => {
    render(<CalendarGrid {...DEFAULT_PROPS} />);
    // Day 1 to 31 should be present as buttons
    for (let d = 1; d <= 31; d++) {
      expect(
        screen.getByRole("button", { name: String(d) })
      ).toBeInTheDocument();
    }
  });

  it("shows dots only for markedDates (DIARY-001)", () => {
    render(
      <CalendarGrid
        {...DEFAULT_PROPS}
        markedDates={["2025-03-10", "2025-03-15"]}
      />
    );

    expect(screen.getByTestId("diary-dot-2025-03-10")).toBeInTheDocument();
    expect(screen.getByTestId("diary-dot-2025-03-15")).toBeInTheDocument();
    expect(screen.queryByTestId("diary-dot-2025-03-11")).not.toBeInTheDocument();
  });

  it("does not show a dot when markedDates is empty", () => {
    render(<CalendarGrid {...DEFAULT_PROPS} markedDates={[]} />);
    expect(screen.queryByTestId("diary-dot-2025-03-19")).not.toBeInTheDocument();
  });

  it("calls onPrevMonth when previous button is clicked (DIARY-011)", async () => {
    const onPrevMonth = vi.fn();
    const user = userEvent.setup();

    render(<CalendarGrid {...DEFAULT_PROPS} onPrevMonth={onPrevMonth} />);

    await user.click(screen.getByRole("button", { name: /이전/ }));

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
  });

  it("calls onNextMonth when next button is clicked (DIARY-011)", async () => {
    const onNextMonth = vi.fn();
    const user = userEvent.setup();

    render(<CalendarGrid {...DEFAULT_PROPS} onNextMonth={onNextMonth} />);

    await user.click(screen.getByRole("button", { name: /다음/ }));

    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it("calls onDateClick with correct date string when a day is clicked", async () => {
    const onDateClick = vi.fn();
    const user = userEvent.setup();

    render(<CalendarGrid {...DEFAULT_PROPS} onDateClick={onDateClick} />);

    await user.click(screen.getByRole("button", { name: "19" }));

    expect(onDateClick).toHaveBeenCalledWith("2025-03-19");
  });

  it("marks today with aria-current='date'", () => {
    render(<CalendarGrid {...DEFAULT_PROPS} today="2025-03-19" />);
    const todayBtn = screen.getByRole("button", { name: "19" });
    expect(todayBtn).toHaveAttribute("aria-current", "date");
  });

  it("first day of March 2025 is Saturday (index 6), so 5 leading empty cells", () => {
    // March 2025 starts on Saturday
    render(<CalendarGrid {...DEFAULT_PROPS} />);
    // Day 1 should exist
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });

  it("renders February 2025 with 28 days correctly", () => {
    render(
      <CalendarGrid
        {...DEFAULT_PROPS}
        year={2025}
        month={2}
        today="2025-02-01"
        markedDates={[]}
      />
    );
    expect(screen.getByText(/2025년 02월/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "28" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "29" })).not.toBeInTheDocument();
  });
});

describe("MiniCalendar", () => {
  it("renders in compact mode with 168px width constraint", () => {
    const { container } = render(<MiniCalendar {...DEFAULT_PROPS} />);
    const root = container.firstElementChild;
    expect(root?.className).toContain("w-[168px]");
  });

  it("shows dots for markedDates same as CalendarGrid", () => {
    render(
      <MiniCalendar
        {...DEFAULT_PROPS}
        markedDates={["2025-03-10", "2025-03-15"]}
      />
    );

    expect(screen.getByTestId("diary-dot-2025-03-10")).toBeInTheDocument();
    expect(screen.getByTestId("diary-dot-2025-03-15")).toBeInTheDocument();
    expect(screen.queryByTestId("diary-dot-2025-03-11")).not.toBeInTheDocument();
  });

  it("calls onPrevMonth and onNextMonth", async () => {
    const onPrevMonth = vi.fn();
    const onNextMonth = vi.fn();
    const user = userEvent.setup();

    render(
      <MiniCalendar
        {...DEFAULT_PROPS}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />
    );

    await user.click(screen.getByRole("button", { name: /이전/ }));
    await user.click(screen.getByRole("button", { name: /다음/ }));

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });
});
