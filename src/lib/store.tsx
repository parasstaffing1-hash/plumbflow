import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEntry,
  AppData,
  Customer,
  CustomerProperty,
  Enquiry,
  Job,
  JobType,
  JobVariation,
  OrgSettings,
  PriceBookItem,
  Property,
  Quote,
  TaskItem,
} from "./domain";
import { capabilitiesFor } from "./domain";
import { createSeedData } from "./seed";

const STORAGE_KEY = "rch-plumbflow:v4";
const DEFAULT_COUNTERS = { quote: 136, job: 212, invoice: 155, enquiry: 105 };

function loadData(): AppData {
  if (typeof window === "undefined") return createSeedData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedData();
    const parsed = JSON.parse(raw) as AppData;
    return { ...parsed, counters: { ...DEFAULT_COUNTERS, ...parsed.counters } };
  } catch {
    return createSeedData();
  }
}

/**
 * localStorage is a hard 5MB in most browsers and base64 photos eat it fast.
 * Returns false when the browser refused the write so callers can retry with
 * a lighter payload instead of losing the record.
 */
function persist(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * References of enquiries whose photos had to be dropped to fit the storage
 * quota. Session only, the confirmation screen reads it to be honest with the
 * homeowner.
 */
export const enquiriesWithDroppedPhotos = new Set<string>();

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface StoreValue {
  data: AppData;
  update: (updater: (draft: AppData) => AppData) => void;
  log: (entityType: ActivityEntry["entityType"], entityId: string, message: string) => void;
  activityFor: (entityType: ActivityEntry["entityType"], entityId: string) => ActivityEntry[];
  currentUser: { id: string; name: string; role: AppData["team"][number]["role"] };
  can: ReturnType<typeof capabilitiesFor>;
  reset: () => void;
  // lookups
  customer: (id: string | null) => Customer | undefined;
  property: (id: string | null) => Property | undefined;
  jobType: (id: string | null) => JobType | undefined;
  job: (id: string) => Job | undefined;
  variationsFor: (jobId: string) => JobVariation[];
  occupancyFor: (propertyId: string) => CustomerProperty[];
  // mutations
  setJob: (id: string, patch: Partial<Job>) => void;
  setEnquiry: (id: string, patch: Partial<Enquiry>) => void;
  setQuote: (id: string, patch: Partial<Quote>) => void;
  setTask: (id: string, patch: Partial<TaskItem>) => void;
  setOrg: (patch: Partial<OrgSettings>) => void;
  addPriceItem: (input: Omit<PriceBookItem, "id" | "orgId">) => void;
  setPriceItem: (id: string, patch: Partial<PriceBookItem>) => void;
  addVariation: (jobId: string, description: string, amount: number) => void;
  addQuote: (quote: Omit<Quote, "id" | "quoteNumber" | "orgId">) => Quote;
  addCustomer: (input: Omit<Customer, "id" | "orgId">) => Customer;
  addEnquiry: (input: Omit<Enquiry, "id" | "orgId" | "reference" | "receivedAt">) => Enquiry;
  addProperty: (input: Omit<Property, "id" | "orgId">) => Property;
  addTask: (title: string, dueDate: string) => void;
  nextJobNumber: () => string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData());

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (persist(data)) return;
    /* Over quota. Drop homeowner photos, the enquiry itself must survive. */
    const stripped: AppData = {
      ...data,
      enquiries: data.enquiries.map((enquiry) => {
        if (!enquiry.photos?.length) return enquiry;
        enquiriesWithDroppedPhotos.add(enquiry.reference);
        return { ...enquiry, photos: [] };
      }),
    };
    persist(stripped);
  }, [data]);

  const update = useCallback((updater: (draft: AppData) => AppData) => {
    setData((prev) => updater(structuredClone(prev)));
  }, []);

  const currentUser = useMemo(() => {
    const member = data.team.find((m) => m.id === data.currentUserId) ?? data.team[0] ?? {
      id: "u_default",
      orgId: data.org.id,
      name: "Trade Engineer",
      email: "engineer@rchplumbflow.co.uk",
      role: "owner" as const,
    };
    return member;
  }, [data.team, data.currentUserId, data.org.id]);

  const log = useCallback<StoreValue["log"]>((entityType, entityId, message) => {
    setData((prev) => {
      const actor = prev.team.find((m) => m.id === prev.currentUserId)?.name ?? "Unknown user";
      return {
        ...prev,
        activity: [
          {
            id: uid("a"),
            orgId: prev.org.id,
            entityType,
            entityId,
            message,
            actor,
            at: new Date().toISOString(),
          },
          ...prev.activity,
        ],
      };
    });
  }, []);

  const value = useMemo<StoreValue>(() => {
    const patch = <K extends keyof AppData>(key: K, id: string, changes: object) =>
      update((draft) => {
        const list = draft[key] as unknown as Array<{ id: string }>;
        const index = list.findIndex((row) => row.id === id);
        if (index >= 0) list[index] = { ...list[index], ...changes } as never;
        return draft;
      });

    return {
      data,
      update,
      log,
      currentUser,
      can: capabilitiesFor(currentUser.role),
      reset: () => setData(createSeedData()),
      activityFor: (entityType, entityId) =>
        data.activity.filter((a) => a.entityType === entityType && a.entityId === entityId),
      customer: (id) => data.customers.find((c) => c.id === id),
      property: (id) => data.properties.find((p) => p.id === id),
      jobType: (id) => data.jobTypes.find((t) => t.id === id),
      job: (id) => data.jobs.find((j) => j.id === id),
      variationsFor: (jobId) => data.variations.filter((v) => v.jobId === jobId),
      occupancyFor: (propertyId) =>
        data.customerProperties
          .filter((cp) => cp.propertyId === propertyId)
          .sort((a, b) => b.startedOn.localeCompare(a.startedOn)),
      setJob: (id, changes) => patch("jobs", id, changes),
      setEnquiry: (id, changes) => patch("enquiries", id, changes),
      setQuote: (id, changes) => patch("quotes", id, changes),
      setTask: (id, changes) => patch("tasks", id, changes),
      setOrg: (changes) =>
        update((draft) => {
          draft.org = { ...draft.org, ...changes };
          return draft;
        }),
      addPriceItem: (input) =>
        update((draft) => {
          draft.priceBook.push({ ...input, id: uid("pb"), orgId: draft.org.id });
          return draft;
        }),
      setPriceItem: (id, changes) => patch("priceBook", id, changes),
      addVariation: (jobId, description, amount) => {
        update((draft) => {
          draft.variations.push({
            id: uid("v"),
            orgId: draft.org.id,
            jobId,
            description,
            amount,
            isVatable: true,
            status: "pending",
            approvedAt: null,
            approvedByNote: "",
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
          });
          return draft;
        });
        log("job", jobId, `Variation recorded: ${description}`);
      },
      addQuote: (input) => {
        const number = data.counters.quote + 1;
        const quote: Quote = {
          ...input,
          id: uid("q"),
          orgId: data.org.id,
          quoteNumber: `Q-${String(number).padStart(4, "0")}`,
        };
        update((draft) => {
          draft.counters.quote = number;
          draft.quotes.unshift(quote);
          return draft;
        });
        return quote;
      },
      addEnquiry: (input) => {
        const number = data.counters.enquiry + 1;
        const enquiry: Enquiry = {
          ...input,
          id: uid("e"),
          orgId: data.org.id,
          reference: `E-${String(number).padStart(4, "0")}`,
          receivedAt: new Date().toISOString(),
        };
        update((draft) => {
          draft.counters.enquiry = number;
          draft.enquiries.unshift(enquiry);
          return draft;
        });
        return enquiry;
      },
      addCustomer: (input) => {
        const customer: Customer = { ...input, id: uid("c"), orgId: data.org.id };
        update((draft) => {
          draft.customers.unshift(customer);
          return draft;
        });
        return customer;
      },
      addProperty: (input) => {
        const property: Property = { ...input, id: uid("p"), orgId: data.org.id };
        update((draft) => {
          draft.properties.unshift(property);
          return draft;
        });
        return property;
      },
      addTask: (title, dueDate) => {
        update((draft) => {
          draft.tasks.unshift({
            id: uid("t"),
            orgId: draft.org.id,
            title,
            status: "open",
            dueDate,
          });
          return draft;
        });
      },
      nextJobNumber: () => `J-${String(data.counters.job + 1).padStart(4, "0")}`,
    };
  }, [data, update, log, currentUser]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
