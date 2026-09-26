"use client";

import {
  BellRing,
  Loader2,
  MapPinOff,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Route,
  TrafficCone,
  Warehouse,
  Zap,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_CONFIG } from "@/config/demo";
import { useLiveSimulation } from "@/hooks/use-live-simulation";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { DemoScenarioTrigger, SimulationSpeed } from "@/types/realtime";

const SCENARIOS: Array<{
  id: DemoScenarioTrigger;
  label: string;
  hint: string;
  icon: typeof TrafficCone;
}> = [
  {
    id: "TRAFFIC_INCREASE",
    label: "Traffic increase",
    hint: `${DEMO_CONFIG.headlineTrackingNumber} at Agra · +120 min on NH19`,
    icon: TrafficCone,
  },
  { id: "CREATE_ROUTE_DEVIATION", label: "Route deviation", hint: "Push a moving vehicle off its corridor", icon: Route },
  { id: "HUB_DWELL_INCREASE", label: "Hub dwell +60 min", hint: "Extend dwell for a vehicle at a hub", icon: Warehouse },
  { id: "NO_MOVEMENT", label: "No movement", hint: "Stop a moving vehicle outside a hub", icon: MapPinOff },
  { id: "COMPLETE_DELIVERY", label: "Complete delivery", hint: "Deliver an out-for-delivery shipment", icon: PackageCheck },
];

/**
 * Presenter controls: Start / Pause / Reset / 1x · 5x · 20x and demo event
 * triggers. All actions go through the simulation API — the UI never mutates
 * demo data directly.
 */
export function SimulationControls({ className }: { className?: string }) {
  const { state, pendingAction, start, pause, reset, setSpeed, trigger } = useLiveSimulation();
  const pathname = usePathname();
  const router = useRouter();
  const running = Boolean(state?.running);
  const disabled = !state?.enabled;
  const speed = state?.speed ?? DEMO_CONFIG.defaultSpeed;

  const onTrigger = async (scenario: DemoScenarioTrigger) => {
    const result = await trigger(scenario);
    // Bring the affected vehicle into focus on the control tower map.
    if (result?.applied && result.vehicleId && pathname === "/control-tower") {
      router.replace(`/control-tower?focus=${result.vehicleId}`, { scroll: false });
    }
  };

  const sendTest = async () => {
    try {
      await apiClient.post("/api/v1/notifications/test", {
        template: "SHIPMENT_UPDATE",
        severity: "SUCCESS",
        title: "Test notification delivered",
        message: "In-app demo provider is working. No external channel was contacted.",
      });
    } catch (error) {
      toast.error("Test notification failed", { description: error instanceof ApiError ? error.message : undefined });
    }
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border bg-card/60 p-0.5", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant={running ? "ghost" : "default"}
            disabled={disabled || pendingAction === "start" || pendingAction === "pause"}
            onClick={() => void (running ? pause() : start())}
            aria-label={running ? "Pause simulation" : "Start simulation"}
          >
            {running ? <Pause /> : <Play />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{running ? "Pause simulation" : "Start simulation"}</TooltipContent>
      </Tooltip>

      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        value={String(speed)}
        onValueChange={(value) => value && void setSpeed(Number(value) as SimulationSpeed)}
        className="hidden md:flex"
        aria-label="Simulation speed"
        disabled={disabled}
      >
        {DEMO_CONFIG.speeds.map((option) => (
          <ToggleGroupItem key={option} value={String(option)} className="h-7 px-2 font-mono text-[11px]" aria-label={`${option}x speed`}>
            {option}x
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Reset demo data" disabled={pendingAction === "reset"}>
                {pendingAction === "reset" ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Reset to seed state</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Restores the deterministic seed dataset and restarts the simulated clock at the current time. Exception
              actions and notifications from this session are cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void reset()}>Reset demo data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2" disabled={disabled && !state?.demoMode}>
            {pendingAction && SCENARIOS.some((scenario) => scenario.id === pendingAction) ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Zap data-icon="inline-start" className="text-status-warning" />
            )}
            <span className="hidden lg:inline">Scenarios</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Trigger a demo event</DropdownMenuLabel>
          <DropdownMenuGroup>
            {SCENARIOS.map((scenario) => (
              <DropdownMenuItem key={scenario.id} onSelect={() => void onTrigger(scenario.id)} className="items-start gap-2.5 py-2">
                <scenario.icon className="mt-0.5 size-4 text-muted-foreground" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{scenario.label}</span>
                  <span className="text-xs text-muted-foreground">{scenario.hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void sendTest()} className="gap-2.5">
            <BellRing className="size-4 text-muted-foreground" />
            Send test notification
          </DropdownMenuItem>
          <div className="md:hidden">
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Speed</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={String(speed)} onValueChange={(value) => void setSpeed(Number(value) as SimulationSpeed)}>
              {DEMO_CONFIG.speeds.map((option) => (
                <DropdownMenuRadioItem key={option} value={String(option)}>
                  {option}x
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
