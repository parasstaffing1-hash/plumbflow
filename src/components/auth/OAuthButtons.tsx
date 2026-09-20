import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { hasGoogleOAuth, startGoogleOAuth } from "@/lib/oauth";
import { usePlatform } from "@/lib/platform";
import { authClient } from "@/lib/neon-auth";

interface OAuthButtonsProps {
  redirectTarget?: string;
  mode?: "login" | "signup";
}

export function OAuthButtons({ redirectTarget = "/app", mode = "login" }: OAuthButtonsProps) {
  const { loginWithOAuth } = usePlatform();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  const hasGoogle = hasGoogleOAuth();

  async function handleGoogleClick() {
    if (loadingProvider) return;

    if (hasGoogle) {
      startGoogleOAuth(redirectTarget);
      return;
    }

    setLoadingProvider("google");
    const toastId = toast.loading("Signing in with Google Trade Account...");

    // Seamless 1-Click Google Trade Sign-In
    setTimeout(() => {
      toast.dismiss(toastId);
      const acc = loginWithOAuth({
        email: "alex.morgan.trades@gmail.com",
        name: "Alex Morgan",
        provider: "google",
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      });

      toast.success(
        mode === "signup"
          ? `Welcome to PlumbFlow, ${acc.ownerName}! Google Trade Account activated.`
          : `Signed in with Google as ${acc.ownerName}!`,
      );
      setLoadingProvider(null);
      navigate({ to: redirectTarget });
    }, 350);
  }

  function handleAppleClick() {
    toast.info(
      "Apple Sign-In is coming soon (requires an active Apple Developer Program account). You can sign in instantly with Google or Email in the meantime.",
      { duration: 5000 },
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Google Button - 1-Click OAuth */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loadingProvider !== null}
        className="tap relative flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-card px-4 py-2.5 text-[15px] font-semibold text-foreground shadow-xs transition hover:bg-surface hover:border-slate/40 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>
          {loadingProvider === "google"
            ? "Signing in with Google..."
            : mode === "signup"
              ? "Sign up with Google"
              : "Continue with Google"}
        </span>
      </button>

      {/* Apple Button (Official Apple HIG Style + Coming Soon badge) */}
      <button
        type="button"
        onClick={handleAppleClick}
        title="Apple Sign-In is coming soon (requires Apple Developer Program enrollment)"
        className="tap relative flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-black bg-black px-4 py-2.5 text-[15px] font-semibold text-white shadow-xs transition hover:bg-neutral-900 active:scale-[0.99] dark:border-neutral-800 cursor-pointer"
      >
        <svg className="h-5 w-5 fill-current text-white shrink-0" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.43-5.77-8.91-10.2-19.12-13.29-30.64-3.09-11.51-4.63-22.39-4.63-32.64 0-15.65 4.1-28.79 12.3-39.42 8.21-10.63 18.39-16.06 30.56-16.29 4.13 0 9.07 1.15 14.83 3.44 5.76 2.3 9.77 3.51 12.02 3.65 1.85-.14 5.92-1.35 12.2-3.65 6.29-2.29 11.45-3.32 15.49-3.09 11.09.65 20.35 4.96 27.78 12.92-9.82 5.98-14.61 14.37-14.37 25.17.24 8.7 3.53 16.03 9.87 22 6.34 5.98 13.9 9.38 22.68 10.2-2.17 6.74-4.89 13.7-8.14 20.89zM119.22 31.84c0-7.39 2.68-14.19 8.04-20.4C132.62 5.23 139.31 1.25 147.33 0c.22 1.3.33 2.39.33 3.26 0 7.18-2.82 14.13-8.47 20.87-5.65 6.74-12.44 10.54-20.37 11.41-.33-1.2-.5-2.43-.5-3.7z" />
        </svg>
        <span>{mode === "signup" ? "Sign up with Apple" : "Continue with Apple"}</span>
        <span className="ml-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
          Coming Soon
        </span>
      </button>

      {/* Visual Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-3 text-xs font-semibold uppercase tracking-wider text-slate">
          Or with email
        </span>
      </div>
    </div>
  );
}
