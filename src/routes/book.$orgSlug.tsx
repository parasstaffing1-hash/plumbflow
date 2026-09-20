import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone } from "lucide-react";
import { usePlatform } from "@/lib/platform";
import { findTenant, telHref } from "@/lib/tenants";
import { TenantContext } from "@/lib/tenant-context";

export const Route = createFileRoute("/book/$orgSlug")({
  component: TenantLayout,
});

function TenantLayout() {
  const { orgSlug } = useParams({ from: "/book/$orgSlug" });
  const { data } = usePlatform();
  const [emergency, setEmergency] = useState(false);
  const tenant = useMemo(() => findTenant(data.accounts, orgSlug), [data.accounts, orgSlug]);

  const value = useMemo(
    () => (tenant ? { tenant, emergency, setEmergency } : null),
    [tenant, emergency],
  );

  if (!tenant || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold text-ink">Page not found</h1>
          <p className="mt-3 text-lg text-slate">
            We could not find a plumbing business at this address.
          </p>
        </div>
      </div>
    );
  }

  const { account, profile } = tenant;

  return (
    <TenantContext.Provider value={value}>
      <div className="min-h-screen bg-surface">
        <header
          className={
            emergency
              ? "sticky top-0 z-40 bg-emergency text-white"
              : "sticky top-0 z-40 bg-ink text-paper"
          }
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-bold tracking-tight">{account.businessName}</p>
            <a
              href={telHref(account.phone)}
              className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-emergency px-5 text-lg font-bold text-white sm:w-auto"
            >
              <Phone className="size-5" aria-hidden />
              Call now
            </a>
          </div>
        </header>

        <Outlet />

        <footer className="border-t border-line bg-paper px-4 py-8">
          <div className="mx-auto max-w-3xl space-y-2 text-base text-slate">
            <p className="text-lg font-bold text-ink">{account.businessName}</p>
            <p>
              <a
                href={telHref(account.phone)}
                className="tap inline-flex items-center font-semibold text-ink"
              >
                {account.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${account.email}`} className="tap inline-flex items-center">
                {account.email}
              </a>
            </p>
            {profile.address ? <p>{profile.address}</p> : null}
            <p>Covering {profile.serviceArea}</p>
            {profile.legalName ? <p>{profile.legalName}</p> : null}
            {profile.companyNumber ? <p>Company number {profile.companyNumber}</p> : null}
            {profile.registeredOffice ? <p>Registered office: {profile.registeredOffice}</p> : null}
            {profile.vatNumber ? <p>VAT number {profile.vatNumber}</p> : null}
            <p className="pt-4 text-[15px] text-fog">
              Powered by{" "}
              <Link to="/" className="underline">
                RCH PlumbFlow
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </TenantContext.Provider>
  );
}
