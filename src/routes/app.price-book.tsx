import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import type { PriceBookItem } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/app/price-book")({
  head: () => ({
    meta: [
      { title: "Price book | RCH PlumbFlow" },
      {
        name: "description",
        content: "Call-out charges, labour rates, materials and services with live prices.",
      },
      { property: "og:title", content: "Price book | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Call-out charges, labour rates, materials and services with live prices.",
      },
      { property: "og:url", content: "/price-book" },
    ],
    links: [{ rel: "canonical", href: "/price-book" }],
  }),
  component: PriceBook,
});

const CATEGORIES: Array<{ id: PriceBookItem["category"]; label: string }> = [
  { id: "callout", label: "Call-out" },
  { id: "labour", label: "Labour" },
  { id: "materials", label: "Materials" },
  { id: "service", label: "Service" },
];

function PriceBook() {
  const { data, can, addPriceItem, setPriceItem } = useStore();
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ callout: true });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<PriceBookItem["category"]>("materials");

  if (!can.seeMoney) {
    return (
      <div>
        <PageHeader title="Price book" subtitle="Prices used on quotes and invoices" />
        <main className="px-4 py-5">
          <p className="text-base text-fog">Your role cannot see prices.</p>
        </main>
      </div>
    );
  }

  const visible = data.priceBook.filter((item) => (showArchived ? true : !item.isArchived));

  return (
    <div>
      <PageHeader title="Price book" subtitle="Prices used on quotes and invoices" />
      <main className="space-y-4 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setAddOpen((prev) => !prev)}
            className="tap flex items-center gap-2 rounded-xl bg-amber px-4 text-base font-bold text-ink"
          >
            <Plus className="size-5" aria-hidden />
            Add item
          </button>
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="tap flex items-center rounded-xl border border-line px-4 text-[15px] font-semibold text-amber-deep"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
        </div>

        {addOpen ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const unitPrice = Number(price);
              if (!code.trim() || !name.trim() || !Number.isFinite(unitPrice)) {
                toast.error("Code, name and price are all needed.");
                return;
              }
              addPriceItem({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                unit: "each",
                unitPrice,
                isVatable: true,
                category,
              });
              toast.success(`${code.trim().toUpperCase()} added to the price book`);
              setCode("");
              setName("");
              setPrice("");
            }}
            className="space-y-2 rounded-2xl border border-line bg-paper p-4"
          >
            <p className="label-caps">Add an item</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Code"
                autoComplete="off"
                aria-label="New item code"
                className="tap w-28 rounded-xl border border-line bg-surface px-3 text-base text-ink"
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Description"
                autoComplete="off"
                aria-label="New item description"
                className="tap min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base text-ink"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as PriceBookItem["category"])}
              aria-label="New item category"
              className="tap w-full rounded-xl border border-line bg-surface px-3 text-base text-ink"
            >
              {CATEGORIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <span className="flex items-center self-center text-base text-fog">£</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                inputMode="decimal"
                step="0.01"
                autoComplete="off"
                placeholder="Price"
                aria-label="New item price"
                className="tabular tap w-28 rounded-xl border border-line bg-surface px-3 text-base text-ink"
              />
              <button
                type="submit"
                className="tap min-w-0 flex-1 rounded-xl bg-amber text-base font-bold text-ink"
              >
                Add item
              </button>
            </div>
          </form>
        ) : null}

        {CATEGORIES.map((entry) => {
          const items = visible.filter((item) => item.category === entry.id);
          const isOpen = open[entry.id] ?? false;
          return (
            <section key={entry.id} className="rounded-2xl border border-line bg-paper">
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [entry.id]: !isOpen }))}
                className="tap flex w-full items-center justify-between gap-3 px-4 text-left"
              >
                <span className="label-caps">{entry.label}</span>
                <span className="flex items-center gap-2 text-base text-fog">
                  <span className="tabular">{items.length}</span>
                  {isOpen ? (
                    <ChevronDown className="size-5" aria-hidden />
                  ) : (
                    <ChevronRight className="size-5" aria-hidden />
                  )}
                </span>
              </button>
              {isOpen ? (
                <ul className="divide-y divide-line border-t border-line px-4">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 text-base text-slate">
                        <span className="tabular text-fog">{item.code}</span> {item.name}
                        {item.isArchived ? <span className="text-fog"> · archived</span> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular text-base text-fog">£</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          autoComplete="off"
                          defaultValue={item.unitPrice}
                          onBlur={(event) => {
                            const next = Number(event.target.value);
                            if (Number.isFinite(next) && next !== item.unitPrice) {
                              setPriceItem(item.id, { unitPrice: next });
                              toast.success(`${item.code} now ${formatCurrency(next)}`);
                            }
                          }}
                          aria-label={`Price for ${item.name}`}
                          className="tabular tap w-24 rounded-lg border border-line bg-surface px-2 py-2 text-right text-base text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPriceItem(item.id, { isArchived: !item.isArchived });
                            toast.success(
                              item.isArchived ? `${item.code} restored` : `${item.code} archived`,
                            );
                          }}
                          className="tap flex items-center rounded-lg px-2 text-[15px] font-semibold text-amber-deep"
                        >
                          {item.isArchived ? "Restore" : "Archive"}
                        </button>
                      </span>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="py-3 text-base text-fog">Nothing in this category yet.</li>
                  ) : null}
                </ul>
              ) : null}
            </section>
          );
        })}
      </main>
    </div>
  );
}
