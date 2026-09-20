import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { findTown, tenantTowns, telHref } from "@/lib/tenants";
import { areaHead } from "@/lib/tenant-seo";

export const Route = createFileRoute("/book/$orgSlug/areas/$townSlug")({
  head: ({ params }) => areaHead(params.orgSlug, params.townSlug),
  component: AreaPage,
});

function AreaPage() {
  const { orgSlug, townSlug } = useParams({ from: "/book/$orgSlug/areas/$townSlug" });
  const navigate = useNavigate();
  const { tenant, emergency } = useTenant();
  const { account, profile } = tenant;
  const towns = tenantTowns(profile);
  const town = findTown(profile, townSlug);
  const [selected, setSelected] = useState(town?.name ?? towns[0]?.name ?? "");

  if (!town) {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Area not found</h1>
        <Link
          to="/book/$orgSlug/areas"
          params={{ orgSlug }}
          className="tap mt-4 inline-flex items-center font-semibold text-ink underline"
        >
          See the areas we cover
        </Link>
      </main>
    );
  }

  const nearby = towns.filter((row) => row.slug !== town.slug).slice(0, 6);

  return (
    <main>
      <div
        className={
          emergency
            ? "sticky top-[64px] z-30 bg-emergency px-4 py-2 text-center text-base font-bold text-white"
            : "sticky top-[64px] z-30 bg-amber px-4 py-2 text-center text-base font-bold text-ink"
        }
      >
        Water pouring in?{" "}
        <a href={telHref(account.phone)} className="underline">
          Call now
        </a>
      </div>

      <section className="bg-ink px-4 pt-6 pb-8 text-paper">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">
            {account.businessName}, {profile.primaryService.toLowerCase()} in {town.name}
          </h1>
          {town.areaIntro ? (
            <p className="mt-4 text-lg leading-relaxed text-fog">{town.areaIntro}</p>
          ) : null}
          <p className="mt-3 text-lg text-fog">
            {town.prefix}. {profile.hours}.
          </p>

          <div className="mt-6 rounded-2xl bg-paper p-4 text-ink shadow-[var(--shadow-card)]">
            <h2 className="text-xl font-bold">Tell us what is wrong</h2>
            <label className="mt-3 block text-base font-semibold" htmlFor="area-town">
              Area
            </label>
            <select
              id="area-town"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base"
            >
              {towns.map((row) => (
                <option key={row.slug} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/book/$orgSlug/report",
                  params: { orgSlug },
                  search: { town: selected },
                })
              }
              className="tap mt-3 w-full rounded-xl bg-amber text-lg font-bold text-ink"
            >
              Report a problem
            </button>
            <a
              href={telHref(account.phone)}
              className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line text-lg font-bold text-ink"
            >
              <Phone className="size-5" aria-hidden /> Call {account.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">What we get called out for in {town.name}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.problems.map((problem) => (
              <li
                key={problem}
                className="rounded-2xl border border-line bg-paper px-4 py-3 text-lg font-semibold text-ink"
              >
                {problem}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {nearby.length ? (
        <section className="border-t border-line bg-surface px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-ink">Nearby areas</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {nearby.map((row) => (
                <li key={row.slug}>
                  <Link
                    to="/book/$orgSlug/areas/$townSlug"
                    params={{ orgSlug, townSlug: row.slug }}
                    className="tap inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-4 text-base font-semibold text-ink"
                  >
                    <MapPin className="size-4 text-amber" aria-hidden /> {row.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/book/$orgSlug"
                params={{ orgSlug }}
                className="tap inline-flex items-center text-lg font-semibold text-ink underline"
              >
                Back to {account.businessName}
              </Link>
              {profile.websiteUrl ? (
                <a
                  href={profile.websiteUrl}
                  rel="noopener"
                  className="tap inline-flex items-center text-lg font-semibold text-ink underline"
                >
                  More on our own website
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
