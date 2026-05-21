"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function FeeSection({
  title,
  basis,
  enabled,
  onEnabledChange,
  enabledLabel,
  learnSheet,
  accentColor,
  children,
}: {
  title: string;
  basis: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  enabledLabel: string;
  learnSheet?: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
}) {
  const ac = accentColor ?? "#D97757";
  return (
    <section
      className="border rounded-lg p-4"
      style={{
        borderColor: `${ac}66`,
        background: `${ac}0A`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              {basis}
            </div>
          </div>
          {learnSheet}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`${title}-enabled`}
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
          <Label
            htmlFor={`${title}-enabled`}
            className="text-[11.5px] text-muted-foreground cursor-pointer"
          >
            {enabledLabel}
          </Label>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">{children}</div>
    </section>
  );
}
