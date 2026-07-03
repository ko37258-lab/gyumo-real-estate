"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSimulatorStore } from "@/store/simulator";
import { ZONE_LIST, ZONE_LABEL, ZONES, type ZoneCode } from "@/lib/zones";

export function ZoneSelector() {
  const zone = useSimulatorStore((s) => s.zone);
  const setZone = useSimulatorStore((s) => s.setZone);

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5 font-medium">
        ② 용도지역 선택{" "}
        <span className="text-[10px] text-muted-foreground/70">
          (국토계획법 시행령 제30조)
        </span>
      </div>
      <Select value={zone} onValueChange={(v) => setZone(v as ZoneCode)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {ZONES[zone] ? ZONE_LABEL(ZONES[zone]) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ZONE_LIST.map((z) => (
            <SelectItem key={z.code} value={z.code}>
              {ZONE_LABEL(z)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
