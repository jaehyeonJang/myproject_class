"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoogleUser } from "@/lib/auth";

interface GoogleLoginButtonProps {
  isLoggedIn: boolean;
  user: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function GoogleLoginButton({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
}: GoogleLoginButtonProps) {
  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        {user && (
          <span
            aria-label={`사용자 이니셜: ${getInitials(user.name)}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold select-none"
          >
            {getInitials(user.name)}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLogout}
        >
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onLogin}
    >
      <LogIn className="w-4 h-4 mr-1" />
      구글로 로그인
    </Button>
  );
}
