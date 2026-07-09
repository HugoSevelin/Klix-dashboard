import type { Prospect } from "@/lib/types";
import type { Database } from "./database.types";

type Row = Database["public"]["Tables"]["prospects"]["Row"];
type InsertRow = Database["public"]["Tables"]["prospects"]["Insert"];

export function rowToProspect(row: Row): Prospect {
  return {
    id: row.id,
    company: row.company,
    phone: row.phone,
    address: row.address,
    city: row.city ?? undefined,
    website: row.website ?? undefined,
    businessType: row.business_type ?? undefined,
    extra: (row.extra as Record<string, string>) ?? {},
    status: row.status as Prospect["status"],
    failureReason: (row.failure_reason as Prospect["failureReason"]) ?? undefined,
    nextCallDate: row.next_call_date ?? undefined,
    callAttempts: row.call_attempts,
    priority: row.priority,
    notes: row.notes,
    history: (row.history as Prospect["history"]) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function prospectToRow(p: Prospect): InsertRow {
  return {
    id: p.id,
    company: p.company,
    phone: p.phone,
    address: p.address,
    city: p.city ?? null,
    website: p.website ?? null,
    business_type: p.businessType ?? null,
    extra: p.extra,
    status: p.status,
    failure_reason: p.failureReason ?? null,
    next_call_date: p.nextCallDate ?? null,
    call_attempts: p.callAttempts,
    priority: p.priority,
    notes: p.notes,
    history: p.history,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    // owner_id volontairement omis : rempli par le défaut auth.uid() côté DB.
  };
}
