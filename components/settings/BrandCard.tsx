"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetBrandConfig,
  saveBrandConfig,
  useBrandConfig,
} from "@/lib/branding/storage";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import type { BrandConfig } from "@/lib/branding/types";

export function BrandCard({ canEdit = false }: { canEdit?: boolean }) {
  const saved = useBrandConfig();
  const [draft, setDraft] = useState<BrandConfig>(saved);
  const [savedAt, setSavedAt] = useState<string>("");

  // saved 값이 외부에서 바뀌면 draft 초기화 (저장 직후 / 리셋 직후).
  // useEffect 없이 단순화: draft가 비어 있으면 saved 사용. 또는 changes 카운트.
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <K extends keyof BrandConfig>(k: K, v: BrandConfig[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const handleSave = () => {
    saveBrandConfig(draft);
    setSavedAt(new Date().toLocaleTimeString("ko-KR"));
  };

  const handleReset = () => {
    resetBrandConfig();
    setDraft(DEFAULT_BRAND);
    setSavedAt(new Date().toLocaleTimeString("ko-KR"));
  };

  if (!canEdit) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">📋 보고서 브랜드 설정</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            정회원 이상
          </span>
        </div>
        <div className="rounded-lg px-4 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <div className="text-2xl mb-2">🔒</div>
          <div className="text-sm font-medium text-foreground mb-1">정회원 이상 이용 가능</div>
          <div className="text-xs text-muted-foreground">
            정회원·VIP·미스터홈즈센터·멘토스쿨 회원은 PDF 브랜드를 자신의 상호로 변경할 수 있습니다.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">📋 보고서 브랜드 설정</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            PRO 기능 · PDF 화이트라벨
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          PDF 보고서에 표시되는 회사명·작성자·로고 색상을 본인 브랜드로 변경할 수
          있습니다.
        </p>
      </header>

      {/* 한국어 브랜드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="회사명 (한국어)"
          value={draft.companyName}
          onChange={(v) => set("companyName", v)}
          placeholder="미스터홈즈"
        />
        <Field
          label="브랜드 태그라인"
          value={draft.brandTagline}
          onChange={(v) => set("brandTagline", v)}
          placeholder="공법의 신"
        />
      </div>

      {/* 영문 브랜드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="회사명 (영문, 표지 상단)"
          value={draft.companyNameEn}
          onChange={(v) => set("companyNameEn", v)}
          placeholder="MR. HOMES"
        />
        <Field
          label="영문 태그라인"
          value={draft.brandTaglineEn}
          onChange={(v) => set("brandTaglineEn", v)}
          placeholder="공법의 신"
        />
      </div>

      <Field
        label="보고서 부제 (영문)"
        value={draft.reportSubtitle}
        onChange={(v) => set("reportSubtitle", v)}
        placeholder="REAL ESTATE CONSULTING REPORT"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="작성자 (직책 포함)"
          value={draft.authorName}
          onChange={(v) => set("authorName", v)}
          placeholder="고상철 대표"
        />
        <Field
          label="법률 자문"
          value={draft.legalAdvisor}
          onChange={(v) => set("legalAdvisor", v)}
          placeholder="법무법인 윤강"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="법인명"
          value={draft.corporationName}
          onChange={(v) => set("corporationName", v)}
          placeholder="㈜미스터홈즈 FC"
        />
        <Field
          label="대표 정보"
          value={draft.ceoTitle}
          onChange={(v) => set("ceoTitle", v)}
          placeholder="대표이사 고상철"
        />
      </div>

      {/* 색상 */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">
          브랜드 메인 색상
          <span className="ml-1.5 text-[10px] text-muted-foreground/70">
            (표지 상단 띠·헤더에 적용)
          </span>
        </Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={draft.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            className="w-12 h-9 rounded border border-input bg-background cursor-pointer"
          />
          <Input
            value={draft.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            placeholder="#993C1D"
            className="flex-1 font-mono text-[12px]"
          />
          <div
            className="size-9 rounded border border-input"
            style={{ background: draft.primaryColor }}
            aria-label="색상 미리보기"
          />
        </div>
      </div>

      {/* 액션 */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button onClick={handleSave} disabled={!dirty}>
          💾 저장
        </Button>
        <Button variant="outline" onClick={handleReset}>
          ↩️ 기본값(미스터홈즈)으로
        </Button>
        {savedAt && (
          <span className="text-[11px] text-[var(--success)] self-center">
            ✓ 저장됨 {savedAt}
          </span>
        )}
        {dirty && !savedAt && (
          <span className="text-[11px] text-amber-600 self-center">
            • 변경사항 미저장
          </span>
        )}
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
        💡 변경 사항은 다음 보고서 생성부터 즉시 적용됩니다. 현재 미리보기가 필요하면
        시뮬레이터 → 보고서 생성에서 빈 데이터로도 PDF 1장을 받아 확인할 수
        있습니다.
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-[12.5px]"
      />
    </div>
  );
}
