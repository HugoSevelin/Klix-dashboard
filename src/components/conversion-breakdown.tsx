"use client";

import { useMemo } from "react";
import { Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getProspectCity, getProspectType } from "@/lib/utils";
import type { Prospect } from "@/lib/types";

interface BreakdownEntry {
  key: string;
  success: number;
  total: number;
  rate: number;
}

function computeBreakdown(
  prospects: Prospect[],
  keyFn: (p: Prospect) => string | null
): BreakdownEntry[] {
  const map = new Map<string, { success: number; total: number }>();
  for (const p of prospects) {
    if (p.status !== "success" && p.status !== "failed") continue;
    const key = keyFn(p);
    if (!key) continue;
    const entry = map.get(key) ?? { success: 0, total: 0 };
    entry.total += 1;
    if (p.status === "success") entry.success += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([key, { success, total }]) => ({
      key,
      success,
      total,
      rate: Math.round((success / total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function BreakdownList({ entries }: { entries: BreakdownEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Pas encore d&apos;appels traités.</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">{e.key}</span>
            <span className="tabular-nums text-muted-foreground">
              {e.rate}% · {e.success}/{e.total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${e.rate}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface ConversionBreakdownProps {
  prospects: Prospect[];
}

export function ConversionBreakdown({ prospects }: ConversionBreakdownProps) {
  const byCity = useMemo(() => computeBreakdown(prospects, getProspectCity), [prospects]);
  const byType = useMemo(() => computeBreakdown(prospects, getProspectType), [prospects]);

  if (byCity.length === 0 && byType.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4 text-primary" />
            Taux de conversion par ville
          </div>
          <BreakdownList entries={byCity} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-primary" />
            Taux de conversion par type d&apos;entreprise
          </div>
          <BreakdownList entries={byType} />
        </CardContent>
      </Card>
    </div>
  );
}
