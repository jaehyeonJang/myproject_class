"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "diary:v1";

type DiaryEntries = Record<string, string>;

function loadEntries(): DiaryEntries {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiaryEntries) : {};
  } catch {
    return {};
  }
}

function persistEntries(entries: DiaryEntries): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // incognito / quota exceeded
  }
}

export function useDiaryStore() {
  // Lazy init: runs only once, avoids re-reading localStorage on every render
  const [entries, setEntries] = useState<DiaryEntries>(() => loadEntries());

  const save = useCallback((date: string, content: string) => {
    setEntries((prev) => {
      const next = { ...prev, [date]: content };
      persistEntries(next);
      return next;
    });
  }, []);

  const remove = useCallback((date: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[date];
      persistEntries(next);
      return next;
    });
  }, []);

  const get = useCallback(
    (date: string): string | undefined => {
      return entries[date];
    },
    [entries]
  );

  return { entries, save, remove, get };
}
