"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { ChevronLeft, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DiaryEditorProps {
  date: string; // "YYYY-MM-DD"
  initialContent: string;
  isLoggedIn: boolean;
  user?: { name: string } | null;
  onSave: (content: string) => void;
  onBack: () => void;
  onDelete?: () => void;
  onRequestAI?: () => Promise<{ content: string; noCalendarEvents?: boolean }>;
}

function formatDate(dateStr: string): { year: string; month: string; day: string; weekday: string } {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
    weekday: weekdays[d.getDay()],
  };
}

export function DiaryEditor({
  date,
  initialContent,
  isLoggedIn,
  user,
  onSave,
  onBack,
  onDelete,
  onRequestAI,
}: DiaryEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiDraftLoaded, setAiDraftLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const aiRequestInFlightRef = useRef(false);

  const isEditing = initialContent.length > 0;
  const { year, month, day, weekday } = formatDate(date);

  const handleSave = useCallback(() => {
    if (content.trim() === "") {
      setError("내용을 입력해 주세요");
      return;
    }
    setError(null);
    onSave(content);
  }, [content, onSave]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete?.();
    setIsDeleteDialogOpen(false);
  }, [onDelete]);

  const handleAI = useCallback(() => {
    if (isPending || aiRequestInFlightRef.current) return;
    if (!isLoggedIn) {
      setAiMessage("AI 추천 기능은 구글 로그인이 필요합니다");
      return;
    }
    if (!onRequestAI) return;

    aiRequestInFlightRef.current = true;
    startTransition(async () => {
      try {
        const result = await onRequestAI();
        setContent(result.content);
        setAiDraftLoaded(true);
        if (result.noCalendarEvents) {
          setAiMessage("캘린더 일정이 없어 일반 회고로 초안을 작성했습니다");
        } else {
          setAiMessage(null);
        }
      } catch {
        setAiMessage("AI 추천을 불러오지 못했습니다. 다시 시도해 주세요.");
      } finally {
        aiRequestInFlightRef.current = false;
      }
    });
  }, [isPending, isLoggedIn, onRequestAI]);

  const aiButtonLabel = aiDraftLoaded ? "AI 재생성" : "AI 추천";

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="뒤로"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-2">
          {isLoggedIn && user && (
            <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-semibold">
              {user.name?.split(" ").filter(p => p.length > 0).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?"}
            </div>
          )}
          {isEditing && (
            <button
              type="button"
              aria-label="삭제"
              onClick={handleDeleteClick}
              className="text-stone-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Paper card */}
      <div className="bg-[#fffdf7] border border-amber-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        {/* Date heading */}
        <div className="border-b border-amber-100 pb-3">
          <p className="text-xs text-stone-400 tracking-widest uppercase">{year}</p>
          <h2 className="text-2xl font-semibold text-stone-700">
            {month}월 {day}일 <span className="text-lg font-normal text-stone-400">{weekday}요일</span>
          </h2>
        </div>

        {/* AI loading skeleton */}
        {isPending && (
          <div role="status" aria-label="로딩 중" className="space-y-2">
            <Skeleton className="h-3 w-full bg-amber-100" />
            <Skeleton className="h-3 w-full bg-amber-100" />
            <Skeleton className="h-3 w-3/4 bg-amber-100" />
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (error) setError(null);
          }}
          placeholder="오늘 하루를 기록해 보세요..."
          aria-label="일기 내용"
          className={[
            isPending ? "hidden" : "",
            "w-full min-h-[120px] resize-none bg-transparent",
            "text-stone-700 text-sm leading-relaxed font-serif",
            "placeholder:text-stone-300",
            "outline-none border-none focus:ring-0",
          ].join(" ")}
        />

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}
      </div>

      {/* AI message */}
      {aiMessage && (
        <div className="flex items-start gap-2 text-xs text-stone-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>{aiMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleAI}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {aiButtonLabel}
        </Button>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
        >
          {isEditing ? "수정 저장" : "저장하기"}
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 일기는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
