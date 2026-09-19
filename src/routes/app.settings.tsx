import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Building2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Business settings | RCH PlumbFlow" },
      {
        name: "description",
        content: "Trading name, contact details, VAT rate and default deposit percentage.",
      },
      { property: "og:title", content: "Business settings | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Trading name, contact details, VAT rate and default deposit percentage.",
      },
      { property: "og:url", content: "/settings" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Settings,
});

function Settings() {
  const { data, can, setOrg } = useStore();

  return (
    <div>
      <PageHeader title="Business settings" subtitle="Used on new quotes and invoices" />
      <main className="space-y-5 px-4 py-5">
        {can.seeOrgSettings ? (
          <section className="rounded-2xl border border-line bg-paper p-4">
            <h2 className="label-caps flex items-center gap-2">
              <Building2 className="size-4" aria-hidden />
              Business settings
            </h2>
            <div className="mt-3 space-y-3">
              <Field
                label="Trading name"
                value={data.org.tradingName}
                onSave={(value) => setOrg({ tradingName: value })}
              />
              <Field
                label="Phone"
                value={data.org.phone}
                type="tel"
                inputMode="tel"
                onSave={(value) => setOrg({ phone: value })}
              />
              <Field
                label="Email"
                value={data.org.email}
                type="email"
                onSave={(value) => setOrg({ email: value })}
              />
              <Field
                label="VAT rate %"
                value={String(Math.round(data.org.vatRate * 100))}
                type="number"
                inputMode="numeric"
                onSave={(value) => setOrg({ vatRate: Number(value) / 100 })}
              />
              <Field
                label="Default deposit % on acceptance"
                value={String(data.org.defaultDepositPercentage)}
                type="number"
                inputMode="numeric"
                onSave={(value) => setOrg({ defaultDepositPercentage: Number(value) })}
              />
            </div>
            <p className="mt-2 text-[15px] text-fog">
              Changes save straight away and are used on new quotes and invoices.
            </p>
          </section>
        ) : (
          <p className="text-base text-fog">Your role cannot change business settings.</p>
        )}

        <Link
          to="/app/booking-page"
          className="tap flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4"
        >
          <span>
            <span className="block text-base font-semibold text-ink">Your booking page</span>
            <span className="block text-[15px] text-fog">Link, preview and embed code</span>
          </span>
          <ChevronRight className="size-5 text-fog" aria-hidden />
        </Link>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  inputMode,
  onSave,
}: {
  label: string;
  value: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <input
        value={draft}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        name={`setting-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
        data-lpignore="true"
        data-1p-ignore="true"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() && draft !== value) onSave(draft.trim());
        }}
        className="tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink"
      />
    </label>
  );
}
