import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ShieldCheck, Camera, BadgePoundSterling, Clock } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { telHref, tenantTowns } from "@/lib/tenants";
import { bookingHomeHead } from "@/lib/tenant-seo";

export const Route = createFileRoute("/book/$orgSlug/")({
  head: ({ params }) => bookingHomeHead(params.orgSlug),
  component: TenantHome,
});

function TenantHome() {
  const { orgSlug } = useParams({ from: "/book/$orgSlug/" });
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { account, profile } = tenant;

  const [problem, setProblem] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");

  function goToReport(prefill: { problem?: string; service?: string } = {}) {
    void navigate({
      to: "/book/$orgSlug/report",
      params: { orgSlug },
      search: {
        problem: prefill.problem ?? problem,
        postcode,
        phone,
        ...(prefill.service ? { service: prefill.service } : {}),
      },
    });
  }

  const credentialIcons = [ShieldCheck, BadgePoundSterling, Camera, Clock];
  const why = [
    ...(profile.credentials ?? []).map((text, index) => ({
      icon: credentialIcons[index % credentialIcons.length]!,
      text,
    })),
    profile.gasSafe ? { icon: ShieldCheck, text: profile.gasSafe } : null,
    profile.vatNumber ? { icon: BadgePoundSterling, text: "VAT registered business" } : null,
    profile.photosWithEveryJob ? { icon: Camera, text: "Photos of every job sent to you" } : null,
    profile.noFixNoFee ? { icon: Clock, text: "No call out charge if we cannot fix it" } : null,
  ].filter(Boolean) as Array<{ icon: typeof ShieldCheck; text: string }>;

  return (
    <main>
      <section className="bg-ink px-4 pt-6 pb-8 text-paper">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">
            {profile.hero?.headline ?? `${account.businessName}. ${profile.trade}.`}
          </h1>
          <p className="mt-3 text-lg text-fog">
            {profile.hero?.sub ?? "Tell us what has gone wrong and we will call you back."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => goToReport()}
              className="tap w-full rounded-xl bg-amber text-lg font-bold text-ink"
            >
              Report your problem
            </button>
            <a
              href={telHref(account.phone)}
              className="tap flex w-full items-center justify-center gap-2 rounded-xl border-2 border-paper text-lg font-bold text-paper"
            >
              <Phone className="size-5" aria-hidden /> Call now
            </a>
          </div>

          <p className="mt-3 text-base text-fog">
            {profile.hero?.reassurance ??
              `Covering ${profile.towns
                .slice(0, 3)
                .map((town) => town.name)
                .join(", ")}. ${profile.hours}.`}
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToReport();
            }}
            className="mt-5 space-y-3 rounded-2xl bg-paper p-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <label htmlFor="quick-problem" className="text-base font-semibold text-ink">
                What has gone wrong
              </label>
              <input
                id="quick-problem"
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
                placeholder="Water coming through the kitchen ceiling"
                className="tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="quick-postcode" className="text-base font-semibold text-ink">
                  Postcode
                </label>
                <input
                  id="quick-postcode"
                  value={postcode}
                  onChange={(event) => setPostcode(event.target.value)}
                  autoComplete="postal-code"
                  className="tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink uppercase"
                />
              </div>
              <div>
                <label htmlFor="quick-phone" className="text-base font-semibold text-ink">
                  Phone number
                </label>
                <input
                  id="quick-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink"
                />
              </div>
            </div>
            <button
              type="submit"
              className="tap w-full rounded-xl bg-amber text-lg font-bold text-ink"
            >
              Get help
            </button>
          </form>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">What we deal with</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              profile.problemCards ?? profile.problems.map((label) => ({ label, service: "" }))
            ).map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() =>
                  goToReport({
                    problem: card.label,
                    ...(card.service ? { service: card.service } : {}),
                  })
                }
                className="min-h-14 rounded-2xl border border-line bg-paper px-3 py-3 text-left text-base font-semibold text-ink"
              >
                {card.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {profile.waterAuthorityNote ? (
        <section className="bg-paper px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-2xl border-l-4 border-amber bg-surface p-5">
            <h2 className="text-2xl font-bold text-ink">Is it even your drain?</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate">{profile.waterAuthorityNote}</p>
          </div>
        </section>
      ) : null}

      {profile.rating ? (
        <section className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-ink">What customers say</h2>
            <p className="mt-3 text-lg text-slate tabular-nums">
              {profile.rating.value.toFixed(1)} out of 5, based on {profile.rating.count} Google
              reviews.
            </p>
            {profile.reviewsUrl ? (
              <a
                href={profile.reviewsUrl}
                rel="noopener"
                className="tap mt-2 inline-flex items-center text-lg font-semibold text-ink underline"
              >
                Read the reviews on Google
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="bg-paper px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">How it works</h2>
          <ol className="mt-4 space-y-3 text-lg text-slate">
            <li>1. Tell us what is wrong.</li>
            <li>2. We call you back and give you a price.</li>
            <li>3. We turn up and fix it.</li>
          </ol>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">Areas we cover</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tenantTowns(profile).map((town) => (
              <li key={town.slug}>
                <Link
                  to="/book/$orgSlug/areas/$townSlug"
                  params={{ orgSlug, townSlug: town.slug }}
                  className="flex min-h-12 items-center rounded-full border border-line bg-paper px-4 text-base text-ink"
                >
                  {town.name}, {town.prefix}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/book/$orgSlug/areas"
            params={{ orgSlug }}
            className="tap mt-4 inline-flex items-center text-lg font-semibold text-ink underline"
          >
            All areas we cover
          </Link>
        </div>
      </section>

      {why.length ? (
        <section className="bg-paper px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-ink">Why us</h2>
            <ul className="mt-4 space-y-3">
              {why.map((point) => (
                <li key={point.text} className="flex items-start gap-3 text-lg text-slate">
                  <point.icon className="mt-1 size-5 shrink-0 text-amber" aria-hidden />
                  {point.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
