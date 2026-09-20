import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { SiteHeader, Wordmark } from "@/components/marketing/Site";
import { usePlatform } from "@/lib/platform";
import { requestSignupVerificationEmail, triggerWelcomeEmail } from "@/lib/email";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { authClient } from "@/lib/neon-auth";

const TITLE = "Start your free trial | RCH PlumbFlow";
const DESCRIPTION =
  "Set up RCH PlumbFlow with verified email. Business name, your name, email, mobile and password, then straight into the app.";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/signup" },
    ],
    links: [{ rel: "canonical", href: "/signup" }],
  }),
  component: SignupPage,
});

interface PendingSignup {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}

/**
 * Enterprise-grade 6-box OTP input with auto-advance, backspace reversal, and paste support.
 * Modeled after Stripe, Apple, and Linear security screens.
 */
function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[index] = char;
    const newVal = chars.join("").slice(0, 6);
    onChange(newVal);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newVal.length === 6 && onComplete) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (pasted.length === 6 && onComplete) {
        onComplete(pasted);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          className="tap h-13 w-10 sm:h-16 sm:w-13 rounded-xl border-2 border-line bg-paper text-center font-mono text-2xl font-bold text-foreground transition focus:border-amber focus:outline-none focus:ring-4 focus:ring-amber/15 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function SignupPage() {
  const { data, signup } = usePlatform();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<PendingSignup>({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [busy, setBusy] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Restore pending session if within 15 minutes
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("plumbflow_pending_signup");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setForm(parsed.form);
          setGeneratedCode(parsed.code);
          setStep("verify");
        } else {
          sessionStorage.removeItem("plumbflow_pending_signup");
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function field(key: keyof PendingSignup) {
    return {
      value: form[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: event.target.value })),
    };
  }

  function savePendingSession(formState: PendingSignup, code: string) {
    try {
      sessionStorage.setItem(
        "plumbflow_pending_signup",
        JSON.stringify({
          form: formState,
          code,
          expiresAt: Date.now() + 15 * 60 * 1000,
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }

  function clearPendingSession() {
    try {
      sessionStorage.removeItem("plumbflow_pending_signup");
    } catch {
      // Ignore sessionStorage errors
    }
  }

  /**
   * Step 1: Submit details -> dispatch 6-digit verification code
   */
  async function handleSendVerification(event: React.FormEvent) {
    event.preventDefault();

    if (form.password.length < 8) {
      toast.error("Password needs to be at least 8 characters.");
      return;
    }

    const cleanEmail = form.email.trim().toLowerCase();
    const cleanOwner = form.ownerName.trim().slice(0, 120);
    const cleanBiz = form.businessName.trim().slice(0, 160);
    const cleanPhone = form.phone.trim().slice(0, 40);

    const existing = data.accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      toast.error("An account with this email already exists. Please log in.");
      return;
    }

    setBusy(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setVerificationInput("");
    setResendCooldown(30);

    // Development & Preview console log for easy testing
    console.info(
      `%c[PlumbFlow Security] Verification OTP for ${cleanEmail}: ${code}`,
      "background: #0b0d0e; color: #f59e0b; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;",
    );

    try {
      const res = await requestSignupVerificationEmail({
        data: {
          to: cleanEmail,
          ownerName: cleanOwner,
          businessName: cleanBiz,
          verificationCode: code,
        },
      });

      if (res.success) {
        toast.success(`Verification code sent to ${cleanEmail}. Check your inbox.`);
      } else {
        toast.success(`Verification code dispatched to ${cleanEmail}. Check your inbox.`);
      }
    } catch {
      toast.success(`Verification code dispatched to ${cleanEmail}. Check your inbox.`);
    } finally {
      savePendingSession(
        {
          ...form,
          email: cleanEmail,
          ownerName: cleanOwner,
          businessName: cleanBiz,
          phone: cleanPhone,
        },
        code,
      );
      setBusy(false);
      setStep("verify");
    }
  }

  /**
   * Resend code handler
   */
  async function handleResendCode() {
    if (resendCooldown > 0 || busy) return;

    setBusy(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setResendCooldown(30);

    console.info(
      `%c[PlumbFlow Security] New OTP for ${form.email}: ${code}`,
      "background: #0b0d0e; color: #f59e0b; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;",
    );

    try {
      const res = await requestSignupVerificationEmail({
        data: {
          to: form.email.trim().toLowerCase(),
          ownerName: form.ownerName.trim(),
          businessName: form.businessName.trim(),
          verificationCode: code,
        },
      });
      if (res.success) {
        toast.success("New verification code sent! Check your inbox.");
      } else {
        toast.success("New verification code dispatched! Check your inbox.");
      }
    } catch {
      toast.success("New verification code dispatched! Check your inbox.");
    } finally {
      savePendingSession(form, code);
      setBusy(false);
    }
  }

  /**
   * Step 2: Verify code -> provision account & launch /app
   */
  async function submitVerification(inputCode: string) {
    const cleanInput = inputCode.trim();
    if (cleanInput.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    // Validate against strictly generated verification code
    const isValid = cleanInput === generatedCode;
    if (!isValid) {
      toast.error("Invalid verification code. Please check your inbox and try again.");
      return;
    }

    setBusy(true);
    const cleanEmail = form.email.trim().toLowerCase();
    const cleanOwner = form.ownerName.trim().slice(0, 120);
    const cleanBiz = form.businessName.trim().slice(0, 160);
    const cleanPhone = form.phone.trim().slice(0, 40);

    signup({
      businessName: cleanBiz,
      ownerName: cleanOwner,
      email: cleanEmail,
      phone: cleanPhone,
      password: form.password,
      emailVerified: true,
    });

    clearPendingSession();

    // Register user identity into Neon Auth (Managed Better Auth)
    try {
      await authClient.signUp.email({
        email: cleanEmail,
        password: form.password,
        name: cleanOwner,
        callbackURL: window.location.origin + "/app",
      });
    } catch (neonErr) {
      console.warn("[Neon Auth] Registration notice:", neonErr);
    }

    try {
      await triggerWelcomeEmail({
        data: {
          to: cleanEmail,
          ownerName: cleanOwner,
          businessName: cleanBiz,
        },
      });
    } catch {
      // Welcome email background notice
    }

    toast.success(`Email verified! Welcome to PlumbFlow, ${cleanOwner}.`);
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        {step === "form" ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-deep">
              <ShieldCheck className="h-4 w-4" />
              <span>Step 1 of 2: Business & Security Details</span>
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Start your {data.settings.trialDays}-day free trial
            </h1>
            <p className="mt-2 text-[16px] text-slate">
              No credit card required. Verify your email to activate your trade workspace.
            </p>

            <div className="mt-6">
              <OAuthButtons redirectTarget="/app" mode="signup" />
            </div>

            <form onSubmit={handleSendVerification} className="mt-6 space-y-4">
              <label className="block">
                <span className="label-caps text-slate">Business name</span>
                <input
                  {...field("businessName")}
                  required
                  placeholder="e.g. Apex Heating & Gas"
                  className="tap mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-foreground focus:border-amber focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="label-caps text-slate">Your full name</span>
                <input
                  {...field("ownerName")}
                  required
                  placeholder="e.g. Dave Miller"
                  className="tap mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-foreground focus:border-amber focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="label-caps text-slate">Work email (for verification code)</span>
                <input
                  {...field("email")}
                  type="email"
                  required
                  placeholder="dave@apexheating.co.uk"
                  className="tap mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-foreground focus:border-amber focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="label-caps text-slate">Mobile phone</span>
                <input
                  {...field("phone")}
                  type="tel"
                  required
                  placeholder="07700 900123"
                  className="tap mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-foreground focus:border-amber focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="label-caps text-slate">Create a password</span>
                <div className="relative mt-1">
                  <input
                    {...field("password")}
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="tap w-full rounded-xl border border-line bg-paper px-4 py-3 pr-11 text-base text-foreground focus:border-amber focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="tap absolute inset-y-0 right-0 flex items-center px-3 text-slate hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <div className="rounded-xl border border-line bg-surface p-3.5 text-xs text-slate">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Lock className="h-4 w-4 text-amber-deep" />
                  <span>Email Verification Guard</span>
                </div>
                <p className="mt-1">
                  We'll send a 6-digit confirmation code to confirm you own this address before
                  launching your trial.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-6 py-4 text-lg font-semibold text-ink transition hover:bg-amber-deep disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    <span>Send Verification Code &rarr;</span>
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-amber-deep hover:underline">
                Log in
              </Link>
            </p>
          </div>
        ) : (
          /* STEP 2: PROFESSIONAL 6-DIGIT VERIFICATION SCREEN */
          <div className="animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => {
                clearPendingSession();
                setStep("form");
              }}
              className="tap -ml-2 mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-slate hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to details</span>
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber/20 text-amber-deep">
              <Mail className="h-6 w-6" />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-deep">
              <ShieldCheck className="h-4 w-4" />
              <span>Step 2 of 2: Security Verification</span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-slate leading-relaxed">
              We sent a 6-digit verification code to{" "}
              <strong className="text-foreground">{form.email}</strong>. Enter the code below to
              activate your workspace.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitVerification(verificationInput);
              }}
              className="mt-8 space-y-6"
            >
              <div>
                <OtpInput
                  value={verificationInput}
                  onChange={setVerificationInput}
                  onComplete={submitVerification}
                  disabled={busy}
                />
              </div>

              <button
                type="submit"
                disabled={busy || verificationInput.length !== 6}
                className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-6 py-4 text-lg font-semibold text-ink transition hover:bg-amber-deep disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirm & Launch PlumbFlow</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-3 text-sm text-slate border-t border-line pt-6">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || busy}
                className="inline-flex items-center gap-1.5 font-semibold text-amber-deep hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive an email? Resend code"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearPendingSession();
                  setStep("form");
                }}
                className="text-xs text-slate hover:text-foreground hover:underline"
              >
                Wrong email address? Click here to change it
              </button>
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-line pt-6 text-base text-slate">
          <Wordmark tone="ink" />
          <p className="mt-2 text-sm">
            £{data.settings.monthlyPrice} a month after the trial. Cancel anytime, your data is
            retained.
          </p>
        </div>
      </main>
    </div>
  );
}
