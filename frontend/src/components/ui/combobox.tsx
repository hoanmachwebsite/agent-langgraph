"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Spinner } from "./spinner";

interface ComboboxProps {
  classTrigger?: string;
  classContent?: string;
  items: { value: string; label: string; new?: boolean }[];
  onChange: (value: string) => void;
  selectedValue: string;
  size?: "default" | "small";
  placeholder?: string;
  placeholderSearch?: string;
  textEmpty?: string;
  disabled?: boolean;
  isLoading?: boolean;
  allowNewItems?: boolean;
  showNewItemLabel?: boolean;
}

export function Combobox({
  classTrigger,
  classContent,
  items = [],
  onChange,
  selectedValue,
  size,
  placeholder,
  placeholderSearch,
  textEmpty,
  disabled = false,
  isLoading = false,
  allowNewItems = true,
  showNewItemLabel = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState<string>("");
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Move filters calculation into useMemo to optimize performance
  const filters = React.useMemo(() => {
    const filtered = items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );

    // Only add new items if allowNewItems is true
    if (
      allowNewItems &&
      search &&
      !filtered.some((f) => f.label.toLowerCase() === search.toLowerCase())
    ) {
      return [...filtered, { value: search, label: search, new: true }];
    }

    return filtered;
  }, [items, search, allowNewItems]);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setOpen(false);
    setSearch("");
  };

  // Reset search when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Add touch event handlers
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (scrollContainer) {
      const preventTouch = (e: TouchEvent) => {
        e.stopPropagation();
      };

      scrollContainer.addEventListener("touchstart", preventTouch, {
        passive: false,
      });
      scrollContainer.addEventListener("touchmove", preventTouch, {
        passive: false,
      });

      return () => {
        scrollContainer.removeEventListener("touchstart", preventTouch);
        scrollContainer.removeEventListener("touchmove", preventTouch);
      };
    }
  }, []);

  const classNameSize = size === "small" ? "h-7" : "h-[38px]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "placeholder:text-muted-foreground text-foreground !active:border-input !active:text-foreground group flex items-center justify-between gap-0 overflow-hidden border-none bg-transparent p-0 text-sm hover:bg-transparent focus:bg-transparent focus:outline-none active:bg-transparent active:text-white disabled:cursor-not-allowed disabled:opacity-50",
            classNameSize,
            classTrigger
          )}
        >
          <span
            className={cn(
              "font-raleway text-foreground border-input group-active:border-input flex flex-1 items-center justify-start overflow-hidden rounded-l-md border px-2 font-medium leading-4",
              classNameSize
            )}
          >
            <span className="truncate whitespace-nowrap font-normal">
              {selectedValue ? (
                items.find((item) => item.value === selectedValue)?.label ||
                selectedValue
              ) : (
                <span className="text-control-content-disabled">
                  {placeholder || "Select..."}
                </span>
              )}
            </span>
          </span>
          <span
            className={cn(
              "border-input group-active:bg-control-hover group-hover:bg-control-hover flex w-8 items-center justify-center rounded-r-md border-b border-l-0 border-r border-t focus-visible:border-none group-focus:bg-transparent",
              classNameSize
            )}
          >
            <ChevronsUpDown className="group-focus:text-foreground group-hover:text-white" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("left-0 z-9999 w-auto p-0", classContent)}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholderSearch || "Search..."}
            className={classNameSize}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            ref={scrollContainerRef}
            className={cn(
              "max-h-[200px] overflow-y-auto overscroll-contain",
              // Add these classes to improve touch scrolling
              "touch-pan-y will-change-scroll"
            )}
          >
            {isLoading ? (
              <CommandItem className="flex h-[38px] items-center justify-center">
                <Spinner size="sm" label="Loading experiments..." />
              </CommandItem>
            ) : filters.length === 0 && search ? (
              <CommandEmpty>{textEmpty || "No framework found."}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filters.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => handleSelect(item.value)}
                    className={cn(
                      "focus:bg-athos-teal focus:text-accent-foreground hover:bg-athos-teal relative flex h-[38px] w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm font-medium leading-4 outline-none",
                      selectedValue === item.value ? "bg-athos-teal" : ""
                    )}
                  >
                    <span className="truncate whitespace-nowrap">
                      {item.label}{" "}
                      {showNewItemLabel && item.new && "(new item)"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
