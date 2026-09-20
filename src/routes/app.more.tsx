import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { usePlatform } from "@/lib/platform";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import {
  BookOpen,
  Building2,
  ChevronRight,
  ListTodo,
  LogOut,
  Receipt,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";

const LINKS = [
  { to: "/app/enquiries", label: "Enquiries", icon: Users },
  { to: "/app/quotes", label: "Quotes", icon: Receipt },
  { to: "/app/tasks", label: "Tasks", icon: ListTodo },
  { to: "/app/settings", label: "Business settings", icon: Building2 },
  { to: "/app/price-book", label: "Price book", icon: BookOpen },
  { to: "/app/job-types", label: "Job types", icon: Wrench },
] as const;

export const Route = createFileRoute("/app/more")({
  head: () => ({
    meta: [
      { title: "More | RCH PlumbFlow" },
      {
        name: "description",
        content: "Enquiries, quotes, tasks, business settings, price book and job types.",
      },
      { property: "og:title", content: "More | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Enquiries, quotes, tasks, business settings, price book and job types.",
      },
      { property: "og:url", content: "/more" },
    ],
    links: [{ rel: "canonical", href: "/more" }],
  }),
  component: More,
});

function More() {
  const { data, update, currentUser, isDemoData, clearAllData } = useStore();
  const { data: platform, currentAccount, logout } = usePlatform();
  const navigate = useNavigate();

  const displayName = currentAccount?.ownerName || currentUser.name;
  const businessName = currentAccount?.businessName || data.org.tradingName;

  return (
    <div>
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-5 text-paper">
        <h1 className="text-2xl font-semibold">More</h1>
        <p className="mt-1 text-base text-fog">Settings, team and links</p>
      </header>

      <main className="space-y-4 px-4 py-5">
        {/* Workspace data management */}
        {isDemoData ? (
          <section className="rounded-2xl border border-amber/40 bg-amber-wash/50 p-4">
            <h2 className="label-caps text-amber-deep">Demo Data Active</h2>
            <p className="mt-1 text-xs text-slate">
              This workspace contains sample records (Marie Osei, sample invoices). Clear demo data to start fresh with your real business data.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear demo data and start with an empty, real workspace?")) {
                  clearAllData();
                  toast.success("Demo data cleared! Workspace ready for real jobs.");
                }
              }}
              className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-slate transition cursor-pointer"
            >
              Clear Demo Data & Start Fresh
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-paper p-4">
            <h2 className="label-caps">Workspace Data</h2>
            <p className="mt-1 text-xs text-slate">
              Clean real workspace active for <strong>{businessName}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all workspace records to a fresh clean slate? This action cannot be undone.",
                  )
                ) {
                  clearAllData();
                  toast.success("Workspace reset to a clean slate.");
                }
              }}
              className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            >
              Reset Workspace Data
            </button>
          </section>
        )}

        <section className="divide-y divide-line rounded-2xl border border-line bg-paper">
          <Link
            to="/app/booking-page"
            className="tap flex items-center justify-between px-4 text-base font-semibold text-ink"
          >
            <span className="flex items-center gap-3">
              <Globe className="size-5 text-slate" aria-hidden />
              Your booking link
            </span>
            <ChevronRight className="size-5 text-slate" aria-hidden />
          </Link>
          <Link
            to="/app/price-book"
            className="tap flex items-center justify-between px-4 text-base font-semibold text-ink"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="size-5 text-slate" aria-hidden />
              Price book
            </span>
            <ChevronRight className="size-5 text-slate" aria-hidden />
          </Link>
          <Link
            to="/app/settings"
            className="tap flex items-center justify-between px-4 text-base font-semibold text-ink"
          >
            <span className="flex items-center gap-3">
              <Settings className="size-5 text-slate" aria-hidden />
              Settings
            </span>
            <ChevronRight className="size-5 text-slate" aria-hidden />
          </Link>
          {platform.isPlatformOwner ? (
            <Link
              to="/owner"
              className="tap flex items-center justify-between bg-amber-wash px-4 text-base font-semibold text-ink"
            >
              <span className="flex items-center gap-3">
                <ShieldAlert className="size-5 text-amber-deep" aria-hidden />
                Owner console
              </span>
              <ChevronRight className="size-5 text-amber-deep" aria-hidden />
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Signed in as</h2>
          <p className="mt-2 text-lg font-semibold text-ink">{displayName}</p>
          <p className="text-sm font-medium text-amber-deep">{businessName}</p>
          {currentAccount?.email ? (
            <p className="mt-0.5 text-xs text-slate">{currentAccount.email}</p>
          ) : null}
          <p className="mt-1 text-xs text-fog">{ROLE_LABELS[currentUser.role]}</p>
          <label htmlFor="role-switch" className="label-caps mt-4 block">
            Preview another role
          </label>
          <select
            id="role-switch"
            value={data.currentUserId}
            onChange={(event) =>
              update((draft) => {
                draft.currentUserId = event.target.value;
                return draft;
              })
            }
            className="tap mt-2 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink"
          >
            {data.team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}, {ROLE_LABELS[member.role as Role]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success("Signed out successfully.");
              navigate({ to: "/login" });
            }}
            className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-slate"
          >
            <LogOut className="size-5" aria-hidden />
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}
