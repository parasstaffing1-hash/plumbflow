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
import { createSeedData, seedJobTypes, seedPriceBook } from "./seed";
import type { Account } from "./platform";
import { usePlatform } from "./platform";

export function createRealWorkspaceData(account?: Account): AppData {
  const orgId = account?.id || "org_main";
  const orgName = account?.businessName?.trim() || "PlumbFlow Trade";
  const owner = account?.ownerName?.trim() || "Trade Engineer";
  const email = account?.email?.trim() || "engineer@plumbflow.co.uk";
  const phone = account?.phone?.trim() || "";
  const town = account?.town?.trim() || "";

  const jobTypes: JobType[] = seedJobTypes.map((jt) => ({
    ...jt,
    id: `jt_${jt.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    orgId,
  }));

  const priceBook: PriceBookItem[] = seedPriceBook.map((pb) => ({
    ...pb,
    id: `pb_${pb.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    orgId,
  }));

  return {
    org: {
      id: orgId,
      name: orgName,
      tradingName: orgName,
      phone,
      email,
      town,
      vatRate: 0.2,
      defaultDepositRule: "none_trusted_customer",
      defaultDepositPercentage: 20,
      minimumCalloutItemId: priceBook[0]?.id ?? null,
    },
    team: [
      {
        id: `u_${orgId}`,
        orgId,
        name: owner,
        role: "owner",
      },
    ],
    currentUserId: `u_${orgId}`,
    jobTypes,
    priceBook,
    customers: [],
    properties: [],
    customerProperties: [],
    enquiries: [],
    quotes: [],
    jobs: [],
    variations: [],
    invoices: [],
    tasks: [],
    activity: [
      {
        id: `act_${Date.now()}`,
        orgId,
        entityType: "job",
        entityId: "init",
        message: `Workspace initialized for ${orgName}. Add your first customer or job to get started.`,
        actor: owner,
        at: new Date().toISOString(),
      },
    ],
    counters: { quote: 0, job: 0, invoice: 0, enquiry: 0 },
  };
}

function getStorageKey(accountId?: string): string {
  if (!accountId || accountId === "org_default") {
    return "plumbflow:workspace:guest";
  }
  return `plumbflow:workspace:${accountId}`;
}

const DEFAULT_COUNTERS = { quote: 0, job: 0, invoice: 0, enquiry: 0 };

function loadDataForAccount(account?: Account): AppData {
  if (typeof window === "undefined") {
    return account && account.id !== "org_rch"
      ? createRealWorkspaceData(account)
      : createSeedData();
  }

  const key = getStorageKey(account?.id);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      return { ...parsed, counters: { ...DEFAULT_COUNTERS, ...parsed.counters } };
    }
  } catch {
    // ignore parse error
  }

  // Real accounts start with clean, empty data (0 fake emergency jobs, £0 overdue)
  if (account && account.id !== "org_rch") {
    return createRealWorkspaceData(account);
  }

  // Fallback demo account
  return createSeedData();
}

/**
 * localStorage is a hard 5MB in most browsers and base64 photos eat it fast.
 * Returns false when the browser refused the write so callers can retry with
 * a lighter payload instead of losing the record.
 */
function persistForAccount(data: AppData, accountId?: string): boolean {
  try {
    const key = getStorageKey(accountId);
    window.localStorage.setItem(key, JSON.stringify(data));
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

export interface StoreValue {
  data: AppData;
  isDemoData: boolean;
  clearAllData: () => void;
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
  const { currentAccount } = usePlatform();
  const accountId = currentAccount?.id;

  const [data, setData] = useState<AppData>(() => loadDataForAccount(currentAccount));

  // Reload when switching accounts
  useEffect(() => {
    setData(loadDataForAccount(currentAccount));
  }, [accountId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (persistForAccount(data, accountId)) return;
    /* Over quota. Drop homeowner photos, the enquiry itself must survive. */
    const stripped: AppData = {
      ...data,
      enquiries: data.enquiries.map((enquiry) => {
        if (!enquiry.photos?.length) return enquiry;
        enquiriesWithDroppedPhotos.add(enquiry.reference);
        return { ...enquiry, photos: [] };
      }),
    };
    persistForAccount(stripped, accountId);
  }, [data, accountId]);

  const update = useCallback((updater: (draft: AppData) => AppData) => {
    setData((prev) => updater(structuredClone(prev)));
  }, []);

  const currentUser = useMemo(() => {
    const member = data.team.find((m) => m.id === data.currentUserId) ??
      data.team[0] ?? {
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

  const isDemoData = useMemo(() => {
    return (
      data.customers.some((c) => c.name.toLowerCase().includes("marie osei")) ||
      data.org.name.toLowerCase().includes("rch drainage") ||
      data.invoices.some((i) => i.id === "inv_seed_1" || i.id === "inv_seed_12")
    );
  }, [data]);

  const clearAllData = useCallback(() => {
    const fresh = createRealWorkspaceData(currentAccount);
    setData(fresh);
    persistForAccount(fresh, accountId);
  }, [currentAccount, accountId]);

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
      isDemoData,
      clearAllData,
      update,
      log,
      currentUser,
      can: capabilitiesFor(currentUser.role),
      reset: () => {
        if (currentAccount?.id && currentAccount.id !== "org_rch") {
          clearAllData();
        } else {
          setData(createSeedData());
        }
      },
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
  }, [data, update, log, currentUser, isDemoData, clearAllData, currentAccount]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
