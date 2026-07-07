"use client";

import { useMemo, useState } from "react";
import { AlarmClock, Building2, Globe, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, StatusButtons } from "@/components/status-controls";
import { cn, getProspectCity, getProspectWebsite } from "@/lib/utils";
import type { FailureReason, Prospect, ProspectStatus } from "@/lib/types";
import { FAILURE_REASON_LABELS } from "@/lib/types";

type StatusFilter = ProspectStatus | "all";
const NONE = "__all__";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function ReminderBadge({ nextCallDate }: { nextCallDate?: string }) {
  if (!nextCallDate) return <span className="text-muted-foreground">—</span>;
  const today = startOfToday();
  const target = new Date(nextCallDate).setHours(0, 0, 0, 0);
  const label = new Date(nextCallDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
  if (target < today) {
    return (
      <Badge variant="outline" className="gap-1 border-red-500/30 bg-red-500/15 text-red-400">
        <AlarmClock className="size-3" />
        En retard · {label}
      </Badge>
    );
  }
  if (target === today) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/15 text-amber-400">
        <AlarmClock className="size-3" />
        Aujourd&apos;hui
      </Badge>
    );
  }
  return <span className="text-muted-foreground">{label}</span>;
}

interface ProspectTableProps {
  prospects: Prospect[];
  onRowClick: (prospect: Prospect) => void;
  onStatusChange: (id: string, status: ProspectStatus, failureReason?: FailureReason) => void;
}

export function ProspectTable({
  prospects,
  onRowClick,
  onStatusChange,
}: ProspectTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [failureFilter, setFailureFilter] = useState<FailureReason | "">("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (failureFilter && p.failureReason !== failureFilter) return false;
      if (!q) return true;
      const haystack = [
        p.company,
        p.phone,
        p.address,
        p.notes,
        ...Object.values(p.extra),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [prospects, search, statusFilter, failureFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (entreprise, téléphone, ville…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          {statusFilter === "failed" && (
            <Select
              value={failureFilter || NONE}
              onValueChange={(v) => setFailureFilter(v === NONE ? "" : (v as FailureReason))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Raison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Toutes les raisons</SelectItem>
                {(Object.keys(FAILURE_REASON_LABELS) as FailureReason[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {FAILURE_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              if (v !== "failed") setFailureFilter("");
            }}
          >
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="todo">À faire</TabsTrigger>
              <TabsTrigger value="success">Succès</TabsTrigger>
              <TabsTrigger value="failed">Échec</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="hidden sm:table-cell">Ville</TableHead>
              <TableHead className="hidden md:table-cell">Adresse</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden lg:table-cell">Rappel</TableHead>
              <TableHead className="hidden sm:table-cell text-center">Tent.</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-6" />
                    {prospects.length === 0
                      ? "Aucun prospect. Importez un fichier CSV pour commencer."
                      : "Aucun résultat pour ces filtres."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const websiteUrl = getProspectWebsite(p);
                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "cursor-pointer",
                      p.nextCallDate &&
                        new Date(p.nextCallDate).setHours(0, 0, 0, 0) < startOfToday() &&
                        "bg-red-500/5"
                    )}
                    onClick={() => onRowClick(p)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{p.company}</span>
                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex w-fit items-center gap-1 text-xs font-normal text-primary hover:underline"
                          >
                            <Globe className="size-3 text-muted-foreground" />
                            {websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{p.phone || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getProspectCity(p) || "—"}</TableCell>
                    <TableCell className="hidden max-w-64 truncate md:table-cell">
                      {p.address || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} failureReason={p.failureReason} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ReminderBadge nextCallDate={p.nextCallDate} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums text-muted-foreground">
                      {p.callAttempts}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <StatusButtons
                          status={p.status}
                          onChange={(s, reason) => onStatusChange(p.id, s, reason)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} prospect(s) affiché(s) sur {prospects.length}
      </p>
    </div>
  );
}
