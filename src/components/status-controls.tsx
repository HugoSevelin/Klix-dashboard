"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FailureReason, ProspectStatus } from "@/lib/types";
import { FAILURE_REASON_LABELS, STATUS_LABELS } from "@/lib/types";

export function StatusBadge({
  status,
  failureReason,
}: {
  status: ProspectStatus;
  failureReason?: FailureReason;
}) {
  const styles: Record<ProspectStatus, string> = {
    todo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <Badge variant="outline" className={cn("gap-1", styles[status])}>
      {status === "todo" && <Clock className="size-3" />}
      {status === "success" && <CheckCircle2 className="size-3" />}
      {status === "failed" && <XCircle className="size-3" />}
      {STATUS_LABELS[status]}
      {status === "failed" && failureReason && (
        <span className="opacity-80">· {FAILURE_REASON_LABELS[failureReason]}</span>
      )}
    </Badge>
  );
}

interface StatusButtonsProps {
  status: ProspectStatus;
  onChange: (status: ProspectStatus, failureReason?: FailureReason) => void;
  size?: "sm" | "default";
}

export function StatusButtons({ status, onChange, size = "sm" }: StatusButtonsProps) {
  const btnSize = size === "sm" ? "icon-sm" : "icon";

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size={btnSize}
        title={STATUS_LABELS.todo}
        className={cn(
          "text-muted-foreground",
          status === "todo" && "bg-blue-500/20 text-blue-400"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onChange("todo");
        }}
      >
        <Clock className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size={btnSize}
        title={STATUS_LABELS.success}
        className={cn(
          "text-muted-foreground",
          status === "success" && "bg-emerald-500/20 text-emerald-400"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onChange("success");
        }}
      >
        <CheckCircle2 className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={btnSize}
            title={STATUS_LABELS.failed}
            className={cn(
              "text-muted-foreground",
              status === "failed" && "bg-red-500/20 text-red-400"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <XCircle className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {(Object.keys(FAILURE_REASON_LABELS) as FailureReason[]).map((reason) => (
            <DropdownMenuItem
              key={reason}
              onClick={() => onChange("failed", reason)}
            >
              {FAILURE_REASON_LABELS[reason]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
