"use client";

import { useState, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: object) => { requestAccessToken: () => void };
          revoke: (token: string, cb: () => void) => void;
        };
      };
    };
  }
}

export type GoogleUser = {
  name: string;
  email: string;
  picture?: string;
};

export function useGoogleAuth(initialLoggedIn?: boolean) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn ?? false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = useCallback(() => {
    // window.google이 없으면 (테스트/SSR) 스킵
    if (typeof window === "undefined" || !window.google) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      callback: (response: { access_token?: string }) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          setIsLoggedIn(true);
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${response.access_token}` },
          })
            .then((r) => r.json())
            .then((data) =>
              setUser({ name: data.name, email: data.email, picture: data.picture })
            )
            .catch(() => setUser({ name: "사용자", email: "" }));
        }
      },
    });
    client.requestAccessToken();
  }, []);

  const logout = useCallback(() => {
    if (accessToken && typeof window !== "undefined" && window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setIsLoggedIn(false);
    setUser(null);
    setAccessToken(null);
  }, [accessToken]);

  return { isLoggedIn, user, accessToken, login, logout };
}
