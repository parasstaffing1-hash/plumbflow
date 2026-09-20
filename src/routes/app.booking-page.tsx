import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { usePlatform } from "@/lib/platform";

export const Route = createFileRoute("/app/booking-page")({
  head: () => ({
    meta: [
      { title: "Your booking page | RCH PlumbFlow" },
      {
        name: "description",
        content:
          "The link customers use to report a problem, plus the embed code for your own website.",
      },
      { property: "og:title", content: "Your booking page | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Share your booking link or embed the report form on your own website.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingPageSettings,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function BookingPageSettings() {
  const { data } = useStore();
  const { currentAccount } = usePlatform();
  const slug =
    currentAccount?.slug || slugify(currentAccount?.businessName || data.org.tradingName);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const bookPath = `/book/${slug}`;
  const bookUrl = `${origin}${bookPath}`;
  const embedCode = `<iframe src="${origin}/embed/${slug}" title="Report a plumbing problem" width="100%" height="900" style="border:0"></iframe>`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Could not copy. Select the text instead.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Your booking page"
        subtitle="Send it to customers or put it on your site"
      />
      <main className="space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Your link</h2>
          <p className="mt-2 break-all text-base text-ink">{bookUrl || bookPath}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/book/$orgSlug"
              params={{ orgSlug: slug }}
              target="_blank"
              className="tap inline-flex items-center gap-2 rounded-xl bg-amber px-4 text-base font-bold text-ink"
            >
              <ExternalLink className="size-4" aria-hidden /> Preview
            </Link>
            <button
              type="button"
              onClick={() => void copy(bookUrl || bookPath, "Link")}
              className="tap inline-flex items-center gap-2 rounded-xl border border-line px-4 text-base font-semibold text-ink"
            >
              <Copy className="size-4" aria-hidden /> Copy link
            </button>
          </div>
          <p className="mt-2 text-[15px] text-fog">
            Print it on the van, put it on your invoices, text it to a customer who rings while you
            are under a sink.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Put the form on your own website</h2>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-surface p-3 text-[13px] text-ink">
            {embedCode}
          </pre>
          <button
            type="button"
            onClick={() => void copy(embedCode, "Embed code")}
            className="tap mt-3 inline-flex items-center gap-2 rounded-xl border border-line px-4 text-base font-semibold text-ink"
          >
            <Copy className="size-4" aria-hidden /> Copy embed code
          </button>
        </section>

        <p className="text-[15px] text-fog">
          Enquiries from the booking page land in Enquiries with a New chip. Anything marked as an
          emergency goes to the top of Today.
        </p>
      </main>
    </div>
  );
}
