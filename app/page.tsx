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
    // Editor screen: split layout with MiniCalendar on left and DiaryEditor on right
    return (
      <div className="min-h-screen flex flex-col">
        {/* Google login button - independent, outside calendar card */}
        {loginButton}

        <div className="flex flex-1 gap-6 px-4 pb-4">
          {/* Mini calendar - fixed 168px */}
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
          <div className="flex-1">
            <DiaryEditor
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
    <div className="min-h-screen flex flex-col">
      {/* Google login button - independent, outside calendar card */}
      {loginButton}

      <div className="flex justify-center px-4 pb-4">
        <div className="w-full max-w-[480px] border rounded-lg p-4">
          <h1 className="text-center font-bold text-lg mb-4">오늘의 일기</h1>
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
          <p className="text-center text-sm text-muted-foreground mt-4">
            날짜를 클릭하여 일기를 작성하세요
          </p>
        </div>
      </div>
    </div>
  );
}
