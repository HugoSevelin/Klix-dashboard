"use client";

import { CheckCircle2, PhoneCall, Users, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Prospect } from "@/lib/types";

interface KpiCardsProps {
  prospects: Prospect[];
}

export function KpiCards({ prospects }: KpiCardsProps) {
  const total = prospects.length;
  const todo = prospects.filter((p) => p.status === "todo").length;
  const success = prospects.filter((p) => p.status === "success").length;
  const failed = prospects.filter((p) => p.status === "failed").length;

  const kpis = [
    {
      label: "Prospects totaux",
      value: total,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: "Appels à faire",
      value: todo,
      icon: PhoneCall,
      color: "text-blue-400",
    },
    {
      label: "Appels réussis",
      value: success,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      label: "Appels échoués",
      value: failed,
      icon: XCircle,
      color: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
            </div>
            <Icon className={`size-8 ${color} opacity-80`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
