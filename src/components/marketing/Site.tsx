import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/lib/platform";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function Wordmark({ tone = "paper" }: { tone?: "paper" | "ink" }) {
  return (
    <span
      className={cn(
        "text-lg font-semibold tracking-tight",
        tone === "paper" ? "text-paper" : "text-ink",
      )}
    >
      RCH Plumb<span className="text-amber">Flow</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-soft bg-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="tap flex items-center">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-fog hover:text-paper"
              activeProps={{ className: "text-paper" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold text-fog hover:text-paper"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex min-h-11 items-center rounded-lg bg-amber px-4 py-2 text-[15px] font-semibold text-ink"
          >
            Start free trial
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="tap -mr-2 p-2 text-paper md:hidden"
        >
          {open ? <Menu className="size-6 hidden" /> : null}
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-ink-soft px-4 pb-4 md:hidden">
          <ul className="flex flex-col">
            {[...NAV, { to: "/login", label: "Log in" } as const].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="tap block border-b border-ink-soft py-4 text-base font-semibold text-paper"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            onClick={() => setOpen(false)}
            className="tap mt-4 block rounded-lg bg-amber px-4 py-3 text-center text-base font-semibold text-ink"
          >
            Start free trial
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const { data } = usePlatform();
  const { contactEmail, contactPhone } = data.settings;

  return (
    <footer className="bg-ink px-4 py-12 text-fog">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed">
            Job management for plumbers. Built in Northamptonshire by a drainage firm that got sick
            of paperwork.
          </p>
        </div>

        <div>
          <h2 className="label-caps text-paper">Product</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 min-w-11 items-center hover:text-paper"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/signup"
                className="inline-flex min-h-11 min-w-11 items-center hover:text-paper"
              >
                Start free trial
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                className="inline-flex min-h-11 min-w-11 items-center hover:text-paper"
              >
                Log in
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="label-caps text-paper">Get in touch</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex min-h-11 min-w-11 items-center hover:text-paper"
              >
                {contactEmail}
              </a>
            </li>
            <li>
              <a
                href={`tel:${contactPhone.replace(/\s/g, "")}`}
                className="inline-flex min-h-11 min-w-11 items-center hover:text-paper"
              >
                {contactPhone}
              </a>
            </li>
            <li>Northampton, Northamptonshire</li>
          </ul>
          <p className="mt-4 text-[15px]">Privacy · Terms</p>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-5xl border-t border-ink-soft pt-6 text-[15px]">
        © {new Date().getFullYear()} RCH PlumbFlow. All rights reserved.
      </p>
    </footer>
  );
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Section({
  children,
  tone = "surface",
  className,
}: {
  children: ReactNode;
  tone?: "surface" | "paper" | "ink";
  className?: string;
}) {
  const tones = {
    surface: "bg-surface text-ink",
    paper: "bg-paper text-ink",
    ink: "bg-ink text-paper",
  } as const;
  return (
    <section className={cn("px-4 py-14 md:py-20", tones[tone], className)}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

export function PrimaryCta({ label = "Start free trial" }: { label?: string }) {
  return (
    <Link
      to="/signup"
      className="tap inline-flex items-center justify-center rounded-xl bg-amber px-6 py-4 text-lg font-semibold text-ink"
    >
      {label}
    </Link>
  );
}
