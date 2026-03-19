import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDiaryStore } from "./diary-store";

// jsdom provides localStorage; reset between tests
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useDiaryStore", () => {
  it("save stores content and get retrieves it", () => {
    const { result } = renderHook(() => useDiaryStore());

    act(() => {
      result.current.save("2025-03-19", "내용");
    });

    expect(result.current.get("2025-03-19")).toBe("내용");
    expect(localStorage.getItem("diary:v1")).toContain("내용");
  });

  it("save overwrites existing entry (DIARY-010)", () => {
    const { result } = renderHook(() => useDiaryStore());

    act(() => {
      result.current.save("2025-03-10", "내용A");
    });
    act(() => {
      result.current.save("2025-03-10", "내용B");
    });

    expect(result.current.get("2025-03-10")).toBe("내용B");
  });

  it("remove deletes entry and get returns undefined", () => {
    const { result } = renderHook(() => useDiaryStore());

    act(() => {
      result.current.save("2025-03-10", "내용A");
    });
    act(() => {
      result.current.remove("2025-03-10");
    });

    expect(result.current.get("2025-03-10")).toBeUndefined();
  });

  it("get returns undefined for non-existent date", () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.get("2099-01-01")).toBeUndefined();
  });

  it("lazy init loads existing localStorage data on mount", () => {
    localStorage.setItem(
      "diary:v1",
      JSON.stringify({ "2025-03-19": "이미 있는 내용" })
    );

    const { result } = renderHook(() => useDiaryStore());

    expect(result.current.get("2025-03-19")).toBe("이미 있는 내용");
  });

  it("multiple entries are stored independently", () => {
    const { result } = renderHook(() => useDiaryStore());

    act(() => {
      result.current.save("2025-03-19", "오늘");
      result.current.save("2025-03-20", "내일");
    });

    expect(result.current.get("2025-03-19")).toBe("오늘");
    expect(result.current.get("2025-03-20")).toBe("내일");
  });

  it("does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useDiaryStore());

    expect(() => {
      act(() => {
        result.current.save("2025-03-19", "내용");
      });
    }).not.toThrow();
  });
});
