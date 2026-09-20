import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Product screenshots for the marketing site.
 *
 * These are rendered from the real design tokens rather than bitmap captures,
 * so they never drift from the app and stay sharp on any screen. No stock
 * photography anywhere on the site.
 */

export function PhoneMock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-[280px] shrink-0 rounded-[2rem] border-[6px] border-ink-soft bg-ink p-1 shadow-lift",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-surface">{children}</div>
    </div>
  );
}

function Bar({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="bg-ink px-3 pt-4 pb-3 text-paper">
      <p className="text-[15px] font-semibold">{title}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-fog">{sub}</p> : null}
    </div>
  );
}

function Chip({ label, tone = "amber" }: { label: string; tone?: "amber" | "go" | "line" }) {
  const tones = {
    amber: "bg-amber-wash text-amber-deep border-amber",
    go: "bg-go-wash text-go border-go/30",
    line: "bg-surface text-slate border-line",
  } as const;
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", tones[tone])}>
      {label}
    </span>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-line bg-paper p-2.5 shadow-card">{children}</div>;
}

export function ScreenToday() {
  return (
    <div className="text-ink">
      <Bar title="Today" sub="Tue 4 Aug · 3 jobs booked" />
      <div className="space-y-2 p-2.5">
        <div className="rounded-lg border-2 border-emergency bg-emergency-wash p-2.5">
          <p className="text-[11px] font-bold tracking-wide text-emergency">EMERGENCY</p>
          <p className="text-[13px] font-semibold">Burst pipe · Kingsthorpe NN2</p>
        </div>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">08:30 Boiler service</p>
            <Chip label="On site" />
          </div>
          <p className="mt-1 text-[11px] text-slate">J-0142 · Mrs Bevan, Duston</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">11:00 Blocked drain</p>
            <Chip label="Booked" tone="line" />
          </div>
          <p className="mt-1 text-[11px] text-slate">J-0143 · Weston Favell</p>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <p className="text-[10px] text-slate">Enquiries</p>
            <p className="text-lg font-semibold tabular-nums">4</p>
          </Card>
          <Card>
            <p className="text-[10px] text-slate">Owed to you</p>
            <p className="text-lg font-semibold tabular-nums">£4,180</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ScreenEnquiries() {
  return (
    <div className="text-ink">
      <Bar title="Enquiries" sub="4 waiting" />
      <div className="space-y-2 p-2.5">
        <div className="rounded-lg border-2 border-emergency bg-emergency-wash p-2.5">
          <p className="text-[11px] font-bold text-emergency">EMERGENCY · 6 min ago</p>
          <p className="text-[13px] font-semibold">No water, whole house</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded bg-ink px-2 py-1 text-[10px] font-semibold text-paper">
              Call
            </span>
            <span className="rounded bg-amber px-2 py-1 text-[10px] font-semibold text-ink">
              Send call-out quote
            </span>
          </div>
        </div>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Leaking rad valve</p>
            <Chip label="Needs contact" />
          </div>
          <p className="mt-1 text-[11px] text-slate">Brackmills NN4 · standard</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Bathroom refit quote</p>
            <Chip label="Quoted" />
          </div>
          <p className="mt-1 text-[11px] text-slate">Wootton NN4 · large job</p>
        </Card>
      </div>
    </div>
  );
}

export function ScreenQuote() {
  return (
    <div className="text-ink">
      <Bar title="Q-0184" sub="Mrs Bevan · Duston NN5" />
      <div className="space-y-2 p-2.5">
        <Card>
          <div className="flex justify-between text-[12px]">
            <span>Call-out &amp; first hour</span>
            <span className="font-semibold tabular-nums">£95.00</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[12px]">
            <span>Rad valve (pair)</span>
            <span className="font-semibold tabular-nums">£38.40</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[12px]">
            <span>Labour · 2 hrs</span>
            <span className="font-semibold tabular-nums">£110.00</span>
          </div>
          <div className="mt-2 border-t border-line pt-2 flex justify-between text-[13px] font-semibold">
            <span>Total inc VAT</span>
            <span className="tabular-nums">£292.08</span>
          </div>
        </Card>
        <Card>
          <p className="text-[10px] text-slate">Deposit on acceptance (75%)</p>
          <p className="text-lg font-semibold tabular-nums">£219.06</p>
        </Card>
        <div className="rounded-lg bg-amber px-3 py-2.5 text-center text-[13px] font-semibold text-ink">
          Send quote
        </div>
      </div>
    </div>
  );
}

export function ScreenJob() {
  return (
    <div className="text-ink">
      <Bar title="J-0142 Boiler service" sub="On site · Duston NN5" />
      <div className="space-y-2 p-2.5">
        <Card>
          <p className="text-[10px] font-semibold tracking-wide text-slate">EVIDENCE</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[
              ["Before", true],
              ["During", true],
              ["Testing", false],
              ["After", false],
            ].map(([label, done]) => (
              <div
                key={label as string}
                className={cn(
                  "rounded border p-1.5 text-center text-[9px] font-semibold",
                  done
                    ? "border-go/30 bg-go-wash text-go"
                    : "border-amber bg-amber-wash text-amber-deep",
                )}
              >
                {label as string}
                <div className="mt-1 text-[8px]">{done ? "2 photos" : "needed"}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-[10px] text-slate">Work done</p>
          <p className="mt-1 text-[11px] leading-snug">
            Stripped and cleaned burner, replaced seal, flue gas check passed…
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-amber-deep">🎙 Dictated</p>
        </Card>
        <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-[13px] font-semibold text-slate">
          JOB COMPLETE · 2 items outstanding
        </div>
      </div>
    </div>
  );
}

export function ScreenComplete() {
  return (
    <div className="text-ink">
      <Bar title="Job complete" sub="J-0142 · 4 Aug" />
      <div className="space-y-2 p-2.5">
        <div className="rounded-lg border border-go/30 bg-go-wash p-2.5">
          <p className="text-[12px] font-semibold text-go">Completion pack generated</p>
          <p className="mt-1 text-[10px] text-slate">10 sections · 8 photos · signed off 15:42</p>
        </div>
        <Card>
          <p className="text-[10px] text-slate">Draft invoice</p>
          <p className="text-[13px] font-semibold">INV-0231 · £292.08</p>
          <p className="mt-1 text-[10px] text-slate">Ready to send, nothing to retype</p>
        </Card>
        <Card>
          <p className="text-[10px] text-slate">Next service reminder</p>
          <p className="text-[13px] font-semibold">04/08/2027 · added to tasks</p>
        </Card>
      </div>
    </div>
  );
}

export function ScreenMoney() {
  return (
    <div className="text-ink">
      <Bar title="Money" sub="Outstanding £4,180" />
      <div className="space-y-2 p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <p className="text-[10px] text-slate">Overdue</p>
            <p className="text-lg font-semibold tabular-nums">£860</p>
          </Card>
          <Card>
            <p className="text-[10px] text-slate">Paid this month</p>
            <p className="text-lg font-semibold tabular-nums">£7,340</p>
          </Card>
        </div>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">INV-0228</p>
            <Chip label="Overdue" />
          </div>
          <p className="mt-1 text-[11px] text-slate tabular-nums">£860.00 · due 21/07/2026</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">INV-0230</p>
            <Chip label="Paid" tone="go" />
          </div>
          <p className="mt-1 text-[11px] text-slate tabular-nums">£412.50 · paid 02/08/2026</p>
        </Card>
      </div>
    </div>
  );
}

export function ScreenCustomer() {
  return (
    <div className="text-ink">
      <Bar title="14 Millers Way" sub="Kingsthorpe NN2 · property record" />
      <div className="space-y-2 p-2.5">
        <Card>
          <p className="text-[10px] text-slate">Current occupier</p>
          <p className="text-[13px] font-semibold">Mr &amp; Mrs Ayres · owner occupier</p>
          <p className="mt-1 text-[10px] text-slate">Previous: J. Kowal (tenant, 2021, 2024)</p>
        </Card>
        <Card>
          <p className="text-[10px] text-slate">Boiler</p>
          <p className="text-[12px] font-semibold">Worcester 30i · fitted 2019</p>
          <p className="mt-1 text-[10px] text-slate">Next service 12/11/2026</p>
        </Card>
        <Card>
          <p className="text-[10px] text-slate">Job history</p>
          <p className="mt-1 text-[11px]">J-0098 Service · 11/11/2025</p>
          <p className="text-[11px]">J-0061 Leak under sink · 03/02/2025</p>
          <p className="text-[11px]">J-0022 Full drain jet · 19/06/2024</p>
        </Card>
      </div>
    </div>
  );
}
