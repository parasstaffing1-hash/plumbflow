import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { Check, Phone } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { enquiriesWithDroppedPhotos, useStore } from "@/lib/store";
import { telHref } from "@/lib/tenants";

export const Route = createFileRoute("/book/$orgSlug/sent/$ref")({
  head: () => ({
    meta: [
      { title: "Your problem has been sent" },
      {
        name: "description",
        content: "Your plumber has your details and will call you back.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Your problem has been sent" },
      {
        property: "og:description",
        content: "Your plumber has your details and will call you back.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SentPage,
});

function SentPage() {
  const { ref } = useParams({ from: "/book/$orgSlug/sent/$ref" });
  const { tenant } = useTenant();
  const { data } = useStore();
  const { account } = tenant;
  const firstName =
    account.ownerName?.trim().split(" ")[0] || account.businessName || "Your plumber";

  const enquiry = data.enquiries.find((row) => row.reference === ref);
  const photosDropped = enquiriesWithDroppedPhotos.has(ref);

  useEffect(() => {
    document.title = `Sent | ${account.businessName}`;
  }, [account.businessName]);

  return (
    <main className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex size-16 items-center justify-center rounded-full bg-amber">
          <Check className="size-9 text-ink" aria-hidden />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
          Got it. {firstName} has your details.
        </h1>

        <p className="mt-4 text-lg text-slate">
          Your reference is <span className="tabular font-bold text-ink">{ref}</span>. Quote it if
          you call.
        </p>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-4">
          <h2 className="text-xl font-bold text-ink">What happens next</h2>
          <p className="mt-2 text-lg text-slate">
            {firstName} will call you on {account.phone}. If this cannot wait, call now.
          </p>
          <a
            href={telHref(account.phone)}
            className="tap mt-3 flex items-center justify-center gap-2 rounded-xl bg-emergency text-lg font-bold text-white"
          >
            <Phone className="size-5" aria-hidden /> Call {account.phone}
          </a>
        </div>

        {enquiry ? (
          <div className="mt-6 rounded-2xl border border-line bg-paper p-4">
            <h2 className="text-xl font-bold text-ink">What you sent</h2>
            <dl className="mt-3 space-y-3 text-base">
              <div>
                <dt className="font-semibold text-ink">The problem</dt>
                <dd className="text-slate">{enquiry.description}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Where</dt>
                <dd className="text-slate">{enquiry.rawAddress}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Phone</dt>
                <dd className="tabular text-slate">{enquiry.phone}</dd>
              </div>
              {enquiry.email ? (
                <div>
                  <dt className="font-semibold text-ink">Email</dt>
                  <dd className="text-slate">{enquiry.email}</dd>
                </div>
              ) : null}
              {enquiry.preferredTiming ? (
                <div>
                  <dt className="font-semibold text-ink">When suits you</dt>
                  <dd className="text-slate">{enquiry.preferredTiming}</dd>
                </div>
              ) : null}
              {enquiry.isEmergency ? (
                <div>
                  <dt className="font-semibold text-ink">Urgency</dt>
                  <dd className="text-slate">You said you need someone today</dd>
                </div>
              ) : null}
            </dl>

            {enquiry.photos?.length ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {enquiry.photos.map((photo) => (
                  <li key={photo.id}>
                    <img
                      src={photo.dataUrl}
                      alt="Photo you sent"
                      className="size-24 rounded-xl border border-line object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {photosDropped ? (
              <p className="mt-3 text-base text-slate">
                Your photos could not be attached. Bring them up when we call.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-lg text-slate">
            Your details are with {firstName}. Keep the reference {ref} handy.
          </p>
        )}
      </div>
    </main>
  );
}
