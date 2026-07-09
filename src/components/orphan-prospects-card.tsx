"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Prospect } from "@/lib/types";

const STALE_AFTER_DAYS = 14;

function isOrphan(p: Prospect): boolean {
  const noPhone = !p.phone.trim();
  const staleUntouched =
    p.status === "todo" &&
    p.callAttempts === 0 &&
    !p.nextCallDate &&
    Date.now() - new Date(p.createdAt).getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return noPhone || staleUntouched;
}

interface OrphanProspectsCardProps {
  prospects: Prospect[];
  onSelect: (id: string) => void;
}

export function OrphanProspectsCard({ prospects, onSelect }: OrphanProspectsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const orphans = useMemo(() => prospects.filter(isOrphan), [prospects]);
  const noPhoneCount = useMemo(() => orphans.filter((p) => !p.phone.trim()).length, [orphans]);
  const staleCount = orphans.length - noPhoneCount;

  if (orphans.length === 0) return null;

  const visible = expanded ? orphans : orphans.slice(0, 5);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserX className="size-4 text-amber-500" />
          {orphans.length} prospect(s) orphelin(s)
        </div>
        <p className="text-xs text-muted-foreground">
          {noPhoneCount > 0 && <>{noPhoneCount} sans numéro de téléphone</>}
          {noPhoneCount > 0 && staleCount > 0 && " · "}
          {staleCount > 0 && (
            <>{staleCount} jamais appelé(s) depuis plus de {STALE_AFTER_DAYS} jours</>
          )}
        </p>
        <ul className="divide-y">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center justify-between py-1.5 text-left text-sm hover:text-primary"
              >
                <span className="truncate">{p.company}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {!p.phone.trim() ? "Sans téléphone" : "Jamais appelé"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {orphans.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                Voir les {orphans.length - 5} autres
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
