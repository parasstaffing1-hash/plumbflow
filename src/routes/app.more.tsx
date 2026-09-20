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
  const { data, update, currentUser } = useStore();
  const { data: platform, currentAccount, logout } = usePlatform();
  const navigate = useNavigate();

  const displayName = currentAccount?.ownerName || currentUser.name;
  const businessName = currentAccount?.businessName || data.org.tradingName;

  return (
    <div>
      <PageHeader title="More" subtitle="Everything else in the business" />
      <main className="space-y-5 px-4 py-5">
        <section className="space-y-3">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="tap flex w-full items-center justify-between rounded-2xl border border-line bg-paper px-4 text-lg font-semibold text-ink"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-5 text-fog" aria-hidden />
                {label}
              </span>
              <ChevronRight className="size-5 text-fog" aria-hidden />
            </Link>
          ))}
          {platform.isPlatformOwner ? (
            <Link
              to="/owner"
              className="tap flex w-full items-center justify-between rounded-2xl border border-amber bg-amber-wash px-4 text-lg font-semibold text-ink"
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
