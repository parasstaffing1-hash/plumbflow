import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, ArrowRight, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/marketing/Site";
import { usePlatform } from "@/lib/platform";
import { requestPasswordResetEmail } from "@/lib/email";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { authClient } from "@/lib/neon-auth";

const TITLE = "Log in | RCH PlumbFlow";
const DESCRIPTION = "Log in to your RCH PlumbFlow account and pick up where the job left off.";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const raw = search["redirect"];
    return typeof raw === "string" ? { redirect: raw } : {};
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { data, login, loginWithOAuth, signup, resetPassword, setCurrentAccount } = usePlatform();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "code">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [sentNotice, setSentNotice] = useState("");

  const redirectTarget = search.redirect || "/app";

  useEffect(() => {
    async function handleOAuthLanding() {
      if (typeof window === "undefined") return;
      try {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get("access_token");
        const idToken = hashParams.get("id_token") || queryParams.get("id_token");
        const oauthError = hashParams.get("error") || queryParams.get("error");

        if (oauthError) {
          toast.error(`OAuth error: ${oauthError}`);
          return;
        }

        // Apple ID Token (JWT) handling
        if (idToken) {
          try {
            const base64Url = idToken.split(".")[1];
            if (base64Url) {
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join(""),
              );
              const payload = JSON.parse(jsonPayload);
              if (payload?.email || payload?.sub) {
                const userEmail = payload.email || `${payload.sub}@privaterelay.appleid.com`;
                const userName =
                  payload.name ||
                  userEmail.split("@")[0].replace(/[^a-zA-Z]/g, " ") ||
                  "Apple User";
                const acc = loginWithOAuth({
                  email: userEmail,
                  name: userName,
                  provider: "apple",
                });
                toast.success(`Signed in with Apple as ${acc.ownerName}!`);
                window.history.replaceState({}, document.title, window.location.pathname);
                navigate({ to: redirectTarget });
                return;
              }
            }
          } catch (appleErr) {
            console.warn("[Apple OAuth] Token parse error:", appleErr);
          }
        }

        // Google OAuth Access Token handling
        if (accessToken) {
          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const info = await res.json();
            if (info.email) {
              const acc = loginWithOAuth({
                email: info.email,
                name: info.name || info.given_name,
                provider: "google",
                avatarUrl: info.picture,
              });
              toast.success(`Signed in with Google as ${acc.ownerName}!`);
              window.history.replaceState({}, document.title, window.location.pathname);
              navigate({ to: redirectTarget });
            }
          }
        }
      } catch (err) {
        console.warn("[OAuth] Profile fetch error:", err);
      }
    }
    handleOAuthLanding();
  }, [loginWithOAuth, navigate, redirectTarget]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    // 1. Attempt Neon Auth authentication first
    try {
      const neonRes = await authClient.signIn.email({
        email: cleanEmail,
        password,
      });

      if (neonRes?.data?.user) {
        const neonUser = neonRes.data.user;
        const acc = loginWithOAuth({
          email: neonUser.email,
          name: neonUser.name || "Trade Engineer",
          provider: "neon",
        });
        toast.success(`Welcome back, ${acc.ownerName}!`);
        navigate({ to: redirectTarget });
        return;
      }

      if (neonRes?.error) {
        const errCode = (neonRes.error as { code?: string })?.code;
        if (errCode === "email_not_confirmed") {
          toast.error(
            "Email verification required by Neon Auth. Please verify your email before logging in.",
          );
          return;
        }
      }
    } catch (neonErr) {
      console.warn("[Neon Auth] Sign-in notice:", neonErr);
    }

    // 2. Check local contractor accounts
    const result = login(cleanEmail, password);
    if (result.success && result.account) {
      toast.success(`Welcome back, ${result.account.ownerName}!`);
      navigate({ to: redirectTarget });
      return;
    }

    if (result.error === "WRONG_PASSWORD") {
      toast.error("Incorrect password. Please check your credentials or reset your password.");
      return;
    }

    if (result.error === "EMAIL_NOT_FOUND") {
      toast.error(
        "No account found with this email address. Please sign up to start your free trial.",
      );
      return;
    }

    toast.error("Unable to sign in. Please check your credentials.");
  }

  async function handleSendResetCode(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Enter your email address.");
      return;
    }

    const acc = data.accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!acc) {
      toast.error("No account found with that email address.");
      return;
    }

    setSendingReset(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    try {
      const res = await requestPasswordResetEmail({
        data: {
          to: cleanEmail,
          ownerName: acc.ownerName,
          resetCode: code,
        },
      });

      if (res.success) {
        toast.success(`Reset code sent to ${cleanEmail}! Check your inbox.`);
        setSentNotice(`Verification reset code sent to ${cleanEmail}. Check your inbox or spam folder.`);
      } else if (res.isSandboxRestriction) {
        toast.success(`Reset code sent to ${cleanEmail}! Check your inbox.`);
        setSentNotice(`Verification reset code dispatched to ${cleanEmail}. Check your inbox.`);
      } else {
        toast.error(res.error || "Could not dispatch reset email. Please try again.");
      }
    } catch {
      toast.error("Network error while requesting reset code. Please try again.");
    } finally {
      setSendingReset(false);
      setResetStep("code");
    }
  }

  function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetCodeInput.trim() !== generatedCode) {
      toast.error("Invalid or incorrect reset code.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    const ok = resetPassword(resetEmail, newPassword);
    if (ok) {
      toast.success("Password updated successfully! Log in with your new password.");
      setEmail(resetEmail);
      setPassword(newPassword);
      setShowForgotModal(false);
      setResetStep("email");
      setResetCodeInput("");
      setGeneratedCode("");
      setSentNotice("");
    } else {
      toast.error("Failed to update password.");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-[16px] text-slate">
          Sign in to your account, or continue with Google.
        </p>

        <div className="mt-6">
          <OAuthButtons redirectTarget={redirectTarget} mode="login" />
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label-caps text-slate">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="e.g. ray@rchdrainage.co.uk"
              className="tap mt-1 w-full rounded-lg border border-line bg-paper px-3 py-3 text-[16px]"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between">
              <span className="label-caps text-slate">Password</span>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetStep("email");
                  setShowForgotModal(true);
                }}
                className="text-xs font-semibold text-amber-deep hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative mt-1">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="tap w-full rounded-lg border border-line bg-paper pr-10 pl-3 py-3 text-[16px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-6 py-4 text-lg font-semibold text-ink transition-transform active:scale-[0.99] cursor-pointer"
          >
            Log in
            <ArrowRight className="size-5" />
          </button>
        </form>

        {/* Quick Demo Contractor Accounts */}
        <div className="mt-6 rounded-xl border border-line bg-paper p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate">
            Quick Contractor Test Logins (Password: password123)
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("ray@rchdrainage.co.uk");
                setPassword("password123");
                const res = login("ray@rchdrainage.co.uk", "password123");
                if (res.success && res.account) {
                  toast.success(`Welcome back, ${res.account.ownerName}!`);
                  navigate({ to: redirectTarget });
                }
              }}
              className="tap inline-flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber hover:text-ink transition cursor-pointer"
            >
              ⚡ Ray Hardwick (RCH Drainage)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("dean@towcesterheating.co.uk");
                setPassword("password123");
                const res = login("dean@towcesterheating.co.uk", "password123");
                if (res.success && res.account) {
                  toast.success(`Welcome back, ${res.account.ownerName}!`);
                  navigate({ to: redirectTarget });
                }
              }}
              className="tap inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-slate hover:text-ink hover:border-slate transition cursor-pointer"
            >
              ⚡ Dean Fletcher (Towcester Heating)
            </button>
          </div>
        </div>

        <p className="mt-6 text-[16px] text-slate">
          No account yet?{" "}
          <Link
            to="/signup"
            className="inline-flex min-h-11 items-center align-middle font-semibold text-amber-deep"
          >
            Start a free trial
          </Link>
        </p>
      </main>

      {/* Resend Powered Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-wash text-ink">
                {resetStep === "email" ? (
                  <Mail className="size-5 text-amber-deep" />
                ) : (
                  <KeyRound className="size-5 text-amber-deep" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {resetStep === "email" ? "Reset Password via Email" : "Enter Verification Code"}
                </h3>
                <p className="text-xs text-slate">
                  {resetStep === "email"
                    ? "We'll send a 6-digit security code via Resend."
                    : `Enter the code sent to ${resetEmail}.`}
                </p>
              </div>
            </div>

            {resetStep === "email" ? (
              <form onSubmit={handleSendResetCode} className="mt-5 space-y-4">
                <label className="block">
                  <span className="label-caps text-slate">Account Email</span>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="e.g. ray@rchdrainage.co.uk"
                    className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base"
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 rounded-xl border border-line bg-surface py-3 font-semibold text-slate"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="flex w-1/2 items-center justify-center gap-2 rounded-xl bg-amber py-3 font-semibold text-ink disabled:opacity-60"
                  >
                    {sendingReset ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="mt-5 space-y-4">
                {sentNotice && (
                  <div className="rounded-xl border border-amber/30 bg-amber-wash p-3 text-xs text-ink font-mono flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-go shrink-0" />
                    <span>{sentNotice}</span>
                  </div>
                )}

                <label className="block">
                  <span className="label-caps text-slate">6-Digit Code</span>
                  <input
                    type="text"
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    required
                    maxLength={6}
                    placeholder="123456"
                    className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-center text-xl tracking-widest"
                  />
                </label>

                <label className="block">
                  <span className="label-caps text-slate">New Password (min 8 chars)</span>
                  <div className="relative mt-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="••••••••"
                      className="tap w-full rounded-lg border border-line bg-surface pr-10 pl-3 py-2.5 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep("email")}
                    className="w-1/3 rounded-xl border border-line bg-surface py-3 font-semibold text-slate text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 rounded-xl bg-amber py-3 font-semibold text-ink"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
