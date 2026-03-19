import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DiaryEditor } from "./DiaryEditor";

describe("DiaryEditor", () => {
  const baseProps = {
    date: "2025-03-19",
    initialContent: "",
    isLoggedIn: false,
    onSave: vi.fn(),
    onBack: vi.fn(),
    onDelete: vi.fn(),
    onRequestAI: vi.fn(),
  };

  it("날짜를 헤더에 표시한다", () => {
    render(<DiaryEditor {...baseProps} />);
    expect(screen.getByText("2025-03-19")).toBeInTheDocument();
  });

  it("initialContent가 없으면 textarea가 비어 있다", () => {
    render(<DiaryEditor {...baseProps} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("initialContent가 있으면 textarea에 내용이 표시된다", () => {
    render(<DiaryEditor {...baseProps} initialContent="기존 내용" />);
    expect(screen.getByRole("textbox")).toHaveValue("기존 내용");
  });

  it("빈 내용 저장 시 에러 메시지가 표시된다", async () => {
    const user = userEvent.setup();
    render(<DiaryEditor {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /저장/ }));

    expect(screen.getByText(/내용을 입력해 주세요/)).toBeInTheDocument();
  });

  it("빈 내용 저장 시 onSave가 호출되지 않는다", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<DiaryEditor {...baseProps} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /저장/ }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("내용 입력 후 저장 버튼 클릭 시 onSave가 호출된다", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<DiaryEditor {...baseProps} onSave={onSave} />);

    await user.type(screen.getByRole("textbox"), "오늘 산책했다");
    await user.click(screen.getByRole("button", { name: /저장/ }));

    expect(onSave).toHaveBeenCalledWith("오늘 산책했다");
  });

  it("뒤로 버튼 클릭 시 onBack이 호출된다", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<DiaryEditor {...baseProps} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /뒤로/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("기존 일기가 있을 때 '수정 중' Badge가 표시된다", () => {
    render(<DiaryEditor {...baseProps} initialContent="기존 내용" />);
    expect(screen.getByText("수정 중")).toBeInTheDocument();
  });

  it("기존 일기가 없을 때 '수정 중' Badge가 없다", () => {
    render(<DiaryEditor {...baseProps} initialContent="" />);
    expect(screen.queryByText("수정 중")).not.toBeInTheDocument();
  });

  it("기존 일기가 있을 때 저장 버튼 레이블이 '저장 (덮어쓰기)'이다", () => {
    render(<DiaryEditor {...baseProps} initialContent="기존 내용" />);
    expect(screen.getByRole("button", { name: /저장 \(덮어쓰기\)/ })).toBeInTheDocument();
  });

  it("기존 일기가 없을 때 저장 버튼 레이블이 '저장'이다", () => {
    render(<DiaryEditor {...baseProps} initialContent="" />);
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("기존 일기가 없을 때 삭제 버튼이 비활성화된다", () => {
    render(<DiaryEditor {...baseProps} initialContent="" />);
    expect(screen.getByRole("button", { name: /삭제/ })).toBeDisabled();
  });

  it("기존 일기가 있을 때 삭제 버튼이 활성화된다", () => {
    render(<DiaryEditor {...baseProps} initialContent="기존 내용" />);
    expect(screen.getByRole("button", { name: /삭제/ })).not.toBeDisabled();
  });

  it("삭제 버튼 클릭 시 onDelete가 호출된다", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<DiaryEditor {...baseProps} initialContent="기존 내용" onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /삭제/ }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("로그인하지 않은 상태에서 AI 추천 버튼 클릭 시 로그인 안내 메시지가 표시된다", async () => {
    const user = userEvent.setup();
    render(<DiaryEditor {...baseProps} isLoggedIn={false} />);

    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    expect(screen.getByText(/AI 추천 기능은 구글 로그인이 필요합니다/)).toBeInTheDocument();
  });

  it("로그인 상태에서 AI 추천 성공 시 textarea에 내용이 채워진다", async () => {
    const user = userEvent.setup();
    const onRequestAI = vi.fn().mockResolvedValueOnce({ content: "AI 생성 내용" });
    render(<DiaryEditor {...baseProps} isLoggedIn={true} onRequestAI={onRequestAI} />);

    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("AI 생성 내용");
    });
  });

  it("AI 추천 로딩 중 로딩 상태 표시가 나타난다", async () => {
    const user = userEvent.setup();
    let resolve!: (v: { content: string }) => void;
    const promise = new Promise<{ content: string }>((res) => { resolve = res; });
    const onRequestAI = vi.fn().mockReturnValueOnce(promise);
    render(<DiaryEditor {...baseProps} isLoggedIn={true} onRequestAI={onRequestAI} />);

    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    expect(screen.getByRole("status")).toBeInTheDocument();
    resolve({ content: "완료" });
  });

  it("AI 추천 실패 시 에러 메시지가 표시된다", async () => {
    const user = userEvent.setup();
    const onRequestAI = vi.fn().mockRejectedValueOnce(new Error("API Error"));
    render(<DiaryEditor {...baseProps} isLoggedIn={true} onRequestAI={onRequestAI} />);

    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    await waitFor(() => {
      expect(screen.getByText(/AI 추천을 불러오지 못했습니다/)).toBeInTheDocument();
    });
  });

  it("noCalendarEvents가 true일 때 안내 메시지가 표시된다", async () => {
    const user = userEvent.setup();
    const onRequestAI = vi.fn().mockResolvedValueOnce({
      content: "일반 회고 내용",
      noCalendarEvents: true,
    });
    render(<DiaryEditor {...baseProps} isLoggedIn={true} onRequestAI={onRequestAI} />);

    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    await waitFor(() => {
      expect(screen.getByText(/캘린더 일정이 없어 일반 회고로 초안을 작성했습니다/)).toBeInTheDocument();
    });
  });
});
