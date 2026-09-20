import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage, Section, PrimaryCta } from "@/components/marketing/Site";
import { PhoneMock, ScreenToday } from "@/components/marketing/Screens";
import { usePlatform } from "@/lib/platform";
import { IMAGE_SLOTS } from "@/lib/image-slots";
import { AdminHoursChart } from "@/components/marketing/AdminHoursChart";

const TITLE = "RCH PlumbFlow, job software for plumbers | £69 a month";
const DESCRIPTION =
  "RCH PlumbFlow runs the admin side of a plumbing business from your phone: enquiries, quotes, on-site photos, completion packs and invoices. £69 a month.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "RCH PlumbFlow",
              url: "https://rchplumbflow.co.uk",
              email: "hello@rchplumbflow.co.uk",
              telephone: "+441604555019",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Northampton",
                addressRegion: "Northamptonshire",
                addressCountry: "GB",
              },
            },
            {
              "@type": "SoftwareApplication",
              name: "RCH PlumbFlow",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web browser",
              url: "https://rchplumbflow.co.uk",
              offers: {
                "@type": "Offer",
                price: "69",
                priceCurrency: "GBP",
                category: "Subscription",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

const PROBLEMS = [
  {
    title: "Enquiries you never got back to",
    body: "A missed call at 11am is a job someone else did by teatime. Nothing writes it down for you.",
  },
  {
    title: "Quotes that never got sent",
    body: "You priced it in your head on the drive home. Three days later it is still not typed up.",
  },
  {
    title: "Invoices chased on a Sunday",
    body: "Work finished a fortnight ago. You are sat at the kitchen table trying to remember what you fitted.",
  },
];

const JOURNEY = [
  { step: "Enquiry arrives", you: "nothing" },
  { step: "Emergency check", you: "one tap" },
  { step: "Quote, built from your own prices", you: "review and send" },
  { step: "Customer accepts, pays deposit", you: "nothing" },
  { step: "Book and prep", you: "confirm" },
  { step: "On site", you: "photos only" },
  { step: "JOB COMPLETE", you: "one button" },
  { step: "Invoice and completion pack", you: "generated for you" },
  { step: "Getting paid", you: "tracked automatically" },
];

const DIFFERENT = [
  {
    title: "Your prices, never ours",
    body: "You load your own price book. RCH PlumbFlow never decides what your labour is worth or marks up your materials.",
  },
  {
    title: "An evidence pack that protects you",
    body: "Before, during, testing and after photos, tied to the job. When a customer disputes the work six months on, you send one PDF.",
  },
  {
    title: "Permanent property history",
    body: "The record belongs to the address, not the customer. A call two years later comes with the boiler, the last three jobs and the access notes.",
  },
  {
    title: "Works on any phone",
    body: "It runs in the browser and adds to your home screen. No app store, no updates, no separate tablet in the van.",
  },
];

const FAQ_PREVIEW = [
  {
    q: "Do I need to install anything?",
    a: "No. It runs in your phone browser and adds to the home screen.",
  },
  { q: "Can I use my own prices?", a: "Yes, always. Your price book, your rates." },
  {
    q: "Does it work with no signal?",
    a: "Active jobs stay readable and changes sync when you reconnect.",
  },
  { q: "Is there a contract?", a: "No. £69 a month, cancel whenever you like." },
];

function HomePage() {
  const { data } = usePlatform();

  return (
    <MarketingPage>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink px-4 pt-12 pb-16 text-paper">
        <img
          src={IMAGE_SLOTS.heroBackdrop.src}
          alt={IMAGE_SLOTS.heroBackdrop.alt}
          width={IMAGE_SLOTS.heroBackdrop.width}
          height={IMAGE_SLOTS.heroBackdrop.height}
          aria-hidden
          fetchPriority="low"
          decoding="async"
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-15 md:w-3/5"
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl">
              From first enquiry to paid invoice. Without the paperwork.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-fog">
              RCH PlumbFlow runs the admin side of a plumbing business from your phone, so your
              evenings are yours again.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryCta />
              <a
                href="#how-it-works"
                className="tap inline-flex items-center justify-center rounded-xl border border-fog px-6 py-4 text-lg font-semibold text-paper"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-[15px] text-fog">
              £{data.settings.monthlyPrice} a month. {data.settings.trialDays} days free. No card
              needed to start.
            </p>
          </div>

          <div>
            <PhoneMock>
              <ScreenToday />
            </PhoneMock>
            <img
              src={IMAGE_SLOTS.heroPhoto.src}
              alt={IMAGE_SLOTS.heroPhoto.alt}
              width={IMAGE_SLOTS.heroPhoto.width}
              height={IMAGE_SLOTS.heroPhoto.height}
              decoding="async"
              className="mt-6 h-40 w-full rounded-2xl object-cover md:h-48"
            />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section tone="paper">
        <h2 className="text-3xl font-semibold tracking-tight">Where the money leaks out</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((item) => (
            <div key={item.title} className="rounded-xl border border-line bg-surface p-5">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2">
          <img
            src={IMAGE_SLOTS.moneyLeaksPhoto.src}
            alt={IMAGE_SLOTS.moneyLeaksPhoto.alt}
            width={IMAGE_SLOTS.moneyLeaksPhoto.width}
            height={IMAGE_SLOTS.moneyLeaksPhoto.height}
            loading="lazy"
            decoding="async"
            className="h-56 w-full rounded-xl object-cover md:h-full"
          />
          <AdminHoursChart />
        </div>
      </Section>

      {/* Journey */}
      <Section tone="surface" className="scroll-mt-16">
        <div id="how-it-works" className="scroll-mt-20">
          <h2 className="text-3xl font-semibold tracking-tight">
            Nine steps. You do four of them.
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-slate">
            This is the whole job, start to finish, and exactly what is left for you.
          </p>
          <ol className="relative mt-8 ml-[18px] border-l-2 border-dashed border-amber pl-6 md:ml-6 md:pl-8">
            {JOURNEY.map((row, index) => (
              <li key={row.step} className="relative pb-6 last:pb-0">
                <span className="absolute top-0 -left-[37px] flex size-9 items-center justify-center rounded-full bg-ink text-base font-semibold text-amber tabular-nums ring-4 ring-surface md:-left-[49px]">
                  {index + 1}
                </span>
                <div className="rounded-xl border border-line bg-paper p-4">
                  <p className="text-[17px] font-semibold">{row.step}</p>
                  <p className="text-[15px] text-slate">You: {row.you}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Why different */}
      <Section tone="paper">
        <h2 className="text-3xl font-semibold tracking-tight">Why plumbers stay on it</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-5 md:grid-cols-2">
            {DIFFERENT.map((item) => (
              <div key={item.title} className="border-l-4 border-amber pl-5">
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-slate">{item.body}</p>
              </div>
            ))}
          </div>
          <img
            src={IMAGE_SLOTS.vanPhoto.src}
            alt={IMAGE_SLOTS.vanPhoto.alt}
            width={IMAGE_SLOTS.vanPhoto.width}
            height={IMAGE_SLOTS.vanPhoto.height}
            loading="lazy"
            decoding="async"
            className="h-56 w-full rounded-xl object-cover md:h-full"
          />
        </div>
      </Section>

      {/* Pricing strip */}
      <Section tone="ink" className="relative isolate overflow-hidden">
        <img
          src={IMAGE_SLOTS.pricingBandBackdrop.src}
          alt={IMAGE_SLOTS.pricingBandBackdrop.alt}
          width={IMAGE_SLOTS.pricingBandBackdrop.width}
          height={IMAGE_SLOTS.pricingBandBackdrop.height}
          aria-hidden
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-10"
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-5xl font-semibold tracking-tight tabular-nums">
              £{data.settings.monthlyPrice}
              <span className="text-2xl font-normal text-fog"> /month</span>
            </p>
            <p className="mt-3 max-w-md text-lg text-fog">
              Everything included. One plumber, one price. Cancel anytime, less than an hour of
              billed labour a month.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <PrimaryCta />
            <Link
              to="/pricing"
              className="inline-flex min-h-11 items-center justify-center text-center text-[15px] font-semibold text-fog"
            >
              See what&rsquo;s included
            </Link>
          </div>
        </div>
      </Section>

      {/* FAQ preview */}
      <Section tone="surface">
        <h2 className="text-3xl font-semibold tracking-tight">Questions we get asked</h2>
        <dl className="mt-8 space-y-4">
          {FAQ_PREVIEW.map((item) => (
            <div key={item.q} className="rounded-xl border border-line bg-paper p-5">
              <dt className="text-lg font-semibold">{item.q}</dt>
              <dd className="mt-1.5 text-[16px] text-slate">{item.a}</dd>
            </div>
          ))}
        </dl>
        <Link to="/faq" className="tap mt-6 inline-block text-lg font-semibold text-amber-deep">
          All questions →
        </Link>
      </Section>
    </MarketingPage>
  );
}
