"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulatorStore } from "@/store/simulator";

export function AddressLookup() {
  const address = useSimulatorStore((s) => s.address);
  const lotInfo = useSimulatorStore((s) => s.lotInfo);
  const setAddress = useSimulatorStore((s) => s.setAddress);
  const applyLotInfo = useSimulatorStore((s) => s.applyLotInfo);
  const [loading, setLoading] = useState(false);

  const onLookup = async () => {
    if (!address.trim()) return;
    setLoading(true);
    // v0.2까지는 mock. v0.3에 VWorld API 연동.
    await new Promise((r) => setTimeout(r, 200));
    applyLotInfo({
      address,
      lotSqm: 661.16,
      zone: "2il",
      roadM: 6,
      source: "mock",
    });
    setLoading(false);
  };

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5 font-medium">
        ① 지번 조회
      </div>
      <div className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="예: 서울특별시 강남구 역삼동 123-45"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && onLookup()}
        />
        <Button onClick={onLookup} disabled={loading} variant="outline">
          조회
        </Button>
      </div>
      {lotInfo && (
        <div className="mt-2.5 px-3 py-2 rounded-md text-xs bg-[var(--info-bg)] text-[var(--info)]">
          <div className="font-semibold">📍 {lotInfo.address}</div>
          <div className="mt-0.5 text-[11px]">
            대지면적 {lotInfo.lotSqm.toLocaleString("ko-KR")}㎡ ({Math.round(
              lotInfo.lotSqm / 3.305785,
            )}평) · 제2종일반주거지역 · 전면도로 {lotInfo.roadM}m
          </div>
          {lotInfo.source === "mock" && (
            <div className="mt-0.5 text-[10px] opacity-70">
              ※ v0.1 mock 데이터. v0.3부터 VWorld API 자동조회
            </div>
          )}
        </div>
      )}
    </div>
  );
}
