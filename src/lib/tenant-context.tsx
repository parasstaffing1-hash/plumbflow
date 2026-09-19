import { createContext, useContext } from "react";
import type { Tenant } from "@/lib/tenants";

export interface TenantContextValue {
  tenant: Tenant;
  emergency: boolean;
  setEmergency: (next: boolean) => void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used inside the booking layout");
  return context;
}
