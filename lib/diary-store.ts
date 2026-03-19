"use client";

import { useState, useCallback, useEffect } from "react";

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
  // Start empty to match SSR, then hydrate from localStorage after mount
  const [entries, setEntries] = useState<DiaryEntries>({});

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

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
