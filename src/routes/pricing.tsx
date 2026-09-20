import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingPage, Section, PrimaryCta } from "@/components/marketing/Site";
import { usePlatform } from "@/lib/platform";

const TITLE = "Pricing, £69 a month, everything included | RCH PlumbFlow";
const DESCRIPTION =
  "One plan, £69 per plumber per month. Every feature included, no per-job fees, no contract. Free trial, cancel anytime, your data is always yours.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

const INCLUDED = [
  "Enquiry inbox with emergency triage",
  "Your own price book, your own rates",
  "Quotes with deposits, locked on acceptance",
  "Job scheduling and on-site workflow",
  "Four-stage photo evidence (before, during, testing, after)",
  "JOB COMPLETE gate, nothing gets closed half-finished",
  "Completion pack PDF for every job",
  "Draft invoices generated from the job",
  "Payments, part payments and overdue tracking",
  "Customer and permanent property history",
  "Tasks and service reminders",
  "Voice dictation for notes",
  "Works offline, syncs when you reconnect",
  "Unlimited customers, jobs, quotes and photos",
  "Data export whenever you want it",
];

const BILLING_FAQ = [
  {
    q: "What happens if a payment fails?",
    a: "You keep working. The app shows an amber banner asking you to update the card, and we retry. Nothing is locked on the first failure.",
  },
  {
    q: "Do I lose my data if I cancel?",
    a: "No. Your jobs, photos, quotes and invoices are kept. You lose access to the app, not the records, and everything comes straight back if you restart.",
  },
  {
    q: "Can I export my data?",
    a: "Yes, at any time, including from the locked screen after cancelling.",
  },
  {
    q: "Is there a contract?",
    a: "No contract and no minimum term. It renews monthly on the card you have on file and you can stop it whenever you like.",
  },
  {
    q: "Is VAT included?",
    a: "VAT is added where applicable. If you are VAT registered you claim it back like any other tool.",
  },
];

function PricingPage() {
  const { data } = usePlatform();
  const { monthlyPrice, trialDays } = data.settings;

  return (
    <MarketingPage>
      <section className="bg-ink px-4 py-16 text-paper">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            One plan. £{monthlyPrice} a month.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">
            Per plumber, VAT where applicable. Everything is included, there is no bigger version of
            RCH PlumbFlow to upgrade to.
          </p>

          <div className="mt-10 max-w-md rounded-2xl border border-ink-soft bg-ink-soft p-6">
            <p className="text-5xl font-semibold tabular-nums">
              £{monthlyPrice}
              <span className="text-xl font-normal text-fog"> /month</span>
            </p>
            <ul className="mt-6 space-y-3 text-[16px]">
              {[
                "Everything included, no feature gating",
                "No per-job or per-invoice fees",
                `${trialDays} days free to try it properly`,
                "Card on file, renews automatically",
                "Cancel anytime, data retained",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <PrimaryCta />
            </div>
            <p className="mt-4 text-[15px] text-fog">
              Cheaper than one hour of billed labour a month.
            </p>
          </div>
        </div>
      </section>

      <Section tone="paper">
        <h2 className="text-3xl font-semibold tracking-tight">What you get</h2>
        <ul className="mt-8 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-3 border-b border-line pb-3 text-[16px]">
              <Check className="mt-0.5 size-5 shrink-0 text-go" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <h2 className="text-3xl font-semibold tracking-tight">Billing questions</h2>
        <dl className="mt-8 space-y-4">
          {BILLING_FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-line bg-paper p-5">
              <dt className="text-lg font-semibold">{item.q}</dt>
              <dd className="mt-1.5 text-[16px] leading-relaxed text-slate">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[16px] text-slate">
          Something else on your mind?{" "}
          <Link
            to="/contact"
            className="inline-flex min-h-11 items-center align-middle font-semibold text-amber-deep"
          >
            Ask us directly
          </Link>
          .
        </p>
      </Section>
    </MarketingPage>
  );
}
