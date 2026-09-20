import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage, Section, PrimaryCta } from "@/components/marketing/Site";
import { usePlatform } from "@/lib/platform";

const TITLE = "FAQ, common questions about RCH PlumbFlow";
const DESCRIPTION =
  "Do I need to install anything? Can I use my own prices? What happens to my data? Straight answers about RCH PlumbFlow for plumbers.";

const QUESTIONS = [
  {
    q: "Do I need to install anything?",
    a: "No. It runs in the phone browser and adds to the home screen, so it sits next to your other apps without going anywhere near an app store. Nothing to update, nothing to reinstall when you change phone.",
  },
  {
    q: "Can I use my own prices?",
    a: "Yes, always. You load your price book, call-outs, labour rates, materials, and every quote is built from it. RCH PlumbFlow never sets your prices or takes a cut of a job.",
  },
  {
    q: "What happens to my data if I stop paying?",
    a: "It is retained. You lose access to the app, not the records. Pay again and everything is exactly where you left it, jobs, photos, quotes, invoices and history.",
  },
  {
    q: "Does it work with no signal?",
    a: "Active jobs stay readable in a cellar or a plant room. Photos and notes you take offline are queued and sync as soon as you get a bar back.",
  },
  {
    q: "Can I get my data out?",
    a: "Yes, export at any time, including after you cancel. It is your business's information.",
  },
  {
    q: "Who is this for?",
    a: "Solo plumbers and small firms, one van up to about ten. It is built for the person doing the work and the person doing the books, often the same person.",
  },
  {
    q: "Can my engineers see the money?",
    a: "Only if you let them. Engineers and subcontractors can be set up to see jobs and evidence without seeing prices, invoices or what the customer paid.",
  },
  {
    q: "How long does it take to set up?",
    a: "About ten minutes for business details and a starter price book. You can add customers as you go, there is no import project to get through first.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QUESTIONS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { data } = usePlatform();

  return (
    <MarketingPage>
      <section className="bg-ink px-4 py-16 text-paper">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Questions</h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">
            If yours isn&rsquo;t here, ring {data.settings.contactPhone} and ask.
          </p>
        </div>
      </section>

      <Section tone="paper">
        <dl className="space-y-5">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="border-b border-line pb-5">
              <dt className="text-xl font-semibold">{item.q}</dt>
              <dd className="mt-2 max-w-3xl text-[17px] leading-relaxed text-slate">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="surface">
        <h2 className="text-3xl font-semibold tracking-tight">Still deciding?</h2>
        <p className="mt-3 max-w-xl text-lg text-slate">
          {data.settings.trialDays} days free, no card, and you can{" "}
          <Link to="/contact" className="font-semibold text-amber-deep">
            talk to a human
          </Link>{" "}
          before you start.
        </p>
        <div className="mt-7">
          <PrimaryCta />
        </div>
      </Section>
    </MarketingPage>
  );
}
