import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface SortOption<T> {
  id: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface FilterChip<T> {
  id: string;
  label: string;
  test: (item: T) => boolean;
}

export interface ListScreenProps<T> {
  listId: string;
  items: T[];
  searchFields: (item: T) => Array<string | null | undefined>;
  sortOptions: SortOption<T>[];
  filterChips: FilterChip<T>[];
  renderRow: (item: T) => ReactNode;
  emptyState: ReactNode;
  noun: string;
  keyFor: (item: T) => string;
  initialFilterId?: string | undefined;
  onRefresh?: (() => void | Promise<void>) | undefined;
  isLoading?: boolean | undefined;
}

const sortMemory = new Map<string, string>();
const filterMemory = new Map<string, string>();

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ListScreen<T>({
  listId,
  items,
  searchFields,
  sortOptions,
  filterChips,
  renderRow,
  emptyState,
  noun,
  keyFor,
  initialFilterId,
  onRefresh,
  isLoading = false,
}: ListScreenProps<T>) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 200);
  const [sortId, setSortId] = useState(() => sortMemory.get(listId) ?? sortOptions[0]?.id ?? "");
  const [filterId, setFilterId] = useState(() => initialFilterId ?? filterMemory.get(listId) ?? "");
  const [sortOpen, setSortOpen] = useState(false);
  const [visible, setVisible] = useState(20);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStart = useRef<number | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sortMemory.set(listId, sortId);
  }, [listId, sortId]);
  useEffect(() => {
    filterMemory.set(listId, filterId);
  }, [listId, filterId]);
  useEffect(() => {
    setVisible(20);
  }, [debouncedQuery, filterId, sortId]);

  const activeFilter = filterChips.find((chip) => chip.id === filterId) ?? null;
  const activeSort = sortOptions.find((option) => option.id === sortId) ?? sortOptions[0];

  const filtered = useMemo(() => {
    const term = normalise(debouncedQuery);
    let list = items;
    if (activeFilter) list = list.filter((item) => activeFilter.test(item));
    if (term) {
      list = list.filter((item) =>
        searchFields(item).some((field) => field && normalise(field).includes(term)),
      );
    }
    const sorted = list.slice();
    if (activeSort) sorted.sort(activeSort.compare);
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, debouncedQuery, activeFilter, activeSort]);

  const isFiltering = Boolean(debouncedQuery.trim() || activeFilter);
  const rows = filtered.slice(0, visible);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((prev) => (prev >= filtered.length ? prev : prev + 20));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  const runRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  function onTouchStart(event: React.TouchEvent) {
    if (window.scrollY <= 0) pullStart.current = event.touches[0]!.clientY;
  }
  function onTouchMove(event: React.TouchEvent) {
    if (pullStart.current === null) return;
    const delta = event.touches[0]!.clientY - pullStart.current;
    setPullDistance(delta > 0 ? Math.min(delta, 90) : 0);
  }
  function onTouchEnd() {
    if (pullDistance > 60) void runRefresh();
    pullStart.current = null;
    setPullDistance(0);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="sticky top-0 z-30 bg-ink px-4 pt-2 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-ink-soft px-3">
          <Search className="size-5 shrink-0 text-fog" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${noun}`}
            aria-label={`Search ${noun}`}
            type="search"
            autoComplete="off"
            className="tap w-full bg-transparent text-base text-paper placeholder:text-fog focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-fog"
            >
              <X className="size-5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky top-[3.75rem] z-20 flex items-start gap-2 bg-ink px-4 pb-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilterId("")}
            className={cn(
              "tap flex shrink-0 items-center justify-center rounded-full px-4 text-base font-semibold whitespace-nowrap",
              filterId === "" ? "bg-amber text-ink" : "bg-ink-soft text-fog",
            )}
          >
            All
          </button>
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterId(chip.id)}
              className={cn(
                "tap flex shrink-0 items-center justify-center rounded-full px-4 text-base font-semibold whitespace-nowrap",
                filterId === chip.id ? "bg-amber text-ink" : "bg-ink-soft text-fog",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          aria-label="Sort"
          className="tap flex shrink-0 items-center gap-1 rounded-full bg-ink-soft px-3 text-base font-semibold text-paper"
        >
          <ArrowUpDown className="size-4" aria-hidden />
          Sort
        </button>
      </div>

      <main className="px-4 py-4">
        {refreshing || pullDistance > 0 ? (
          <p className="pb-2 text-center text-base text-slate">
            {refreshing ? "Refreshing" : "Pull to refresh"}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pb-3">
          <p className="text-base text-slate">
            {isFiltering
              ? `${filtered.length} of ${items.length} ${noun}`
              : `${filtered.length} ${noun}`}
          </p>
          {isFiltering ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilterId("");
              }}
              className="text-base font-semibold text-amber-deep"
            >
              Clear
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-line bg-paper p-4"
              >
                <div className="h-4 w-24 rounded bg-surface" />
                <div className="mt-3 h-5 w-3/4 rounded bg-surface" />
                <div className="mt-3 h-4 w-1/2 rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          emptyState
        ) : (
          <div className="space-y-3">
            {rows.map((item) => (
              <div key={keyFor(item)}>{renderRow(item)}</div>
            ))}
            <div ref={sentinel} aria-hidden className="h-4" />
          </div>
        )}
      </main>

      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-line bg-paper">
          <SheetHeader>
            <SheetTitle className="text-xl">Sort {noun}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSortId(option.id);
                  setSortOpen(false);
                }}
                className={cn(
                  "tap flex w-full items-center justify-between rounded-xl border px-4 text-lg font-semibold",
                  option.id === sortId
                    ? "border-amber-deep bg-amber-wash text-ink"
                    : "border-line bg-surface text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
