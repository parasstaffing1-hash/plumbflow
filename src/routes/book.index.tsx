import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { usePlatform } from "@/lib/platform";
import { TENANT_PROFILES, telHref } from "@/lib/tenants";

/*
 * Indexing is disabled on every /book and /embed route until the production
 * domain and real business data are in place. These pages carry demo trading
 * names, invented registration numbers and reserved phone numbers.
 */
export const Route = createFileRoute("/book/")({
  head: () => ({
    meta: [
      { title: "Booking pages | RCH PlumbFlow" },
      {
        name: "description",
        content:
          "Every business on RCH PlumbFlow gets a customer facing booking page. This index lists all of them.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Booking pages | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "The customer facing booking page for each business on the platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingIndex,
});

function BookingIndex() {
  const { data } = usePlatform();
  const tenants = data.accounts.filter((account) => TENANT_PROFILES[account.slug]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink px-4 py-8 text-paper">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight">Booking pages</h1>
          <p className="mt-3 text-lg text-fog">
            These are the customer facing pages, one per business on the platform. A homeowner uses
            them to report a problem and the enquiry lands in that plumber&rsquo;s app.
          </p>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
          {tenants.map((account) => {
            const profile = TENANT_PROFILES[account.slug]!;
            return (
              <div
                key={account.id}
                className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
              >
                <h2 className="text-xl font-bold text-ink">{account.businessName}</h2>
                <p className="mt-1 text-base text-slate">{profile.towns[0]?.name}</p>
                <p className="tabular mt-1 text-base text-slate">{account.phone}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/book/$orgSlug"
                    params={{ orgSlug: account.slug }}
                    className="tap inline-flex items-center rounded-xl bg-amber px-4 text-base font-bold text-ink"
                  >
                    Open booking page
                  </Link>
                  <a
                    href={telHref(account.phone)}
                    className="tap inline-flex items-center gap-2 rounded-xl border border-line px-4 text-base font-semibold text-ink"
                  >
                    <Phone className="size-4" aria-hidden /> Call
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
