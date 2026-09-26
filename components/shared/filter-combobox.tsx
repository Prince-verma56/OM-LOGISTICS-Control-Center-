"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FilterOption } from "@/types/api";

/** Searchable single-select for long reference lists (vehicles, customers, routes). */
export function FilterCombobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
  loading = false,
}: {
  label: string;
  placeholder?: string;
  options: FilterOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className={cn("h-8 w-full min-w-0 justify-between gap-1.5 px-2.5 font-normal", selected && "pr-8")}
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? label}</span>
            {!selected && <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />}
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder ?? `Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading…" : "No matches."}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.hint ?? ""}`}
                  onSelect={() => {
                    onChange(option.value === value ? undefined : option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-3.5", option.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="ml-auto truncate text-[11px] text-muted-foreground">{option.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => onChange(undefined)}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
