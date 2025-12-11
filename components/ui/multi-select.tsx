"use client";

import * as React from "react";
import {Check, ChevronDown, X} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";

export type MultiSelectOption = {
  value: string;
  label: string;
  className?: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel?: string;
  className?: string;
  id?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  allLabel = "All",
  className,
  id,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const displayValue = () => {
    if (selected.length === 0) {
      return <span className="text-muted-foreground">{allLabel}</span>;
    }
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    if (selected.length === options.length) {
      return <span className="text-muted-foreground">{allLabel}</span>;
    }
    return (
      <div className="flex items-center gap-1">
        <span className="truncate">
          {selected.length} selected
        </span>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal cursor-pointer",
            className
          )}
        >
          <span className="truncate">{displayValue()}</span>
          <div className="flex items-center gap-1">
            {selected.length > 0 && selected.length < options.length && (
              <X
                className="h-3 w-3 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer",
              selected.length === 0 || selected.length === options.length
                ? "font-medium"
                : ""
            )}
            onClick={handleSelectAll}
          >
            <div
              className={cn(
                "h-4 w-4 border rounded flex items-center justify-center",
                selected.length === 0 || selected.length === options.length
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-input"
              )}
            >
              {(selected.length === 0 || selected.length === options.length) && (
                <Check className="h-3 w-3" />
              )}
            </div>
            {allLabel}
          </button>
          <div className="h-px bg-border my-1" />
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer",
                selected.includes(option.value) ? "font-medium" : ""
              )}
              onClick={() => handleToggle(option.value)}
            >
              <div
                className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  selected.includes(option.value)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input"
                )}
              >
                {selected.includes(option.value) && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              {option.className ? (
                <Badge className={cn(option.className, "text-xs")}>
                  {option.label}
                </Badge>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
