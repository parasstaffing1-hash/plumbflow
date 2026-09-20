import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage, Section, PrimaryCta } from "@/components/marketing/Site";
import {
  PhoneMock,
  ScreenEnquiries,
  ScreenQuote,
  ScreenJob,
  ScreenComplete,
  ScreenMoney,
  ScreenCustomer,
} from "@/components/marketing/Screens";

const TITLE = "Features: enquiries, quotes, jobs and invoices | RCH PlumbFlow";
const DESCRIPTION =
  "See what RCH PlumbFlow does: emergency triage, quoting from your price book, on-site photo evidence, the JOB COMPLETE gate, invoicing and permanent property history.";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/features" },
    ],
    links: [{ rel: "canonical", href: "/features" }],
  }),
  component: FeaturesPage,
});

const SECTIONS = [
  {
    title: "Enquiries and emergencies",
    body: [
      "Every enquiry lands in one list with the emergencies pinned at the top and marked in red. That is the only place in RCH PlumbFlow red is ever used.",
      "From the enquiry you can call, message, send a call-out quote, book it in or decline it with a reason. Nothing sits in your head or on a scrap of paper.",
    ],
    screen: <ScreenEnquiries />,
  },
  {
    title: "Quoting from your price book",
    body: [
      "Load your own rates once. Building a quote is then picking lines and adjusting quantities, on the doorstep if you want.",
      "Deposits default to 75% on acceptance, and you can override that per quote with a reason that gets logged. Accepted quotes lock so the numbers cannot drift.",
    ],
    screen: <ScreenQuote />,
  },
  {
    title: "Jobs and on-site evidence",
    body: [
      "Booked, en route, on site, in progress: one tap each, so the office always knows where the job is without ringing you.",
      "Photos are captured in four stages: before, during, testing and after. What each job type actually requires is set by you, not by us.",
    ],
    screen: <ScreenJob />,
  },
  {
    title: "JOB COMPLETE",
    body: [
      "One button ends the job, but only when the evidence, the notes and any variations are done. If something is missing you get a list, and each item can be added now, marked not applicable, or logged as an exception with a reason.",
      "That gate is the difference between a job you can invoice confidently and one you argue about later.",
    ],
    screen: <ScreenComplete />,
  },
  {
    title: "Invoicing and getting paid",
    body: [
      "Completing a job generates the completion pack and a draft invoice from the quote plus any approved variations. You check it and send it.",
      "Part payments, overdue balances and payment plans are all tracked, so Sunday night chasing becomes a two-minute look at one screen.",
    ],
    screen: <ScreenMoney />,
  },
  {
    title: "Customer and property history",
    body: [
      "The history belongs to the address. Tenants change, landlords sell, the record stays.",
      "Two years after a job you can see the boiler you fitted, the access notes, who lived there at the time and every photo you took.",
    ],
    screen: <ScreenCustomer />,
  },
  {
    title: "Your own booking page",
    body: [
      "Every business gets a booking page at your own address, with your name, your number and your patch on it. Send the link, print it on the van, put it on your invoices.",
      "Customers describe the problem, add a photo and say how soon they need you. It lands in Enquiries with a New chip, and anything marked as an emergency goes straight to the top of Today.",
    ],
    screen: <ScreenEnquiries />,
    link: {
      to: "/book/$orgSlug",
      params: { orgSlug: "rch-drainage" },
      label: "See an example booking page",
    },
  },
];

function FeaturesPage() {
  return (
    <MarketingPage>
      <section className="bg-ink px-4 py-16 text-paper">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Everything the job needs. Nothing it doesn&rsquo;t.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">
            Six parts, in the order a job actually happens.
          </p>
        </div>
      </section>

      {SECTIONS.map((section, index) => (
        <Section key={section.title} tone={index % 2 === 0 ? "paper" : "surface"}>
          <div
            className={`grid items-center gap-10 md:grid-cols-2 ${
              index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-[17px] leading-relaxed text-slate">
                  {paragraph}
                </p>
              ))}
              {"link" in section && section.link ? (
                <Link
                  to={section.link.to}
                  params={section.link.params}
                  className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-amber px-5 text-base font-semibold text-ink"
                >
                  {section.link.label}
                </Link>
              ) : null}
            </div>
            <PhoneMock>{section.screen}</PhoneMock>
          </div>
        </Section>
      ))}

      <Section tone="ink">
        <h2 className="text-3xl font-semibold tracking-tight">Try it on your next job</h2>
        <p className="mt-3 max-w-xl text-lg text-fog">
          Set your prices up in ten minutes and run one real job through it. You will know by the
          end of the day.
        </p>
        <div className="mt-7">
          <PrimaryCta />
        </div>
      </Section>
    </MarketingPage>
  );
}
