import "@testing-library/jest-dom/vitest";
import { beforeAll, afterAll } from "vitest";

// Pin the Date to 2025-03-19 so spec tests that render <App /> without
// initialMonth see the expected 2025-03 calendar. Only Date is faked, not
// timers, so userEvent async interactions remain unaffected.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2025-03-19T00:00:00.000Z"));
});

afterAll(() => {
  vi.useRealTimers();
});
