import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Users, Search, MapPin, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/customers/")({
  head: () => ({
    meta: [
      { title: "Customers | RCH PlumbFlow" },
      {
        name: "description",
        content: "Search customers and properties, with permanent job history per address.",
      },
      { property: "og:title", content: "Customers | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Search customers and properties, with permanent job history per address.",
      },
      { property: "og:url", content: "/customers" },
    ],
    links: [{ rel: "canonical", href: "/customers" }],
  }),
  component: Customers,
});

function Customers() {
  const { data, can } = useStore();
  const [query, setQuery] = useState("");

  const customers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.customers.filter((customer) => {
      if (!term) return true;
      const addresses = data.customerProperties
        .filter((link) => link.customerId === customer.id)
        .map((link) => {
          const place = data.properties.find((p) => p.id === link.propertyId);
          return place ? `${place.line1} ${place.town} ${place.postcode}` : "";
        })
        .join(" ");
      return `${customer.name} ${customer.phone} ${customer.email} ${addresses}`
        .toLowerCase()
        .includes(term);
    });
  }, [data, query]);

  return (
    <div>
      <PageHeader title="Customers" subtitle="Search by name, phone or postcode" />
      <div className="bg-ink px-4 pb-4">
        <div className="flex items-center gap-2 rounded-xl bg-ink-soft px-3">
          <Search className="size-5 text-fog" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers"
            aria-label="Search customers"
            className="tap w-full bg-transparent text-base text-paper placeholder:text-fog focus:outline-none"
          />
        </div>
      </div>

      <main className="space-y-3 px-4 py-5">
        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Try a shorter search, or add a new customer from the + New button."
          />
        ) : (
          customers.map((customer) => {
            const link = data.customerProperties.find(
              (row) => row.customerId === customer.id && row.isCurrent,
            );
            const place = data.properties.find((p) => p.id === link?.propertyId);
            return (
              <Link
                key={customer.id}
                to="/app/customers/$customerId"
                params={{ customerId: customer.id }}
                className="block rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-ink">{customer.name}</p>
                    {can.seeCustomerContact ? (
                      <p className="tabular mt-1 text-base text-slate">{customer.phone}</p>
                    ) : null}
                    {place ? (
                      <p className="mt-1 flex items-center gap-1.5 text-base text-fog">
                        <MapPin className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">
                          {place.line1}, {place.postcode}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-fog" aria-hidden />
                </div>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
