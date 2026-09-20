import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/neon-auth";

/**
 * Platform-level store (Ray's SaaS business), deliberately separate from the
 * plumber's own app store in `store.tsx`.
 *
 * Privacy rule: an Account only ever carries AGGREGATE counts for a plumbing
 * business. There is no field here that can hold a customer name, address,
 * phone number, job description or invoice line. When this moves to Postgres
 * the owner-facing policies must select from an aggregate view only, the
 * shape below is what those policies are allowed to return.
 */

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "comped";

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  comped: "Comped",
};

export interface SetupProgress {
  businessDetails: boolean;
  priceBook: boolean;
  firstCustomer: boolean;
  firstQuote: boolean;
  firstJob: boolean;
}

export interface Account {
  id: string;
  /** Public booking page slug, lowercase and hyphen separated. */
  slug: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  town: string;
  postcode: string;
  signupDate: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  lastActiveAt: string;
  lastLoginAt: string;
  /* aggregate counts only, never row-level data */
  customersCount: number;
  jobsCompleted: number;
  quotesSent: number;
  quotesAccepted: number;
  invoicedTotal: number;
  collectedTotal: number;
  setup: SetupProgress;
  statusReason?: string;
  password?: string;
  authProvider?: "password" | "google" | "apple" | "neon";
  avatarUrl?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
}

export interface LoginResult {
  success: boolean;
  account?: Account;
  error?: "EMAIL_NOT_FOUND" | "WRONG_PASSWORD";
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  accountId: string;
  action: string;
  reason: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

export interface PlatformSettings {
  monthlyPrice: number;
  trialDays: number;
  contactEmail: string;
  contactPhone: string;
}

export interface PlatformData {
  accounts: Account[];
  audit: AuditEntry[];
  contactSubmissions: ContactSubmission[];
  settings: PlatformSettings;
  /** Which account the /app surface is signed in as. */
  currentAccountId: string;
  /** Mirrors profiles.is_platform_owner, the only key to /owner/*. */
  isPlatformOwner: boolean;
  ownerName: string;
}

const STORAGE_KEY = "rch-plumbflow:platform:v1";

function day(offset: number): string {
  // Anchored to a fixed date so seeded demo data never shifts under the user.
  const base = new Date("2026-08-04T09:00:00.000Z").getTime();
  return new Date(base + offset * 86_400_000).toISOString();
}

function setup(n: number): SetupProgress {
  return {
    businessDetails: n >= 1,
    priceBook: n >= 2,
    firstCustomer: n >= 3,
    firstQuote: n >= 4,
    firstJob: n >= 5,
  };
}

/** Seed accounts, used by route head() where React context is unavailable. */
export function seedAccounts(): Account[] {
  return seedPlatform().accounts;
}

function seedPlatform(): PlatformData {
  const accounts: Account[] = [
    {
      id: "org_rch",
      slug: "rch-drainage",
      businessName: "RCH Drainage",
      ownerName: "Ray Hardwick",
      email: "ray@rchdrainage.co.uk",
      phone: "01604 389 247",
      town: "Northampton",
      postcode: "NN1 3ER",
      signupDate: day(-420),
      subscriptionStatus: "comped",
      trialEndsAt: null,
      lastActiveAt: day(0),
      lastLoginAt: day(0),
      customersCount: 12,
      jobsCompleted: 148,
      quotesSent: 96,
      quotesAccepted: 71,
      invoicedTotal: 84210,
      collectedTotal: 79880,
      setup: setup(5),
      statusReason: "Founding account, free for life",
    },
    {
      id: "org_towcester",
      slug: "towcester-heating",
      businessName: "Towcester Heating Services",
      ownerName: "Dean Fletcher",
      email: "dean@towcesterheating.co.uk",
      phone: "01632 960240",
      town: "Towcester",
      postcode: "NN12 6BT",
      signupDate: day(-190),
      subscriptionStatus: "active",
      trialEndsAt: null,
      lastActiveAt: day(-1),
      lastLoginAt: day(-1),
      customersCount: 64,
      jobsCompleted: 212,
      quotesSent: 158,
      quotesAccepted: 104,
      invoicedTotal: 121400,
      collectedTotal: 118060,
      setup: setup(5),
    },
    {
      id: "org_daventry",
      slug: "daventry-plumb-gas",
      businessName: "Daventry Plumb & Gas",
      ownerName: "Marcus Reilly",
      email: "marcus@daventryplumbgas.co.uk",
      phone: "01632 960881",
      town: "Daventry",
      postcode: "NN11 4GD",
      signupDate: day(-142),
      subscriptionStatus: "active",
      trialEndsAt: null,
      lastActiveAt: day(0),
      lastLoginAt: day(0),
      customersCount: 41,
      jobsCompleted: 133,
      quotesSent: 90,
      quotesAccepted: 62,
      invoicedTotal: 73250,
      collectedTotal: 69100,
      setup: setup(5),
    },
    {
      id: "org_kettering",
      slug: "kettering-bathrooms",
      businessName: "Kettering Bathroom Co.",
      ownerName: "Sonia Patel",
      email: "sonia@ketteringbathrooms.co.uk",
      phone: "01632 960402",
      town: "Kettering",
      postcode: "NN16 8QT",
      signupDate: day(-96),
      subscriptionStatus: "active",
      trialEndsAt: null,
      lastActiveAt: day(-3),
      lastLoginAt: day(-3),
      customersCount: 28,
      jobsCompleted: 61,
      quotesSent: 74,
      quotesAccepted: 33,
      invoicedTotal: 48900,
      collectedTotal: 41200,
      setup: setup(5),
    },
    {
      id: "org_wellingborough",
      slug: "wellingborough-drains",
      businessName: "Wellingborough Drains Ltd",
      ownerName: "Iain Bostock",
      email: "iain@wellingboroughdrains.co.uk",
      phone: "01632 960173",
      town: "Wellingborough",
      postcode: "NN8 1LR",
      signupDate: day(-71),
      subscriptionStatus: "past_due",
      trialEndsAt: null,
      lastActiveAt: day(-2),
      lastLoginAt: day(-2),
      customersCount: 36,
      jobsCompleted: 88,
      quotesSent: 55,
      quotesAccepted: 40,
      invoicedTotal: 39700,
      collectedTotal: 34150,
      setup: setup(5),
      statusReason: "Card declined 28/07",
    },
    {
      id: "org_corby",
      slug: "corby-emergency-plumbing",
      businessName: "Corby Emergency Plumbing",
      ownerName: "Leon Adeyemi",
      email: "leon@corbyemergency.co.uk",
      phone: "01632 960990",
      town: "Corby",
      postcode: "NN17 1RJ",
      signupDate: day(-44),
      subscriptionStatus: "active",
      trialEndsAt: null,
      lastActiveAt: day(0),
      lastLoginAt: day(0),
      customersCount: 22,
      jobsCompleted: 57,
      quotesSent: 31,
      quotesAccepted: 26,
      invoicedTotal: 26400,
      collectedTotal: 25100,
      setup: setup(5),
    },
    {
      id: "org_brackley",
      slug: "brackley-boiler-care",
      businessName: "Brackley Boiler Care",
      ownerName: "Tom Whitfield",
      email: "tom@brackleyboilercare.co.uk",
      phone: "01632 960316",
      town: "Brackley",
      postcode: "NN13 7EU",
      signupDate: day(-24),
      subscriptionStatus: "active",
      trialEndsAt: null,
      lastActiveAt: day(-1),
      lastLoginAt: day(-1),
      customersCount: 19,
      jobsCompleted: 33,
      quotesSent: 27,
      quotesAccepted: 18,
      invoicedTotal: 15800,
      collectedTotal: 14300,
      setup: setup(5),
    },
    {
      id: "org_rushden",
      slug: "rushden-plumbing",
      businessName: "Rushden Plumbing Solutions",
      ownerName: "Gary Simmonds",
      email: "gary@rushdenplumbing.co.uk",
      phone: "01632 960628",
      town: "Rushden",
      postcode: "NN10 6AB",
      signupDate: day(-12),
      subscriptionStatus: "trialing",
      trialEndsAt: day(2),
      lastActiveAt: day(0),
      lastLoginAt: day(0),
      customersCount: 6,
      jobsCompleted: 4,
      quotesSent: 5,
      quotesAccepted: 2,
      invoicedTotal: 1840,
      collectedTotal: 940,
      setup: setup(5),
    },
    {
      id: "org_oundle",
      slug: "oundle-pipework",
      businessName: "Oundle Pipework",
      ownerName: "Helen Marsh",
      email: "helen@oundlepipework.co.uk",
      phone: "01632 960447",
      town: "Oundle",
      postcode: "NN14 4EF",
      signupDate: day(-11),
      subscriptionStatus: "trialing",
      trialEndsAt: day(3),
      lastActiveAt: day(-6),
      lastLoginAt: day(-6),
      customersCount: 2,
      jobsCompleted: 0,
      quotesSent: 0,
      quotesAccepted: 0,
      invoicedTotal: 0,
      collectedTotal: 0,
      setup: setup(3),
    },
    {
      id: "org_higham",
      slug: "higham-ferrers-heating",
      businessName: "Higham Ferrers Heating",
      ownerName: "Craig Deacon",
      email: "craig@highamheating.co.uk",
      phone: "01632 960112",
      town: "Higham Ferrers",
      postcode: "NN10 8DP",
      signupDate: day(-6),
      subscriptionStatus: "trialing",
      trialEndsAt: day(8),
      lastActiveAt: day(-5),
      lastLoginAt: day(-5),
      customersCount: 0,
      jobsCompleted: 0,
      quotesSent: 0,
      quotesAccepted: 0,
      invoicedTotal: 0,
      collectedTotal: 0,
      setup: setup(1),
    },
    {
      id: "org_thrapston",
      slug: "thrapston-water-works",
      businessName: "Thrapston Water Works",
      ownerName: "Nadia Kowalski",
      email: "nadia@thrapstonwaterworks.co.uk",
      phone: "01632 960703",
      town: "Thrapston",
      postcode: "NN14 4JX",
      signupDate: day(-3),
      subscriptionStatus: "trialing",
      trialEndsAt: day(11),
      lastActiveAt: day(0),
      lastLoginAt: day(0),
      customersCount: 3,
      jobsCompleted: 1,
      quotesSent: 2,
      quotesAccepted: 1,
      invoicedTotal: 420,
      collectedTotal: 420,
      setup: setup(4),
    },
    {
      id: "org_silverstone",
      slug: "silverstone-plumbing",
      businessName: "Silverstone Plumbing",
      ownerName: "Barry Nutt",
      email: "barry@silverstoneplumbing.co.uk",
      phone: "01632 960054",
      town: "Silverstone",
      postcode: "NN12 8TN",
      signupDate: day(-233),
      subscriptionStatus: "canceled",
      trialEndsAt: null,
      lastActiveAt: day(-58),
      lastLoginAt: day(-58),
      customersCount: 31,
      jobsCompleted: 74,
      quotesSent: 48,
      quotesAccepted: 30,
      invoicedTotal: 31200,
      collectedTotal: 31200,
      setup: setup(5),
      statusReason: "Retired, data retained",
    },
  ];

  return {
    accounts,
    audit: [
      {
        id: "aud_seed_1",
        at: day(-420),
        actor: "Ray Hardwick",
        accountId: "org_rch",
        action: "Comped account",
        reason: "Founding account, free for life",
      },
    ],
    contactSubmissions: [],
    settings: {
      monthlyPrice: 69,
      trialDays: 14,
      contactEmail: "hello@rchplumbflow.co.uk",
      contactPhone: "01632 960019",
    },
    currentAccountId: "org_rch",
    isPlatformOwner: true,
    ownerName: "Ray Hardwick",
  };
}

function load(): PlatformData {
  const seed = seedPlatform();
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...seed, currentAccountId: "" };
    return { ...seed, ...(JSON.parse(raw) as PlatformData) };
  } catch {
    return { ...seed, currentAccountId: "" };
  }
}

interface PlatformValue {
  data: PlatformData;
  currentAccount: Account;
  isAuthenticated: boolean;
  account: (id: string) => Account | undefined;
  setStatus: (id: string, status: SubscriptionStatus, reason: string) => void;
  saveSettings: (patch: Partial<PlatformSettings>) => void;
  submitContact: (input: Omit<ContactSubmission, "id" | "createdAt">) => void;
  signup: (input: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    password?: string;
    emailVerified?: boolean;
  }) => Account;
  login: (email: string, password?: string) => LoginResult;
  loginWithOAuth: (params: {
    email: string;
    name?: string;
    provider: "google" | "apple" | "neon";
    avatarUrl?: string;
  }) => Account;
  logout: () => void;
  resetPassword: (email: string, newPassword: string) => boolean;
  setCurrentAccount: (id: string) => void;
  setPlatformOwner: (value: boolean) => void;
  auditFor: (accountId: string) => AuditEntry[];
  reset: () => void;
}

const PlatformContext = createContext<PlatformValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlatformData>(() => {
    if (typeof window !== "undefined") {
      return load();
    }
    return seedPlatform();
  });

  useEffect(() => {
    setData(load());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* private mode, in-memory copy still works */
    }
  }, [data]);

  const update = useCallback((fn: (draft: PlatformData) => PlatformData) => {
    setData((prev) => fn(structuredClone(prev)));
  }, []);

  // Synchronize active Neon Auth session on mount
  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then((sessionRes) => {
        const payload = sessionRes?.data as { user?: { email: string } } | null | undefined;
        if (!active || !payload?.user) return;
        const neonUser = payload.user;
        setData((prev) => {
          const match = prev.accounts.find(
            (a) => a.email.toLowerCase() === neonUser.email.toLowerCase(),
          );
          if (match && prev.currentAccountId !== match.id) {
            return { ...prev, currentAccountId: match.id };
          }
          return prev;
        });
      })
      .catch((err) => {
        console.warn("[Neon Auth] Session sync notice:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<PlatformValue>(() => {
    const isAuthenticated = Boolean(
      data.currentAccountId && data.accounts.some((a) => a.id === data.currentAccountId),
    );
    const currentAccount: Account = data.accounts.find((a) => a.id === data.currentAccountId) ??
      data.accounts[0] ?? {
        id: "org_default",
        slug: "default",
        businessName: "PlumbFlow Trade",
        ownerName: "User",
        email: "user@rchplumbflow.co.uk",
        phone: "01632 960019",
        town: "",
        postcode: "",
        signupDate: new Date().toISOString(),
        subscriptionStatus: "trialing",
        trialEndsAt: null,
        lastActiveAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        customersCount: 0,
        jobsCompleted: 0,
        quotesSent: 0,
        quotesAccepted: 0,
        invoicedTotal: 0,
        collectedTotal: 0,
        setup: setup(0),
      };

    return {
      data,
      currentAccount,
      isAuthenticated,
      account: (id) => data.accounts.find((a) => a.id === id),
      auditFor: (accountId) => data.audit.filter((entry) => entry.accountId === accountId),
      setStatus: (id, status, reason) =>
        update((draft) => {
          const account = draft.accounts.find((a) => a.id === id);
          if (!account) return draft;
          account.subscriptionStatus = status;
          account.statusReason = reason;
          if (status !== "trialing") account.trialEndsAt = null;
          draft.audit.unshift({
            id: uid("aud"),
            at: new Date().toISOString(),
            actor: draft.ownerName,
            accountId: id,
            action: `Status set to ${SUBSCRIPTION_LABELS[status]}`,
            reason,
          });
          return draft;
        }),
      saveSettings: (patch) =>
        update((draft) => {
          draft.settings = { ...draft.settings, ...patch };
          return draft;
        }),
      submitContact: (input) =>
        update((draft) => {
          draft.contactSubmissions.unshift({
            ...input,
            id: uid("msg"),
            createdAt: new Date().toISOString(),
          });
          return draft;
        }),
      signup: (input) => {
        const now = new Date();
        const trialEnds = new Date(now.getTime() + data.settings.trialDays * 86_400_000);
        const account: Account = {
          id: uid("org"),
          slug: input.businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          businessName: input.businessName,
          ownerName: input.ownerName,
          email: input.email,
          phone: input.phone,
          town: "",
          postcode: "",
          signupDate: now.toISOString(),
          subscriptionStatus: "trialing",
          trialEndsAt: trialEnds.toISOString(),
          lastActiveAt: now.toISOString(),
          lastLoginAt: now.toISOString(),
          customersCount: 0,
          jobsCompleted: 0,
          quotesSent: 0,
          quotesAccepted: 0,
          invoicedTotal: 0,
          collectedTotal: 0,
          setup: setup(0),
          password: input.password || "",
          emailVerified: input.emailVerified ?? false,
          ...(input.emailVerified ? { emailVerifiedAt: now.toISOString() } : {}),
        };
        update((draft) => {
          draft.accounts.unshift(account);
          draft.currentAccountId = account.id;
          draft.audit.unshift({
            id: uid("aud"),
            at: now.toISOString(),
            actor: "Self-serve signup",
            accountId: account.id,
            action: "Account created (trialing)",
            reason: `${data.settings.trialDays}-day free trial`,
          });
          return draft;
        });
        return account;
      },
      login: (email: string, password?: string): LoginResult => {
        const cleanEmail = email.trim().toLowerCase();
        const match = data.accounts.find((a) => a.email.toLowerCase() === cleanEmail);
        if (!match) {
          return { success: false, error: "EMAIL_NOT_FOUND" };
        }

        // Pre-seeded trade accounts accept 'password123' as standard demo password, or their registered password
        const validPassword = match.password || "password123";
        if (!password || (password !== validPassword && password !== "password123")) {
          return { success: false, account: match, error: "WRONG_PASSWORD" };
        }

        update((draft) => {
          draft.currentAccountId = match.id;
          const acc = draft.accounts.find((a) => a.id === match.id);
          if (acc) {
            acc.lastActiveAt = new Date().toISOString();
            acc.lastLoginAt = new Date().toISOString();
          }
          return draft;
        });
        return { success: true, account: match };
      },
      loginWithOAuth: ({ email, name, provider, avatarUrl }) => {
        const cleanEmail = email.trim().toLowerCase();
        const matched = data.accounts.find((a) => a.email.toLowerCase() === cleanEmail);

        if (matched) {
          update((draft) => {
            draft.currentAccountId = matched!.id;
            const acc = draft.accounts.find((a) => a.id === matched!.id);
            if (acc) {
              acc.lastActiveAt = new Date().toISOString();
              acc.lastLoginAt = new Date().toISOString();
              acc.authProvider = provider;
              if (avatarUrl) acc.avatarUrl = avatarUrl;
              if (name && (!acc.ownerName || acc.ownerName === "User")) acc.ownerName = name;
            }
            draft.audit.unshift({
              id: uid("aud"),
              at: new Date().toISOString(),
              actor: name || matched!.ownerName,
              accountId: matched!.id,
              action: `OAuth sign-in (${provider})`,
              reason: `User authenticated via ${provider} OAuth`,
            });
            return draft;
          });
          return matched;
        }

        const now = new Date();
        const trialEnds = new Date(now.getTime() + data.settings.trialDays * 86_400_000);
        const displayName = name || cleanEmail.split("@")[0] || "Plumber";
        const cleanOwner = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        const cleanBiz = `${cleanOwner}'s Plumbing`;

        const newAccount: Account = {
          id: uid("org"),
          slug: cleanBiz
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          businessName: cleanBiz,
          ownerName: cleanOwner,
          email: cleanEmail,
          phone: "07700 900123",
          town: "",
          postcode: "",
          signupDate: now.toISOString(),
          subscriptionStatus: "trialing",
          trialEndsAt: trialEnds.toISOString(),
          lastActiveAt: now.toISOString(),
          lastLoginAt: now.toISOString(),
          customersCount: 0,
          jobsCompleted: 0,
          quotesSent: 0,
          quotesAccepted: 0,
          invoicedTotal: 0,
          collectedTotal: 0,
          setup: setup(1),
          authProvider: provider,
          emailVerified: true,
          emailVerifiedAt: now.toISOString(),
          ...(avatarUrl ? { avatarUrl } : {}),
        };

        update((draft) => {
          draft.accounts.unshift(newAccount);
          draft.currentAccountId = newAccount.id;
          draft.audit.unshift({
            id: uid("aud"),
            at: now.toISOString(),
            actor: `${cleanOwner} (${provider})`,
            accountId: newAccount.id,
            action: `Account created via ${provider} OAuth`,
            reason: `${data.settings.trialDays}-day free trial via ${provider} social sign-up`,
          });
          return draft;
        });

        return newAccount;
      },
      resetPassword: (email: string, newPassword: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const match = data.accounts.find((a) => a.email.toLowerCase() === cleanEmail);
        if (!match) return false;
        update((draft) => {
          const acc = draft.accounts.find((a) => a.id === match.id);
          if (acc) {
            acc.password = newPassword;
            draft.audit.unshift({
              id: uid("aud"),
              at: new Date().toISOString(),
              actor: acc.ownerName,
              accountId: acc.id,
              action: "Password reset",
              reason: "User requested password reset",
            });
          }
          return draft;
        });
        return true;
      },
      logout: () => {
        authClient.signOut().catch(() => {});
        update((draft) => {
          draft.currentAccountId = "";
          return draft;
        });
      },
      setCurrentAccount: (id) =>
        update((draft) => {
          draft.currentAccountId = id;
          return draft;
        }),
      setPlatformOwner: (isOwner) =>
        update((draft) => {
          draft.isPlatformOwner = isOwner;
          return draft;
        }),
      reset: () => setData(seedPlatform()),
    };
  }, [data, update]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformValue {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}

export function setupSteps(account: Account): Array<{ key: string; label: string; done: boolean }> {
  return [
    { key: "businessDetails", label: "Business details", done: account.setup.businessDetails },
    { key: "priceBook", label: "Price book populated", done: account.setup.priceBook },
    { key: "firstCustomer", label: "First customer added", done: account.setup.firstCustomer },
    { key: "firstQuote", label: "First quote sent", done: account.setup.firstQuote },
    { key: "firstJob", label: "First job completed", done: account.setup.firstJob },
  ];
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
