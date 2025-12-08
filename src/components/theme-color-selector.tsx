import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ThemeColorSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

const themes = [
  { name: "Default", value: "default", color: "#66800b" }, // Flexoki Green
  { name: "Emerald", value: "emerald", color: "#10b981" }, // Emerald
  { name: "Midnight", value: "midnight", color: "#3b82f6" }, // Blue
  { name: "Sunset", value: "sunset", color: "#f59e0b" }, // Amber
  { name: "Mono", value: "mono", color: "#71717a" }, // Zinc-500
  { name: "Rose", value: "rose", color: "#fb7185" }, // Rose
  { name: "Neon", value: "neon", color: "#a3e635" }, // Lime
];

export function ThemeColorSelector({ value, onChange, className }: ThemeColorSelectorProps) {
  return (
    <RadioGroup
      onValueChange={onChange}
      defaultValue={value}
      value={value}
      className={cn("grid grid-cols-4 gap-4 md:grid-cols-7", className)}
    >
      {themes.map((theme) => (
        <FormItem key={theme.value} className="space-y-0">
          <FormLabel className="cursor-pointer">
            <FormControl>
              <RadioGroupItem value={theme.value} className="sr-only" />
            </FormControl>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all hover:scale-105",
                  value === theme.value
                    ? "border-primary ring-2 ring-primary/30 ring-offset-2"
                    : "border-transparent ring-1 ring-border"
                )}
                style={{ backgroundColor: theme.color }}
              >
                {value === theme.value && (
                  <Check className="h-6 w-6 text-white drop-shadow-md" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                value === theme.value ? "text-primary" : "text-muted-foreground"
              )}>
                {theme.name}
              </span>
            </div>
          </FormLabel>
        </FormItem>
      ))}
    </RadioGroup>
  );
}
