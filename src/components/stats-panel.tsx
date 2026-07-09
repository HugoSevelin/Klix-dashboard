"use client";

import { useMemo, useState } from "react";
import { Pencil, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Prospect } from "@/lib/types";

interface StatsPanelProps {
  prospects: Prospect[];
  dailyGoal: number;
  onGoalChange: (goal: number) => void;
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function startOfWeek(d: Date): number {
  const c = new Date(d);
  const day = c.getDay(); // 0 = dimanche
  const diff = (day === 0 ? -6 : 1) - day; // lundi comme premier jour
  c.setDate(c.getDate() + diff);
  return startOfDay(c);
}

function daysAgo(d: Date, days: number): number {
  const c = new Date(d);
  c.setDate(c.getDate() - days);
  return startOfDay(c);
}

function computePeriodStats(prospects: Prospect[], sinceMs: number) {
  const inPeriod = prospects.filter(
    (p) => (p.status === "success" || p.status === "failed") && new Date(p.updatedAt).getTime() >= sinceMs
  );
  const success = inPeriod.filter((p) => p.status === "success").length;
  const failed = inPeriod.filter((p) => p.status === "failed").length;
  const total = success + failed;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
  return { success, failed, total, rate };
}

export function StatsPanel({ prospects, dailyGoal, onGoalChange }: StatsPanelProps) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(dailyGoal));

  const today = useMemo(() => computePeriodStats(prospects, startOfDay(new Date())), [prospects]);
  const week = useMemo(() => computePeriodStats(prospects, startOfWeek(new Date())), [prospects]);
  const last30Days = useMemo(
    () => computePeriodStats(prospects, daysAgo(new Date(), 30)),
    [prospects]
  );

  const progress = Math.min(100, Math.round((today.total / Math.max(dailyGoal, 1)) * 100));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="size-4 text-primary" />
              Objectif du jour
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(e.target.value)}
                  className="h-7 w-16 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    const v = Number(draftGoal);
                    if (Number.isFinite(v) && v > 0) onGoalChange(v);
                    setEditingGoal(false);
                  }}
                >
                  OK
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setDraftGoal(String(dailyGoal));
                  setEditingGoal(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {today.total} / {dailyGoal} appels traités aujourd&apos;hui ({progress}%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-primary" />
            Taux de conversion
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Aujourd&apos;hui</p>
              <p className="text-2xl font-semibold tabular-nums">
                {today.total > 0 ? `${today.rate}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {today.success} succès / {today.total} appel(s)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Cette semaine</p>
              <p className="text-2xl font-semibold tabular-nums">
                {week.total > 0 ? `${week.rate}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {week.success} succès / {week.total} appel(s)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">30 derniers jours</p>
              <p className="text-2xl font-semibold tabular-nums">
                {last30Days.total > 0 ? `${last30Days.rate}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {last30Days.success} succès / {last30Days.total} appel(s)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
