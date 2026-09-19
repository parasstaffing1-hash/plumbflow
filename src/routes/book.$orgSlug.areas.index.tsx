import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { tenantTowns, telHref } from "@/lib/tenants";
import { areaIndexHead } from "@/lib/tenant-seo";

export const Route = createFileRoute("/book/$orgSlug/areas/")({
  head: ({ params }) => areaIndexHead(params.orgSlug),
  component: AreaIndex,
});

function AreaIndex() {
  const { orgSlug } = useParams({ from: "/book/$orgSlug/areas/" });
  const { tenant } = useTenant();
  const { account, profile } = tenant;
  const towns = tenantTowns(profile);

  return (
    <main>
      <section className="bg-ink px-4 pt-6 pb-8 text-paper">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">
            Areas {account.businessName} covers
          </h1>
          <p className="mt-3 text-lg text-fog">
            {profile.primaryService} across {profile.serviceArea}. {profile.hours}.
          </p>
          <a
            href={telHref(account.phone)}
            className="tap mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber text-lg font-bold text-ink sm:w-auto sm:px-6"
          >
            <Phone className="size-5" aria-hidden /> Call {account.phone}
          </a>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <ul className="grid gap-3 sm:grid-cols-2">
            {towns.map((town) => (
              <li key={town.slug}>
                <Link
                  to="/book/$orgSlug/areas/$townSlug"
                  params={{ orgSlug, townSlug: town.slug }}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-base font-semibold text-ink"
                >
                  <MapPin className="size-5 shrink-0 text-amber" aria-hidden />
                  <span>
                    {town.name}
                    <span className="block text-base font-normal text-slate">{town.prefix}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/book/$orgSlug"
            params={{ orgSlug }}
            className="tap mt-6 inline-flex items-center text-lg font-semibold text-ink underline"
          >
            Back to {account.businessName}
          </Link>
        </div>
      </section>
    </main>
  );
}
