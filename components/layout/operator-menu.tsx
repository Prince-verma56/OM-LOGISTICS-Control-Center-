"use client";

import { Activity, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
/** Authentic operator identity based on NextAuth session. */
export function OperatorMenu() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const { name, email, role } = session.user as Session["user"];
  const initials = name?.substring(0, 2).toUpperCase() || "OP";
  const displayRole = role ? role.replace("_", " ").toLowerCase() : "Operator";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label={`Signed in as ${name}`}>
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start leading-tight xl:flex">
            <span className="text-xs font-medium">{name}</span>
            <span className="text-[10px] text-muted-foreground">{displayRole} · DEMO</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <ShieldCheck className="size-4" />
          Role: {displayRole}
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2">
          <a href="/api/health" target="_blank" rel="noopener noreferrer">
            <Activity className="size-4" />
            API health
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => void signOut({ callbackUrl: "/login" })}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
