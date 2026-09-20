import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePlatform } from "@/lib/platform";
import { findTenant } from "@/lib/tenants";
import { ReportForm } from "@/components/homeowner/ReportForm";

export const Route = createFileRoute("/embed/$orgSlug")({
  head: () => ({
    meta: [
      { title: "Report a plumbing problem" },
      { name: "description", content: "Send your plumber the details of what has gone wrong." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Report a plumbing problem" },
      {
        property: "og:description",
        content: "Send your plumber the details of what has gone wrong.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmbeddedForm,
});

function EmbeddedForm() {
  const { orgSlug } = useParams({ from: "/embed/$orgSlug" });
  const { data } = usePlatform();
  const navigate = useNavigate();
  const [sentRef, setSentRef] = useState("");
  const tenant = useMemo(() => findTenant(data.accounts, orgSlug), [data.accounts, orgSlug]);

  if (!tenant) {
    return (
      <div className="bg-surface p-5">
        <p className="text-lg font-semibold text-ink">This form is not available.</p>
      </div>
    );
  }

  if (sentRef) {
    const firstName =
      tenant.account.ownerName?.trim().split(" ")[0] ||
      tenant.account.businessName ||
      "Your plumber";
    return (
      <div className="bg-surface p-5">
        <p className="text-xl font-bold text-ink">Got it. Your reference is {sentRef}.</p>
        <p className="mt-2 text-lg text-slate">
          {firstName} will call you back on the number you gave.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface p-5">
      <ReportForm
        tenant={tenant}
        onSent={(reference) => {
          setSentRef(reference);
          void navigate({ to: "/embed/$orgSlug", params: { orgSlug } });
        }}
      />
    </div>
  );
}
