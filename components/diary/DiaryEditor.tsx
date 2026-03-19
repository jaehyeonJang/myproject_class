"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { ChevronLeft, Trash2, Sparkles, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  // Track in-flight request to prevent duplicate calls (transient, no re-render needed)
  const aiRequestInFlightRef = useRef(false);

  // Derived: is this an edit of existing diary?
  const isEditing = initialContent.length > 0;

  const handleSave = useCallback(() => {
    if (content.trim() === "") {
      setError("내용을 입력해 주세요");
      return;
    }
    setError(null);
    onSave(content);
  }, [content, onSave]);

  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

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
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="뒤로"
          onClick={handleBack}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>뒤로</span>
        </Button>

        <span className="flex-1 font-semibold text-base">{date}</span>

        {isLoggedIn && user && (
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {user.name?.split(" ").filter(p => p.length > 0).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
        )}

        {isEditing && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            수정 중
          </Badge>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="삭제"
          disabled={!isEditing}
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* AI loading skeleton */}
      {isPending && (
        <div role="status" aria-label="로딩 중" className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}

      {/* Textarea - always in DOM */}
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        placeholder="오늘 하루를 기록해 보세요..."
        className={isPending ? "sr-only" : "min-h-[200px] resize-none"}
        aria-label="일기 내용"
      />

      {/* Inline error */}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* AI message */}
      {aiMessage && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{aiMessage}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleAI}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          {aiButtonLabel}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
        >
          {isEditing ? "저장 (덮어쓰기)" : "저장"}
        </Button>
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
