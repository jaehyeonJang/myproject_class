"use client";

import { useState, useCallback } from "react";
import { useDiaryStore } from "@/lib/diary-store";
import { useGoogleAuth } from "@/lib/auth";
import { CalendarGrid } from "@/components/diary/CalendarGrid";
import { MiniCalendar } from "@/components/diary/MiniCalendar";
import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { GoogleLoginButton } from "@/components/diary/GoogleLoginButton";

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY = getTodayString();

function parseInitialMonth(m?: string): { year: number; month: number } {
  if (m) {
    const [y, mo] = m.split("-").map(Number);
    return { year: y, month: mo };
  }
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

type AppProps = {
  initialLoggedIn?: boolean;
  initialMonth?: string; // "YYYY-MM" format
};

export default function App({ initialLoggedIn = false, initialMonth }: AppProps) {
  const { entries, save, remove } = useDiaryStore();

  const [displayedMonth, setDisplayedMonth] = useState(() =>
    parseInitialMonth(initialMonth)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { isLoggedIn, user, accessToken, login, logout } = useGoogleAuth(initialLoggedIn);

  // Derived: marked dates from entries
  const markedDates = Object.keys(entries);

  const handlePrevMonth = useCallback(() => {
    setDisplayedMonth((prev) => {
      const date = new Date(prev.year, prev.month - 2, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setDisplayedMonth((prev) => {
      const date = new Date(prev.year, prev.month, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }, []);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleSave = useCallback(
    (content: string) => {
      if (selectedDate) {
        save(selectedDate, content);
        setSelectedDate(null);
      }
    },
    [selectedDate, save]
  );

  const handleBack = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedDate) {
      remove(selectedDate);
      setSelectedDate(null);
    }
  }, [selectedDate, remove]);

  const handleRequestAI = useCallback(async (): Promise<{ content: string; noCalendarEvents?: boolean }> => {
    const response = await fetch("/api/ai-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ date: selectedDate }),
    });
    if (!response.ok) {
      throw new Error("AI API error");
    }
    const data = await response.json();
    return data as { content: string; noCalendarEvents?: boolean };
  }, [selectedDate, accessToken]);

  const loginButton = (
    <div className="flex justify-end p-4">
      <GoogleLoginButton
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={login}
        onLogout={logout}
      />
    </div>
  );

  if (selectedDate !== null) {
    return (
      <div className="min-h-screen bg-amber-50/60 flex flex-col items-center">
        <div className="w-full max-w-3xl">{loginButton}</div>

        <div className="flex flex-1 gap-6 px-6 pb-6 w-full max-w-3xl">
          {/* Mini calendar */}
          <div className="flex-shrink-0">
            <MiniCalendar
              year={displayedMonth.year}
              month={displayedMonth.month}
              markedDates={markedDates}
              selectedDate={selectedDate}
              today={TODAY}
              onDateClick={handleDateClick}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </div>

          {/* Diary editor */}
          <div className="flex-1 max-w-lg">
            <DiaryEditor
              key={selectedDate}
              date={selectedDate}
              initialContent={entries[selectedDate] ?? ""}
              isLoggedIn={isLoggedIn}
              user={user}
              onSave={handleSave}
              onBack={handleBack}
              onDelete={handleDelete}
              onRequestAI={handleRequestAI}
            />
          </div>
        </div>
      </div>
    );
  }

  // Calendar screen
  return (
    <div className="min-h-screen bg-amber-50/60 flex flex-col items-center">
      <div className="w-full max-w-3xl">{loginButton}</div>

      <div className="flex justify-center px-4 pb-8 w-full">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-stone-700 tracking-tight">나의 일기</h1>
            <p className="text-sm text-stone-400 mt-1">날짜를 눌러 오늘을 기록해보세요</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4">
            <CalendarGrid
              year={displayedMonth.year}
              month={displayedMonth.month}
              markedDates={markedDates}
              selectedDate={undefined}
              today={TODAY}
              onDateClick={handleDateClick}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
