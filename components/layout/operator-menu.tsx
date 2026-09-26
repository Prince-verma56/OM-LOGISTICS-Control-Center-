"use client";

import { Activity, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_CONFIG } from "@/config/demo";

/** Demo operator identity. Authentication and RBAC arrive in a later phase (brain/21). */
export function OperatorMenu() {
  const { operator } = DEMO_CONFIG;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label={`Signed in as ${operator.name}`}>
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">{operator.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start leading-tight xl:flex">
            <span className="text-xs font-medium">{operator.name}</span>
            <span className="text-[10px] text-muted-foreground">Ops manager · demo</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{operator.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{operator.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <ShieldCheck className="size-4" />
          Role: {operator.role.replace("_", " ").toLowerCase()} (simulated)
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2">
          <a href="/api/health" target="_blank" rel="noopener noreferrer">
            <Activity className="size-4" />
            API health
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
          Sign-in and role-based access are not enabled in the Phase 1 prototype.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
