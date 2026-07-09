"use client";

import { useMemo, useState } from "react";
import { AlarmClock, Building2, Globe, MapPin, Phone, Search, Star, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn, getProspectCity, getProspectType, getProspectWebsite } from "@/lib/utils";
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
  onPriorityChange: (id: string, priority: boolean) => void;
  onBulkStatusChange: (ids: string[], status: ProspectStatus) => void;
  onBulkPriorityChange: (ids: string[], priority: boolean) => void;
  onBulkDelete: (prospects: Prospect[]) => void;
}

export function ProspectTable({
  prospects,
  onRowClick,
  onStatusChange,
  onPriorityChange,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkDelete,
}: ProspectTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [failureFilter, setFailureFilter] = useState<FailureReason | "">("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const cityOptions = useMemo(() => {
    const cities = prospects.map((p) => getProspectCity(p)).filter((c): c is string => !!c);
    return Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  const typeOptions = useMemo(() => {
    const types = prospects.map((p) => getProspectType(p)).filter((t): t is string => !!t);
    return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (failureFilter && p.failureReason !== failureFilter) return false;
        if (cityFilter && getProspectCity(p) !== cityFilter) return false;
        if (typeFilter && getProspectType(p) !== typeFilter) return false;
        if (priorityFilter && !p.priority) return false;
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
      })
      .sort((a, b) => Number(b.priority) - Number(a.priority));
  }, [prospects, search, statusFilter, failureFilter, cityFilter, typeFilter, priorityFilter]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  function toggleSelectRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={cityFilter || NONE}
            onValueChange={(v) => setCityFilter(v === NONE ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Toutes les villes</SelectItem>
              {cityOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter || NONE}
            onValueChange={(v) => setTypeFilter(v === NONE ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type d'entreprise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Tous les types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Button
            variant={priorityFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setPriorityFilter((v) => !v)}
          >
            <Star className={cn("size-3.5", priorityFilter && "fill-current")} />
            Prioritaires
          </Button>
          {(cityFilter || typeFilter || priorityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCityFilter("");
                setTypeFilter("");
                setPriorityFilter(false);
              }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">{selected.size} sélectionné(s)</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkStatusChange(selectedIds, "todo")}
              >
                À faire
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkStatusChange(selectedIds, "success")}
              >
                Succès
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkStatusChange(selectedIds, "failed")}
              >
                Échec
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkPriorityChange(selectedIds, true)}
              >
                <Star className="size-3.5" />
                Prioritaire
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmBulkDelete(true)}
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setSelected(new Set())} title="Annuler la sélection">
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border py-12 text-center text-muted-foreground">
            <Building2 className="size-6" />
            <p className="text-sm">
              {prospects.length === 0
                ? "Aucun prospect. Importez un fichier CSV ou ajoutez-en un pour commencer."
                : "Aucun résultat pour ces filtres."}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const websiteUrl = getProspectWebsite(p);
            const city = getProspectCity(p);
            return (
              <Card
                key={p.id}
                className={cn(
                  "cursor-pointer",
                  p.nextCallDate &&
                    new Date(p.nextCallDate).setHours(0, 0, 0, 0) < startOfToday() &&
                    "border-red-500/30 bg-red-500/5"
                )}
                onClick={() => onRowClick(p)}
              >
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPriorityChange(p.id, !p.priority);
                        }}
                        title={p.priority ? "Retirer des prioritaires" : "Marquer comme prioritaire"}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-amber-500"
                      >
                        <Star className={cn("size-4", p.priority && "fill-amber-400 text-amber-400")} />
                      </button>
                      <div>
                        <p className="font-medium">{p.company}</p>
                        {city && <p className="text-xs text-muted-foreground">{city}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {websiteUrl && (
                            <a
                              href={websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline mr-1"
                            >
                              <Globe className="size-3 text-muted-foreground" />
                              {websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                            </a>
                          )}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(p.company + " " + (city || ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-4 items-center gap-0.5 rounded bg-muted px-1 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Rechercher sur Google"
                          >
                            <Search className="size-2" /> Google
                          </a>
                          <a
                            href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.company)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-4 items-center gap-0.5 rounded bg-muted px-1 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Rechercher sur LinkedIn"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-2">
                              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                              <rect width="4" height="12" x="2" y="9" />
                              <circle cx="4" cy="4" r="2" />
                            </svg> LinkedIn
                          </a>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={p.status} failureReason={p.failureReason} />
                  </div>
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-lg font-medium tabular-nums text-primary"
                    >
                      <Phone className="size-4" />
                      {p.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Téléphone non renseigné</p>
                  )}
                  <div
                    className="flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusButtons
                      size="default"
                      status={p.status}
                      onChange={(s, reason) => onStatusChange(p.id, s, reason)}
                    />
                    <ReminderBadge nextCallDate={p.nextCallDate} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="hidden rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="hidden sm:table-cell">Ville</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
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
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-6" />
                    {prospects.length === 0
                      ? "Aucun prospect. Importez un fichier CSV ou ajoutez-en un pour commencer."
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={(checked) => toggleSelectRow(p.id, checked === true)}
                        aria-label={`Sélectionner ${p.company}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-start gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPriorityChange(p.id, !p.priority);
                          }}
                          title={p.priority ? "Retirer des prioritaires" : "Marquer comme prioritaire"}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-amber-500"
                        >
                          <Star className={cn("size-4", p.priority && "fill-amber-400 text-amber-400")} />
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <span>{p.company}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {websiteUrl && (
                              <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex w-fit items-center gap-1 text-xs font-normal text-primary hover:underline mr-0.5"
                              >
                                <Globe className="size-3 text-muted-foreground" />
                                {websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                              </a>
                            )}
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(p.company + " " + (getProspectCity(p) || ""))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-4 items-center gap-0.5 rounded bg-muted px-1 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Rechercher sur Google"
                            >
                              <Search className="size-2" /> Google
                            </a>
                            <a
                              href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.company)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-4 items-center gap-0.5 rounded bg-muted px-1 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Rechercher sur LinkedIn"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-2">
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                <rect width="4" height="12" x="2" y="9" />
                                <circle cx="4" cy="4" r="2" />
                              </svg> LinkedIn
                            </a>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{p.phone || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getProspectCity(p) || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getProspectType(p) || "—"}</TableCell>
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

      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {selected.size} prospect(s) ?</DialogTitle>
            <DialogDescription>
              Cette action supprime définitivement les prospects sélectionnés, leurs
              notes et leur historique.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onBulkDelete(prospects.filter((p) => selected.has(p.id)));
                setSelected(new Set());
                setConfirmBulkDelete(false);
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
