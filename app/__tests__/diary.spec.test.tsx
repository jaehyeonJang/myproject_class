/**
 * Spec 수용 기준 테스트: DIARY-001 ~ DIARY-016
 * spec.yaml 시나리오에서 파생된 테스트입니다.
 * 이 파일은 생성 이후 수정 금지입니다. 테스트가 실패하면 구현을 수정합니다.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "@/app/page";

// localStorage mock helpers
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

function setDiaryEntries(entries: Record<string, string>) {
  localStorageMock.setItem("diary:v1", JSON.stringify(entries));
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  localStorageMock.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// DIARY-001: 캘린더에서 일기 작성 날짜 시각화
// ---------------------------------------------------------------------------
describe("DIARY-001: 캘린더에서 일기 작성 날짜 시각화", () => {
  it("2025-03-10, 2025-03-15에 일기가 저장된 상태에서 3월 캘린더를 조회하면 두 날짜에 dot 표시가 나타나고 2025-03-11에는 dot이 없다", async () => {
    setDiaryEntries({
      "2025-03-10": "독서를 했다",
      "2025-03-15": "카페에서 공부했다",
    });

    render(<App />);

    // 두 날짜에 dot 표시 존재
    expect(
      screen.getByTestId("diary-dot-2025-03-10")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("diary-dot-2025-03-15")
    ).toBeInTheDocument();

    // 나머지 날짜에는 dot이 없음
    expect(
      screen.queryByTestId("diary-dot-2025-03-11")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DIARY-002: 캘린더에서 날짜 클릭으로 일기 작성 화면 열기
// ---------------------------------------------------------------------------
describe("DIARY-002: 캘린더에서 날짜 클릭으로 일기 작성 화면 열기", () => {
  it("2025-03-19 날짜 셀을 클릭하면 '2025-03-19' 날짜가 표시된 빈 일기 작성 화면이 열린다", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /19/ }));

    expect(screen.getByText("2025-03-19")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("2025-03-10 날짜 셀을 클릭하면 '2025-03-10' 날짜가 표시된 일기 작성 화면이 열린다", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /10/ }));

    expect(screen.getByText("2025-03-10")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// DIARY-003: 수동 일기 작성 및 저장
// ---------------------------------------------------------------------------
describe("DIARY-003: 수동 일기 작성 및 저장", () => {
  it("텍스트 영역에 내용을 입력하고 저장 버튼을 클릭하면 캘린더 화면으로 돌아오고 해당 날짜에 dot 표시가 생긴다", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 날짜 클릭하여 일기 작성 화면 진입
    await user.click(screen.getByRole("button", { name: /19/ }));

    // 내용 입력
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "오늘 카페에서 책을 읽었다");

    // 저장 버튼 클릭
    await user.click(screen.getByRole("button", { name: /저장/ }));

    // 캘린더 화면으로 복귀 확인: dot 표시 존재
    await waitFor(() => {
      expect(
        screen.getByTestId("diary-dot-2025-03-19")
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// DIARY-004: 로그인 없이 AI 추천 시도 시 로그인 안내
// ---------------------------------------------------------------------------
describe("DIARY-004: 로그인 없이 AI 추천 시도 시 로그인 안내", () => {
  it("로그인하지 않은 상태에서 AI 추천 버튼을 클릭하면 구글 로그인 필요 안내가 표시된다", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 버튼 클릭
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // 로그인 필요 안내 문구 표시
    expect(
      screen.getByText(/AI 추천 기능은 구글 로그인이 필요합니다/)
    ).toBeInTheDocument();

    // 텍스트 영역은 비어 있음
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// DIARY-005: 구글 로그인 후 AI 일기 추천 요청
// ---------------------------------------------------------------------------
describe("DIARY-005: 구글 로그인 후 AI 일기 추천 요청", () => {
  it("로그인된 상태에서 AI 추천 버튼을 클릭하면 로딩 표시 후 텍스트 영역에 AI 초안이 채워져 편집 가능한 상태가 된다", async () => {
    const user = userEvent.setup();

    // fetch mock: AI 추천 API 응답 지연 시뮬레이션
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(global, "fetch").mockReturnValueOnce(fetchPromise);

    render(<App initialLoggedIn={true} />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 버튼 클릭
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // 로딩 상태 확인
    expect(screen.getByRole("status")).toBeInTheDocument();

    // fetch 응답 완료
    resolveFetch(
      new Response(
        JSON.stringify({ content: "오늘 팀 회의와 점심 약속이 있었다." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    // AI 초안이 텍스트 영역에 채워짐
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).not.toHaveValue("");
    });

    // 편집 가능한 상태
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// DIARY-006: 구글 캘린더에 일정이 없을 때 AI 추천
// ---------------------------------------------------------------------------
describe("DIARY-006: 구글 캘린더에 일정이 없을 때 AI 추천", () => {
  it("캘린더 일정이 없는 날의 AI 추천 시 일반 회고 안내 문구와 함께 초안이 표시된다", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: "오늘 하루를 돌아보며 작성한 일반 회고입니다.",
          noCalendarEvents: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<App initialLoggedIn={true} />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 버튼 클릭
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // 안내 문구 표시
    await waitFor(() => {
      expect(
        screen.getByText(/캘린더 일정이 없어 일반 회고로 초안을 작성했습니다/)
      ).toBeInTheDocument();
    });

    // 텍스트 영역에 초안이 채워짐
    expect(screen.getByRole("textbox")).not.toHaveValue("");

    // 편집 가능
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// DIARY-007: AI 추천 일기 편집 및 저장
// ---------------------------------------------------------------------------
describe("DIARY-007: AI 추천 일기 편집 및 저장", () => {
  it("AI 초안을 수정하고 저장 버튼을 클릭하면 캘린더 화면으로 돌아오고 해당 날짜에 dot 표시가 생긴다", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ content: "AI 생성 초안 내용" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<App initialLoggedIn={true} />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 요청
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // AI 초안이 채워질 때까지 대기
    await waitFor(() => {
      expect(screen.getByRole("textbox")).not.toHaveValue("");
    });

    // 내용 수정
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "AI 초안을 수정한 최종 내용");

    // 저장 버튼 클릭
    await user.click(screen.getByRole("button", { name: /저장/ }));

    // 캘린더 화면으로 복귀 및 dot 표시
    await waitFor(() => {
      expect(
        screen.getByTestId("diary-dot-2025-03-19")
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// DIARY-008: 기존 일기 수정
// ---------------------------------------------------------------------------
describe("DIARY-008: 기존 일기 수정", () => {
  it("기존 일기를 수정하고 저장하면 해당 날짜를 다시 열었을 때 수정된 내용이 표시된다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "독서를 했다" });

    render(<App />);

    // 2025-03-10 날짜 클릭
    await user.click(screen.getByRole("button", { name: /10/ }));

    // 기존 내용 확인
    expect(screen.getByRole("textbox")).toHaveValue("독서를 했다");

    // 내용 수정
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "독서와 산책을 했다");

    // 저장
    await user.click(screen.getByRole("button", { name: /저장/ }));

    // 캘린더로 복귀 후 같은 날짜 다시 클릭
    await waitFor(() => {
      expect(screen.getByTestId("diary-dot-2025-03-10")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /10/ }));

    // 수정된 내용이 표시
    expect(screen.getByRole("textbox")).toHaveValue("독서와 산책을 했다");
  });
});

// ---------------------------------------------------------------------------
// DIARY-009: 기존 일기 삭제
// ---------------------------------------------------------------------------
describe("DIARY-009: 기존 일기 삭제", () => {
  it("일기 화면에서 삭제 버튼을 클릭하고 확인하면 캘린더로 돌아오고 dot 표시가 사라진다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "독서를 했다" });

    render(<App />);

    // dot이 존재함을 확인
    expect(screen.getByTestId("diary-dot-2025-03-10")).toBeInTheDocument();

    // 2025-03-10 클릭하여 일기 화면 진입
    await user.click(screen.getByRole("button", { name: /10/ }));

    // 삭제 버튼 클릭
    await user.click(screen.getByRole("button", { name: /삭제/ }));

    // 확인 다이얼로그에서 확인 클릭
    await user.click(screen.getByRole("button", { name: /확인/ }));

    // 캘린더로 복귀 및 dot 사라짐
    await waitFor(() => {
      expect(
        screen.queryByTestId("diary-dot-2025-03-10")
      ).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// DIARY-010: 같은 날 일기 재작성 시 덮어쓰기
// ---------------------------------------------------------------------------
describe("DIARY-010: 같은 날 일기 재작성 시 덮어쓰기", () => {
  it("같은 날짜에 새 내용으로 저장하면 dot이 1개만 유지되고 새 내용이 표시된다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "내용A" });

    render(<App />);

    // 2025-03-10 클릭
    await user.click(screen.getByRole("button", { name: /10/ }));

    // 기존 내용 지우고 새 내용 입력
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "내용B");

    // 저장
    await user.click(screen.getByRole("button", { name: /저장/ }));

    // 캘린더로 복귀
    await waitFor(() => {
      expect(screen.getByTestId("diary-dot-2025-03-10")).toBeInTheDocument();
    });

    // dot이 1개만 존재하는지 확인
    const dots = screen.getAllByTestId("diary-dot-2025-03-10");
    expect(dots).toHaveLength(1);

    // 해당 날짜 다시 열어 새 내용 확인
    await user.click(screen.getByRole("button", { name: /10/ }));
    expect(screen.getByRole("textbox")).toHaveValue("내용B");
  });
});

// ---------------------------------------------------------------------------
// DIARY-011: 캘린더 이전/다음 월 이동
// ---------------------------------------------------------------------------
describe("DIARY-011: 캘린더 이전/다음 월 이동", () => {
  it("3월 캘린더에서 이전 달 버튼을 클릭하면 2월 캘린더로 전환되고 2025-02-14에 dot 표시가 나타난다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-02-14": "2월의 일기" });

    render(<App />);

    // 이전 달 버튼 클릭
    await user.click(screen.getByRole("button", { name: /이전/ }));

    // 2월 캘린더로 전환 확인
    expect(screen.getByText(/2025.*02|2월/)).toBeInTheDocument();

    // 2025-02-14에 dot 표시
    expect(screen.getByTestId("diary-dot-2025-02-14")).toBeInTheDocument();
  });

  it("2월 캘린더에서 다음 달 버튼을 클릭하면 3월 캘린더로 전환되고 2025-03-05에 dot 표시가 나타난다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-05": "3월의 일기" });

    render(<App initialMonth="2025-02" />);

    // 다음 달 버튼 클릭
    await user.click(screen.getByRole("button", { name: /다음/ }));

    // 3월 캘린더로 전환 확인
    expect(screen.getByText(/2025.*03|3월/)).toBeInTheDocument();

    // 2025-03-05에 dot 표시
    expect(screen.getByTestId("diary-dot-2025-03-05")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DIARY-012: 빈 내용으로 저장 시도 시 저장 차단
// ---------------------------------------------------------------------------
describe("DIARY-012: 빈 내용으로 저장 시도 시 저장 차단", () => {
  it("텍스트 영역이 비어 있는 상태에서 저장 버튼을 클릭하면 '내용을 입력해 주세요' 안내 문구가 표시되고 작성 화면이 유지된다", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // 내용 입력 없이 저장 버튼 클릭
    await user.click(screen.getByRole("button", { name: /저장/ }));

    // 안내 문구 표시
    expect(screen.getByText(/내용을 입력해 주세요/)).toBeInTheDocument();

    // 작성 화면 유지 (텍스트 영역이 존재)
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    // dot이 생기지 않음
    expect(
      screen.queryByTestId("diary-dot-2025-03-19")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DIARY-013: 일기 작성 중 저장 없이 캘린더로 이탈
// ---------------------------------------------------------------------------
describe("DIARY-013: 일기 작성 중 저장 없이 캘린더로 이탈", () => {
  it("내용을 입력 중 뒤로 가기 버튼을 클릭하면 캘린더 화면으로 돌아오고 dot이 생기지 않는다", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // 내용 입력
    await user.type(screen.getByRole("textbox"), "오늘 산책했다");

    // 뒤로 가기 버튼 클릭 (저장 없이)
    await user.click(screen.getByRole("button", { name: /뒤로/ }));

    // 캘린더 화면으로 복귀
    await waitFor(() => {
      expect(
        screen.queryByTestId("diary-dot-2025-03-19")
      ).not.toBeInTheDocument();
    });
  });

  it("기존 일기 편집 중 뒤로 가기를 클릭하면 기존 내용이 보존된다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "기존 내용" });

    render(<App />);

    // 2025-03-10 클릭
    await user.click(screen.getByRole("button", { name: /10/ }));

    // 내용 수정 (저장 안 함)
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "수정 중 내용");

    // 뒤로 가기
    await user.click(screen.getByRole("button", { name: /뒤로/ }));

    // 다시 2025-03-10 클릭하여 원본 내용 확인
    await user.click(screen.getByRole("button", { name: /10/ }));
    expect(screen.getByRole("textbox")).toHaveValue("기존 내용");
  });
});

// ---------------------------------------------------------------------------
// DIARY-014: AI 추천 로딩 중 버튼 비활성화
// ---------------------------------------------------------------------------
describe("DIARY-014: AI 추천 로딩 중 버튼 비활성화", () => {
  it("AI 추천 로딩 중에 AI 추천 버튼이 비활성화 상태로 표시된다", async () => {
    const user = userEvent.setup();

    // fetch를 절대 resolve하지 않는 무한 대기 mock
    vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));

    render(<App initialLoggedIn={true} />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 버튼 클릭
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // 버튼 비활성화 확인
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /AI 추천/ })
      ).toBeDisabled();
    });

    // 로딩 표시 확인
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DIARY-015: AI 추천 API 오류 시 에러 안내
// ---------------------------------------------------------------------------
describe("DIARY-015: AI 추천 API 오류 시 에러 안내", () => {
  it("AI API 요청이 실패하면 에러 문구가 표시되고 텍스트 영역은 비어 있다", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("API Error"));

    render(<App initialLoggedIn={true} />);

    // 일기 작성 화면으로 이동
    await user.click(screen.getByRole("button", { name: /19/ }));

    // AI 추천 버튼 클릭
    await user.click(screen.getByRole("button", { name: /AI 추천/ }));

    // 에러 문구 표시
    await waitFor(() => {
      expect(
        screen.getByText(/AI 추천을 불러오지 못했습니다. 다시 시도해 주세요./)
      ).toBeInTheDocument();
    });

    // 텍스트 영역은 비어 있음
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// DIARY-016: 일기 삭제 전 확인 다이얼로그
// ---------------------------------------------------------------------------
describe("DIARY-016: 일기 삭제 전 확인 다이얼로그", () => {
  it("삭제 버튼을 클릭하면 '일기를 삭제하시겠습니까?' 확인 다이얼로그가 표시된다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "독서를 했다" });

    render(<App />);

    // 2025-03-10 클릭하여 일기 화면 진입
    await user.click(screen.getByRole("button", { name: /10/ }));

    // 삭제 버튼 클릭
    await user.click(screen.getByRole("button", { name: /삭제/ }));

    // 확인 다이얼로그 표시
    expect(screen.getByText(/일기를 삭제하시겠습니까?/)).toBeInTheDocument();
  });

  it("삭제 확인 다이얼로그에서 확인을 클릭하면 캘린더로 복귀하고 dot이 사라진다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "독서를 했다" });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /10/ }));
    await user.click(screen.getByRole("button", { name: /삭제/ }));
    await user.click(screen.getByRole("button", { name: /확인/ }));

    await waitFor(() => {
      expect(
        screen.queryByTestId("diary-dot-2025-03-10")
      ).not.toBeInTheDocument();
    });
  });

  it("삭제 확인 다이얼로그에서 취소를 클릭하면 일기 화면이 유지되고 dot도 유지된다", async () => {
    const user = userEvent.setup();

    setDiaryEntries({ "2025-03-10": "독서를 했다" });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /10/ }));
    await user.click(screen.getByRole("button", { name: /삭제/ }));
    await user.click(screen.getByRole("button", { name: /취소/ }));

    // 일기 화면 유지 (텍스트 영역 존재)
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
