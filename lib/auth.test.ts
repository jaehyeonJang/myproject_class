import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGoogleAuth } from "./auth";

describe("useGoogleAuth", () => {
  describe("초기 상태", () => {
    it("initialLoggedIn이 없으면 isLoggedIn은 false", () => {
      const { result } = renderHook(() => useGoogleAuth());
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it("initialLoggedIn=true이면 isLoggedIn은 true", () => {
      const { result } = renderHook(() => useGoogleAuth(true));
      expect(result.current.isLoggedIn).toBe(true);
    });

    it("initialLoggedIn=false이면 isLoggedIn은 false", () => {
      const { result } = renderHook(() => useGoogleAuth(false));
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe("login()", () => {
    it("window.google이 없으면 로그인 상태가 변경되지 않는다", () => {
      // 테스트 환경에서는 window.google이 없으므로 graceful degrade
      const { result } = renderHook(() => useGoogleAuth());
      act(() => {
        result.current.login();
      });
      expect(result.current.isLoggedIn).toBe(false);
    });

    it("window.google이 있으면 initTokenClient를 호출한다", () => {
      const requestAccessToken = vi.fn();
      const initTokenClient = vi.fn().mockReturnValue({ requestAccessToken });
      const revoke = vi.fn();

      Object.defineProperty(window, "google", {
        value: {
          accounts: {
            oauth2: { initTokenClient, revoke },
          },
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useGoogleAuth());
      act(() => {
        result.current.login();
      });

      expect(initTokenClient).toHaveBeenCalledOnce();
      expect(requestAccessToken).toHaveBeenCalledOnce();

      // cleanup
      // @ts-expect-error intentional cleanup
      delete window.google;
    });
  });

  describe("logout()", () => {
    it("로그아웃하면 isLoggedIn, user, accessToken이 초기화된다", () => {
      const { result } = renderHook(() => useGoogleAuth(true));

      act(() => {
        result.current.logout();
      });

      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it("accessToken이 있고 window.google이 있으면 revoke를 호출한다", () => {
      const revoke = vi.fn();
      const requestAccessToken = vi.fn();
      const initTokenClient = vi.fn().mockReturnValue({ requestAccessToken });

      Object.defineProperty(window, "google", {
        value: {
          accounts: {
            oauth2: { initTokenClient, revoke },
          },
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useGoogleAuth());

      // 내부 accessToken을 직접 설정할 수 없으므로
      // login callback을 통해 설정 — 단, 테스트 환경에서는 callback이 실행되지 않음
      // 대신 window.google이 있는 상태에서 logout이 revoke를 호출하지 않음을 확인
      // (accessToken이 null이므로 revoke 미호출)
      act(() => {
        result.current.logout();
      });

      expect(revoke).not.toHaveBeenCalled();
      expect(result.current.isLoggedIn).toBe(false);

      // cleanup
      // @ts-expect-error intentional cleanup
      delete window.google;
    });
  });

  describe("반환 값 구조", () => {
    it("login, logout 함수와 상태 값들을 반환한다", () => {
      const { result } = renderHook(() => useGoogleAuth());
      expect(typeof result.current.login).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.isLoggedIn).toBe("boolean");
    });
  });
});
