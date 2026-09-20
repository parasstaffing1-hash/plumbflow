import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/lib/platform";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/owner/settings")({
  component: OwnerSettings,
});

function OwnerSettings() {
  const { data, saveSettings } = usePlatform();
  const [form, setForm] = useState({
    monthlyPrice: String(data.settings.monthlyPrice),
    trialDays: String(data.settings.trialDays),
    contactEmail: data.settings.contactEmail,
    contactPhone: data.settings.contactPhone,
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(form.monthlyPrice);
    const trial = Number(form.trialDays);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Monthly price must be a positive number.");
      return;
    }
    if (!Number.isInteger(trial) || trial < 0 || trial > 90) {
      toast.error("Trial length must be between 0 and 90 days.");
      return;
    }
    saveSettings({
      monthlyPrice: price,
      trialDays: trial,
      contactEmail: form.contactEmail.trim().slice(0, 255),
      contactPhone: form.contactPhone.trim().slice(0, 40),
    });
    toast.success("Platform settings saved");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Platform settings</h1>
        <p className="mt-1 text-[16px] text-slate">
          These values drive the marketing site and every new signup.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-line bg-paper p-5 shadow-card"
      >
        <label className="block">
          <span className="label-caps text-slate">Monthly price (£ per plumber)</span>
          <input
            value={form.monthlyPrice}
            onChange={(event) => setForm((p) => ({ ...p, monthlyPrice: event.target.value }))}
            inputMode="decimal"
            className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px] tabular-nums"
          />
        </label>
        <label className="block">
          <span className="label-caps text-slate">Free trial length (days)</span>
          <input
            value={form.trialDays}
            onChange={(event) => setForm((p) => ({ ...p, trialDays: event.target.value }))}
            inputMode="numeric"
            className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px] tabular-nums"
          />
        </label>
        <label className="block">
          <span className="label-caps text-slate">Contact email shown on the site</span>
          <input
            value={form.contactEmail}
            onChange={(event) => setForm((p) => ({ ...p, contactEmail: event.target.value }))}
            type="email"
            className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
          />
        </label>
        <label className="block">
          <span className="label-caps text-slate">Contact phone shown on the site</span>
          <input
            value={form.contactPhone}
            onChange={(event) => setForm((p) => ({ ...p, contactPhone: event.target.value }))}
            type="tel"
            className="tap mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3 text-[16px]"
          />
        </label>
        <button
          type="submit"
          className="tap w-full rounded-xl bg-amber px-5 py-3 font-semibold text-ink"
        >
          Save settings
        </button>
      </form>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">Contact form submissions</h2>
        {data.contactSubmissions.length === 0 ? (
          <p className="mt-3 text-[16px] text-slate">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.contactSubmissions.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-[16px] font-semibold">
                  {entry.name} · {entry.email}
                </p>
                <p className="text-[15px] text-slate">{entry.message}</p>
                <p className="mt-1 text-base text-slate tabular-nums">
                  {formatDate(entry.createdAt)}
                  {entry.phone ? ` · ${entry.phone}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
